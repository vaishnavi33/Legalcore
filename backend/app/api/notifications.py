from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.api.deps import DB, CurrentUser
from app.models import LegalRequest, Notification
from app.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def my_notifications(user: CurrentUser, db: DB):
    rows = db.execute(
        select(Notification, LegalRequest.request_number)
        .join(LegalRequest, LegalRequest.id == Notification.request_id, isouter=True)
        .where(Notification.user_id == user.id, Notification.channel == "in_app")
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()
    return [NotificationOut(id=n.id, subject=n.subject, body=n.body, request_number=num, read=n.read_at is not None, at=n.created_at) for n, num in rows]


@router.get("/unread")
def unread_count(user: CurrentUser, db: DB) -> dict:
    n = db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.channel == "in_app", Notification.read_at.is_(None)))
    return {"unread": n or 0}


@router.post("/{nid}/read", status_code=204)
def mark_read(nid: int, user: CurrentUser, db: DB):
    n = db.get(Notification, nid)
    if not n or n.user_id != user.id:
        raise HTTPException(404, "Not found")
    n.read_at = n.read_at or datetime.now(UTC)
    db.commit()


@router.post("/read-all", status_code=204)
def mark_all_read(user: CurrentUser, db: DB):
    for n in db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))):
        n.read_at = datetime.now(UTC)
    db.commit()
