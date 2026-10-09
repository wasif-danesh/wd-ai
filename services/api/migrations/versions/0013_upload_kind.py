"""uploads: what kind of file it is, and how long a recording is (ADR-0043)

Revision ID: 0013
Revises: 0012
"""

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"


def upgrade() -> None:
    op.add_column("uploads", sa.Column("kind", sa.Text, nullable=False, server_default="image"))
    op.add_column("uploads", sa.Column("seconds", sa.Float))


def downgrade() -> None:
    op.drop_column("uploads", "seconds")
    op.drop_column("uploads", "kind")
