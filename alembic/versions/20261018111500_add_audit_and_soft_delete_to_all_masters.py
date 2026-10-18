"""add_audit_and_soft_delete_to_all_masters

Revision ID: 20261018111500
Revises: 20261017063000
Create Date: 2026-10-18 11:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261018111500"
down_revision: str | Sequence[str] | None = "20261017063000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MASTER_TABLES = [
    "countries",
    "states",
    "cities",
    "currencies",
    "time_zones",
    "units_of_measure",
    "industries",
    "languages",
    "brands",
    "taxes",
    "address_types",
    "communication_types",
    "document_types",
    "identification_types",
]


def upgrade() -> None:
    for table in MASTER_TABLES:
        op.add_column(table, sa.Column("created_by_id", sa.UUID(), nullable=True))
        op.add_column(table, sa.Column("updated_by_id", sa.UUID(), nullable=True))
        op.add_column(
            table,
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                server_default="false",
                nullable=False,
            ),
        )
        op.add_column(
            table,
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index(
            op.f(f"ix_{table}_is_deleted"),
            table,
            ["is_deleted"],
            unique=False,
        )
        op.create_index(
            op.f(f"ix_{table}_created_by_id"),
            table,
            ["created_by_id"],
            unique=False,
        )


def downgrade() -> None:
    for table in reversed(MASTER_TABLES):
        op.drop_index(op.f(f"ix_{table}_created_by_id"), table_name=table)
        op.drop_index(op.f(f"ix_{table}_is_deleted"), table_name=table)
        op.drop_column(table, "deleted_at")
        op.drop_column(table, "is_deleted")
        op.drop_column(table, "updated_by_id")
        op.drop_column(table, "created_by_id")
