from sqlalchemy.orm import Session

from app.models import AuditLog, User


def audit(db: Session, actor: User | None, action: str, resource_type: str, resource_id: str, ip: str = "", **detail) -> None:
    db.add(AuditLog(actor_id=actor.id if actor else None, action=action, resource_type=resource_type, resource_id=str(resource_id), detail=detail, ip=ip))
