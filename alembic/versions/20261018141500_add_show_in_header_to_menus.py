"""add_show_in_header_to_menus

Revision ID: 20261018141500
Revises: 20261018111500
Create Date: 2026-10-18 14:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261018141500"
down_revision: str | Sequence[str] | None = "20261018111500"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menus",
        sa.Column(
            "show_in_header",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("menus", "show_in_header")
