from datetime import UTC, datetime
from logging.config import fileConfig
from typing import Any

from alembic.operations.ops import MigrationScript
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.config import settings
from app.infrastructure.database.base import Base

# General master models
from app.infrastructure.database.models.masters import (
    AddressType,
    City,
    CommunicationType,
    Country,
    Currency,
    DocumentType,
    IdentificationType,
    Industry,
    Language,
    State,
    TimeZone,
    UnitOfMeasure,
)

# Organization master models
from app.infrastructure.database.models.organization import (
    Branch,
    BusinessHours,
    BusinessUnit,
    CostCenter,
    Department,
    DocumentSequence,
    FiscalPeriod,
    FiscalYear,
    Holiday,
    JobTitle,
    LegalEntity,
    Organization,
    ProfitCenter,
    Team,
)

# Masters models
from app.modules.identity.models import AuthSession
from app.modules.menus.models import (
    Menu,
    MenuPermission,
    MenuRole,
)
from app.modules.rbac.models import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from app.modules.users.models import User

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Importing the models above registers their tables with Base.metadata.
target_metadata = Base.metadata


# DATABASE_URL contains encoded characters such as %40.
# ConfigParser interprets % specially, so escape % before passing
# the URL to Alembic's configuration.
config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace("%", "%%"),
)

def process_revision_directives(
    context: Any,
    revision: Any,
    directives: list[MigrationScript],
) -> None:
    """Ensure generated revision IDs use UTC timestamps (YYYYMMDDHHMMSS) instead of random hashes."""
    for directive in directives:
        # If no custom rev_id was provided or it is a default short hex hash
        if not directive.rev_id or len(directive.rev_id) < 14:
            directive.rev_id = datetime.now(UTC).strftime("%Y%m%d%H%M%S")


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        process_revision_directives=process_revision_directives,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        process_revision_directives=process_revision_directives,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    import asyncio

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()