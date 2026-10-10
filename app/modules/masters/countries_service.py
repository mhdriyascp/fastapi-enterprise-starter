from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.masters import Country
from app.modules.masters.schemas.country import CountryCreate, CountryUpdate


class CountryNotFoundError(Exception):
    """Raised when a country cannot be found."""


class CountryConflictError(Exception):
    """Raised when a country violates a unique constraint."""


async def list_countries(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = True,
) -> tuple[list[Country], int]:
    query = select(Country)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Country.name.ilike(term),
                Country.code.ilike(term),
                Country.iso3_code.ilike(term),
            )
        )

    if is_active is not None:
        query = query.where(Country.is_active.is_(is_active))

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    result = await db.scalars(
        query.order_by(Country.name).offset(offset).limit(limit)
    )

    return list(result.all()), total or 0


async def get_country(
    db: AsyncSession,
    public_id: UUID,
    *,
    include_inactive: bool = False,
) -> Country:
    query = select(Country).where(Country.public_id == public_id)

    if not include_inactive:
        query = query.where(Country.is_active.is_(True))

    result = await db.scalars(query)
    country = result.one_or_none()

    if country is None:
        raise CountryNotFoundError

    return country


async def create_country(
    db: AsyncSession,
    payload: CountryCreate,
) -> Country:
    country = Country(**payload.model_dump())
    db.add(country)

    try:
        await db.commit()
        await db.refresh(country)
    except IntegrityError as exc:
        await db.rollback()
        raise CountryConflictError from exc

    return country


async def update_country(
    db: AsyncSession,
    public_id: UUID,
    payload: CountryUpdate,
) -> Country:
    country = await get_country(db, public_id)

    changes = payload.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(country, field, value)

    try:
        await db.commit()
        await db.refresh(country)
    except IntegrityError as exc:
        await db.rollback()
        raise CountryConflictError from exc

    return country


async def deactivate_country(
    db: AsyncSession,
    public_id: UUID,
) -> None:
    country = await get_country(db, public_id)
    country.is_active = False
    await db.commit()