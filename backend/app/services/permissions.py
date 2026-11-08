"""Object-level access rules. Menus are hidden in the website too, but these checks are what actually protect data."""

from sqlalchemy import Select, false, or_, select

from app.models import LegalRequest, RequestAssignment, Role, User


def is_requester(user: User | None, req: LegalRequest) -> bool:
    return user is not None and req.user_id == user.id


def is_assigned(user: User, req: LegalRequest) -> bool:
    return any(a.assignee_id == user.id for a in req.assignments)


def staff_can_access(user: User | None, req: LegalRequest) -> bool:
    """Admins see everything. Branch managers and drafting staff see their own branches.
    Advocate reviewers see what is assigned to them. Nobody sees another branch's matters by default."""
    if user is None or not user.is_active:
        return False
    if user.is_admin:
        return True
    if user.has(Role.BRANCH_MANAGER, Role.DRAFTING_STAFF) and req.branch_id in user.branch_ids:
        return True
    if user.is_staff and is_assigned(user, req):
        return True
    return False


def can_view(user: User | None, req: LegalRequest) -> bool:
    return is_requester(user, req) or staff_can_access(user, req)


def can_manage_branch(user: User, branch_id: int) -> bool:
    return user.is_admin or (user.has(Role.BRANCH_MANAGER) and branch_id in user.branch_ids)


def visible_requests_query(user: User, scope: str) -> Select:
    """scope = 'mine' (requests I sent) or 'work' (requests I handle)."""
    q = select(LegalRequest)
    if scope == "mine":
        return q.where(LegalRequest.user_id == user.id)
    if user.is_admin:
        return q
    conds = []
    if user.has(Role.BRANCH_MANAGER, Role.DRAFTING_STAFF) and user.branch_ids:
        conds.append(LegalRequest.branch_id.in_(user.branch_ids))
    if user.is_staff:
        conds.append(LegalRequest.id.in_(select(RequestAssignment.request_id).where(RequestAssignment.assignee_id == user.id)))
    return q.where(or_(*conds)) if conds else q.where(false())
