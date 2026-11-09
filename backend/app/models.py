"""Database tables. One PostgreSQL database serves all six branches."""

import enum
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Role(str, enum.Enum):
    CLIENT = "client"  # individual client (every registered person has this)
    LAWYER = "lawyer"
    BUSINESS_CLIENT = "business_client"
    DRAFTING_STAFF = "drafting_staff"
    SUPPORT_STAFF = "support_staff"  # intake and screening; allocates new requests to branches
    ADVOCATE_REVIEWER = "advocate_reviewer"
    BRANCH_MANAGER = "branch_manager"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


STAFF_ROLES = {Role.DRAFTING_STAFF, Role.SUPPORT_STAFF, Role.ADVOCATE_REVIEWER, Role.BRANCH_MANAGER, Role.ADMIN, Role.SUPER_ADMIN}
ADMIN_ROLES = {Role.ADMIN, Role.SUPER_ADMIN}


class Status(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_SCREENING = "UNDER_SCREENING"
    INFORMATION_REQUIRED = "INFORMATION_REQUIRED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    ADVOCATE_REVIEW = "ADVOCATE_REVIEW"
    QUALITY_REVIEW = "QUALITY_REVIEW"
    CLIENT_REVIEW = "CLIENT_REVIEW"
    REVISION_REQUIRED = "REVISION_REQUIRED"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    CANCELLED = "CANCELLED"


class Priority(str, enum.Enum):
    """Set by staff after screening. A working priority, never a legal determination of urgency."""

    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    DEADLINE_SENSITIVE = "deadline_sensitive"


class Audience(str, enum.Enum):
    LAWYER = "lawyer"
    INDIVIDUAL = "individual"
    BUSINESS = "business"


class DocKind(str, enum.Enum):
    """Document status within a request's workspace."""

    ORIGINAL = "original"  # uploaded by the requester
    UNDER_REVIEW = "under_review"
    DRAFT = "draft"
    REVISED_DRAFT = "revised_draft"
    ADVOCATE_REVIEWED = "advocate_reviewed"
    FINAL = "final"
    SUPERSEDED = "superseded"


# Shown to the requester without staff explicitly sharing them. Drafts are shared one by one.
REQUESTER_VISIBLE_KINDS = {DocKind.ORIGINAL, DocKind.UNDER_REVIEW, DocKind.FINAL}


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(254), unique=True, index=True)
    mobile: Mapped[str | None] = mapped_column(String(15), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # bump to sign the user out everywhere
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    roles: Mapped[list["UserRole"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    lawyer_profile: Mapped["LawyerProfile | None"] = relationship(back_populates="user", foreign_keys="LawyerProfile.user_id", cascade="all, delete-orphan", lazy="selectin")
    branch_links: Mapped[list["StaffBranch"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")

    @property
    def role_set(self) -> set[Role]:
        return {r.role for r in self.roles}

    @property
    def branch_ids(self) -> set[int]:
        return {b.branch_id for b in self.branch_links}

    def has(self, *roles: Role) -> bool:
        return bool(self.role_set & set(roles))

    @property
    def is_staff(self) -> bool:
        return bool(self.role_set & STAFF_ROLES)

    @property
    def is_admin(self) -> bool:
        return bool(self.role_set & ADMIN_ROLES)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[Role] = mapped_column(Enum(Role, name="role", native_enum=False, length=32))
    user: Mapped[User] = relationship(back_populates="roles")


class LawyerProfile(Base):
    """Professional details for lawyers who use Legal Core and for advocates in the internal network.
    A submitted enrolment number is only a claim until staff verify it."""

    __tablename__ = "lawyer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enrolment_number: Mapped[str] = mapped_column(String(40), default="")
    state_bar_council: Mapped[str] = mapped_column(String(80), default="")
    verification_status: Mapped[str] = mapped_column(String(20), default=VerificationStatus.PENDING.value)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    verification_note: Mapped[str] = mapped_column(Text, default="")
    practice_location: Mapped[str] = mapped_column(String(120), default="")
    experience_areas: Mapped[str] = mapped_column(Text, default="")
    availability: Mapped[str] = mapped_column(String(30), default="available")  # available | limited | unavailable
    user: Mapped[User] = relationship(back_populates="lawyer_profile", foreign_keys=[user_id])

    @property
    def is_verified(self) -> bool:
        return self.verification_status == VerificationStatus.VERIFIED.value


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    code: Mapped[str] = mapped_column(String(5), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    name_te: Mapped[str] = mapped_column(String(80), default="")
    state: Mapped[str] = mapped_column(String(40))
    address: Mapped[str] = mapped_column(Text, default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    hours: Mapped[str] = mapped_column(String(120), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    # operational = office open to visitors | service_area = served remotely | planned = not yet open
    office_status: Mapped[str] = mapped_column(String(20), default="planned")
    manager_name: Mapped[str] = mapped_column(String(120), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class StaffBranch(Base):
    __tablename__ = "staff_branch_assignments"
    __table_args__ = (UniqueConstraint("user_id", "branch_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), index=True)
    user: Mapped[User] = relationship(back_populates="branch_links")
    branch: Mapped[Branch] = relationship(lazy="joined")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(30))  # drafting | research | documentation | advice | other
    audience: Mapped[str] = mapped_column(String(60))  # comma list of lawyer, individual, business
    fee_text: Mapped[str] = mapped_column(String(60), default="")  # internal only; never shown publicly
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def audiences(self) -> set[str]:
        return {a.strip() for a in self.audience.split(",") if a.strip()}

    @property
    def requires_advocate(self) -> bool:
        """Opinions and consultations must pass through a qualified advocate."""
        return self.category == "advice"


class LegalRequest(Base):
    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    request_number: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    audience: Mapped[Audience] = mapped_column(Enum(Audience, name="audience", native_enum=False, length=16))
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    # Allocated internally by staff. Customers never choose a branch.
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id"), index=True)
    status: Mapped[Status] = mapped_column(Enum(Status, name="status", native_enum=False, length=32), index=True, default=Status.SUBMITTED)
    priority: Mapped[Priority] = mapped_column(Enum(Priority, name="priority", native_enum=False, length=24), default=Priority.NORMAL, index=True)
    service_other: Mapped[str] = mapped_column(String(200), default="")
    organisation: Mapped[str] = mapped_column(String(200), default="")
    opposite_party: Mapped[str] = mapped_column(String(200), default="")

    contact_name: Mapped[str] = mapped_column(String(120))
    contact_phone: Mapped[str] = mapped_column(String(15), index=True)
    contact_email: Mapped[str] = mapped_column(String(254), default="")
    preferred_contact: Mapped[str] = mapped_column(String(30), default="")
    preferred_date: Mapped[date | None] = mapped_column(Date)
    topic: Mapped[str] = mapped_column(String(60), default="")
    message: Mapped[str] = mapped_column(Text)
    # Lawyer matter details
    enrolment_number: Mapped[str] = mapped_column(String(40), default="")
    court: Mapped[str] = mapped_column(String(200), default="")
    case_number: Mapped[str] = mapped_column(String(80), default="")
    needed_by: Mapped[date | None] = mapped_column(Date)
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    service: Mapped[Service] = relationship(lazy="joined")
    branch: Mapped[Branch | None] = relationship(lazy="joined")
    user: Mapped[User | None] = relationship(lazy="joined")
    history: Mapped[list["RequestHistory"]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="RequestHistory.created_at", lazy="selectin"
    )
    assignments: Mapped[list["RequestAssignment"]] = relationship(back_populates="request", cascade="all, delete-orphan", lazy="selectin")
    documents: Mapped[list["Document"]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="Document.created_at", lazy="selectin")
    notes: Mapped[list["RequestNote"]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="RequestNote.created_at", lazy="selectin")


class RequestAssignment(Base):
    __tablename__ = "request_assignments"
    __table_args__ = (UniqueConstraint("request_id", "assignee_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    assignee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    assigned_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    conflict_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    conflict_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[LegalRequest] = relationship(back_populates="assignments")
    assignee: Mapped[User] = relationship(foreign_keys=[assignee_id], lazy="joined")


class RequestHistory(Base):
    __tablename__ = "request_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(32))
    new_status: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text, default="")  # shared with the requester
    public_note: Mapped[bool] = mapped_column(Boolean, default=True)
    internal_note: Mapped[str] = mapped_column(Text, default="")  # staff only
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[LegalRequest] = relationship(back_populates="history")
    changed_by: Mapped[User | None] = relationship(lazy="joined")


class RequestNote(Base):
    """Messages on a request. Internal notes are never shown to the requester."""

    __tablename__ = "request_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    body: Mapped[str] = mapped_column(Text)
    internal: Mapped[bool] = mapped_column(Boolean, default=False)
    kind: Mapped[str] = mapped_column(String(20), default="message")  # message | revision | review | system
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[LegalRequest] = relationship(back_populates="notes")
    author: Mapped[User | None] = relationship(lazy="joined")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    kind: Mapped[DocKind] = mapped_column(Enum(DocKind, name="doc_kind", native_enum=False, length=24), default=DocKind.ORIGINAL)
    version: Mapped[int] = mapped_column(Integer, default=1)
    shared_with_client: Mapped[bool] = mapped_column(Boolean, default=False)
    scan_status: Mapped[str] = mapped_column(String(16), default="not_scanned")  # clean | not_scanned
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[LegalRequest] = relationship(back_populates="documents")
    uploaded_by: Mapped[User | None] = relationship(foreign_keys=[uploaded_by_id], lazy="joined")

    def visible_to_requester(self) -> bool:
        return self.kind in REQUESTER_VISIBLE_KINDS or self.shared_with_client


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    resource_type: Mapped[str] = mapped_column(String(40))
    resource_id: Mapped[str] = mapped_column(String(64))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class TrackingChallenge(Base):
    """One-time code sent to the requester's mobile or email before guest tracking shows anything."""

    __tablename__ = "tracking_challenges"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    channel: Mapped[str] = mapped_column(String(16))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    """Every notification attempt is recorded with its real outcome. Nothing is marked sent unless a provider accepted it."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    request_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    channel: Mapped[str] = mapped_column(String(16))  # in_app | email | sms | whatsapp
    recipient: Mapped[str] = mapped_column(String(254), default="")
    subject: Mapped[str] = mapped_column(String(200), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20))  # delivered | sent | failed | not_configured
    error: Mapped[str] = mapped_column(String(300), default="")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
