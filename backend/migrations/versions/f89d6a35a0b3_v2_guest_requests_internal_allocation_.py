"""v2: guest requests, internal branch allocation, new statuses and priority, document workspace,
advocate verification, tracking codes and notifications

Revision ID: f89d6a35a0b3
Revises: 3b667e22a58c
Create Date: 2026-11-09 20:00:05

Written to run on PostgreSQL and on SQLite (used by the single-container preview), so table changes use batch mode.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f89d6a35a0b3"
down_revision: Union[str, None] = "3b667e22a58c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Old status -> new status. No quotation or payment stages remain.
STATUS_MAP = {
    "UNDER_REVIEW": "UNDER_SCREENING",
    "AWAITING_INFORMATION": "INFORMATION_REQUIRED",
    "ACCEPTED": "UNDER_SCREENING",
    "PAYMENT_PENDING": "UNDER_SCREENING",
    "REVISION_REQUESTED": "REVISION_REQUIRED",
    "APPROVED": "QUALITY_REVIEW",
    "REJECTED": "CANCELLED",
    "REFUND_PENDING": "CANCELLED",
}
DOC_MAP = {"WORKING": "DRAFT", "APPROVED": "FINAL"}

DOC_KIND = sa.Enum("ORIGINAL", "UNDER_REVIEW", "DRAFT", "REVISED_DRAFT", "ADVOCATE_REVIEWED", "FINAL", "SUPERSEDED", name="doc_kind", native_enum=False, length=24)
PRIORITY = sa.Enum("NORMAL", "HIGH", "URGENT", "DEADLINE_SENSITIVE", name="priority", native_enum=False, length=24)


def _text(name: str, length: int | None = None) -> sa.Column:
    t = sa.String(length) if length else sa.Text()
    return sa.Column(name, t, nullable=False, server_default="")


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("request_id", sa.Uuid(), nullable=True),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("recipient", sa.String(length=254), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error", sa.String(length=300), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["request_id"], ["requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)
    op.create_index(op.f("ix_notifications_request_id"), "notifications", ["request_id"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    op.create_table(
        "tracking_challenges",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["request_id"], ["requests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tracking_challenges_request_id"), "tracking_challenges", ["request_id"], unique=False)

    with op.batch_alter_table("branches") as b:
        b.add_column(_text("description"))
        b.add_column(sa.Column("office_status", sa.String(length=20), nullable=False, server_default="planned"))
        b.add_column(_text("manager_name", 120))

    with op.batch_alter_table("documents") as b:
        b.add_column(sa.Column("shared_with_client", sa.Boolean(), nullable=False, server_default=sa.false()))
        b.add_column(sa.Column("scan_status", sa.String(length=16), nullable=False, server_default="not_scanned"))
        b.add_column(sa.Column("reviewed_by_id", sa.Uuid(), nullable=True))
        b.add_column(sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
        b.alter_column("kind", existing_type=sa.VARCHAR(length=16), type_=DOC_KIND, existing_nullable=False)
        b.create_foreign_key("fk_documents_reviewed_by", "users", ["reviewed_by_id"], ["id"], ondelete="SET NULL")

    with op.batch_alter_table("lawyer_profiles") as b:
        b.add_column(_text("state_bar_council", 80))
        b.add_column(sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))
        b.add_column(sa.Column("verified_by_id", sa.Uuid(), nullable=True))
        b.add_column(_text("verification_note"))
        b.add_column(_text("practice_location", 120))
        b.add_column(_text("experience_areas"))
        b.add_column(sa.Column("availability", sa.String(length=30), nullable=False, server_default="available"))
        b.create_foreign_key("fk_lawyer_profiles_verified_by", "users", ["verified_by_id"], ["id"], ondelete="SET NULL")

    with op.batch_alter_table("request_assignments") as b:
        b.add_column(sa.Column("conflict_checked", sa.Boolean(), nullable=False, server_default=sa.false()))
        b.add_column(_text("conflict_note"))

    with op.batch_alter_table("request_history") as b:
        b.add_column(_text("internal_note"))

    with op.batch_alter_table("request_notes") as b:
        b.add_column(sa.Column("kind", sa.String(length=20), nullable=False, server_default="message"))

    with op.batch_alter_table("requests") as b:
        b.add_column(sa.Column("priority", PRIORITY, nullable=False, server_default="NORMAL"))
        b.add_column(_text("service_other", 200))
        b.add_column(_text("organisation", 200))
        b.add_column(_text("opposite_party", 200))
        b.alter_column("branch_id", existing_type=sa.INTEGER(), nullable=True)
        b.create_index(op.f("ix_requests_priority"), ["priority"], unique=False)

    with op.batch_alter_table("services") as b:
        b.alter_column("audience", existing_type=sa.VARCHAR(length=20), type_=sa.String(length=60), existing_nullable=False)

    # Data: move existing records onto the new statuses and document kinds.
    conn = op.get_bind()
    for old, new in STATUS_MAP.items():
        conn.execute(sa.text("UPDATE requests SET status = :n WHERE status = :o"), {"n": new, "o": old})
        conn.execute(sa.text("UPDATE request_history SET new_status = :n WHERE new_status = :o"), {"n": new, "o": old})
        conn.execute(sa.text("UPDATE request_history SET old_status = :n WHERE old_status = :o"), {"n": new, "o": old})
    for old, new in DOC_MAP.items():
        conn.execute(sa.text("UPDATE documents SET kind = :n WHERE kind = :o"), {"n": new, "o": old})
    conn.execute(sa.text("UPDATE documents SET shared_with_client = :t WHERE kind = 'FINAL'"), {"t": True})
    conn.execute(sa.text("UPDATE services SET audience = 'lawyer,individual' WHERE audience = 'both'"))
    # Earlier assignments were made before conflict checks existed; record that honestly.
    conn.execute(sa.text("UPDATE request_assignments SET conflict_note = 'Assigned before conflict checks were recorded.'"))


def downgrade() -> None:
    raise NotImplementedError("Restore from a backup to go back to the first schema; statuses were merged and cannot be split again.")
