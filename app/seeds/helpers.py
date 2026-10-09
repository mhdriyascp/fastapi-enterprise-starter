from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase


ModelT = TypeVar("ModelT", bound=DeclarativeBase)


async def get_or_create(
    db: AsyncSession,
    model: type[ModelT],
    *,
    lookup: dict[str, Any],
    defaults: dict[str, Any] | None = None,
) -> tuple[ModelT, bool]:
    """
    Get a record by its unique lookup fields or create it.

    Returns:
        A tuple containing (record, created).

    Notes:
        - Does not commit the transaction.
        - Existing records are not modified.
        - Lookup fields should identify a record uniquely.
    """
    if not lookup:
        raise ValueError("lookup must not be empty.")

    for field in lookup:
        if not hasattr(model, field):
            raise ValueError(
                f"{model.__name__} has no field {field!r}."
            )

    statement = select(model).filter_by(**lookup)
    result = await db.execute(statement)
    instance = result.scalar_one_or_none()

    if instance is not None:
        return instance, False

    values = {**(defaults or {}), **lookup}

    for field in values:
        if not hasattr(model, field):
            raise ValueError(
                f"{model.__name__} has no field {field!r}."
            )

    instance = model(**values)
    db.add(instance)

    # Populate generated defaults and identifiers without committing.
    await db.flush()

    return instance, True