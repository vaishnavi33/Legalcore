"""Request status rules. Every change goes through `change_status`, which checks the transition and records history.

The workflow has no quotation or payment stages. Legal Core coordinates the work; opinions and other legal
content pass through a verified advocate reviewer before they reach the client."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import LegalRequest, RequestHistory, Role, Status, User

S = Status

TRANSITIONS: dict[Status, set[Status]] = {
    S.SUBMITTED: {S.UNDER_SCREENING, S.ON_HOLD, S.CANCELLED},
    S.UNDER_SCREENING: {S.INFORMATION_REQUIRED, S.ASSIGNED, S.ON_HOLD, S.CANCELLED},
    S.INFORMATION_REQUIRED: {S.UNDER_SCREENING, S.IN_PROGRESS, S.ON_HOLD, S.CANCELLED},
    S.ASSIGNED: {S.IN_PROGRESS, S.INFORMATION_REQUIRED, S.ON_HOLD, S.CANCELLED},
    S.IN_PROGRESS: {S.ADVOCATE_REVIEW, S.QUALITY_REVIEW, S.INFORMATION_REQUIRED, S.ON_HOLD},
    S.ADVOCATE_REVIEW: {S.QUALITY_REVIEW, S.REVISION_REQUIRED},
    S.QUALITY_REVIEW: {S.CLIENT_REVIEW, S.COMPLETED, S.REVISION_REQUIRED},
    S.CLIENT_REVIEW: {S.COMPLETED, S.REVISION_REQUIRED},
    S.REVISION_REQUIRED: {S.IN_PROGRESS},
    S.COMPLETED: {S.REVISION_REQUIRED},
    S.ON_HOLD: {S.UNDER_SCREENING, S.IN_PROGRESS, S.CANCELLED},
    S.CANCELLED: set(),
}

# Steps a requester may take on their own request.
REQUESTER_ALLOWED = {
    (S.SUBMITTED, S.CANCELLED),
    (S.UNDER_SCREENING, S.CANCELLED),
    (S.INFORMATION_REQUIRED, S.UNDER_SCREENING),  # "I have added the information"
    (S.INFORMATION_REQUIRED, S.CANCELLED),
    (S.CLIENT_REVIEW, S.COMPLETED),  # "I am satisfied"
    (S.CLIENT_REVIEW, S.REVISION_REQUIRED),
    (S.COMPLETED, S.REVISION_REQUIRED),
}

# Leaving advocate review is a professional sign-off: only a verified advocate reviewer may do it.
ADVOCATE_ONLY = {(S.ADVOCATE_REVIEW, S.QUALITY_REVIEW), (S.ADVOCATE_REVIEW, S.REVISION_REQUIRED)}

# Staff must give a reason for these.
NEEDS_REASON = {S.ON_HOLD, S.CANCELLED, S.INFORMATION_REQUIRED, S.REVISION_REQUIRED}

LABELS = {
    S.SUBMITTED: "Submitted",
    S.UNDER_SCREENING: "Under screening",
    S.INFORMATION_REQUIRED: "Information required",
    S.ASSIGNED: "Assigned",
    S.IN_PROGRESS: "In progress",
    S.ADVOCATE_REVIEW: "Advocate review",
    S.QUALITY_REVIEW: "Quality review",
    S.CLIENT_REVIEW: "Client review",
    S.REVISION_REQUIRED: "Revision required",
    S.COMPLETED: "Completed",
    S.ON_HOLD: "On hold",
    S.CANCELLED: "Cancelled",
}

# Plain-language explanation shown to the requester.
EXPLAIN = {
    S.SUBMITTED: "We have received your request.",
    S.UNDER_SCREENING: "Our team is reading your request and documents.",
    S.INFORMATION_REQUIRED: "We need more information or a document from you.",
    S.ASSIGNED: "A suitable professional has been assigned to your matter.",
    S.IN_PROGRESS: "Work on your request is under way.",
    S.ADVOCATE_REVIEW: "A qualified advocate is reviewing the work.",
    S.QUALITY_REVIEW: "We are doing a final quality check.",
    S.CLIENT_REVIEW: "The work is ready for you to review.",
    S.REVISION_REQUIRED: "Changes are being made.",
    S.COMPLETED: "Your request is complete.",
    S.ON_HOLD: "Your request is paused for now.",
    S.CANCELLED: "This request has been cancelled.",
}

# The usual path, shown as steps on the tracking page.
MAIN_PATH = [S.SUBMITTED, S.UNDER_SCREENING, S.ASSIGNED, S.IN_PROGRESS, S.QUALITY_REVIEW, S.COMPLETED]
POSITION = {
    S.SUBMITTED: 0,
    S.UNDER_SCREENING: 1,
    S.INFORMATION_REQUIRED: 1,
    S.ON_HOLD: 1,
    S.ASSIGNED: 2,
    S.IN_PROGRESS: 3,
    S.REVISION_REQUIRED: 3,
    S.ADVOCATE_REVIEW: 4,
    S.QUALITY_REVIEW: 4,
    S.CLIENT_REVIEW: 4,
    S.COMPLETED: 5,
}

OPEN_STATUSES = [s for s in Status if s not in (S.COMPLETED, S.CANCELLED)]


def is_verified_advocate(user: User) -> bool:
    return user.has(Role.ADVOCATE_REVIEWER) and bool(user.lawyer_profile and user.lawyer_profile.is_verified)


def allowed_next(req: LegalRequest, user: User, is_requester: bool, is_staff_for_request: bool) -> list[Status]:
    out = [n for n in TRANSITIONS[req.status] if _may(req, n, user, is_requester, is_staff_for_request)]
    order = list(Status)
    return sorted(out, key=order.index)


def _may(req: LegalRequest, nxt: Status, user: User, is_requester: bool, is_staff_for_request: bool) -> bool:
    cur = req.status
    if nxt not in TRANSITIONS[cur]:
        return False
    if is_staff_for_request:
        if (cur, nxt) in ADVOCATE_ONLY:
            return is_verified_advocate(user)
        # Opinions and consultations cannot skip the advocate.
        if cur == S.IN_PROGRESS and nxt == S.QUALITY_REVIEW and req.service.requires_advocate:
            return False
        return True
    return is_requester and (cur, nxt) in REQUESTER_ALLOWED


def change_status(
    db: Session,
    req: LegalRequest,
    nxt: Status,
    user: User,
    *,
    is_requester: bool,
    is_staff_for_request: bool,
    note: str = "",
    internal_note: str = "",
) -> RequestHistory:
    if not _may(req, nxt, user, is_requester, is_staff_for_request):
        if is_staff_for_request and req.status == S.IN_PROGRESS and nxt == S.QUALITY_REVIEW and req.service.requires_advocate:
            raise HTTPException(409, f"{req.service.name} must go to advocate review first.")
        if is_staff_for_request and (req.status, nxt) in ADVOCATE_ONLY:
            raise HTTPException(409, "Only a verified advocate reviewer can complete advocate review.")
        raise HTTPException(409, f"Cannot move from {LABELS[req.status]} to {LABELS[nxt]}.")
    if is_staff_for_request and not is_requester and nxt in NEEDS_REASON and not (note.strip() or internal_note.strip()):
        raise HTTPException(422, f"Please give a reason for moving the request to {LABELS[nxt]}.")
    h = RequestHistory(
        request=req,
        old_status=req.status.value,
        new_status=nxt.value,
        note=note.strip(),
        public_note=True,
        internal_note=internal_note.strip(),
        changed_by_id=user.id,
    )
    db.add(h)
    req.status = nxt
    return h
