"""Guest tracking. The reference number and mobile number only start the check; nothing about the request is shown
until the one-time code sent to the requester's own mobile or email is entered."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, File, Header, HTTPException, Request, UploadFile
from sqlalchemy import select

from app.api.deps import DB
from app.api.requests import _serve, store_files
from app.api.serializers import history_out
from app.core.config import get_settings
from app.core.ratelimit import client_ip, limiter
from app.core.security import create_scoped_token, decode_scoped_token, hash_otp, new_otp, otp_matches
from app.models import DocKind, LegalRequest, Status, TrackingChallenge
from app.schemas import DocumentOut, TrackOut, TrackStart, TrackStarted, TrackStep, TrackVerify
from app.services import notify
from app.services.audit import audit
from app.services.workflow import EXPLAIN, LABELS, MAIN_PATH, POSITION

router = APIRouter(prefix="/track", tags=["tracking"])

NOT_FOUND = "We could not find a request with that reference number and mobile number."


def _mask_phone(p: str) -> str:
    return f"mobile ending {p[-4:]}"


def _mask_email(e: str) -> str:
    name, _, domain = e.partition("@")
    return f"email {name[:2]}…@{domain}"


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def track_out(r: LegalRequest, token: str = "") -> TrackOut:
    pos = POSITION.get(r.status, -1)
    steps = []
    for i, s in enumerate(MAIN_PATH):
        state = "done" if i < pos or (i == pos and r.status == Status.COMPLETED) else "current" if i == pos else "todo"
        label = LABELS[r.status] if (i == pos and r.status != s) else LABELS[s]
        steps.append(TrackStep(status=r.status if i == pos else s, label=label, state=state))
    return TrackOut(
        request_number=r.request_number,
        service=r.service.name,
        status=r.status,
        status_label=LABELS[r.status],
        status_explain=EXPLAIN[r.status],
        created_at=r.created_at,
        steps=steps,
        updates=history_out(r, include_internal=False),
        files_received=sum(1 for d in r.documents if d.kind == DocKind.ORIGINAL),
        token=token,
    )


@router.post("/start", response_model=TrackStarted)
def start(body: TrackStart, request: Request, db: DB):
    s = get_settings()
    ip = client_ip(request)
    limiter.check(f"track:{ip}", s.rate_limit_track_per_min)
    r = db.scalar(select(LegalRequest).where(LegalRequest.request_number == body.request_number))
    if not r or r.contact_phone != body.phone:
        raise HTTPException(404, NOT_FOUND)
    limiter.check(f"otp:{r.request_number}", s.rate_limit_otp_per_hour, window=3600)
    code = new_otp()
    ch = TrackingChallenge(request_id=r.id, channel="sms", code_hash="", expires_at=datetime.now(UTC) + timedelta(minutes=s.otp_minutes))
    db.add(ch)
    db.flush()
    ch.code_hash = hash_otp(code, str(ch.id))
    text = f"Your Legal Core verification code for {r.request_number} is {code}. It expires in {s.otp_minutes} minutes. Do not share it."
    sent = [notify.send(db, "sms", r.contact_phone, "Legal Core verification code", text, request=r)]
    if r.contact_email:
        sent.append(notify.send(db, "email", r.contact_email, "Legal Core verification code", text, request=r))
    # Never store the code itself in the notification log.
    for n in sent:
        n.body = n.body.replace(code, "••••••")
    ok = [n for n in sent if n.status == "sent"]
    sent_to = [_mask_phone(n.recipient) if n.channel == "sms" else _mask_email(n.recipient) for n in ok]
    demo_code = None
    if not ok:
        if not s.demo_mode:
            db.commit()
            raise HTTPException(503, "We could not send a verification code right now. Please contact Legal Core to check your request.")
        demo_code = code  # demo only: no SMS or email provider is connected
    ch.channel = ",".join(n.channel for n in ok) or "demo"
    audit(db, None, "track.code_sent", "request", r.request_number, ip, channels=ch.channel)
    db.commit()
    return TrackStarted(challenge_id=ch.id, sent_to=sent_to, expires_in=s.otp_minutes * 60, demo_code=demo_code)


@router.post("/verify", response_model=TrackOut)
def verify(body: TrackVerify, request: Request, db: DB):
    s = get_settings()
    ip = client_ip(request)
    limiter.check(f"track:{ip}", s.rate_limit_track_per_min)
    ch = db.get(TrackingChallenge, body.challenge_id)
    if not ch or ch.verified_at or _aware(ch.expires_at) < datetime.now(UTC) or ch.attempts >= s.otp_max_attempts:
        raise HTTPException(410, "This code has expired. Please ask for a new one.")
    ch.attempts += 1
    if not otp_matches(body.code, str(ch.id), ch.code_hash):
        db.commit()
        left = s.otp_max_attempts - ch.attempts
        raise HTTPException(422, f"That code is not right. {left} attempt{'s' if left != 1 else ''} left." if left else "Too many wrong codes. Please ask for a new one.")
    ch.verified_at = datetime.now(UTC)
    r = db.get(LegalRequest, ch.request_id)
    audit(db, None, "track.verified", "request", r.request_number, ip)
    db.commit()
    token = create_scoped_token("track", str(r.id), s.track_session_minutes)
    return track_out(r, token)


def _session(db, token: str | None) -> LegalRequest:
    data = decode_scoped_token(token or "", "track")
    r = db.get(LegalRequest, uuid.UUID(data["sub"])) if data else None
    if not r:
        raise HTTPException(401, "Your tracking session has ended. Please verify again.")
    return r


TrackToken = Annotated[str | None, Header(alias="X-Track-Token")]


@router.get("/session", response_model=TrackOut)
def session(db: DB, x_track_token: TrackToken = None):
    return track_out(_session(db, x_track_token), x_track_token or "")


@router.get("/documents", response_model=list[DocumentOut])
def documents(db: DB, x_track_token: TrackToken = None):
    r = _session(db, x_track_token)
    return [
        DocumentOut(
            id=d.id, filename=d.filename, size=d.size, kind=d.kind, version=d.version, shared_with_client=d.shared_with_client,
            scan_status=d.scan_status, uploaded_by=None, from_requester=d.kind == DocKind.ORIGINAL, at=d.created_at,
        )
        for d in r.documents
        if d.visible_to_requester()
    ]


@router.get("/documents/{doc_id}")
def download(doc_id: uuid.UUID, request: Request, db: DB, x_track_token: TrackToken = None):
    r = _session(db, x_track_token)
    d = next((d for d in r.documents if d.id == doc_id and d.visible_to_requester()), None)
    if not d:
        raise HTTPException(404, "Document not found")
    audit(db, None, "document.download", "document", str(d.id), client_ip(request), request=r.request_number, via="guest-tracking")
    db.commit()
    return _serve(d, inline=False)


@router.post("/documents", response_model=TrackOut)
async def upload(request: Request, db: DB, files: Annotated[list[UploadFile], File()], x_track_token: TrackToken = None):
    """Guests can send documents they did not have when they first submitted."""
    r = _session(db, x_track_token)
    limiter.check(f"guest-upload:{r.id}", 20, window=3600)
    added = await store_files(db, r, files, None, DocKind.ORIGINAL)
    if not added:
        raise HTTPException(422, "Please choose at least one file.")
    audit(db, None, "request.guest_upload", "request", r.request_number, client_ip(request), files=len(added))
    db.commit()
    db.refresh(r)
    return track_out(r, x_track_token or "")
