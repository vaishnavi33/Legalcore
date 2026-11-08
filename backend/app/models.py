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
    CLIENT = "client"
    LAWYER = "lawyer"
    DRAFTING_STAFF = "drafting_staff"
    ADVOCATE_REVIEWER = "advocate_reviewer"
    BRANCH_MANAGER = "branch_manager"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


STAFF_ROLES = {Role.DRAFTING_STAFF, Role.ADVOCATE_REVIEWER, Role.BRANCH_MANAGER, Role.ADMIN, Role.SUPER_ADMIN}
ADMIN_ROLES = {Role.ADMIN, Role.SUPER_ADMIN}


class Status(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    AWAITING_INFORMATION = "AWAITING_INFORMATION"
    ACCEPTED = "ACCEPTED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    QUALITY_REVIEW = "QUALITY_REVIEW"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    REFUND_PENDING = "REFUND_PENDING"


class Audience(str, enum.Enum):
    LAWYER = "lawyer"
    INDIVIDUAL = "individual"


class DocKind(str, enum.Enum):
    ORIGINAL = "original"  # uploaded by the requester
    WORKING = "working"  # internal drafts
    APPROVED = "approved"  # final, visible to the requester


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
    lawyer_profile: Mapped["LawyerProfile | None"] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
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
    __tablename__ = "lawyer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enrolment_number: Mapped[str] = mapped_column(String(40))
    verification_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | verified | rejected
    user: Mapped[User] = relationship(back_populates="lawyer_profile")


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
    hours: Mapped[str] = mapped_column(String(120), default="Monday to Saturday, 9:30 am to 6:30 pm")
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
    category: Mapped[str] = mapped_column(String(30))  # drafting | research | documentation | advice
    audience: Mapped[str] = mapped_column(String(20))  # lawyer | individual | both
    fee_text: Mapped[str] = mapped_column(String(60), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class LegalRequest(Base):
    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    request_number: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    audience: Mapped[Audience] = mapped_column(Enum(Audience, name="audience", native_enum=False, length=16))
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), index=True)
    status: Mapped[Status] = mapped_column(Enum(Status, name="status", native_enum=False, length=32), index=True, default=Status.SUBMITTED)

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
    branch: Mapped[Branch] = relationship(lazy="joined")
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[LegalRequest] = relationship(back_populates="assignments")
    assignee: Mapped[User] = relationship(foreign_keys=[assignee_id], lazy="joined")


class RequestHistory(Base):
    __tablename__ = "request_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(32))
    new_status: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text, default="")
    public_note: Mapped[bool] = mapped_column(Boolean, default=True)
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
    kind: Mapped[DocKind] = mapped_column(Enum(DocKind, name="doc_kind", native_enum=False, length=16), default=DocKind.ORIGINAL)
    version: Mapped[int] = mapped_column(Integer, default=1)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[LegalRequest] = relationship(back_populates="documents")


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
