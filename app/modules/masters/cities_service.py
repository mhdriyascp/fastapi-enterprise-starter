from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.masters import City, Country, State


class CityNotFoundError(Exception):
    pass


class CityConflictError(Exception):
    pass


async def _get_country(db: AsyncSession, public_id: UUID) -> Country:
    result = await db.scalars(
        select(Country).where(
            Country.public_id == public_id,
            Country.is_active.is_(True),
        )
    )
    country = result.one_or_none()

    if country is None:
        raise CityNotFoundError("Active country not found.")

    return country


async def _get_state(
    db: AsyncSession,
    public_id: UUID,
    country_id: int,
) -> State:
    result = await db.scalars(
        select(State).where(
            State.public_id == public_id,
            State.country_id == country_id,
            State.is_active.is_(True),
        )
    )
    state = result.one_or_none()

    if state is None:
        raise CityNotFoundError(
            "Active state not found for the selected country."
        )

    return state


async def get_city(
    db: AsyncSession,
    public_id: UUID,
) -> City:
    result = await db.scalars(
        select(City).where(
            City.public_id == public_id,
            City.is_active.is_(True),
        )
    )
    city = result.one_or_none()

    if city is None:
        raise CityNotFoundError("City not found.")

    return city


async def list_cities(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = True,
    country_public_id: UUID | None = None,
    state_public_id: UUID | None = None,
) -> tuple[list[City], int]:
    query = select(City)

    if search and search.strip():
        query = query.where(City.name.ilike(f"%{search.strip()}%"))

    if is_active is not None:
        query = query.where(City.is_active.is_(is_active))

    country = None
    if country_public_id is not None:
        country = await _get_country(db, country_public_id)
        query = query.where(City.country_id == country.id)

    if state_public_id is not None:
        if country is None:
            state_result = await db.scalars(
                select(State).where(
                    State.public_id == state_public_id,
                    State.is_active.is_(True),
                )
            )
            state = state_result.one_or_none()

            if state is None:
                raise CityNotFoundError("Active state not found.")

            query = query.where(City.state_id == state.id)
        else:
            state = await _get_state(db, state_public_id, country.id)
            query = query.where(City.state_id == state.id)

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )

    result = await db.scalars(
        query.order_by(City.name).offset(offset).limit(limit)
    )

    return list(result.all()), total or 0


async def create_city(db: AsyncSession, data: dict) -> City:
    data = data.copy()

    country_public_id = data.pop("country_public_id")
    state_public_id = data.pop("state_public_id", None)

    country = await _get_country(db, country_public_id)

    state_id = None
    if state_public_id is not None:
        state = await _get_state(db, state_public_id, country.id)
        state_id = state.id

    city = City(
        country_id=country.id,
        state_id=state_id,
        **data,
    )
    db.add(city)

    try:
        await db.commit()
        await db.refresh(city)
    except IntegrityError as exc:
        await db.rollback()
        raise CityConflictError(
            "A city with conflicting data already exists."
        ) from exc

    return city

async def update_city(
    db: AsyncSession,
    public_id: UUID,
    data: dict,
) -> City:
    city = await get_city(db, public_id)
    data = data.copy()

    country_public_id = data.pop("country_public_id", None)
    state_was_provided = "state_public_id" in data
    state_public_id = data.pop("state_public_id", None)

    country = (
        await _get_country(db, country_public_id)
        if country_public_id is not None
        else await db.get(Country, city.country_id)
    )

    if country is None:
        raise CityNotFoundError("Country not found.")

    city.country_id = country.id

    if state_was_provided:
        if state_public_id is None:
            city.state_id = None
        else:
            state = await _get_state(db, state_public_id, country.id)
            city.state_id = state.id
    elif city.state_id is not None:
        current_state = await db.get(State, city.state_id)
        if current_state is None or current_state.country_id != country.id:
            raise CityNotFoundError(
                "The selected state does not belong to the selected country. "
                "Provide a matching state or set state_public_id to null."
            )

    for field, value in data.items():
        setattr(city, field, value)

    try:
        await db.commit()
        await db.refresh(city)
    except IntegrityError as exc:
        await db.rollback()
        raise CityConflictError(
            "A city with conflicting data already exists."
        ) from exc

    return city

async def deactivate_city(db: AsyncSession, public_id: UUID) -> None:
    city = await get_city(db, public_id)
    city.is_active = False

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise CityConflictError("Unable to deactivate city.") from exc