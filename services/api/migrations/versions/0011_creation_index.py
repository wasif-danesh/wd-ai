"""creation_index: the words of every creation, with their meaning as a vector (ADR-0041)

One row per song, image or video, so that My creations can be searched across products. The row
holds a copy of the words (never the file) and an embedding made by the `creation-embedder` alias
(bge-m3, 1024 dimensions). Every query filters by tenant and user first.

Revision ID: 0011
Revises: 0010
"""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"

DIMENSIONS = 1024  # bge-m3; a different embedder with another size needs a new migration


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "creation_index",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("kind", sa.Text, nullable=False),
        sa.Column("item_id", sa.Text, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("model", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.execute(f"ALTER TABLE creation_index ADD COLUMN embedding vector({DIMENSIONS}) NOT NULL")
    op.create_index(
        "ux_creation_index_item",
        "creation_index",
        ["tenant_id", "product_id", "item_id"],
        unique=True,
    )
    op.create_index("ix_creation_index_user", "creation_index", ["tenant_id", "user_id", "kind"])
    op.create_index("ix_creation_index_product", "creation_index", ["product_id", "item_id"])


def downgrade() -> None:
    op.drop_table("creation_index")
