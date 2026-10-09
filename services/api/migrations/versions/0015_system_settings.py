"""system_settings: small system-wide switches an admin can change (ADR-0047)

Revision ID: 0015
Revises: 0014
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0015"
down_revision = "0014"


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.Text, primary_key=True),
        sa.Column("value", postgresql.JSONB, nullable=False),
        sa.Column("updated_by", sa.Text, nullable=False, server_default=""),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("system_settings")
