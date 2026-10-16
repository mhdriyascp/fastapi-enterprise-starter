"""db_optimization_and_integrity

Revision ID: 20261016055340
Revises: 20261015090109
Create Date: 2026-10-16 11:23:40.170990

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261016055340"
down_revision: str | Sequence[str] | None = "20261015090109"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        "uq_branches_org_code", "branches", ["organization_id", "code"]
    )
    op.create_unique_constraint(
        "uq_cost_centers_org_code", "cost_centers", ["organization_id", "code"]
    )
    op.create_unique_constraint(
        "uq_departments_org_code", "departments", ["organization_id", "code"]
    )
    op.create_unique_constraint(
        "uq_teams_org_code", "teams", ["organization_id", "code"]
    )

    # Convert role_permissions to composite primary key
    op.drop_constraint(
        "uq_role_permissions_role_permission", "role_permissions", type_="unique"
    )
    op.drop_column("role_permissions", "id")
    op.create_primary_key(
        "pk_role_permissions", "role_permissions", ["role_id", "permission_id"]
    )

    # Convert user_roles to composite primary key
    op.drop_constraint("uq_user_roles_user_role", "user_roles", type_="unique")
    op.drop_column("user_roles", "id")
    op.create_primary_key("pk_user_roles", "user_roles", ["user_id", "role_id"])


def downgrade() -> None:
    """Downgrade schema."""
    # Revert user_roles composite primary key
    op.drop_constraint("pk_user_roles", "user_roles", type_="primary")
    op.add_column(
        "user_roles", sa.Column("id", sa.UUID(), autoincrement=False, nullable=True)
    )
    op.execute("UPDATE user_roles SET id = gen_random_uuid() WHERE id IS NULL")
    op.alter_column("user_roles", "id", nullable=False)
    op.create_primary_key("user_roles_pkey", "user_roles", ["id"])
    op.create_unique_constraint(
        "uq_user_roles_user_role", "user_roles", ["user_id", "role_id"]
    )

    # Revert role_permissions composite primary key
    op.drop_constraint("pk_role_permissions", "role_permissions", type_="primary")
    op.add_column(
        "role_permissions",
        sa.Column("id", sa.UUID(), autoincrement=False, nullable=True),
    )
    op.execute("UPDATE role_permissions SET id = gen_random_uuid() WHERE id IS NULL")
    op.alter_column("role_permissions", "id", nullable=False)
    op.create_primary_key("role_permissions_pkey", "role_permissions", ["id"])
    op.create_unique_constraint(
        "uq_role_permissions_role_permission",
        "role_permissions",
        ["role_id", "permission_id"],
    )

    # Revert organization unique constraints
    op.drop_constraint("uq_teams_org_code", "teams", type_="unique")
    op.drop_constraint("uq_departments_org_code", "departments", type_="unique")
    op.drop_constraint("uq_cost_centers_org_code", "cost_centers", type_="unique")
    op.drop_constraint("uq_branches_org_code", "branches", type_="unique")
