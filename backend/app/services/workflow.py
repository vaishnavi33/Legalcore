"""Request status rules. Every change goes through `change_status`, which checks the transition and records history."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import LegalRequest, RequestHistory, Role, Status, User

S = Status

TRANSITIONS: dict[Status, set[Status]] = {
    S.SUBMITTED: {S.UNDER_REVIEW, S.REJECTED, S.CANCELLED},
    S.UNDER_REVIEW: {S.AWAITING_INFORMATION, S.ACCEPTED, S.REJECTED, S.ON_HOLD, S.CANCELLED},
    S.AWAITING_INFORMATION: {S.UNDER_REVIEW, S.ON_HOLD, S.CANCELLED},
    S.ACCEPTED: {S.PAYMENT_PENDING, S.ASSIGNED, S.ON_HOLD, S.CANCELLED},
    S.PAYMENT_PENDING: {S.ASSIGNED, S.CANCELLED},
    S.ASSIGNED: {S.IN_PROGRESS, S.ON_HOLD},
    S.IN_PROGRESS: {S.QUALITY_REVIEW, S.AWAITING_INFORMATION, S.ON_HOLD},
    S.QUALITY_REVIEW: {S.APPROVED, S.REVISION_REQUESTED},
    S.REVISION_REQUESTED: {S.IN_PROGRESS},
    S.APPROVED: {S.COMPLETED},
    S.COMPLETED: {S.REVISION_REQUESTED},
    S.ON_HOLD: {S.UNDER_REVIEW, S.IN_PROGRESS, S.CANCELLED},
    S.CANCELLED: {S.REFUND_PENDING},
    S.REJECTED: set(),
    S.REFUND_PENDING: set(),
}

# Steps a requester may take on their own request.
REQUESTER_ALLOWED = {
    (S.SUBMITTED, S.CANCELLED),
    (S.UNDER_REVIEW, S.CANCELLED),
    (S.AWAITING_INFORMATION, S.UNDER_REVIEW),  # "I have added the information"
    (S.AWAITING_INFORMATION, S.CANCELLED),
    (S.COMPLETED, S.REVISION_REQUESTED),
}

# Only a qualified advocate (or admin) can approve legal content.
REVIEWER_ONLY = {(S.QUALITY_REVIEW, S.APPROVED), (S.QUALITY_REVIEW, S.REVISION_REQUESTED)}

LABELS = {
    S.SUBMITTED: "Request received",
    S.UNDER_REVIEW: "Being reviewed",
    S.AWAITING_INFORMATION: "Waiting for your information",
    S.ACCEPTED: "Accepted",
    S.PAYMENT_PENDING: "Waiting for payment",
    S.ASSIGNED: "Team assigned",
    S.IN_PROGRESS: "Work in progress",
    S.QUALITY_REVIEW: "Quality check by advocate",
    S.REVISION_REQUESTED: "Changes being made",
    S.APPROVED: "Approved",
    S.COMPLETED: "Ready for you",
    S.ON_HOLD: "On hold",
    S.CANCELLED: "Cancelled",
    S.REJECTED: "Not accepted",
    S.REFUND_PENDING: "Refund in process",
}

# The happy path, shown as steps on the tracking page.
MAIN_PATH = [S.SUBMITTED, S.UNDER_REVIEW, S.ACCEPTED, S.ASSIGNED, S.IN_PROGRESS, S.QUALITY_REVIEW, S.COMPLETED]


def allowed_next(req: LegalRequest, user: User, is_requester: bool, is_staff_for_request: bool) -> list[Status]:
    out = []
    for nxt in TRANSITIONS[req.status]:
        if _may(req.status, nxt, user, is_requester, is_staff_for_request):
            out.append(nxt)
    order = list(Status)
    return sorted(out, key=order.index)


def _may(cur: Status, nxt: Status, user: User, is_requester: bool, is_staff_for_request: bool) -> bool:
    if nxt not in TRANSITIONS[cur]:
        return False
    if is_staff_for_request:
        if (cur, nxt) in REVIEWER_ONLY:
            return user.has(Role.ADVOCATE_REVIEWER, Role.ADMIN, Role.SUPER_ADMIN)
        return True
    return is_requester and (cur, nxt) in REQUESTER_ALLOWED


def change_status(
    db: Session, req: LegalRequest, nxt: Status, user: User, *, is_requester: bool, is_staff_for_request: bool, note: str = "", public_note: bool = True
) -> None:
    if not _may(req.status, nxt, user, is_requester, is_staff_for_request):
        raise HTTPException(status_code=409, detail=f"Cannot move from {LABELS[req.status]} to {LABELS[nxt]}.")
    db.add(RequestHistory(request=req, old_status=req.status.value, new_status=nxt.value, note=note, public_note=public_note, changed_by_id=user.id))
    req.status = nxt
