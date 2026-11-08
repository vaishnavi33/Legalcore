"""Load branches and services, and create the first super admin.

    python -m app.seed            # safe to run on every deploy
    python -m app.seed --demo     # also add demo staff and sample requests (never in production)
"""

import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.security import hash_password, new_request_number
from app.models import (
    Audience,
    Branch,
    LawyerProfile,
    LegalRequest,
    RequestAssignment,
    RequestHistory,
    Role,
    Service,
    StaffBranch,
    Status,
    User,
    UserRole,
)

BRANCHES = [
    ("anantapur", "ATP", "Anantapur", "అనంతపురం", "Andhra Pradesh"),
    ("puttaparthi", "PTP", "Puttaparthi", "పుట్టపర్తి", "Andhra Pradesh"),
    ("vijayawada", "VJA", "Vijayawada", "విజయవాడ", "Andhra Pradesh"),
    ("visakhapatnam", "VSP", "Visakhapatnam", "విశాఖపట్నం", "Andhra Pradesh"),
    ("kurnool", "KNL", "Kurnool", "కర్నూలు", "Andhra Pradesh"),
    ("hyderabad", "HYD", "Hyderabad", "హైదరాబాద్", "Telangana"),
]

SERVICES = [
    ("case-drafting", "Case Drafting", "drafting", "lawyer"),
    ("legal-research", "Legal Research", "research", "lawyer"),
    ("legal-documentation", "Legal Documentation", "documentation", "both"),
    ("agreement-drafting", "Agreement Drafting", "drafting", "both"),
    ("legal-notices", "Legal Notices", "drafting", "both"),
    ("document-assistance", "Document Assistance", "documentation", "individual"),
    ("advocate-consultation", "Advocate Consultation", "advice", "individual"),
    ("legal-query", "Legal Query", "advice", "individual"),
]


def seed_catalogue(db) -> None:
    for slug, code, name, te, state in BRANCHES:
        if not db.scalar(select(Branch).where(Branch.slug == slug)):
            db.add(Branch(slug=slug, code=code, name=name, name_te=te, state=state))
    for slug, name, cat, aud in SERVICES:
        if not db.scalar(select(Service).where(Service.slug == slug)):
            db.add(Service(slug=slug, name=name, category=cat, audience=aud))
    db.flush()


def seed_admin(db) -> None:
    s = get_settings()
    has_admin = db.scalar(select(UserRole).where(UserRole.role == Role.SUPER_ADMIN))
    if has_admin:
        return
    if not s.admin_password:
        print("No super admin yet. Set ADMIN_EMAIL and ADMIN_PASSWORD and run this again.")
        return
    u = User(name=s.admin_name, email=s.admin_email.lower(), password_hash=hash_password(s.admin_password))
    u.roles += [UserRole(role=Role.SUPER_ADMIN), UserRole(role=Role.ADMIN)]
    db.add(u)
    print(f"Created super admin {s.admin_email}")


DEMO_PASSWORD = "Demo@12345"


def _user(db, name, mobile, email, roles, branches=()):
    u = db.scalar(select(User).where(User.mobile == mobile))
    if u:
        return u
    u = User(name=name, mobile=mobile, email=email, password_hash=hash_password(DEMO_PASSWORD))
    for r in roles:
        u.roles.append(UserRole(role=r))
    for slug in branches:
        b = db.scalar(select(Branch).where(Branch.slug == slug))
        u.branch_links.append(StaffBranch(branch_id=b.id))
    db.add(u)
    db.flush()
    return u


def seed_demo(db) -> None:
    if get_settings().is_production:
        raise SystemExit("Refusing to add demo data in production.")
    admin = _user(db, "Demo Admin", "9000000001", "admin@demo.legalcore.in", [Role.ADMIN])
    mgr = _user(db, "Kavitha Rao", "9000000002", "manager.hyd@demo.legalcore.in", [Role.BRANCH_MANAGER], ["hyderabad"])
    _user(db, "Suresh Naidu", "9000000003", "manager.knl@demo.legalcore.in", [Role.BRANCH_MANAGER], ["kurnool"])
    drafter = _user(db, "Praveen Kumar", "9000000004", "drafting@demo.legalcore.in", [Role.DRAFTING_STAFF], ["hyderabad"])
    reviewer = _user(db, "Adv. Lakshmi Prasanna", "9000000005", "advocate@demo.legalcore.in", [Role.ADVOCATE_REVIEWER])
    client = _user(db, "Ramesh Reddy", "9000000006", "client@demo.legalcore.in", [Role.CLIENT])
    lawyer = _user(db, "Adv. Srinivas Murthy", "9000000007", "lawyer@demo.legalcore.in", [Role.CLIENT, Role.LAWYER])
    if not lawyer.lawyer_profile:
        lawyer.lawyer_profile = LawyerProfile(enrolment_number="TS/1234/2012", verification_status="verified")
    if db.scalar(select(LegalRequest).where(LegalRequest.user_id == client.id)):
        db.flush()
        return
    svc = {s.slug: s for s in db.scalars(select(Service))}
    br = {b.slug: b for b in db.scalars(select(Branch))}

    def req(user, aud, s, b, status, msg, **kw):
        r = LegalRequest(
            request_number=new_request_number(br[b].code), user_id=user.id, audience=aud, service_id=svc[s].id, branch_id=br[b].id,
            status=status, contact_name=user.name, contact_phone=user.mobile, contact_email=user.email or "", message=msg, **kw,
        )
        path = [Status.SUBMITTED, Status.UNDER_REVIEW, Status.ACCEPTED, Status.ASSIGNED, Status.IN_PROGRESS, Status.QUALITY_REVIEW, Status.APPROVED, Status.COMPLETED]
        prev = None
        for st in path[: path.index(status) + 1] if status in path else [Status.SUBMITTED, status]:
            r.history.append(RequestHistory(old_status=prev, new_status=st.value, changed_by_id=admin.id))
            prev = st.value
        db.add(r)
        return r

    req(client, Audience.INDIVIDUAL, "advocate-consultation", "hyderabad", Status.UNDER_REVIEW,
        "My neighbour has built a wall on part of my plot. I have the sale deed and pattadar passbook.", topic="Land / property", preferred_contact="Phone call")
    req(client, Audience.INDIVIDUAL, "legal-notices", "hyderabad", Status.SUBMITTED,
        "A cheque for Rs 1,50,000 given to me bounced last week. I have the bank return memo.", topic="Money / cheque")
    r = req(lawyer, Audience.LAWYER, "case-drafting", "hyderabad", Status.IN_PROGRESS,
            "Need a written statement in a suit for declaration and injunction. Plaint copy attached at branch.",
            enrolment_number="TS/1234/2012", court="Junior Civil Judge, Ranga Reddy District", case_number="O.S. No. 412 of 2026")
    r.assignments += [RequestAssignment(assignee_id=drafter.id, assigned_by_id=mgr.id), RequestAssignment(assignee_id=reviewer.id, assigned_by_id=mgr.id)]
    req(lawyer, Audience.LAWYER, "legal-research", "kurnool", Status.COMPLETED,
        "Research on limitation for filing a revision against an interlocutory order.", enrolment_number="TS/1234/2012", court="High Court of Andhra Pradesh")
    db.flush()
    print(f"Demo users added. Password for all: {DEMO_PASSWORD}")


def main() -> None:
    with SessionLocal() as db:
        seed_catalogue(db)
        seed_admin(db)
        if "--demo" in sys.argv:
            seed_demo(db)
        db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    main()
