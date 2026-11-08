from app.models import LegalRequest, User
from app.schemas import (
    AssigneeOut,
    BranchBrief,
    DocumentOut,
    HistoryOut,
    NoteOut,
    RequestDetail,
    RequestSummary,
    UserOut,
)
from app.services import permissions as perm
from app.services.workflow import LABELS, allowed_next


def user_out(u: User) -> UserOut:
    lp = u.lawyer_profile
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        mobile=u.mobile,
        roles=sorted(u.role_set, key=lambda r: r.value),
        branches=[BranchBrief.model_validate(b.branch) for b in u.branch_links],
        lawyer_status=lp.verification_status if lp else None,
        enrolment_number=lp.enrolment_number if lp else None,
        is_active=u.is_active,
    )


def summary(r: LegalRequest) -> RequestSummary:
    return RequestSummary(
        request_number=r.request_number,
        status=r.status,
        status_label=LABELS[r.status],
        audience=r.audience,
        service=r.service.name,
        service_slug=r.service.slug,
        branch=r.branch.name,
        branch_slug=r.branch.slug,
        contact_name=r.contact_name,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def history_out(r: LegalRequest, include_internal: bool) -> list[HistoryOut]:
    out = []
    for h in r.history:
        from app.models import Status

        out.append(
            HistoryOut(
                old_status=h.old_status,
                new_status=h.new_status,
                label=LABELS[Status(h.new_status)],
                note=h.note if (h.public_note or include_internal) else "",
                at=h.created_at,
                by=(h.changed_by.name if h.changed_by and include_internal else None),
            )
        )
    return out


def detail(r: LegalRequest, user: User) -> RequestDetail:
    staff = perm.staff_can_access(user, r)
    mine = perm.is_requester(user, r)
    s = summary(r)
    return RequestDetail(
        **s.model_dump(),
        contact_phone=r.contact_phone,
        contact_email=r.contact_email,
        preferred_contact=r.preferred_contact,
        preferred_date=r.preferred_date,
        topic=r.topic,
        message=r.message,
        enrolment_number=r.enrolment_number,
        court=r.court,
        case_number=r.case_number,
        needed_by=r.needed_by,
        history=history_out(r, staff),
        notes=[
            NoteOut(
                id=n.id,
                body=n.body,
                internal=n.internal,
                author=n.author.name if n.author else None,
                from_staff=bool(n.author and n.author.is_staff and n.author_id != r.user_id),
                at=n.created_at,
            )
            for n in r.notes
            if staff or not n.internal
        ],
        documents=[
            DocumentOut(id=d.id, filename=d.filename, size=d.size, kind=d.kind.value, version=d.version, at=d.created_at)
            for d in r.documents
            if staff or d.kind.value in ("original", "approved")
        ],
        assignees=[AssigneeOut(id=a.assignee.id, name=a.assignee.name, roles=sorted(a.assignee.role_set, key=lambda x: x.value)) for a in r.assignments]
        if staff
        else [],
        allowed_next=allowed_next(r, user, mine, staff),
        can_manage=staff,
        is_requester=mine,
    )
