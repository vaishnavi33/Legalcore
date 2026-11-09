from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import DB, AdminUser, ManagerUser
from app.models import Branch, Service
from app.schemas import BranchOut, BranchUpdate, ServiceAdminOut, ServiceOut, ServiceUpdate
from app.services.audit import audit
from app.services.permissions import can_manage_branch

router = APIRouter(tags=["catalogue"])


@router.get("/config")
def public_config() -> dict:
    """Settings the website needs to validate forms the same way the server does."""
    from app.core.config import get_settings
    from app.core.security import earliest_needed_by, india_today

    s = get_settings()
    return {
        "demo_mode": s.demo_mode,
        "today_india": india_today().isoformat(),
        "earliest_needed_by": earliest_needed_by().isoformat(),
        "max_upload_mb": s.max_upload_mb,
        "max_files_per_request": s.max_files_per_request,
    }


@router.get("/branches", response_model=list[BranchOut])
def list_branches(db: DB):
    return db.scalars(select(Branch).where(Branch.is_active).order_by(Branch.id)).all()


@router.get("/branches/{slug}", response_model=BranchOut)
def get_branch(slug: str, db: DB):
    b = db.scalar(select(Branch).where(Branch.slug == slug))
    if not b:
        raise HTTPException(404, "Branch not found")
    return b


@router.patch("/admin/branches/{slug}", response_model=BranchOut)
def update_branch(slug: str, body: BranchUpdate, user: ManagerUser, db: DB):
    b = db.scalar(select(Branch).where(Branch.slug == slug))
    if not b:
        raise HTTPException(404, "Branch not found")
    if not can_manage_branch(user, b.id):
        raise HTTPException(403, "You can only edit your own branch.")
    changes = body.model_dump(exclude_unset=True)
    if ("is_active" in changes or "office_status" in changes) and not user.is_admin:
        raise HTTPException(403, "Only administrators can open, close or change the status of a branch.")
    for k, v in changes.items():
        setattr(b, k, v.strip() if isinstance(v, str) else v)
    audit(db, user, "branch.update", "branch", b.slug, **changes)
    db.commit()
    return b


@router.get("/services", response_model=list[ServiceOut])
def list_services(db: DB):
    return db.scalars(select(Service).where(Service.is_active).order_by(Service.id)).all()


@router.get("/services/{slug}", response_model=ServiceOut)
def get_service(slug: str, db: DB):
    s = db.scalar(select(Service).where(Service.slug == slug))
    if not s:
        raise HTTPException(404, "Service not found")
    return s


@router.get("/admin/services", response_model=list[ServiceAdminOut])
def admin_services(user: AdminUser, db: DB):
    return db.scalars(select(Service).order_by(Service.id)).all()


@router.patch("/admin/services/{slug}", response_model=ServiceAdminOut)
def update_service(slug: str, body: ServiceUpdate, user: AdminUser, db: DB):
    s = db.scalar(select(Service).where(Service.slug == slug))
    if not s:
        raise HTTPException(404, "Service not found")
    changes = body.model_dump(exclude_unset=True)
    if s.slug == "other" and changes.get("is_active") is False:
        raise HTTPException(422, "The Other option must stay available on every form.")
    for k, v in changes.items():
        setattr(s, k, v)
    audit(db, user, "service.update", "service", s.slug, **changes)
    db.commit()
    return s
