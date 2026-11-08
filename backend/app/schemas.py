import re
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import Audience, Role, Status


def normalize_mobile(v: str) -> str:
    digits = re.sub(r"\D", "", v or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return digits


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    mobile: str
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)

    @field_validator("mobile")
    @classmethod
    def _m(cls, v: str) -> str:
        return normalize_mobile(v)

    @field_validator("name")
    @classmethod
    def _n(cls, v: str) -> str:
        return v.strip()


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=254, description="Mobile number or email")
    password: str = Field(min_length=1, max_length=128)


class BranchBrief(ORM):
    id: int
    slug: str
    code: str
    name: str


class UserOut(ORM):
    id: uuid.UUID
    name: str
    email: str | None
    mobile: str | None
    roles: list[Role]
    branches: list[BranchBrief]
    lawyer_status: str | None = None
    enrolment_number: str | None = None
    is_active: bool = True


# ---------- catalogue ----------
class BranchOut(ORM):
    id: int
    slug: str
    code: str
    name: str
    name_te: str
    state: str
    address: str
    phone: str
    email: str
    hours: str


class BranchUpdate(BaseModel):
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    hours: str | None = None
    is_active: bool | None = None


class ServiceOut(ORM):
    id: int
    slug: str
    name: str
    category: str
    audience: str
    fee_text: str


class ServiceUpdate(BaseModel):
    fee_text: str | None = Field(default=None, max_length=60)
    is_active: bool | None = None


# ---------- requests ----------
class RequestCreate(BaseModel):
    audience: Audience
    service: str
    branch: str
    name: str = Field(min_length=2, max_length=120)
    phone: str
    email: EmailStr | None = None
    message: str = Field(min_length=5, max_length=8000)
    preferred_contact: str = Field(default="", max_length=30)
    preferred_date: date | None = None
    topic: str = Field(default="", max_length=60)
    enrolment_number: str = Field(default="", max_length=40)
    court: str = Field(default="", max_length=200)
    case_number: str = Field(default="", max_length=80)
    needed_by: date | None = None
    consent: bool

    @field_validator("phone")
    @classmethod
    def _p(cls, v: str) -> str:
        return normalize_mobile(v)

    @field_validator("consent")
    @classmethod
    def _c(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Consent is required so we can contact you")
        return v


class RequestCreated(BaseModel):
    request_number: str
    status_label: str
    service: str
    branch: str
    branch_phone: str
    files_received: int
    linked_to_account: bool


class HistoryOut(ORM):
    old_status: str | None
    new_status: str
    label: str
    note: str
    at: datetime
    by: str | None = None


class NoteOut(BaseModel):
    id: int
    body: str
    internal: bool
    author: str | None
    from_staff: bool
    at: datetime


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    size: int
    kind: str
    version: int
    at: datetime


class AssigneeOut(BaseModel):
    id: uuid.UUID
    name: str
    roles: list[Role]


class RequestSummary(BaseModel):
    request_number: str
    status: Status
    status_label: str
    audience: Audience
    service: str
    service_slug: str
    branch: str
    branch_slug: str
    contact_name: str
    created_at: datetime
    updated_at: datetime


class RequestDetail(RequestSummary):
    contact_phone: str
    contact_email: str
    preferred_contact: str
    preferred_date: date | None
    topic: str
    message: str
    enrolment_number: str
    court: str
    case_number: str
    needed_by: date | None
    history: list[HistoryOut]
    notes: list[NoteOut]
    documents: list[DocumentOut]
    assignees: list[AssigneeOut]
    allowed_next: list[Status]
    can_manage: bool
    is_requester: bool


class RequestList(BaseModel):
    items: list[RequestSummary]
    total: int
    page: int
    page_size: int


class StatusChangeIn(BaseModel):
    status: Status
    note: str = Field(default="", max_length=2000)


class AssignIn(BaseModel):
    assignee_id: uuid.UUID


class TransferIn(BaseModel):
    branch: str
    note: str = Field(default="", max_length=2000)


class TrackIn(BaseModel):
    request_number: str = Field(min_length=8, max_length=24)
    phone: str

    @field_validator("phone")
    @classmethod
    def _p(cls, v: str) -> str:
        return normalize_mobile(v)

    @field_validator("request_number")
    @classmethod
    def _r(cls, v: str) -> str:
        return v.strip().upper()


class TrackStep(BaseModel):
    status: Status
    label: str
    state: str  # done | current | todo


class TrackOut(BaseModel):
    request_number: str
    service: str
    branch: str
    status: Status
    status_label: str
    created_at: datetime
    steps: list[TrackStep]
    updates: list[HistoryOut]


# ---------- admin ----------
class StaffCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    mobile: str
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)
    roles: list[Role]
    branches: list[str] = []

    @field_validator("mobile")
    @classmethod
    def _m(cls, v: str) -> str:
        return normalize_mobile(v)


class UserUpdate(BaseModel):
    roles: list[Role] | None = None
    branches: list[str] | None = None
    is_active: bool | None = None
    lawyer_status: str | None = Field(default=None, pattern="^(pending|verified|rejected)$")


class UserList(BaseModel):
    items: list[UserOut]
    total: int


class CountRow(BaseModel):
    key: str
    label: str
    count: int


class ReportOut(BaseModel):
    total: int
    open: int
    completed: int
    last_30_days: int
    by_status: list[CountRow]
    by_branch: list[CountRow]
    by_service: list[CountRow]


class AuditOut(BaseModel):
    id: int
    actor: str | None
    action: str
    resource_type: str
    resource_id: str
    detail: dict
    ip: str
    at: datetime
