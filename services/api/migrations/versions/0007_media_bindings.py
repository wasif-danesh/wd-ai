"""media_bindings: which backend runs a product's media capability (ADR-0025)

`secret_enc` holds an API key encrypted with MEDIA_SECRETS_KEY; `config` never holds secrets.

Revision ID: 0007
Revises: 0006
"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"


def upgrade() -> None:
    op.create_table(
        "media_bindings",
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        sa.Column("capability", sa.Text, nullable=False),
        sa.Column("backend", sa.Text, nullable=False),
        sa.Column("config", sa.JSON, nullable=False),
        sa.Column("secret_enc", sa.Text),
        sa.Column("updated_by", sa.Text),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("tenant_id", "product_id", "capability"),
    )


def downgrade() -> None:
    op.drop_table("media_bindings")
