from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import DeclarativeBase


class MasterNotFoundError(Exception):
    """Raised when a master record is not found."""


class MasterConflictError(Exception):
    """Raised when a master record violates a database constraint."""


class MasterValidationError(Exception):
    """Raised when master data relationships are invalid."""


async def list_records(
    db: AsyncSession,
    model: type[DeclarativeBase],
    *,
    offset: int = 0,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = True,
) -> tuple[list[Any], int]:
    query = select(model)
    mapper = inspect(model)

    if search and search.strip():
        searchable_columns = [
            getattr(model, column.key)
            for column in mapper.columns
            if column.key in {"name", "code", "iso3_code", "label"}
        ]

        if searchable_columns:
            term = f"%{search.strip()}%"
            query = query.where(
                or_(*(column.ilike(term) for column in searchable_columns))
            )

    if is_active is not None and "is_active" in mapper.columns:
        query = query.where(model.is_active.is_(is_active))

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )

    result = await db.scalars(
        query.order_by(model.id).offset(offset).limit(limit)
    )

    return list(result.all()), total or 0


async def get_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    public_id: UUID,
    *,
    include_inactive: bool = False,
) -> Any:
    query = select(model).where(model.public_id == public_id)

    mapper = inspect(model)
    if not include_inactive and "is_active" in mapper.columns:
        query = query.where(model.is_active.is_(True))

    result = await db.scalars(query)
    record = result.one_or_none()

    if record is None:
        raise MasterNotFoundError

    return record


async def create_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    data: dict[str, Any],
) -> Any:
    record = model(**data)
    db.add(record)

    try:
        await db.commit()
        await db.refresh(record)
    except IntegrityError as exc:
        await db.rollback()
        raise MasterConflictError from exc

    return record


async def update_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    public_id: UUID,
    data: dict[str, Any],
) -> Any:
    record = await get_record(db, model, public_id)

    for field, value in data.items():
        setattr(record, field, value)

    try:
        await db.commit()
        await db.refresh(record)
    except IntegrityError as exc:
        await db.rollback()
        raise MasterConflictError from exc

    return record


async def deactivate_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    public_id: UUID,
) -> None:
    record = await get_record(db, model, public_id)

    if not hasattr(record, "is_active"):
        raise MasterValidationError(
            "This master does not support deactivation."
        )

    record.is_active = False

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise MasterConflictError from exc