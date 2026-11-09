"""Notifications. Each attempt is stored with its true result. When a provider is not configured the attempt is
recorded as `not_configured`; it is never reported to anyone as sent."""

import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import LegalRequest, Notification


def _send_email(to: str, subject: str, body: str) -> tuple[str, str]:
    s = get_settings()
    if not s.email_configured:
        return "not_configured", "Email is not set up"
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = s.smtp_from, to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=10) as smtp:
            if s.smtp_starttls:
                smtp.starttls()
            if s.smtp_user:
                smtp.login(s.smtp_user, s.smtp_password)
            smtp.send_message(msg)
        return "sent", ""
    except (OSError, smtplib.SMTPException) as e:
        return "failed", str(e)[:300]


def _send_sms(to: str, body: str) -> tuple[str, str]:
    # An Indian SMS gateway needs DLT-registered sender IDs and templates. Until one is integrated we say so.
    return "not_configured", "SMS is not set up"


def _send_whatsapp(to: str, body: str) -> tuple[str, str]:
    return "not_configured", "WhatsApp Business is not set up"


def send(db: Session, channel: str, recipient: str, subject: str, body: str, *, request: LegalRequest | None = None, user_id=None) -> Notification:
    if channel == "in_app":
        status, error = "delivered", ""
    elif not recipient:
        status, error = "failed", "No address"
    elif channel == "email":
        status, error = _send_email(recipient, subject, body)
    elif channel == "sms":
        status, error = _send_sms(recipient, body)
    elif channel == "whatsapp":
        status, error = _send_whatsapp(recipient, body)
    else:
        raise ValueError(channel)
    n = Notification(
        channel=channel, recipient=recipient, subject=subject, body=body, status=status, error=error, request_id=request.id if request else None, user_id=user_id
    )
    db.add(n)
    return n


def notify_requester(db: Session, req: LegalRequest, subject: str, body: str, *, sms: bool = False) -> list[Notification]:
    """Tell the person who sent a request about an update, on every channel we can."""
    out = []
    if req.user_id:
        out.append(send(db, "in_app", "", subject, body, request=req, user_id=req.user_id))
    if req.contact_email:
        out.append(send(db, "email", req.contact_email, subject, body, request=req))
    if sms:
        out.append(send(db, "sms", req.contact_phone, subject, body, request=req))
    return out


def delivered(ns: list[Notification]) -> list[str]:
    """Channels that actually went out (in-app always counts)."""
    return [n.channel for n in ns if n.status in ("sent", "delivered")]
