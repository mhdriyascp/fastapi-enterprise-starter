from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.addresses.models import Address
from app.modules.addresses.schemas import AddressCreate, AddressUpdate


async def find_duplicate_address(
    session: AsyncSession,
    values: dict,
    exclude_address_id: int | None = None,
) -> Address | None:
    """Find an active address with matching identity fields."""

    identity_fields = (
        "organization_id",
        "branch_id",
        "address_type_id",
        "country_id",
        "state_id",
        "city_id",
        "address_line1",
    )

    statement = select(Address).where(Address.is_active.is_(True))

    for field in identity_fields:
        column = getattr(Address, field)
        value = values[field]

        if value is None:
            statement = statement.where(column.is_(None))
        elif field == "address_line1":
            statement = statement.where(
                func.lower(func.trim(column)) == value.strip().lower()
            )
        else:
            statement = statement.where(column == value)

    if exclude_address_id is not None:
        statement = statement.where(Address.id != exclude_address_id)

    result = await session.execute(statement.limit(1))
    return result.scalar_one_or_none()


async def create_address(
    session: AsyncSession,
    address_data: AddressCreate,
) -> Address:
    """Create and return an address."""

    values = address_data.model_dump()

    duplicate = await find_duplicate_address(session, values)

    if duplicate is not None:
        raise ValueError("An address with these details already exists.")

    address = Address(**values)
    session.add(address)

    try:
        await session.commit()
        await session.refresh(address)
    except IntegrityError:
        await session.rollback()
        raise

    return address


async def get_address_by_id(
    session: AsyncSession,
    address_id: int,
) -> Address | None:
    """Retrieve an address by its database ID."""

    result = await session.execute(
        select(Address).where(Address.id == address_id)
    )

    return result.scalar_one_or_none()


async def list_addresses(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 20,
) -> list[Address]:
    """Return a paginated list of addresses."""

    statement = (
        select(Address)
        .order_by(Address.id)
        .offset(offset)
        .limit(limit)
    )

    result = await session.execute(statement)
    return list(result.scalars().all())


async def update_address(
    session: AsyncSession,
    address_id: int,
    address_data: AddressUpdate,
) -> Address | None:
    """Update an existing address."""

    address = await get_address_by_id(session, address_id)

    if address is None:
        return None

    update_data = address_data.model_dump(exclude_unset=True)

    # Build the final address identity using both existing and new values.
    candidate = {
        "organization_id": address.organization_id,
        "branch_id": address.branch_id,
        "address_type_id": address.address_type_id,
        "country_id": address.country_id,
        "state_id": address.state_id,
        "city_id": address.city_id,
        "address_line1": address.address_line1,
    }
    candidate.update(
        {
            key: value
            for key, value in update_data.items()
            if key in candidate
        }
    )

    if update_data.get("is_active", address.is_active):
        duplicate = await find_duplicate_address(
            session,
            candidate,
            exclude_address_id=address_id,
        )

        if duplicate is not None:
            raise ValueError("An address with these details already exists.")

    try:
        for field, value in update_data.items():
            setattr(address, field, value)

        await session.commit()
        await session.refresh(address)
    except IntegrityError:
        await session.rollback()
        raise

    return address


async def delete_address(
    session: AsyncSession,
    address_id: int,
) -> bool:
    """Delete an address by its database ID."""

    address = await get_address_by_id(session, address_id)

    if address is None:
        return False

    try:
        await session.delete(address)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise

    return True