import pytest
from sqlalchemy import select

from app.infrastructure.database.models.masters.country import Country
from app.infrastructure.database.models.masters.currency import Currency
from app.infrastructure.database.session import SessionFactory
from app.modules.masters.common.crud_service import (
    create_record,
    list_records,
    update_record,
)
from app.modules.masters.schemas.country import (
    CountryCreate,
    CountryResponse,
    CountryUpdate,
)
from app.modules.users.models import User  # noqa: F401


def test_country_schema_supports_default_currency() -> None:
    """Verifies that CountryCreate, CountryUpdate, and CountryResponse support default_currency_id."""
    create_data = {
        "code": "ZZ",
        "iso3_code": "ZZZ",
        "name": "Zanzibar Test Country",
        "phone_code": "+999",
        "default_currency_id": 1,
    }
    schema = CountryCreate.model_validate(create_data)
    assert schema.default_currency_id == 1

    update_schema = CountryUpdate(default_currency_id=2)
    assert update_schema.default_currency_id == 2


@pytest.mark.asyncio
async def test_country_currency_persistence_and_eager_loading() -> None:
    """Tests that Country records store default_currency_id and eager-load default_currency."""
    async with SessionFactory() as db:
        # Fetch an active currency from seeds
        currency = (
            await db.scalars(select(Currency).where(Currency.code == "USD"))
        ).first()
        assert currency is not None, "USD currency must exist from seeds"

        # Create a new country linked to USD
        country_data = {
            "code": "TX",
            "iso3_code": "TXX",
            "name": "Test Country X",
            "phone_code": "+888",
            "default_currency_id": currency.id,
        }

        # Check existing and cleanup if needed
        existing = (
            await db.scalars(select(Country).where(Country.code == "TX"))
        ).first()
        if existing:
            await db.delete(existing)
            await db.commit()

        country = await create_record(db, Country, country_data)
        assert country.id is not None
        assert country.default_currency_id == currency.id
        assert country.default_currency is not None
        assert country.default_currency.code == "USD"

        # Validate Pydantic serialization
        response_model = CountryResponse.model_validate(country)
        assert response_model.default_currency_id == currency.id
        assert response_model.default_currency is not None
        assert response_model.default_currency.code == "USD"

        # Test listing with filter
        records, total = await list_records(
            db,
            Country,
            filters={"default_currency_id": currency.id},
        )
        assert total >= 1
        found = any(c.code == "TX" for c in records)
        assert found

        # Test updating default_currency_id
        inr_currency = (
            await db.scalars(select(Currency).where(Currency.code == "INR"))
        ).first()
        assert inr_currency is not None

        updated_country = await update_record(
            db,
            Country,
            country.id,
            {"default_currency_id": inr_currency.id},
        )
        assert updated_country.default_currency_id == inr_currency.id
        assert updated_country.default_currency.code == "INR"

        # Clean up
        await db.delete(country)
        await db.commit()
