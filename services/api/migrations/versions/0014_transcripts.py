"""transcripts: speech to text results (ADR-0043)

A row exists from the moment the job starts (status "working"), so the site can say "being made"
while the user does other things. The audio is deleted when the transcript is made; only the words
are kept.

Revision ID: 0014
Revises: 0013
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0014"
down_revision = "0013"


def upgrade() -> None:
    op.create_table(
        "transcripts",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("thread_id", sa.Text),
        sa.Column("run_id", sa.Text),
        sa.Column("status", sa.Text, nullable=False),  # working | done | failed
        sa.Column("title", sa.Text, nullable=False, server_default=""),
        sa.Column("language", sa.Text, nullable=False, server_default=""),
        sa.Column("engine", sa.Text, nullable=False, server_default=""),
        sa.Column("seconds", sa.Float, nullable=False, server_default="0"),
        sa.Column("text", sa.Text, nullable=False, server_default=""),
        sa.Column("segments", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("error", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_transcripts_owner_created",
        "transcripts",
        ["tenant_id", "user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_table("transcripts")
