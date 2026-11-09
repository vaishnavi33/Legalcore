import json
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy import func, or_, select

from app.api.deps import DB, CurrentUser, OptionalUser
from app.api.serializers import detail, summary
from app.core.config import get_settings
from app.core.ratelimit import client_ip, limiter
from app.core.security import create_scoped_token, decode_scoped_token, india_today, new_request_number
from app.models import (
    Audience,
    Branch,
    DocKind,
    Document,
    LawyerProfile,
    LegalRequest,
    Priority,
    RequestAssignment,
    RequestHistory,
    RequestNote,
    Role,
    Service,
    Status,
    User,
    UserRole,
)
from app.schemas import (
    AssignIn,
    ConflictHit,
    DocumentUpdate,
    LinkOut,
    NotifyResult,
    PriorityIn,
    RequestCreate,
    RequestCreated,
    RequestDetail,
    RequestList,
    StatusChangeIn,
    TransferIn,
)
from app.services import notify
from app.services import permissions as perm
from app.services.audit import audit
from app.services.storage import get_storage
from app.services.workflow import EXPLAIN, LABELS, OPEN_STATUSES, change_status, is_verified_advocate

router = APIRouter(prefix="/requests", tags=["requests"])
files_router = APIRouter(tags=["documents"])

AUDIENCE_NAMES = {"lawyer": "lawyers", "individual": "individuals", "business": "businesses"}
LINK_MINUTES = 5


def _load(db, number: str, user: User | None) -> LegalRequest:
    r = db.scalar(select(LegalRequest).where(LegalRequest.request_number == number.upper()))
    # Same answer for "does not exist" and "not yours", so request numbers cannot be probed.
    if not r or not perm.can_view(user, r):
        raise HTTPException(404, "Request not found")
    return r


def _validation_error(e: ValidationError) -> HTTPException:
    out = []
    for err in e.errors():
        msg = err["msg"].removeprefix("Value error, ")
        out.append({"loc": err["loc"], "msg": msg})
    return HTTPException(422, detail=out)


async def store_files(db, req: LegalRequest, files: list[UploadFile], user: User | None, kind: DocKind, shared: bool = False) -> list[Document]:
    s = get_settings()
    files = [f for f in files if f and f.filename]
    if len(files) > s.max_files_per_request:
        raise HTTPException(400, f"You can attach up to {s.max_files_per_request} files at a time.")
    if len(req.documents) + len(files) > s.max_files_per_request * 6:
        raise HTTPException(400, "This request already has too many files. Please contact us.")
    storage = get_storage()
    added = []
    for f in files:
        stored = await storage.save(f)
        same = [d for d in req.documents if d.filename == stored.filename]
        doc = Document(
            filename=stored.filename,
            content_type=stored.content_type,
            size=stored.size,
            sha256=stored.sha256,
            storage_key=stored.key,
            kind=kind,
            version=1 + len(same),
            shared_with_client=shared or kind == DocKind.FINAL,
            scan_status=stored.scan_status,
            uploaded_by_id=user.id if user else None,
        )
        if kind == DocKind.FINAL:
            for d in same:
                if d.kind == DocKind.FINAL:
                    d.kind = DocKind.SUPERSEDED
        req.documents.append(doc)
        added.append(doc)
    return added


@router.post("", response_model=RequestCreated, status_code=201)
async def create_request(
    request: Request,
    db: DB,
    user: OptionalUser,
    data: Annotated[str, Form(description="Request fields as JSON")],
    files: Annotated[list[UploadFile] | None, File()] = None,
):
    """Anyone can send a request without an account; signing in links it to the account."""
    limiter.check(f"create:{client_ip(request)}", get_settings().rate_limit_create_per_min)
    try:
        body = RequestCreate.model_validate(json.loads(data))
    except ValidationError as e:
        raise _validation_error(e) from None
    except ValueError:
        raise HTTPException(422, "Invalid request data") from None

    service = db.scalar(select(Service).where(Service.slug == body.service, Service.is_active))
    if not service:
        raise HTTPException(422, "Please choose a service.")
    if body.audience.value not in service.audiences:
        raise HTTPException(422, f"{service.name} is not offered to {AUDIENCE_NAMES[body.audience.value]}. Please choose another service or Other.")
    if body.audience == Audience.BUSINESS and len(body.organisation) < 2:
        raise HTTPException(422, "Please add the name of your business or organisation.")

    number = new_request_number()
    while db.scalar(select(LegalRequest.id).where(LegalRequest.request_number == number)):
        number = new_request_number()

    req = LegalRequest(
        request_number=number,
        user_id=user.id if user else None,
        audience=body.audience,
        service_id=service.id,
        service_other=body.service_other,
        branch_id=None,  # allocated internally by staff
        status=Status.SUBMITTED,
        priority=Priority.NORMAL,
        contact_name=body.name,
        contact_phone=body.phone,
        contact_email=(body.email or "").lower(),
        organisation=body.organisation,
        preferred_contact=body.preferred_contact,
        topic=body.topic,
        message=body.message,
        enrolment_number=body.enrolment_number,
        court=body.court,
        case_number=body.case_number,
        opposite_party=body.opposite_party,
        needed_by=body.needed_by,
    )
    req.history.append(RequestHistory(old_status=None, new_status=Status.SUBMITTED.value, changed_by_id=user.id if user else None))
    db.add(req)

    if user:
        # One login for everyone. A lawyer request opens the lawyer pages; the enrolment number stays an
        # unverified claim until staff complete verification.
        if body.audience == Audience.LAWYER:
            if Role.LAWYER not in user.role_set:
                user.roles.append(UserRole(role=Role.LAWYER))
            if not user.lawyer_profile:
                user.lawyer_profile = LawyerProfile(enrolment_number=body.enrolment_number, verification_status="pending")
            elif body.enrolment_number and not user.lawyer_profile.enrolment_number:
                user.lawyer_profile.enrolment_number = body.enrolment_number
        if body.audience == Audience.BUSINESS and Role.BUSINESS_CLIENT not in user.role_set:
            user.roles.append(UserRole(role=Role.BUSINESS_CLIENT))

    added = await store_files(db, req, files or [], user, DocKind.ORIGINAL)
    db.flush()
    subject = f"Legal Core: request {req.request_number} received"
    text = (
        f"Dear {req.contact_name},\n\nWe have received your request for {service.name}. Your reference number is {req.request_number}.\n"
        "Our team will review it and contact you. A requested date is noted but is not a promise of completion.\n\n"
        "You can track this request on our website with your reference number and a one-time code sent to you.\n\nLegal Core"
    )
    acks = notify.notify_requester(db, req, subject, text, sms=True)
    audit(db, user, "request.create", "request", req.request_number, client_ip(request), service=service.slug, files=len(added))
    db.commit()
    return RequestCreated(
        request_number=req.request_number,
        status_label=LABELS[req.status],
        service=service.name,
        files_received=len(added),
        linked_to_account=user is not None,
        acknowledgements=[NotifyResult(channel=n.channel, status=n.status) for n in acks],
    )


@router.get("", response_model=RequestList)
def list_requests(
    user: CurrentUser,
    db: DB,
    scope: Annotated[str, Query(pattern="^(mine|work)$")] = "mine",
    status: Status | None = None,
    branch: Annotated[str | None, Query(max_length=40)] = None,
    service: Annotated[str | None, Query(max_length=60)] = None,
    priority: Priority | None = None,
    queue: Annotated[str | None, Query(pattern="^(open|overdue|due_soon|assigned_to_me)$")] = None,
    q: Annotated[str | None, Query(max_length=60)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    if scope == "work" and not user.is_staff:
        raise HTTPException(403, "This list is for Legal Core staff.")
    stmt = perm.visible_requests_query(user, scope)
    if status:
        stmt = stmt.where(LegalRequest.status == status)
    if branch == "unallocated":
        stmt = stmt.where(LegalRequest.branch_id.is_(None))
    elif branch:
        stmt = stmt.where(LegalRequest.branch_id == select(Branch.id).where(Branch.slug == branch).scalar_subquery())
    if service:
        stmt = stmt.where(LegalRequest.service_id == select(Service.id).where(Service.slug == service).scalar_subquery())
    if priority:
        stmt = stmt.where(LegalRequest.priority == priority)
    today = india_today()
    if queue == "open":
        stmt = stmt.where(LegalRequest.status.in_(OPEN_STATUSES))
    elif queue == "overdue":
        stmt = stmt.where(LegalRequest.status.in_(OPEN_STATUSES), LegalRequest.needed_by < today)
    elif queue == "due_soon":
        from datetime import timedelta

        stmt = stmt.where(LegalRequest.status.in_(OPEN_STATUSES), LegalRequest.needed_by >= today, LegalRequest.needed_by <= today + timedelta(days=7))
    elif queue == "assigned_to_me":
        stmt = stmt.where(LegalRequest.id.in_(select(RequestAssignment.request_id).where(RequestAssignment.assignee_id == user.id)))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(LegalRequest.request_number.ilike(like), LegalRequest.contact_name.ilike(like), LegalRequest.contact_phone.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = [LegalRequest.needed_by.asc()] if queue in ("overdue", "due_soon") else [LegalRequest.created_at.desc()]
    rows = db.scalars(stmt.order_by(*order).offset((page - 1) * page_size).limit(page_size)).unique().all()
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
    staff = perm.staff_can_access(user, r)
    change_status(
        db, r, body.status, user, is_requester=perm.is_requester(user, r), is_staff_for_request=staff, note=body.note, internal_note=body.internal_note if staff else ""
    )
    audit(
        db, user, "request.status", "request", r.request_number, client_ip(request),
        old=old.value, new=body.status.value, note=body.note, internal_note=body.internal_note if staff else "",
    )
    if not perm.is_requester(user, r):
        msg = f"Your request {r.request_number} is now: {LABELS[r.status]}. {EXPLAIN[r.status]}"
        if body.note:
            msg += f"\n\nMessage from Legal Core: {body.note}"
        notify.notify_requester(db, r, f"Legal Core: update on {r.request_number}", msg)
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.post("/{number}/priority", response_model=RequestDetail)
def set_priority(number: str, body: PriorityIn, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not perm.staff_can_access(user, r):
        raise HTTPException(403, "Only Legal Core staff can set priority.")
    if body.priority == r.priority:
        return detail(r, user)
    old = r.priority
    r.priority = body.priority
    r.notes.append(RequestNote(author_id=user.id, body=f"Priority changed from {old.value.replace('_', ' ')} to {body.priority.value.replace('_', ' ')}. {body.reason}".strip(), internal=True, kind="system"))
    audit(db, user, "request.priority", "request", r.request_number, client_ip(request), old=old.value, new=body.priority.value, reason=body.reason)
    db.commit()
    db.refresh(r)
    return detail(r, user)


def _conflicts(db, r: LegalRequest, assignee: User) -> list[ConflictHit]:
    """Other matters this person worked on that involve the same people. Staff must review these before assigning."""
    names = {n.strip().lower() for n in (r.contact_name, r.opposite_party, r.organisation) if n and len(n.strip()) > 2}
    if not names:
        return []
    others = db.scalars(
        select(LegalRequest)
        .join(RequestAssignment, RequestAssignment.request_id == LegalRequest.id)
        .where(RequestAssignment.assignee_id == assignee.id, LegalRequest.id != r.id)
    ).unique().all()
    hits = []
    for o in others:
        theirs = {"client": o.contact_name, "other party": o.opposite_party, "organisation": o.organisation}
        for label, value in theirs.items():
            if value and value.strip().lower() in names:
                hits.append(ConflictHit(request_number=o.request_number, service=o.service.name, match=f"{value} ({label} in that matter)", created_at=o.created_at))
    return hits


@router.get("/{number}/conflicts", response_model=list[ConflictHit])
def check_conflicts(number: str, assignee_id: uuid.UUID, user: CurrentUser, db: DB):
    r = _load(db, number, user)
    if not perm.can_manage_request(user, r):
        raise HTTPException(403, "Only the branch manager or an administrator can assign work.")
    assignee = db.get(User, assignee_id)
    if not assignee:
        raise HTTPException(404, "Staff member not found")
    return _conflicts(db, r, assignee)


@router.post("/{number}/assign", response_model=RequestDetail)
def assign(number: str, body: AssignIn, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not perm.can_manage_request(user, r):
        raise HTTPException(403, "Only the branch manager or an administrator can assign work.")
    assignee = db.get(User, body.assignee_id)
    if not assignee or not assignee.is_active or not assignee.has(Role.DRAFTING_STAFF, Role.ADVOCATE_REVIEWER, Role.BRANCH_MANAGER, Role.SUPPORT_STAFF):
        raise HTTPException(422, "Choose an active staff member or advocate.")
    if assignee.has(Role.ADVOCATE_REVIEWER) and not assignee.has(Role.DRAFTING_STAFF, Role.BRANCH_MANAGER) and not is_verified_advocate(assignee):
        raise HTTPException(422, f"{assignee.name}'s advocate verification is not complete.")
    if r.user_id and assignee.id == r.user_id:
        raise HTTPException(422, "The person who sent the request cannot be assigned to it.")
    if any(a.assignee_id == assignee.id for a in r.assignments):
        raise HTTPException(409, f"{assignee.name} is already assigned.")
    if not body.conflict_checked:
        raise HTTPException(422, "Please confirm the conflict-of-interest check before assigning.")
    hits = _conflicts(db, r, assignee)
    if hits and len(body.conflict_note.strip()) < 5:
        raise HTTPException(422, "Possible conflict found. Explain why this assignment is acceptable.")
    r.assignments.append(RequestAssignment(assignee_id=assignee.id, assigned_by_id=user.id, conflict_checked=True, conflict_note=body.conflict_note.strip()))
    note = f"Assigned to {assignee.name}. Conflict check confirmed."
    if body.conflict_note.strip():
        note += f" Note: {body.conflict_note.strip()}"
    r.notes.append(RequestNote(author_id=user.id, body=note, internal=True, kind="system"))
    audit(db, user, "request.assign", "request", r.request_number, client_ip(request), assignee=str(assignee.id), conflicts=len(hits), conflict_note=body.conflict_note)
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.delete("/{number}/assign/{assignee_id}", response_model=RequestDetail)
def unassign(number: str, assignee_id: uuid.UUID, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not perm.can_manage_request(user, r):
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
    """Allocate a new request to a branch, or move it to another branch."""
    r = _load(db, number, user)
    if not perm.can_manage_request(user, r):
        raise HTTPException(403, "Only support staff, the branch manager or an administrator can allocate a request.")
    target = db.scalar(select(Branch).where(Branch.slug == body.branch, Branch.is_active))
    if not target:
        raise HTTPException(422, "Choose a branch.")
    if target.id == r.branch_id:
        raise HTTPException(409, "The request is already at this branch.")
    old = r.branch.name if r.branch else None
    r.branch_id = target.id
    if old:
        r.assignments.clear()  # the new branch decides who works on it
        text = f"Transferred from {old} to {target.name}."
    else:
        text = f"Allocated to {target.name}."
    r.notes.append(RequestNote(author_id=user.id, body=f"{text} {body.note}".strip(), internal=True, kind="system"))
    audit(db, user, "request.transfer" if old else "request.allocate", "request", r.request_number, client_ip(request), from_branch=old, to_branch=target.slug, note=body.note)
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
    note_kind: Annotated[str, Form(pattern="^(message|review|revision)$")] = "message",
    kind: Annotated[DocKind, Form()] = DocKind.ORIGINAL,
    share: Annotated[bool, Form()] = False,
    files: Annotated[list[UploadFile] | None, File()] = None,
):
    """Messages and document uploads. Requesters can only add messages and original documents."""
    limiter.check(f"note:{user.id}", 60)
    r = _load(db, number, user)
    staff = perm.staff_can_access(user, r)
    files = [f for f in (files or []) if f.filename]
    if not body.strip() and not files:
        raise HTTPException(422, "Write a message or attach a file.")
    if not staff:
        internal, kind, share = False, DocKind.ORIGINAL, False
        if note_kind == "review":
            note_kind = "message"
    else:
        if note_kind == "review" and not is_verified_advocate(user):
            raise HTTPException(403, "Only a verified advocate reviewer can add advocate review comments.")
        if kind == DocKind.ADVOCATE_REVIEWED and not is_verified_advocate(user):
            raise HTTPException(403, "Only a verified advocate reviewer can upload an advocate-reviewed document.")
        if kind == DocKind.FINAL and not (is_verified_advocate(user) or user.is_admin or perm.can_manage_branch(user, r.branch_id)):
            raise HTTPException(403, "Only an advocate reviewer or manager can upload the final document.")
        if kind == DocKind.SUPERSEDED:
            raise HTTPException(422, "Upload the new version instead; older versions are marked superseded automatically.")
    added = await store_files(db, r, files, user, kind, shared=share)
    if body.strip():
        r.notes.append(RequestNote(author_id=user.id, body=body.strip(), internal=internal, kind=note_kind))
    audit(db, user, "request.note", "request", r.request_number, client_ip(request), internal=internal, kind=note_kind, files=len(added), doc_kind=kind.value)
    if staff and not perm.is_requester(user, r) and not internal:
        visible_docs = [d for d in added if d.visible_to_requester()]
        if body.strip() or visible_docs:
            msg = f"There is a new update on your request {r.request_number}."
            if visible_docs:
                msg += f" {len(visible_docs)} document(s) shared with you."
            notify.notify_requester(db, r, f"Legal Core: new message on {r.request_number}", msg)
    db.commit()
    db.refresh(r)
    return detail(r, user)


@router.patch("/{number}/documents/{doc_id}", response_model=RequestDetail)
def update_document(number: str, doc_id: uuid.UUID, body: DocumentUpdate, user: CurrentUser, db: DB, request: Request):
    r = _load(db, number, user)
    if not perm.staff_can_access(user, r):
        raise HTTPException(404, "Document not found")
    d = next((d for d in r.documents if d.id == doc_id), None)
    if not d:
        raise HTTPException(404, "Document not found")
    changes = body.model_dump(exclude_unset=True)
    if body.kind is not None and body.kind != d.kind:
        if body.kind == DocKind.ORIGINAL or (d.kind == DocKind.ORIGINAL and body.kind not in (DocKind.UNDER_REVIEW, DocKind.SUPERSEDED)):
            raise HTTPException(422, "Documents sent by the requester can only be marked under review or superseded.")
        if body.kind == DocKind.ADVOCATE_REVIEWED and not is_verified_advocate(user):
            raise HTTPException(403, "Only a verified advocate reviewer can mark a document as advocate reviewed.")
        if body.kind == DocKind.FINAL and not (is_verified_advocate(user) or user.is_admin or perm.can_manage_branch(user, r.branch_id)):
            raise HTTPException(403, "Only an advocate reviewer or manager can mark a document final.")
        if body.kind in (DocKind.ADVOCATE_REVIEWED, DocKind.FINAL):
            d.reviewed_by_id, d.reviewed_at = user.id, datetime.now(UTC)
        d.kind = body.kind
        if body.kind == DocKind.FINAL:
            d.shared_with_client = True
    if body.shared_with_client is not None:
        d.shared_with_client = body.shared_with_client
    audit(db, user, "document.update", "document", str(d.id), client_ip(request), request=r.request_number, **{k: str(v) for k, v in changes.items()})
    db.commit()
    db.refresh(r)
    return detail(r, user)


def _doc_for(r: LegalRequest, doc_id: uuid.UUID, user: User) -> Document:
    d = next((d for d in r.documents if d.id == doc_id), None)
    if not d or (not perm.staff_can_access(user, r) and not d.visible_to_requester()):
        raise HTTPException(404, "Document not found")
    return d


def _serve(d: Document, inline: bool) -> FileResponse:
    path = get_storage().path_for(d.storage_key)
    if not path.exists():
        raise HTTPException(410, "This file is no longer available.")
    inline_ok = inline and d.content_type in ("application/pdf", "image/jpeg", "image/png")
    return FileResponse(
        path,
        media_type=d.content_type,
        filename=d.filename,
        content_disposition_type="inline" if inline_ok else "attachment",
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"},
    )


@router.get("/{number}/documents/{doc_id}")
def download(number: str, doc_id: uuid.UUID, user: CurrentUser, db: DB, request: Request, inline: bool = False):
    r = _load(db, number, user)
    d = _doc_for(r, doc_id, user)
    audit(db, user, "document.download", "document", str(d.id), client_ip(request), request=r.request_number, inline=inline)
    db.commit()
    return _serve(d, inline)


@router.post("/{number}/documents/{doc_id}/link", response_model=LinkOut)
def document_link(number: str, doc_id: uuid.UUID, user: CurrentUser, db: DB):
    """A link that works for a few minutes only, for previews and downloads in a new tab."""
    r = _load(db, number, user)
    d = _doc_for(r, doc_id, user)
    tok = create_scoped_token("file", str(d.id), LINK_MINUTES, uid=str(user.id), ver=user.token_version)
    return LinkOut(url=f"/api/v1/files/{tok}", expires_in=LINK_MINUTES * 60)


@files_router.get("/files/{token}")
def file_by_link(token: str, db: DB, request: Request, inline: bool = True):
    data = decode_scoped_token(token, "file")
    if not data:
        raise HTTPException(410, "This link has expired. Please open the document again from your request.")
    user = db.get(User, uuid.UUID(data["uid"]))
    d = db.get(Document, uuid.UUID(data["sub"]))
    # Permissions are checked again now, not only when the link was made.
    if not user or not user.is_active or user.token_version != data.get("ver") or not d:
        raise HTTPException(404, "Document not found")
    r = d.request
    if not perm.can_view(user, r):
        raise HTTPException(404, "Document not found")
    _doc_for(r, d.id, user)
    audit(db, user, "document.download", "document", str(d.id), client_ip(request), request=r.request_number, via="link")
    db.commit()
    return _serve(d, inline)
