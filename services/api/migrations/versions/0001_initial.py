"""initial schema: tenants, users, products, threads, jobs, usage_events

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None

UUID = sa.Uuid
TS = sa.DateTime(timezone=True)
NOW = sa.text("now()")


def _scoped(name: str, *cols: sa.Column) -> None:
    op.create_table(
        name,
        sa.Column("id", UUID, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        *cols,
        sa.Column("created_at", TS, server_default=NOW, nullable=False),
    )
    op.create_index(f"ix_{name}_tenant_product", name, ["tenant_id", "product_id"])


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("created_at", TS, server_default=NOW, nullable=False),
    )
    op.create_table(
        "products",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("tenant_id", sa.Text, sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("created_at", TS, server_default=NOW, nullable=False),
    )
    _scoped(
        "users",
        sa.Column("external_id", sa.Text, nullable=False),
        sa.Column("email", sa.Text),
    )
    _scoped("threads", sa.Column("user_id", UUID, nullable=False), sa.Column("title", sa.Text))
    _scoped(
        "jobs",
        sa.Column("thread_id", UUID),
        sa.Column("user_id", UUID, nullable=False),
        sa.Column("capability", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False, server_default="queued"),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.Column("result", sa.JSON),
    )
    _scoped(
        "usage_events",
        sa.Column("user_id", UUID),
        sa.Column("kind", sa.Text, nullable=False),
        sa.Column("quantity", sa.Float, nullable=False),
        sa.Column("unit", sa.Text, nullable=False),
        sa.Column("meta", sa.JSON),
    )


def downgrade() -> None:
    for t in ("usage_events", "jobs", "threads", "users", "products", "tenants"):
        op.drop_table(t)
