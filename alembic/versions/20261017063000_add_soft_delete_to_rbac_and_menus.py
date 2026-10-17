"""add_soft_delete_to_rbac_and_menus

Revision ID: 20261017063000
Revises: 20261017060000
Create Date: 2026-10-17 18:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261017063000"
down_revision: str | Sequence[str] | None = "20261017060000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. roles table
    op.add_column("roles", sa.Column("created_by_id", sa.UUID(), nullable=True))
    op.add_column("roles", sa.Column("updated_by_id", sa.UUID(), nullable=True))
    op.add_column(
        "roles",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "roles", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(op.f("ix_roles_is_deleted"), "roles", ["is_deleted"], unique=False)
    op.create_index(
        op.f("ix_roles_created_by_id"), "roles", ["created_by_id"], unique=False
    )

    # 2. permissions table
    op.add_column("permissions", sa.Column("created_by_id", sa.UUID(), nullable=True))
    op.add_column("permissions", sa.Column("updated_by_id", sa.UUID(), nullable=True))
    op.add_column(
        "permissions",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "permissions",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_permissions_is_deleted"), "permissions", ["is_deleted"], unique=False
    )
    op.create_index(
        op.f("ix_permissions_created_by_id"),
        "permissions",
        ["created_by_id"],
        unique=False,
    )

    # 3. menus table
    op.add_column("menus", sa.Column("created_by_id", sa.UUID(), nullable=True))
    op.add_column("menus", sa.Column("updated_by_id", sa.UUID(), nullable=True))
    op.add_column(
        "menus",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "menus", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(op.f("ix_menus_is_deleted"), "menus", ["is_deleted"], unique=False)
    op.create_index(
        op.f("ix_menus_created_by_id"), "menus", ["created_by_id"], unique=False
    )


def downgrade() -> None:
    # 3. menus table
    op.drop_index(op.f("ix_menus_created_by_id"), table_name="menus")
    op.drop_index(op.f("ix_menus_is_deleted"), table_name="menus")
    op.drop_column("menus", "deleted_at")
    op.drop_column("menus", "is_deleted")
    op.drop_column("menus", "updated_by_id")
    op.drop_column("menus", "created_by_id")

    # 2. permissions table
    op.drop_index(op.f("ix_permissions_created_by_id"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_is_deleted"), table_name="permissions")
    op.drop_column("permissions", "deleted_at")
    op.drop_column("permissions", "is_deleted")
    op.drop_column("permissions", "updated_by_id")
    op.drop_column("permissions", "created_by_id")

    # 1. roles table
    op.drop_index(op.f("ix_roles_created_by_id"), table_name="roles")
    op.drop_index(op.f("ix_roles_is_deleted"), table_name="roles")
    op.drop_column("roles", "deleted_at")
    op.drop_column("roles", "is_deleted")
    op.drop_column("roles", "updated_by_id")
    op.drop_column("roles", "created_by_id")
