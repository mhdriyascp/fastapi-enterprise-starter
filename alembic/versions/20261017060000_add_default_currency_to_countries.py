"""add default_currency_id to countries

Revision ID: 20261017060000
Revises: 20261017053019
Create Date: 2026-10-17 11:26:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261017060000"
down_revision: str | Sequence[str] | None = "20261017053019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "countries",
        sa.Column("default_currency_id", sa.BigInteger(), nullable=True),
    )
    op.create_index(
        op.f("ix_countries_default_currency_id"),
        "countries",
        ["default_currency_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_countries_default_currency_id_currencies"),
        "countries",
        "currencies",
        ["default_currency_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("fk_countries_default_currency_id_currencies"),
        "countries",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_countries_default_currency_id"),
        table_name="countries",
    )
    op.drop_column("countries", "default_currency_id")
