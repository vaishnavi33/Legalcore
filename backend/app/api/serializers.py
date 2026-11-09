from app.models import LegalRequest, Status, User
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
from app.services.workflow import EXPLAIN, LABELS, allowed_next


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
        priority=r.priority,
        audience=r.audience,
        service=r.service.name,
        service_slug=r.service.slug,
        service_other=r.service_other,
        branch=r.branch.name if r.branch else None,
        branch_slug=r.branch.slug if r.branch else None,
        contact_name=r.contact_name,
        needed_by=r.needed_by,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def history_out(r: LegalRequest, include_internal: bool) -> list[HistoryOut]:
    return [
        HistoryOut(
            old_status=h.old_status,
            new_status=h.new_status,
            label=LABELS[Status(h.new_status)],
            note=h.note if (h.public_note or include_internal) else "",
            internal_note=h.internal_note if include_internal else "",
            at=h.created_at,
            by=(h.changed_by.name if h.changed_by and include_internal else None),
        )
        for h in r.history
    ]


def detail(r: LegalRequest, user: User) -> RequestDetail:
    staff = perm.staff_can_access(user, r)
    mine = perm.is_requester(user, r)
    s = summary(r)
    profile = r.user.lawyer_profile if r.user else None
    return RequestDetail(
        **s.model_dump(),
        contact_phone=r.contact_phone,
        contact_email=r.contact_email,
        organisation=r.organisation,
        preferred_contact=r.preferred_contact,
        topic=r.topic,
        message=r.message,
        enrolment_number=r.enrolment_number,
        enrolment_verified=bool(
            r.enrolment_number and profile and profile.is_verified and profile.enrolment_number.upper() == r.enrolment_number.upper()
        ),
        court=r.court,
        case_number=r.case_number,
        opposite_party=r.opposite_party,
        requires_advocate=r.service.requires_advocate,
        status_explain=EXPLAIN[r.status],
        history=history_out(r, staff),
        notes=[
            NoteOut(
                id=n.id,
                body=n.body,
                internal=n.internal,
                kind=n.kind,
                author=n.author.name if n.author else None,
                from_staff=bool(n.author and n.author.is_staff and n.author_id != r.user_id),
                at=n.created_at,
            )
            for n in r.notes
            if staff or not n.internal
        ],
        documents=[
            DocumentOut(
                id=d.id,
                filename=d.filename,
                size=d.size,
                kind=d.kind,
                version=d.version,
                shared_with_client=d.shared_with_client,
                scan_status=d.scan_status,
                uploaded_by=(d.uploaded_by.name if d.uploaded_by else ("Requester (guest)" if staff else None)),
                from_requester=(d.uploaded_by_id is None or d.uploaded_by_id == r.user_id),
                at=d.created_at,
            )
            for d in r.documents
            if staff or d.visible_to_requester()
        ],
        assignees=[
            AssigneeOut(id=a.assignee.id, name=a.assignee.name, roles=sorted(a.assignee.role_set, key=lambda x: x.value), conflict_checked=a.conflict_checked)
            for a in r.assignments
        ]
        if staff
        else [],
        allowed_next=allowed_next(r, user, mine, staff),
        can_manage=staff,
        can_allocate=perm.can_manage_request(user, r) if staff else False,
        is_requester=mine,
    )
