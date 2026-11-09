"""Load branches and services, and create the first super admin.

    python -m app.seed            # safe to run on every deploy
    python -m app.seed --demo     # also add fictional demo staff and dummy requests (never in production)

Demo accounts use the password in DEMO_PASSWORD. If it is not set, a random password is generated and printed to the
server log only, so no demo credential is ever published."""

import os
import secrets
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.security import hash_password, india_today, new_request_number
from app.models import (
    Audience,
    Branch,
    LawyerProfile,
    LegalRequest,
    Priority,
    RequestAssignment,
    RequestHistory,
    Role,
    Service,
    StaffBranch,
    Status,
    User,
    UserRole,
)

# slug, code, name, Telugu name, state. Addresses and phone numbers are entered by an administrator; none are invented.
BRANCHES = [
    ("anantapur", "ATP", "Anantapur", "అనంతపురం", "Andhra Pradesh"),
    ("puttaparthi", "PTP", "Puttaparthi", "పుట్టపర్తి", "Andhra Pradesh"),
    ("vijayawada", "VJA", "Vijayawada", "విజయవాడ", "Andhra Pradesh"),
    ("visakhapatnam", "VSP", "Visakhapatnam", "విశాఖపట్నం", "Andhra Pradesh"),
    ("kurnool", "KNL", "Kurnool", "కర్నూలు", "Andhra Pradesh"),
    ("hyderabad", "HYD", "Hyderabad", "హైదరాబాద్", "Telangana"),
]

L, I, B = "lawyer", "individual", "business"
# slug, name, category, audiences. "advice" services always pass through a verified advocate.
SERVICES = [
    ("case-drafting", "Case Drafting", "drafting", [L]),
    ("legal-research", "Legal Research", "research", [L]),
    ("legal-documentation", "Legal Documentation", "documentation", [L, I, B]),
    ("agreement-drafting", "Agreement Drafting", "drafting", [L, I, B]),
    ("legal-notices", "Legal Notice Assistance", "drafting", [L, I, B]),
    ("document-assistance", "Document Assistance", "documentation", [I]),
    ("advocate-consultation", "Advocate Consultation", "advice", [I, B]),
    ("legal-query", "Legal Consultation Coordination", "advice", [I, B]),
    ("legal-opinion", "Legal Opinion", "advice", [I, B]),
    ("case-preparation", "Case Preparation Assistance", "research", [L]),
    ("document-review", "Document Review", "documentation", [L, I, B]),
    ("property-documentation", "Property Documentation Assistance", "documentation", [I]),
    ("case-documentation", "Case-related Documentation", "documentation", [I]),
    ("business-agreements", "Business Agreements", "drafting", [B]),
    ("contract-drafting", "Contract Drafting Assistance", "drafting", [B]),
    ("employment-documentation", "Employment Documentation", "documentation", [B]),
    ("business-legal-support", "Business Legal Support", "documentation", [B]),
    ("other", "Other", "other", [L, I, B]),
]


def seed_catalogue(db) -> None:
    for slug, code, name, te, state in BRANCHES:
        if not db.scalar(select(Branch).where(Branch.slug == slug)):
            db.add(Branch(slug=slug, code=code, name=name, name_te=te, state=state, office_status="planned"))
    for slug, name, cat, aud in SERVICES:
        s = db.scalar(select(Service).where(Service.slug == slug))
        if not s:
            db.add(Service(slug=slug, name=name, category=cat, audience=",".join(aud)))
        else:  # keep names and audiences in step with the code; fees and on/off stay as the admin set them
            s.name, s.category, s.audience = name, cat, ",".join(aud)
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


def _user(db, pw_hash, name, mobile, email, roles, branches=()):
    u = db.scalar(select(User).where(User.mobile == mobile))
    if u:
        return u
    u = User(name=name, mobile=mobile, email=email, password_hash=pw_hash)
    for r in roles:
        u.roles.append(UserRole(role=r))
    for slug in branches:
        b = db.scalar(select(Branch).where(Branch.slug == slug))
        u.branch_links.append(StaffBranch(branch_id=b.id))
    db.add(u)
    db.flush()
    return u


def seed_demo(db) -> None:
    """Fictional people and dummy matters for the demo site. Mobile numbers 90000000xx are not real."""
    if get_settings().is_production:
        raise SystemExit("Refusing to add demo data in production.")
    password = os.environ.get("DEMO_PASSWORD") or ""
    generated = not password
    if generated:
        password = secrets.token_urlsafe(12)
    pw = hash_password(password)
    existing = db.scalars(select(User).where(User.mobile.like("90000000%"))).all()
    if existing:
        # Replace any earlier, published demo password with the current private one.
        for u in existing:
            u.password_hash = pw
            u.token_version += 1
        rev = next((u for u in existing if u.mobile == "9000000005"), None)
        if rev and not rev.lawyer_profile:
            rev.lawyer_profile = LawyerProfile(
                enrolment_number="DEMO/0000/2010", state_bar_council="Bar Council of Telangana (demo)", verification_status="verified",
                verified_at=datetime.now(UTC), verification_note="Demo record. Not a real advocate.",
            )
        print("Demo users already exist; their password was reset." + (f" New random password: {password}" if generated else ""))
        return
    admin = _user(db, pw, "Demo Admin", "9000000001", "admin@demo.legalcore.example", [Role.ADMIN])
    mgr = _user(db, pw, "Kavitha Rao (demo)", "9000000002", "manager.hyd@demo.legalcore.example", [Role.BRANCH_MANAGER], ["hyderabad"])
    _user(db, pw, "Suresh Naidu (demo)", "9000000003", "manager.knl@demo.legalcore.example", [Role.BRANCH_MANAGER], ["kurnool"])
    drafter = _user(db, pw, "Praveen Kumar (demo)", "9000000004", "drafting@demo.legalcore.example", [Role.DRAFTING_STAFF], ["hyderabad"])
    reviewer = _user(db, pw, "Adv. Lakshmi Prasanna (demo)", "9000000005", "advocate@demo.legalcore.example", [Role.ADVOCATE_REVIEWER])
    reviewer.lawyer_profile = LawyerProfile(
        enrolment_number="DEMO/0000/2010", state_bar_council="Bar Council of Telangana (demo)", verification_status="verified",
        verified_at=datetime.now(UTC), verified_by_id=admin.id, verification_note="Demo record. Not a real advocate.",
        practice_location="Hyderabad", experience_areas="Civil, property, contracts", availability="available",
    )
    client = _user(db, pw, "Ramesh Reddy (demo)", "9000000006", "client@demo.legalcore.example", [Role.CLIENT])
    lawyer = _user(db, pw, "Adv. Srinivas Murthy (demo)", "9000000007", "lawyer@demo.legalcore.example", [Role.CLIENT, Role.LAWYER])
    lawyer.lawyer_profile = LawyerProfile(enrolment_number="DEMO/1234/2012", verification_status="pending")
    _user(db, pw, "Anita Desai (demo)", "9000000008", "support@demo.legalcore.example", [Role.SUPPORT_STAFF])
    biz = _user(db, pw, "Meena Traders (demo)", "9000000009", "business@demo.legalcore.example", [Role.CLIENT, Role.BUSINESS_CLIENT])

    svc = {s.slug: s for s in db.scalars(select(Service))}
    br = {b.slug: b for b in db.scalars(select(Branch))}
    soon = india_today() + timedelta(days=10)

    def req(user, aud, s, b, status, msg, **kw):
        r = LegalRequest(
            request_number=new_request_number(), user_id=user.id, audience=aud, service_id=svc[s].id, branch_id=br[b].id if b else None,
            status=status, contact_name=user.name, contact_phone=user.mobile, contact_email=user.email or "", message=msg, needed_by=soon, **kw,
        )
        path = [Status.SUBMITTED, Status.UNDER_SCREENING, Status.ASSIGNED, Status.IN_PROGRESS, Status.QUALITY_REVIEW, Status.COMPLETED]
        prev = None
        for st in path[: path.index(status) + 1] if status in path else [Status.SUBMITTED, status]:
            r.history.append(RequestHistory(old_status=prev, new_status=st.value, changed_by_id=admin.id))
            prev = st.value
        db.add(r)
        return r

    req(client, Audience.INDIVIDUAL, "advocate-consultation", "hyderabad", Status.UNDER_SCREENING,
        "DEMO: A neighbour has built a wall on part of my plot. I have the sale deed and pattadar passbook.", topic="Land / property", preferred_contact="Phone call")
    req(client, Audience.INDIVIDUAL, "legal-notices", None, Status.SUBMITTED,
        "DEMO: A cheque given to me was returned unpaid last week. I have the bank return memo.", topic="Money / cheque")
    r = req(lawyer, Audience.LAWYER, "case-drafting", "hyderabad", Status.IN_PROGRESS,
            "DEMO: Need a written statement in a suit for declaration and injunction.",
            enrolment_number="DEMO/1234/2012", court="Junior Civil Judge (demo court)", case_number="O.S. No. 000 of 2026", priority=Priority.HIGH)
    r.assignments += [
        RequestAssignment(assignee_id=drafter.id, assigned_by_id=mgr.id, conflict_checked=True),
        RequestAssignment(assignee_id=reviewer.id, assigned_by_id=mgr.id, conflict_checked=True),
    ]
    req(lawyer, Audience.LAWYER, "legal-research", "kurnool", Status.COMPLETED,
        "DEMO: Research on limitation for filing a revision against an interlocutory order.", enrolment_number="DEMO/1234/2012")
    req(biz, Audience.BUSINESS, "employment-documentation", None, Status.SUBMITTED,
        "DEMO: We need an appointment letter template and a simple leave policy for 12 staff.", organisation="Meena Traders (demo)")
    db.flush()
    if generated:
        print(f"Demo users added with a random password (not stored anywhere else): {password}")
    else:
        print("Demo users added. Password is the DEMO_PASSWORD you set.")


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
