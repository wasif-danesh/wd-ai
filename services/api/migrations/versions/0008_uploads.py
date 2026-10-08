"""uploads: files users sent that no run has used yet (ADR-0035)

A row exists from the upload until the graph that uses the file finishes (it deletes file and row)
or until the unused-upload clean-up removes both after 24 hours.

Revision ID: 0008
Revises: 0007
"""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"


def upgrade() -> None:
    op.create_table(
        "uploads",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("key", sa.Text, nullable=False),
        sa.Column("bytes", sa.Integer, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "ix_uploads_owner_key", "uploads", ["tenant_id", "product_id", "user_id", "key"]
    )
    op.create_index("ix_uploads_created", "uploads", ["created_at"])


def downgrade() -> None:
    op.drop_table("uploads")
