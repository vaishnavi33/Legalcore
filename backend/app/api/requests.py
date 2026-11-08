import json
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy import func, or_, select

from app.api.deps import DB, CurrentUser, OptionalUser
from app.api.serializers import detail, summary
from app.core.config import get_settings
from app.core.ratelimit import client_ip, limiter
from app.core.security import new_request_number
from app.models import (
    Audience,
    Branch,
    DocKind,
    Document,
    LawyerProfile,
    LegalRequest,
    RequestAssignment,
    RequestHistory,
    RequestNote,
    Role,
    Service,
    Status,
    User,
    UserRole,
)
from app.schemas import AssignIn, RequestCreate, RequestCreated, RequestDetail, RequestList, StatusChangeIn, TransferIn
from app.services import permissions as perm
from app.services.audit import audit
from app.services.storage import get_storage
from app.services.workflow import LABELS, change_status

router = APIRouter(prefix="/requests", tags=["requests"])


def _load(db, number: str, user: User | None) -> LegalRequest:
    r = db.scalar(select(LegalRequest).where(LegalRequest.request_number == number.upper()))
    # Same answer for "does not exist" and "not yours", so request numbers cannot be probed.
    if not r or not perm.can_view(user, r):
        raise HTTPException(404, "Request not found")
    return r


async def _store_files(db, req: LegalRequest, files: list[UploadFile], user: User | None, kind: DocKind) -> None:
    s = get_settings()
    files = [f for f in files if f and f.filename]
    if len(req.documents) + len(files) > s.max_files_per_request * 4:
        raise HTTPException(400, "This request already has too many files.")
    storage = get_storage()
    for f in files:
        stored = await storage.save(f)
        version = 1 + sum(1 for d in req.documents if d.filename == stored.filename and d.kind == kind)
        req.documents.append(
            Document(
                filename=stored.filename,
                content_type=stored.content_type,
                size=stored.size,
                sha256=stored.sha256,
                storage_key=stored.key,
                kind=kind,
                version=version,
                uploaded_by_id=user.id if user else None,
            )
        )


@router.post("", response_model=RequestCreated, status_code=201)
async def create_request(
    request: Request,
    db: DB,
    user: OptionalUser,
    data: Annotated[str, Form(description="Request fields as JSON")],
    files: Annotated[list[UploadFile] | None, File()] = None,
):
    """Anyone can send a request; signing in links it to their account."""
    limiter.check(f"create:{client_ip(request)}", get_settings().rate_limit_create_per_min)
    try:
        body = RequestCreate.model_validate(json.loads(data))
    except (ValueError, ValidationError) as e:
        if isinstance(e, ValidationError):
            raise HTTPException(422, detail=[{"loc": err["loc"], "msg": err["msg"]} for err in e.errors()]) from None
        raise HTTPException(422, "Invalid request data") from None

    files = files or []
    if len([f for f in files if f.filename]) > get_settings().max_files_per_request:
        raise HTTPException(400, f"You can attach up to {get_settings().max_files_per_request} files.")
    service = db.scalar(select(Service).where(Service.slug == body.service, Service.is_active))
    branch = db.scalar(select(Branch).where(Branch.slug == body.branch, Branch.is_active))
    if not service:
        raise HTTPException(422, "Please choose a service.")
    if not branch:
        raise HTTPException(422, "Please choose a branch.")
    if body.audience == Audience.LAWYER and not body.enrolment_number.strip():
        raise HTTPException(422, "Please add your Bar Council enrolment number.")
    if service.audience != "both" and service.audience != body.audience.value:
        who = "lawyers" if service.audience == "lawyer" else "individuals"
        raise HTTPException(422, f"{service.name} is a service for {who}.")

    number = new_request_number(branch.code)
    while db.scalar(select(LegalRequest.id).where(LegalRequest.request_number == number)):
        number = new_request_number(branch.code)

    req = LegalRequest(
        request_number=number,
        user_id=user.id if user else None,
        audience=body.audience,
        service_id=service.id,
        branch_id=branch.id,
        status=Status.SUBMITTED,
        contact_name=body.name.strip(),
        contact_phone=body.phone,
        contact_email=(body.email or "").lower(),
        preferred_contact=body.preferred_contact,
        preferred_date=body.preferred_date,
        topic=body.topic,
        message=body.message.strip(),
        enrolment_number=body.enrolment_number.strip(),
        court=body.court.strip(),
        case_number=body.case_number.strip(),
        needed_by=body.needed_by,
    )
    req.history.append(RequestHistory(old_status=None, new_status=Status.SUBMITTED.value, changed_by_id=user.id if user else None))
    db.add(req)

    # One login for everyone: sending a lawyer request with an enrolment number switches on the lawyer pages.
    if user and body.audience == Audience.LAWYER:
        if Role.LAWYER not in user.role_set:
            user.roles.append(UserRole(role=Role.LAWYER))
        if not user.lawyer_profile:
            user.lawyer_profile = LawyerProfile(enrolment_number=req.enrolment_number, verification_status="pending")

    await _store_files(db, req, files, user, DocKind.ORIGINAL)
    db.flush()
    audit(db, user, "request.create", "request", req.request_number, client_ip(request), branch=branch.slug, service=service.slug)
    db.commit()
    db.refresh(req)
    return RequestCreated(
        request_number=req.request_number,
        status_label=LABELS[req.status],
        service=service.name,
        branch=branch.name,
        branch_phone=branch.phone,
        files_received=len(req.documents),
        linked_to_account=user is not None,
    )


@router.get("", response_model=RequestList)
def list_requests(
    user: CurrentUser,
    db: DB,
    scope: Annotated[str, Query(pattern="^(mine|work)$")] = "mine",
    status: Status | None = None,
    branch: str | None = None,
    service: str | None = None,
    q: Annotated[str | None, Query(max_length=60)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    if scope == "work" and not user.is_staff:
        raise HTTPException(403, "This list is for Legal Core staff.")
    stmt = perm.visible_requests_query(user, scope)
    if status:
        stmt = stmt.where(LegalRequest.status == status)
    if branch:
        stmt = stmt.where(LegalRequest.branch_id == select(Branch.id).where(Branch.slug == branch).scalar_subquery())
    if service:
        stmt = stmt.where(LegalRequest.service_id == select(Service.id).where(Service.slug == service).scalar_subquery())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(LegalRequest.request_number.ilike(like), LegalRequest.contact_name.ilike(like), LegalRequest.contact_phone.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(LegalRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).unique().all()
    return RequestList(items=[summary(r) for r in rows], total=total, page=page, page_size=page_size)


@router.get("/{number}", response_model=RequestDetail)
def get_request(number: str, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if perm.staff_can_access(user, r) and not perm.is_requester(user, r):
        audit(db, user, "request.view", "request", r.request_number, client_ip(request))
        db.commit()
    return detail(r, user)


@router.post("/{number}/status", response_model=RequestDetail)
def set_status(number: str, body: StatusChangeIn, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    old = r.status
    change_status(db, r, body.status, user, is_requester=perm.is_requester(user, r), is_staff_for_request=perm.staff_can_access(user, r), note=body.note)
    audit(db, user, "request.status", "request", r.request_number, client_ip(request), old=old.value, new=body.status.value)
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.post("/{number}/assign", response_model=RequestDetail)
def assign(number: str, body: AssignIn, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not (user.is_admin or (user.has(Role.BRANCH_MANAGER) and r.branch_id in user.branch_ids)):
        raise HTTPException(403, "Only the branch manager or an administrator can assign work.")
    assignee = db.get(User, body.assignee_id)
    if not assignee or not assignee.is_active or not assignee.has(Role.DRAFTING_STAFF, Role.ADVOCATE_REVIEWER, Role.BRANCH_MANAGER):
        raise HTTPException(422, "Choose an active staff member or advocate.")
    if r.user_id and assignee.id == r.user_id:
        raise HTTPException(422, "The person who sent the request cannot be assigned to it.")
    if any(a.assignee_id == assignee.id for a in r.assignments):
        raise HTTPException(409, f"{assignee.name} is already assigned.")
    r.assignments.append(RequestAssignment(assignee_id=assignee.id, assigned_by_id=user.id))
    r.notes.append(RequestNote(author_id=user.id, body=f"Assigned to {assignee.name}.", internal=True))
    audit(db, user, "request.assign", "request", r.request_number, client_ip(request), assignee=str(assignee.id))
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.delete("/{number}/assign/{assignee_id}", response_model=RequestDetail)
def unassign(number: str, assignee_id: uuid.UUID, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not (user.is_admin or (user.has(Role.BRANCH_MANAGER) and r.branch_id in user.branch_ids)):
        raise HTTPException(403, "Only the branch manager or an administrator can change assignments.")
    a = next((a for a in r.assignments if a.assignee_id == assignee_id), None)
    if not a:
        raise HTTPException(404, "Not assigned")
    r.assignments.remove(a)
    audit(db, user, "request.unassign", "request", r.request_number, client_ip(request), assignee=str(assignee_id))
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.post("/{number}/transfer", response_model=RequestDetail)
def transfer(number: str, body: TransferIn, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not (user.is_admin or (user.has(Role.BRANCH_MANAGER) and r.branch_id in user.branch_ids)):
        raise HTTPException(403, "Only the branch manager or an administrator can transfer a request.")
    target = db.scalar(select(Branch).where(Branch.slug == body.branch, Branch.is_active))
    if not target:
        raise HTTPException(422, "Choose a branch.")
    if target.id == r.branch_id:
        raise HTTPException(409, "The request is already at this branch.")
    old = r.branch.name
    r.branch_id = target.id
    r.assignments.clear()  # the new branch decides who works on it
    r.notes.append(RequestNote(author_id=user.id, body=f"Transferred from {old} to {target.name}. {body.note}".strip(), internal=True))
    audit(db, user, "request.transfer", "request", r.request_number, client_ip(request), from_branch=old, to_branch=target.slug)
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.post("/{number}/notes", response_model=RequestDetail)
async def add_note(
    number: str,
    user: CurrentUser,
    db: DB,
    request: Request,
    body: Annotated[str, Form(max_length=8000)] = "",
    internal: Annotated[bool, Form()] = False,
    kind: Annotated[DocKind, Form()] = DocKind.ORIGINAL,
    files: Annotated[list[UploadFile] | None, File()] = None,
):
    r = _load(db, number, user)
    staff = perm.staff_can_access(user, r)
    files = [f for f in (files or []) if f.filename]
    if not body.strip() and not files:
        raise HTTPException(422, "Write a message or attach a file.")
    if not staff:
        internal = False
        kind = DocKind.ORIGINAL
    if len(files) > get_settings().max_files_per_request:
        raise HTTPException(400, f"You can attach up to {get_settings().max_files_per_request} files at a time.")
    if kind == DocKind.APPROVED and not user.has(Role.ADVOCATE_REVIEWER, Role.ADMIN, Role.SUPER_ADMIN, Role.BRANCH_MANAGER):
        raise HTTPException(403, "Only an advocate reviewer or manager can upload the final approved document.")
    if body.strip():
        r.notes.append(RequestNote(author_id=user.id, body=body.strip(), internal=internal))
    await _store_files(db, r, files, user, kind)
    audit(db, user, "request.note", "request", r.request_number, client_ip(request), internal=internal, files=len(files))
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.get("/{number}/documents/{doc_id}")
def download(number: str, doc_id: uuid.UUID, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    d = next((d for d in r.documents if d.id == doc_id), None)
    staff = perm.staff_can_access(user, r)
    if not d or (not staff and d.kind == DocKind.WORKING):
        raise HTTPException(404, "Document not found")
    audit(db, user, "document.download", "document", str(d.id), client_ip(request), request=r.request_number)
    db.commit()
    path = get_storage().path_for(d.storage_key)
    if not path.exists():
        raise HTTPException(410, "This file is no longer available.")
    return FileResponse(path, media_type=d.content_type, filename=d.filename, headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})
