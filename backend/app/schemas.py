import re
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.security import earliest_needed_by
from app.models import Audience, DocKind, Priority, Role, Status, VerificationStatus


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
    description: str
    office_status: str
    manager_name: str


class BranchUpdate(BaseModel):
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None | str = None
    hours: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    office_status: str | None = Field(default=None, pattern="^(operational|service_area|planned)$")
    manager_name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None

    @field_validator("email")
    @classmethod
    def _e(cls, v):
        if v in (None, ""):
            return v
        from pydantic import TypeAdapter

        return str(TypeAdapter(EmailStr).validate_python(v))


class ServiceOut(ORM):
    id: int
    slug: str
    name: str
    category: str
    audience: str
    requires_advocate: bool


class ServiceAdminOut(ServiceOut):
    fee_text: str
    is_active: bool


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    fee_text: str | None = Field(default=None, max_length=60)
    is_active: bool | None = None


# ---------- requests ----------
NEEDED_BY_MESSAGE = (
    "Please select a required date at least two days from today. If your matter involves an urgent court deadline "
    "or other time-sensitive requirement, mention it separately in the description."
)


class RequestCreate(BaseModel):
    """Public request form. There is no branch field: staff allocate requests internally."""

    audience: Audience
    service: str = Field(min_length=2, max_length=60)
    service_other: str = Field(default="", max_length=200)
    name: str = Field(min_length=2, max_length=120)
    phone: str
    email: EmailStr | None = None
    organisation: str = Field(default="", max_length=200)
    message: str = Field(min_length=10, max_length=8000)
    preferred_contact: str = Field(default="", max_length=30)
    topic: str = Field(default="", max_length=60)
    enrolment_number: str = Field(default="", max_length=40)
    court: str = Field(default="", max_length=200)
    case_number: str = Field(default="", max_length=80)
    opposite_party: str = Field(default="", max_length=200)
    needed_by: date
    consent: bool

    @field_validator("phone")
    @classmethod
    def _p(cls, v: str) -> str:
        return normalize_mobile(v)

    @field_validator("name", "service_other", "organisation", "message", "enrolment_number", "court", "case_number", "opposite_party")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("enrolment_number")
    @classmethod
    def _enrol(cls, v: str) -> str:
        if v and not re.fullmatch(r"[A-Za-z0-9/().\- ]{3,40}", v):
            raise ValueError("Enrolment number can use letters, numbers and / - . only")
        return v.upper()

    @field_validator("needed_by")
    @classmethod
    def _due(cls, v: date) -> date:
        if v < earliest_needed_by():
            raise ValueError(NEEDED_BY_MESSAGE)
        return v

    @field_validator("consent")
    @classmethod
    def _c(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Please agree to the privacy notice so we can handle your request")
        return v

    @model_validator(mode="after")
    def _other(self):
        if self.service == "other" and len(self.service_other) < 3:
            raise ValueError("Please specify the legal service you require.")
        if self.service != "other":
            self.service_other = ""
        if self.audience != Audience.BUSINESS:
            self.organisation = ""
        if self.audience != Audience.LAWYER:
            self.enrolment_number = ""
        return self


class NotifyResult(BaseModel):
    channel: str
    status: str


class RequestCreated(BaseModel):
    request_number: str
    status_label: str
    service: str
    files_received: int
    linked_to_account: bool
    acknowledgements: list[NotifyResult]


class HistoryOut(ORM):
    old_status: str | None
    new_status: str
    label: str
    note: str
    internal_note: str = ""
    at: datetime
    by: str | None = None


class NoteOut(BaseModel):
    id: int
    body: str
    internal: bool
    kind: str
    author: str | None
    from_staff: bool
    at: datetime


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    size: int
    kind: DocKind
    version: int
    shared_with_client: bool
    scan_status: str
    uploaded_by: str | None
    from_requester: bool
    at: datetime


class AssigneeOut(BaseModel):
    id: uuid.UUID
    name: str
    roles: list[Role]
    conflict_checked: bool = False


class RequestSummary(BaseModel):
    request_number: str
    status: Status
    status_label: str
    priority: Priority
    audience: Audience
    service: str
    service_slug: str
    service_other: str
    branch: str | None
    branch_slug: str | None
    contact_name: str
    needed_by: date | None
    created_at: datetime
    updated_at: datetime


class RequestDetail(RequestSummary):
    contact_phone: str
    contact_email: str
    organisation: str
    preferred_contact: str
    topic: str
    message: str
    enrolment_number: str
    enrolment_verified: bool
    court: str
    case_number: str
    opposite_party: str
    requires_advocate: bool
    status_explain: str
    history: list[HistoryOut]
    notes: list[NoteOut]
    documents: list[DocumentOut]
    assignees: list[AssigneeOut]
    allowed_next: list[Status]
    can_manage: bool
    can_allocate: bool
    is_requester: bool


class RequestList(BaseModel):
    items: list[RequestSummary]
    total: int
    page: int
    page_size: int


class StatusChangeIn(BaseModel):
    status: Status
    note: str = Field(default="", max_length=2000, description="Shared with the requester")
    internal_note: str = Field(default="", max_length=2000, description="Staff only")


class PriorityIn(BaseModel):
    priority: Priority
    reason: str = Field(default="", max_length=1000)


class AssignIn(BaseModel):
    assignee_id: uuid.UUID
    conflict_checked: bool = False
    conflict_note: str = Field(default="", max_length=1000)


class ConflictHit(BaseModel):
    request_number: str
    service: str
    match: str
    created_at: datetime


class TransferIn(BaseModel):
    branch: str
    note: str = Field(default="", max_length=2000)


class DocumentUpdate(BaseModel):
    kind: DocKind | None = None
    shared_with_client: bool | None = None


class LinkOut(BaseModel):
    url: str
    expires_in: int


class _TrackRef(BaseModel):
    request_number: str = Field(min_length=8, max_length=24)

    @field_validator("request_number")
    @classmethod
    def _r(cls, v: str) -> str:
        return v.strip().upper()


class TrackStart(_TrackRef):
    phone: str

    @field_validator("phone")
    @classmethod
    def _p(cls, v: str) -> str:
        return normalize_mobile(v)


class TrackStarted(BaseModel):
    challenge_id: uuid.UUID
    sent_to: list[str]
    expires_in: int
    demo_code: str | None = None


class TrackVerify(BaseModel):
    challenge_id: uuid.UUID
    code: str = Field(pattern=r"^\s*\d{6}\s*$")


class TrackStep(BaseModel):
    status: Status
    label: str
    state: str  # done | current | todo


class TrackOut(BaseModel):
    request_number: str
    service: str
    status: Status
    status_label: str
    status_explain: str
    created_at: datetime
    steps: list[TrackStep]
    updates: list[HistoryOut]
    files_received: int
    token: str = ""


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


class AdvocateOut(BaseModel):
    user_id: uuid.UUID
    name: str
    mobile: str | None
    email: str | None
    roles: list[Role]
    enrolment_number: str
    state_bar_council: str
    verification_status: VerificationStatus
    verified_at: datetime | None
    verified_by: str | None
    verification_note: str
    practice_location: str
    experience_areas: str
    availability: str
    open_matters: int


class AdvocateUpdate(BaseModel):
    enrolment_number: str | None = Field(default=None, max_length=40)
    state_bar_council: str | None = Field(default=None, max_length=80)
    verification_status: VerificationStatus | None = None
    verification_note: str | None = Field(default=None, max_length=2000)
    practice_location: str | None = Field(default=None, max_length=120)
    experience_areas: str | None = Field(default=None, max_length=2000)
    availability: str | None = Field(default=None, pattern="^(available|limited|unavailable)$")


class NotificationOut(BaseModel):
    id: int
    subject: str
    body: str
    request_number: str | None
    read: bool
    at: datetime


class NotificationLogOut(BaseModel):
    id: int
    channel: str
    recipient: str
    subject: str
    status: str
    error: str
    request_number: str | None
    at: datetime


class UserList(BaseModel):
    items: list[UserOut]
    total: int


class CountRow(BaseModel):
    key: str
    label: str
    count: int


class WorkloadRow(BaseModel):
    id: uuid.UUID
    name: str
    roles: list[Role]
    open: int


class ReportOut(BaseModel):
    total: int
    open: int
    completed: int
    last_30_days: int
    overdue: int
    unallocated: int
    by_status: list[CountRow]
    by_branch: list[CountRow]
    by_service: list[CountRow]
    by_priority: list[CountRow]
    workload: list[WorkloadRow]
    total_users: int | None = None
    pending_verifications: int | None = None


class SystemOut(BaseModel):
    environment: str
    demo_mode: bool
    email: bool
    sms: bool
    whatsapp: bool
    virus_scanning: bool
    storage: str
    max_upload_mb: int
    max_files_per_request: int


class AuditOut(BaseModel):
    id: int
    actor: str | None
    action: str
    resource_type: str
    resource_id: str
    detail: dict
    ip: str
    at: datetime
