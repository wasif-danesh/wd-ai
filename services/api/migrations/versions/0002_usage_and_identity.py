"""identity ids are strings; usage_events gets run_id and quota/billing indexes

Auth.js subjects (and the dev stub user) are strings, not UUIDs. The Phase 0 columns were
declared UUID before identity was designed; nothing wrote to them yet.

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade() -> None:
    for table in ("usage_events", "jobs", "threads"):
        op.alter_column(table, "user_id", type_=sa.Text, postgresql_using="user_id::text")
    op.add_column("usage_events", sa.Column("run_id", sa.Text))
    # Quota checks ("songs today for this user") and billing roll-ups both filter on these.
    op.create_index(
        "ix_usage_events_user_kind_time",
        "usage_events",
        ["tenant_id", "product_id", "user_id", "kind", "created_at"],
    )
    op.create_index("ix_usage_events_created_at", "usage_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_usage_events_created_at", "usage_events")
    op.drop_index("ix_usage_events_user_kind_time", "usage_events")
    op.drop_column("usage_events", "run_id")
    for table in ("usage_events", "jobs", "threads"):
        op.alter_column(table, "user_id", type_=sa.Uuid, postgresql_using="user_id::uuid")
