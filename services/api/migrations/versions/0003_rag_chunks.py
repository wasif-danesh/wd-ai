"""pgvector and the rag_chunks table

The vector size is fixed by the embedding model (nomic-embed-text: 768). Switching to a model
with a different size means a new migration and re-embedding (ADR-0017).

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"

DIMENSIONS = 768


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "rag_chunks",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        sa.Column("collection", sa.Text, nullable=False),
        sa.Column("document_id", sa.Text, nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata", sa.JSON, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.execute(f"ALTER TABLE rag_chunks ADD COLUMN embedding vector({DIMENSIONS}) NOT NULL")
    op.create_index(
        "ix_rag_chunks_scope",
        "rag_chunks",
        ["tenant_id", "product_id", "collection", "document_id"],
    )
    op.execute(
        "CREATE INDEX ix_rag_chunks_embedding ON rag_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.drop_table("rag_chunks")
    # The extension is left installed: other databases objects may depend on it.
