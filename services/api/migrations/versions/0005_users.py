"""users and user_identities (ADR-0030)

A user is ours (a UUID); a user_identity is one provider account that signs in as that user.
Users belong to a tenant, not to a product: a person signs in once for every product.

Replaces the empty placeholder `users` table from 0001 (product-scoped, never written to). The
migration stops if that table somehow holds rows.

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"


def upgrade() -> None:
    if op.get_bind().execute(sa.text("SELECT count(*) FROM users")).scalar_one():
        raise RuntimeError("the placeholder users table has rows; migrate them by hand first")
    op.drop_table("users")
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("email", sa.Text),
        sa.Column("email_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("name", sa.Text),
        sa.Column("image", sa.Text),
        sa.Column("role", sa.Text, nullable=False, server_default="user"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_tenant_email", "users", ["tenant_id", sa.text("lower(email)")])
    op.create_table(
        "user_identities",
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("provider", sa.Text, nullable=False),
        sa.Column("provider_account_id", sa.Text, nullable=False),
        sa.Column(
            "user_id", sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("tenant_id", "provider", "provider_account_id"),
    )
    op.create_index("ix_user_identities_user", "user_identities", ["user_id"])


def downgrade() -> None:
    op.drop_table("user_identities")
    op.drop_table("users")
    op.create_table(  # the placeholder from 0001
        "users",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tenant_id", sa.Text, nullable=False),
        sa.Column("product_id", sa.Text, nullable=False),
        sa.Column("external_id", sa.Text, nullable=False),
        sa.Column("email", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_tenant_product", "users", ["tenant_id", "product_id"])
