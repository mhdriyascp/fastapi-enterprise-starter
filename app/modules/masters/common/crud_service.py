import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import DeclarativeBase


def generate_master_code(name_or_label: str, max_length: int = 30) -> str:
    """Generates an alphanumeric uppercase system code from a master name or label."""
    clean = re.sub(r"[^A-Za-z0-9]+", "_", name_or_label.strip()).upper().strip("_")
    return clean[:max_length]


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
    sort_by: str = "created_at",
    sort_order: str = "desc",
    is_active: bool | None = None,
    filters: dict[str, Any] | None = None,
) -> tuple[list[Any], int]:
    query = select(model)
    mapper = inspect(model)

    if filters:
        for key, value in filters.items():
            if value is not None and key in mapper.columns:
                query = query.where(getattr(model, key) == value)

    clean_search = (
        search.strip()
        if search and search.strip().lower() not in ("null", "undefined")
        else None
    )
    if clean_search:
        searchable_columns = [
            getattr(model, column.key)
            for column in mapper.columns
            if column.key
            in {
                "name",
                "code",
                "iso3_code",
                "label",
                "address_line1",
                "postal_code",
                "landmark",
            }
        ]

        if searchable_columns:
            term = f"%{clean_search}%"
            query = query.where(
                or_(*(column.ilike(term) for column in searchable_columns))
            )

    if "is_deleted" in mapper.columns:
        query = query.where(model.is_deleted.is_(False))

    if is_active is not None and "is_active" in mapper.columns:
        query = query.where(model.is_active.is_(is_active))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))

    # Dynamic injection-safe sorting
    sort_col_name = (
        sort_by
        if sort_by in mapper.columns
        else ("created_at" if "created_at" in mapper.columns else "id")
    )
    sort_column = getattr(model, sort_col_name)
    order_clause = sort_column.asc() if sort_order == "asc" else sort_column.desc()

    result = await db.scalars(query.order_by(order_clause).offset(offset).limit(limit))

    return list(result.all()), total or 0


async def get_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    identifier: int | UUID | str,
    *,
    include_inactive: bool = False,
) -> Any:
    if identifier is None:
        raise MasterValidationError(
            f"{model.__name__} identifier cannot be empty or null."
        )

    resolved_id: int | UUID
    if isinstance(identifier, str):
        str_val = identifier.strip()
        if not str_val or str_val.lower() in ("null", "undefined", "none"):
            raise MasterValidationError(
                f"{model.__name__} identifier cannot be empty or null."
            )
        if str_val.isdigit():
            resolved_id = int(str_val)
        else:
            try:
                resolved_id = UUID(str_val)
            except ValueError, AttributeError:
                raise MasterValidationError(
                    f"Invalid {model.__name__} identifier '{str_val}'. "
                    "Must be a valid UUID or integer ID."
                )
    else:
        resolved_id = identifier

    mapper = inspect(model)
    query = select(model)

    if isinstance(resolved_id, int):
        query = query.where(model.id == resolved_id)
    else:
        query = query.where(model.public_id == resolved_id)

    if "is_deleted" in mapper.columns:
        query = query.where(model.is_deleted.is_(False))

    if not include_inactive and "is_active" in mapper.columns:
        query = query.where(model.is_active.is_(True))

    result = await db.scalars(query)
    record = result.one_or_none()

    if record is None:
        raise MasterNotFoundError(f"{model.__name__} not found.")

    return record


async def resolve_foreign_keys(
    _db: AsyncSession,
    model: type[DeclarativeBase],
    data: dict[str, Any],
) -> dict[str, Any]:
    """Clean extra keys and retain only columns defined on model."""
    data = data.copy()
    mapper = inspect(model)

    # Discard any public_id fields if passed in payload
    data.pop("country_public_id", None)
    data.pop("state_public_id", None)
    data.pop("city_public_id", None)
    data.pop("address_type_public_id", None)

    # Clean up and retain only model columns
    return {k: v for k, v in data.items() if k in mapper.columns}


async def create_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    data: dict[str, Any],
) -> Any:
    resolved_data = await resolve_foreign_keys(db, model, data)
    mapper = inspect(model)

    if "code" in mapper.columns and not resolved_data.get("code"):
        source_val = (
            resolved_data.get("name")
            or resolved_data.get("label")
            or resolved_data.get("title")
            or ""
        )
        if source_val:
            col = mapper.columns["code"]
            max_len = getattr(col.type, "length", 30) or 30
            generated_code = generate_master_code(str(source_val), max_len)
            if getattr(model, "__tablename__", "") == "languages":
                generated_code = generated_code.lower()
            resolved_data["code"] = generated_code

    for field, value in resolved_data.items():
        if field in mapper.columns:
            col = mapper.columns[field]
            if (
                not col.nullable
                and not col.primary_key
                and col.default is None
                and col.server_default is None
            ):
                if value is None:
                    raise MasterValidationError(f"Field '{field}' cannot be null.")
                if isinstance(value, str) and not value.strip():
                    raise MasterValidationError(f"Field '{field}' cannot be empty.")
            elif isinstance(value, str):
                resolved_data[field] = value.strip()

    record = model(**resolved_data)
    db.add(record)

    try:
        await db.commit()
        await db.refresh(record)
    except IntegrityError as exc:
        await db.rollback()
        err_msg = str(getattr(exc, "orig", exc))
        if "NOT NULL" in err_msg.upper() or "NOT-NULL" in err_msg.upper():
            raise MasterValidationError(
                "Database constraint violation: required field cannot be null."
            ) from exc
        raise MasterConflictError(
            f"A conflicting {model.__name__.lower()} record already exists."
        ) from exc

    return record


async def update_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    identifier: int | UUID | str,
    data: dict[str, Any],
) -> Any:
    record = await get_record(db, model, identifier, include_inactive=True)
    resolved_data = await resolve_foreign_keys(db, model, data)
    mapper = inspect(model)

    for field, value in resolved_data.items():
        if field in mapper.columns:
            col = mapper.columns[field]
            if not col.nullable:
                if value is None:
                    raise MasterValidationError(f"Field '{field}' cannot be null.")
                if isinstance(value, str):
                    trimmed = value.strip()
                    if not trimmed:
                        raise MasterValidationError(f"Field '{field}' cannot be empty.")
                    value = trimmed
            elif isinstance(value, str):
                value = value.strip()
            setattr(record, field, value)

    try:
        await db.commit()
        await db.refresh(record)
    except IntegrityError as exc:
        await db.rollback()
        err_msg = str(getattr(exc, "orig", exc))
        if "NOT NULL" in err_msg.upper() or "NOT-NULL" in err_msg.upper():
            raise MasterValidationError(
                "Database constraint violation: required field cannot be null."
            ) from exc
        raise MasterConflictError(
            f"A conflicting {model.__name__.lower()} record already exists."
        ) from exc

    return record


async def deactivate_record(
    db: AsyncSession,
    model: type[DeclarativeBase],
    identifier: int | UUID | str,
) -> None:
    record = await get_record(db, model, identifier)

    if not hasattr(record, "is_active") and not hasattr(record, "is_deleted"):
        raise MasterValidationError("This master does not support deactivation.")

    if hasattr(record, "is_active"):
        record.is_active = False

    if hasattr(record, "is_deleted"):
        record.is_deleted = True
        record.deleted_at = datetime.now(UTC)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise MasterConflictError(
            f"A conflicting {model.__name__.lower()} record already exists."
        ) from exc
