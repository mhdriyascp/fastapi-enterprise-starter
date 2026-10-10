from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.masters import Country, State


class StateNotFoundError(Exception):
    pass


class StateConflictError(Exception):
    pass


async def get_country_by_public_id(
    db: AsyncSession,
    country_public_id: UUID,
) -> Country:
    result = await db.scalars(
        select(Country).where(
            Country.public_id == country_public_id,
            Country.is_active.is_(True),
        )
    )

    country = result.one_or_none()

    if country is None:
        raise StateNotFoundError("Active country not found.")

    return country


async def get_state(
    db: AsyncSession,
    public_id: UUID,
    *,
    include_inactive: bool = False,
) -> State:
    query = select(State).where(State.public_id == public_id)

    if not include_inactive:
        query = query.where(State.is_active.is_(True))

    result = await db.scalars(query)
    state = result.one_or_none()

    if state is None:
        raise StateNotFoundError("State not found.")

    return state


async def list_states(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = True,
    country_public_id: UUID | None = None,
) -> tuple[list[State], int]:
    query = select(State)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                State.name.ilike(term),
                State.code.ilike(term),
            )
        )

    if is_active is not None:
        query = query.where(State.is_active.is_(is_active))

    if country_public_id is not None:
        country = await get_country_by_public_id(db, country_public_id)
        query = query.where(State.country_id == country.id)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    result = await db.scalars(
        query.order_by(State.name).offset(offset).limit(limit)
    )

    return list(result.all()), total or 0


async def create_state(
    db: AsyncSession,
    data: dict,
) -> State:
    data = data.copy()
    country_public_id = data.pop("country_public_id")

    country = await get_country_by_public_id(db, country_public_id)

    state = State(
        country_id=country.id,
        **data,
    )

    db.add(state)

    try:
        await db.commit()
        await db.refresh(state)
    except IntegrityError as exc:
        await db.rollback()
        raise StateConflictError(
            "A state with conflicting data already exists."
        ) from exc

    return state


async def update_state(
    db: AsyncSession,
    public_id: UUID,
    data: dict,
) -> State:
    state = await get_state(db, public_id)
    data = data.copy()

    country_public_id = data.pop("country_public_id", None)

    if country_public_id is not None:
        country = await get_country_by_public_id(db, country_public_id)
        state.country_id = country.id

    for field, value in data.items():
        setattr(state, field, value)

    try:
        await db.commit()
        await db.refresh(state)
    except IntegrityError as exc:
        await db.rollback()
        raise StateConflictError(
            "A state with conflicting data already exists."
        ) from exc

    return state


async def deactivate_state(
    db: AsyncSession,
    public_id: UUID,
) -> None:
    state = await get_state(db, public_id)
    state.is_active = False

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise StateConflictError(
            "Unable to deactivate this state."
        ) from exc