"""standardize_menus_and_notifications_model_ids

Revision ID: 20261016101951
Revises: 20261016095142
Create Date: 2026-10-16 15:49:51.537312

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261016101951"
down_revision: str | Sequence[str] | None = "20261016095142"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema to 64-bit BigInteger PK/FK and UUIDv7 public_id."""
    # 1. Migrate notifications to BigInteger id + UUID public_id
    op.add_column("notifications", sa.Column("public_id", sa.Uuid(), nullable=True))
    op.execute("UPDATE notifications SET public_id = id WHERE public_id IS NULL")
    op.alter_column("notifications", "public_id", nullable=False)
    op.create_index(
        op.f("ix_notifications_public_id"),
        "notifications",
        ["public_id"],
        unique=True,
    )

    op.execute("ALTER TABLE notifications DROP CONSTRAINT notifications_pkey")
    op.execute("CREATE SEQUENCE notifications_id_seq")
    op.execute(
        "ALTER TABLE notifications ALTER COLUMN id TYPE bigint USING nextval('notifications_id_seq')"
    )
    op.execute(
        "ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq')"
    )
    op.execute("ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id")
    op.execute("ALTER TABLE notifications ADD PRIMARY KEY (id)")

    # 2. Migrate menus, menu_roles, menu_permissions to BigInteger PK/FK
    # Drop referencing foreign keys
    op.execute(
        "ALTER TABLE menu_roles DROP CONSTRAINT IF EXISTS menu_roles_menu_id_fkey"
    )
    op.execute(
        "ALTER TABLE menu_permissions DROP CONSTRAINT IF EXISTS menu_permissions_menu_id_fkey"
    )
    op.execute("ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_parent_id_fkey")

    # Prepare new integer IDs
    op.execute("CREATE SEQUENCE menus_id_seq")
    op.execute(
        "ALTER TABLE menus ADD COLUMN new_id bigint DEFAULT nextval('menus_id_seq')"
    )
    op.execute("ALTER TABLE menus ADD COLUMN new_parent_id bigint")
    op.execute(
        "UPDATE menus m SET new_parent_id = p.new_id FROM menus p WHERE m.parent_id = p.id"
    )

    op.execute("ALTER TABLE menu_roles ADD COLUMN new_menu_id bigint")
    op.execute(
        "UPDATE menu_roles mr SET new_menu_id = m.new_id FROM menus m WHERE mr.menu_id = m.id"
    )

    op.execute("ALTER TABLE menu_permissions ADD COLUMN new_menu_id bigint")
    op.execute(
        "UPDATE menu_permissions mp SET new_menu_id = m.new_id FROM menus m WHERE mp.menu_id = m.id"
    )

    # Swap columns in menus
    op.execute("DROP INDEX IF EXISTS ix_menus_parent_id")
    op.execute("ALTER TABLE menus DROP CONSTRAINT menus_pkey")
    op.execute("ALTER TABLE menus DROP COLUMN id")
    op.execute("ALTER TABLE menus DROP COLUMN parent_id")
    op.execute("ALTER TABLE menus RENAME COLUMN new_id TO id")
    op.execute("ALTER TABLE menus RENAME COLUMN new_parent_id TO parent_id")
    op.execute("ALTER TABLE menus ALTER COLUMN id SET NOT NULL")
    op.execute("ALTER TABLE menus ALTER COLUMN id SET DEFAULT nextval('menus_id_seq')")
    op.execute("ALTER SEQUENCE menus_id_seq OWNED BY menus.id")
    op.execute("ALTER TABLE menus ADD PRIMARY KEY (id)")
    op.execute(
        "ALTER TABLE menus ADD CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE"
    )
    op.execute("CREATE INDEX ix_menus_parent_id ON menus(parent_id)")

    # Swap columns in menu_roles
    op.execute("DROP INDEX IF EXISTS ix_menu_roles_menu_id")
    op.execute("ALTER TABLE menu_roles DROP CONSTRAINT IF EXISTS menu_roles_pkey")
    op.execute(
        "ALTER TABLE menu_roles DROP CONSTRAINT IF EXISTS uq_menu_roles_menu_role"
    )
    op.execute("ALTER TABLE menu_roles DROP COLUMN IF EXISTS id")
    op.execute("ALTER TABLE menu_roles DROP COLUMN menu_id")
    op.execute("ALTER TABLE menu_roles RENAME COLUMN new_menu_id TO menu_id")
    op.execute("ALTER TABLE menu_roles ALTER COLUMN menu_id SET NOT NULL")
    op.execute("ALTER TABLE menu_roles ADD PRIMARY KEY (menu_id, role_id)")
    op.execute(
        "ALTER TABLE menu_roles ADD CONSTRAINT menu_roles_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE"
    )

    # Swap columns in menu_permissions
    op.execute("DROP INDEX IF EXISTS ix_menu_permissions_menu_id")
    op.execute(
        "ALTER TABLE menu_permissions DROP CONSTRAINT IF EXISTS menu_permissions_pkey"
    )
    op.execute(
        "ALTER TABLE menu_permissions DROP CONSTRAINT IF EXISTS uq_menu_permissions_menu_permission"
    )
    op.execute("ALTER TABLE menu_permissions DROP COLUMN IF EXISTS id")
    op.execute("ALTER TABLE menu_permissions DROP COLUMN menu_id")
    op.execute("ALTER TABLE menu_permissions RENAME COLUMN new_menu_id TO menu_id")
    op.execute("ALTER TABLE menu_permissions ALTER COLUMN menu_id SET NOT NULL")
    op.execute("ALTER TABLE menu_permissions ADD PRIMARY KEY (menu_id, permission_id)")
    op.execute(
        "ALTER TABLE menu_permissions ADD CONSTRAINT menu_permissions_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE"
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
