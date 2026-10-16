from uuid import uuid4

import pytest

from app.infrastructure.database.models.masters.address import Address
from app.infrastructure.database.session import SessionFactory
from app.modules.masters.common.crud_service import (
    MasterNotFoundError,
    get_record,
    resolve_foreign_keys,
)
from app.modules.masters.schemas.address import AddressCreate
from app.modules.masters.schemas.city import CityCreate
from app.modules.masters.schemas.state import StateCreate


def test_address_create_schema_accepts_integer_ids_and_empty_public_ids() -> None:
    """Verifies that AddressCreate parses integer IDs and tolerates empty public_id strings."""
    payload = {
        "organization_id": 1,
        "branch_id": 1,
        "address_type_id": 1,
        "country_id": 1,
        "state_id": 1,
        "city_id": 1,
        "address_type_public_id": "",
        "country_public_id": "",
        "state_public_id": "",
        "city_public_id": "",
        "address_line1": "Door No. 12/345, Marine Drive",
        "address_line2": "Near High Court Junction",
        "landmark": "Marine Drive Waterfront",
        "postal_code": "682031",
        "latitude": 9.9816,
        "longitude": 76.2765,
        "notes": "Main office address",
        "is_default": True,
        "is_active": True,
    }

    schema = AddressCreate.model_validate(payload)
    assert schema.address_type_id == 1
    assert schema.country_id == 1
    assert schema.state_id == 1
    assert schema.city_id == 1
    assert schema.address_line1 == "Door No. 12/345, Marine Drive"


def test_state_and_city_schemas_use_integer_ids() -> None:
    """Verifies State and City schemas prioritize and include integer ids."""
    state_in = StateCreate(country_id=1, name="Kerala", code="KL")
    assert state_in.country_id == 1

    city_in = CityCreate(country_id=1, state_id=2, name="Kochi")
    assert city_in.country_id == 1
    assert city_in.state_id == 2


@pytest.mark.asyncio
async def test_resolve_foreign_keys_prioritizes_integer_id() -> None:
    """Verifies resolve_foreign_keys uses integer IDs and safely cleans empty string public IDs."""
    async with SessionFactory() as db:
        data = {
            "address_type_id": 1,
            "country_id": 1,
            "state_id": 1,
            "city_id": 1,
            "address_type_public_id": "",
            "country_public_id": "",
            "state_public_id": "",
            "city_public_id": "",
            "address_line1": "Test Line",
        }

        resolved = await resolve_foreign_keys(db, Address, data)
        assert resolved["address_type_id"] == 1
        assert resolved["country_id"] == 1
        assert resolved["state_id"] == 1
        assert resolved["city_id"] == 1
        assert "country_public_id" not in resolved
        assert "address_type_public_id" not in resolved


@pytest.mark.asyncio
async def test_get_record_uses_public_id() -> None:
    """Verifies get_record queries by public_id UUID."""
    async with SessionFactory() as db:
        non_existent_uuid = uuid4()
        with pytest.raises(MasterNotFoundError):
            await get_record(db, Address, non_existent_uuid)


@pytest.mark.asyncio
async def test_get_record_rejects_null_and_empty_identifiers() -> None:
    """Verifies get_record rejects null, empty, and undefined identifiers with proper messages."""
    from app.modules.masters.common.crud_service import MasterValidationError

    async with SessionFactory() as db:
        for bad_id in (None, "", "   ", "null", "undefined", "none"):
            with pytest.raises(MasterValidationError) as exc_info:
                await get_record(db, Address, bad_id)  # type: ignore[arg-type]
            assert "identifier cannot be empty or null" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_record_dual_lookup() -> None:
    """Verifies get_record supports dual lookup by integer ID and UUID."""
    from sqlalchemy import select

    async with SessionFactory() as db:
        existing = (await db.scalars(select(Address))).first()
        if existing:
            # Lookup by int id
            by_int = await get_record(db, Address, existing.id)
            assert by_int.id == existing.id

            # Lookup by string int
            by_str_int = await get_record(db, Address, str(existing.id))
            assert by_str_int.id == existing.id

            # Lookup by UUID
            by_uuid = await get_record(db, Address, existing.public_id)
            assert by_uuid.public_id == existing.public_id

            # Lookup by string UUID
            by_str_uuid = await get_record(db, Address, str(existing.public_id))
            assert by_str_uuid.public_id == existing.public_id


@pytest.mark.asyncio
async def test_update_record_rejects_null_non_nullable_fields() -> None:
    """Verifies update_record raises MasterValidationError when setting non-nullable columns to null."""
    from sqlalchemy import select

    from app.modules.masters.common.crud_service import (
        MasterValidationError,
        update_record,
    )

    async with SessionFactory() as db:
        existing = (await db.scalars(select(Address))).first()
        if existing:
            with pytest.raises(MasterValidationError) as exc_info:
                await update_record(
                    db,
                    Address,
                    existing.id,
                    {"address_line1": None},
                )
            assert "cannot be null" in str(exc_info.value)


@pytest.mark.asyncio
async def test_addresses_api_endpoints_dual_lookup_and_null_rejection() -> None:
    """Verifies that /api/v1/masters/addresses/{identifier} supports dual lookup and null rejection."""
    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.security import create_access_token
    from app.main import app
    from app.modules.users.models import User

    async with SessionFactory() as db:
        admin_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        admin = admin_res.scalar_one()
        token = create_access_token(admin.id)
        existing_addr = (await db.scalars(select(Address))).first()

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # 1. Reject null / undefined / whitespace-only identifiers with 400
        for bad_id in ("null", "undefined", "%20%20", "none"):
            res = await client.get(
                f"/api/v1/masters/addresses/{bad_id}", headers=headers
            )
            assert res.status_code == 400, (
                f"Expected 400 for {bad_id}, got {res.status_code}: {res.text}"
            )
            assert "cannot be empty or null" in res.json().get("detail", "")

        # 2. Dual lookup if address exists
        if existing_addr:
            # 2a. Lookup by internal integer ID
            res_int = await client.get(
                f"/api/v1/masters/addresses/{existing_addr.id}", headers=headers
            )
            assert res_int.status_code == 200
            data_int = res_int.json()
            assert data_int["id"] == existing_addr.id
            assert data_int["public_id"] == str(existing_addr.public_id)

            # 2b. Lookup by external UUID public_id
            res_uuid = await client.get(
                f"/api/v1/masters/addresses/{existing_addr.public_id}",
                headers=headers,
            )
            assert res_uuid.status_code == 200
            data_uuid = res_uuid.json()
            assert data_uuid["id"] == existing_addr.id
            assert data_uuid["public_id"] == str(existing_addr.public_id)

        # 3. Non-existent identifier returns 404
        non_existent_uuid = uuid4()
        res_404 = await client.get(
            f"/api/v1/masters/addresses/{non_existent_uuid}", headers=headers
        )
        assert res_404.status_code == 404
        assert "not found" in res_404.json().get("detail", "").lower()
