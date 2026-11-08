from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.api.deps import DB
from app.api.serializers import history_out
from app.core.config import get_settings
from app.core.ratelimit import client_ip, limiter
from app.models import LegalRequest, Status
from app.schemas import TrackIn, TrackOut, TrackStep
from app.services.workflow import LABELS, MAIN_PATH

router = APIRouter(tags=["tracking"])

# Where each status sits on the simple step bar shown to the public.
_POSITION = {
    Status.SUBMITTED: 0,
    Status.UNDER_REVIEW: 1,
    Status.AWAITING_INFORMATION: 1,
    Status.ON_HOLD: 1,
    Status.ACCEPTED: 2,
    Status.PAYMENT_PENDING: 2,
    Status.ASSIGNED: 3,
    Status.IN_PROGRESS: 4,
    Status.REVISION_REQUESTED: 4,
    Status.QUALITY_REVIEW: 5,
    Status.APPROVED: 5,
    Status.COMPLETED: 6,
}


@router.post("/track", response_model=TrackOut)
def track(body: TrackIn, request: Request, db: DB):
    """Public status check with request number + mobile number. Shows status only, never case details."""
    limiter.check(f"track:{client_ip(request)}", get_settings().rate_limit_track_per_min)
    r = db.scalar(select(LegalRequest).where(LegalRequest.request_number == body.request_number))
    if not r or r.contact_phone != body.phone:
        raise HTTPException(404, "We could not find a request with that number and mobile number.")
    pos = _POSITION.get(r.status, -1)
    steps = []
    for i, s in enumerate(MAIN_PATH):
        state = "done" if i < pos or (i == pos and r.status == Status.COMPLETED) else "current" if i == pos else "todo"
        label = LABELS[r.status] if (i == pos and r.status != s) else LABELS[s]
        steps.append(TrackStep(status=r.status if i == pos else s, label=label, state=state))
    return TrackOut(
        request_number=r.request_number,
        service=r.service.name,
        branch=r.branch.name,
        status=r.status,
        status_label=LABELS[r.status],
        created_at=r.created_at,
        steps=steps,
        updates=history_out(r, include_internal=False),
    )
