from datetime import UTC, datetime, timedelta
from typing import Annotated
import uuid

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, or_, select

from app.api.deps import DB, AdminUser, ManagerUser, StaffUser
from app.api.serializers import user_out
from app.core.ratelimit import client_ip
from app.core.security import hash_password
from app.models import (
    AuditLog,
    Branch,
    LawyerProfile,
    LegalRequest,
    Role,
    Service,
    StaffBranch,
    Status,
    User,
    UserRole,
)
from app.schemas import AuditOut, CountRow, ReportOut, StaffCreate, UserList, UserOut, UserUpdate
from app.services.audit import audit
from app.services.workflow import LABELS

router = APIRouter(prefix="/admin", tags=["admin"])

OPEN = [s for s in Status if s not in (Status.COMPLETED, Status.CANCELLED, Status.REJECTED, Status.REFUND_PENDING)]


def _branches(db, slugs: list[str]) -> list[Branch]:
    rows = db.scalars(select(Branch).where(Branch.slug.in_(slugs))).all()
    if len(rows) != len(set(slugs)):
        raise HTTPException(422, "Unknown branch")
    return list(rows)


def _guard_roles(actor: User, roles: list[Role]) -> None:
    if Role.SUPER_ADMIN in roles and not actor.has(Role.SUPER_ADMIN):
        raise HTTPException(403, "Only a super admin can grant super admin.")


@router.get("/staff", response_model=list[UserOut])
def staff_for_assignment(user: StaffUser, db: DB, branch: str | None = None):
    """People who can be assigned to a request, for the assignment dropdown."""
    stmt = select(User).join(UserRole).where(User.is_active, UserRole.role.in_([Role.DRAFTING_STAFF, Role.ADVOCATE_REVIEWER, Role.BRANCH_MANAGER])).distinct()
    rows = db.scalars(stmt.order_by(User.name)).unique().all()
    if branch:
        b = db.scalar(select(Branch).where(Branch.slug == branch))
        # Advocate reviewers often cover several branches, so they are always listed.
        rows = [u for u in rows if (b and b.id in u.branch_ids) or u.has(Role.ADVOCATE_REVIEWER)]
    return [user_out(u) for u in rows]


@router.get("/users", response_model=UserList)
def list_users(
    user: ManagerUser,
    db: DB,
    q: Annotated[str | None, Query(max_length=60)] = None,
    role: Role | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
):
    stmt = select(User)
    if not user.is_admin:  # branch managers see staff of their branches
        stmt = stmt.where(User.id.in_(select(StaffBranch.user_id).where(StaffBranch.branch_id.in_(user.branch_ids))))
    if role:
        stmt = stmt.where(User.id.in_(select(UserRole.user_id).where(UserRole.role == role)))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.name.ilike(like), User.email.ilike(like), User.mobile.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(User.created_at.desc()).offset((page - 1) * 50).limit(50)).unique().all()
    return UserList(items=[user_out(u) for u in rows], total=total)


@router.post("/users", response_model=UserOut, status_code=201)
def create_staff(body: StaffCreate, actor: AdminUser, db: DB, request: Request):
    _guard_roles(actor, body.roles)
    email = body.email.lower() if body.email else None
    if db.scalar(select(User).where(or_(User.mobile == body.mobile, *( [User.email == email] if email else [] )))):
        raise HTTPException(409, "A user with this mobile number or email already exists.")
    u = User(name=body.name, mobile=body.mobile, email=email, password_hash=hash_password(body.password))
    for r in set(body.roles) or {Role.DRAFTING_STAFF}:
        u.roles.append(UserRole(role=r))
    for b in _branches(db, body.branches):
        u.branch_links.append(StaffBranch(branch_id=b.id))
    db.add(u)
    db.flush()
    audit(db, actor, "user.create", "user", str(u.id), client_ip(request), roles=[r.value for r in body.roles], branches=body.branches)
    db.commit()
    db.refresh(u)
    return user_out(u)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, body: UserUpdate, actor: AdminUser, db: DB, request: Request):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if u.has(Role.SUPER_ADMIN) and not actor.has(Role.SUPER_ADMIN):
        raise HTTPException(403, "Only a super admin can change a super admin.")
    changes = body.model_dump(exclude_unset=True)
    if body.roles is not None:
        _guard_roles(actor, body.roles)
        if u.id == actor.id and not (set(body.roles) & {Role.ADMIN, Role.SUPER_ADMIN}):
            raise HTTPException(422, "You cannot remove your own admin access.")
        u.roles.clear()
        db.flush()
        for r in set(body.roles):
            u.roles.append(UserRole(role=r))
        u.token_version += 1  # new permissions take effect at next sign in
    if body.branches is not None:
        u.branch_links.clear()
        db.flush()
        for b in _branches(db, body.branches):
            u.branch_links.append(StaffBranch(branch_id=b.id))
    if body.is_active is not None:
        if u.id == actor.id and not body.is_active:
            raise HTTPException(422, "You cannot deactivate your own account.")
        u.is_active = body.is_active
        u.token_version += 1
    if body.lawyer_status is not None:
        if not u.lawyer_profile:
            raise HTTPException(422, "This user has no lawyer profile.")
        u.lawyer_profile.verification_status = body.lawyer_status
    audit(db, actor, "user.update", "user", str(u.id), client_ip(request), **{k: (v if not isinstance(v, list) else [str(x) for x in v]) for k, v in changes.items()})
    db.commit()
    db.refresh(u)
    return user_out(u)


@router.get("/reports", response_model=ReportOut)
def reports(user: ManagerUser, db: DB):
    base = select(LegalRequest)
    if not user.is_admin:
        base = base.where(LegalRequest.branch_id.in_(user.branch_ids or {-1}))
    sub = base.subquery()

    def count(where=None) -> int:
        st = select(func.count()).select_from(sub)
        if where is not None:
            st = st.where(where)
        return db.scalar(st) or 0

    by_status = db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all()
    by_branch = db.execute(select(Branch.slug, Branch.name, func.count(sub.c.id)).join(sub, sub.c.branch_id == Branch.id, isouter=True).group_by(Branch.id).order_by(Branch.id)).all()
    by_service = db.execute(select(Service.slug, Service.name, func.count(sub.c.id)).join(sub, sub.c.service_id == Service.id, isouter=True).group_by(Service.id).order_by(Service.id)).all()
    if not user.is_admin:
        by_branch = [r for r in by_branch if r[0] in {b.branch.slug for b in user.branch_links}]
    status_map = {Status(s) if not isinstance(s, Status) else s: c for s, c in by_status}
    since = datetime.now(UTC) - timedelta(days=30)
    return ReportOut(
        total=count(),
        open=count(sub.c.status.in_(OPEN)),
        completed=status_map.get(Status.COMPLETED, 0),
        last_30_days=count(sub.c.created_at >= since),
        by_status=[CountRow(key=s.value, label=LABELS[s], count=status_map.get(s, 0)) for s in Status if status_map.get(s, 0)],
        by_branch=[CountRow(key=a, label=b, count=c) for a, b, c in by_branch],
        by_service=[CountRow(key=a, label=b, count=c) for a, b, c in by_service],
    )


@router.get("/audit-logs", response_model=list[AuditOut])
def audit_logs(user: AdminUser, db: DB, page: Annotated[int, Query(ge=1)] = 1, action: str | None = None):
    stmt = select(AuditLog, User.name).join(User, User.id == AuditLog.actor_id, isouter=True)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    rows = db.execute(stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * 100).limit(100)).all()
    return [AuditOut(id=a.id, actor=n, action=a.action, resource_type=a.resource_type, resource_id=a.resource_id, detail=a.detail or {}, ip=a.ip, at=a.created_at) for a, n in rows]


@router.get("/lawyers/pending", response_model=list[UserOut])
def pending_lawyers(user: AdminUser, db: DB):
    rows = db.scalars(select(User).join(LawyerProfile).where(LawyerProfile.verification_status == "pending").order_by(User.created_at)).unique().all()
    return [user_out(u) for u in rows]
