"""Object-level access rules. Menus are hidden in the website too, but these checks are what actually protect data.

- Administrators see every request.
- Support staff screen new requests that have not been allocated to a branch yet.
- Branch managers, drafting staff and support staff see their own branches only. Access to another branch is granted
  explicitly by an administrator (adding that branch to the person), which is recorded in the audit log.
- Advocate reviewers and other staff see what is assigned to them."""

from sqlalchemy import Select, false, or_, select

from app.models import LegalRequest, RequestAssignment, Role, User

BRANCH_ROLES = (Role.BRANCH_MANAGER, Role.DRAFTING_STAFF, Role.SUPPORT_STAFF)


def is_requester(user: User | None, req: LegalRequest) -> bool:
    return user is not None and req.user_id == user.id


def is_assigned(user: User, req: LegalRequest) -> bool:
    return any(a.assignee_id == user.id for a in req.assignments)


def can_allocate(user: User) -> bool:
    return user.is_admin or user.has(Role.SUPPORT_STAFF)


def staff_can_access(user: User | None, req: LegalRequest) -> bool:
    if user is None or not user.is_active or not user.is_staff:
        return False
    if user.is_admin:
        return True
    if req.branch_id is None and user.has(Role.SUPPORT_STAFF):
        return True
    if req.branch_id is not None and user.has(*BRANCH_ROLES) and req.branch_id in user.branch_ids:
        return True
    return is_assigned(user, req)


def can_view(user: User | None, req: LegalRequest) -> bool:
    return is_requester(user, req) or staff_can_access(user, req)


def can_manage_branch(user: User, branch_id: int | None) -> bool:
    if user.is_admin:
        return True
    return branch_id is not None and user.has(Role.BRANCH_MANAGER) and branch_id in user.branch_ids


def can_manage_request(user: User, req: LegalRequest) -> bool:
    """Assign, transfer and set priority."""
    if req.branch_id is None:
        return can_allocate(user)
    return can_manage_branch(user, req.branch_id)


def visible_requests_query(user: User, scope: str) -> Select:
    """scope = 'mine' (requests I sent) or 'work' (requests I handle)."""
    q = select(LegalRequest)
    if scope == "mine":
        return q.where(LegalRequest.user_id == user.id)
    if user.is_admin:
        return q
    conds = []
    if user.has(Role.SUPPORT_STAFF):
        conds.append(LegalRequest.branch_id.is_(None))
    if user.has(*BRANCH_ROLES) and user.branch_ids:
        conds.append(LegalRequest.branch_id.in_(user.branch_ids))
    if user.is_staff:
        conds.append(LegalRequest.id.in_(select(RequestAssignment.request_id).where(RequestAssignment.assignee_id == user.id)))
    return q.where(or_(*conds)) if conds else q.where(false())
