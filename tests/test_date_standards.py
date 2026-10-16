"""Tests verifying API-level standardized date formatting across all modules."""

import re
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.shared.base_schema import BaseSchema, format_iso_utc
from app.shared.response import PagedResponse, StandardJSONResponse

# Standard enterprise ISO 8601 UTC format regex: YYYY-MM-DDTHH:MM:SSZ
STANDARD_ISO_UTC_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


class SampleResponseModel(BaseSchema):
    name: str
    created_at: datetime
    updated_at: datetime | None = None


def test_format_iso_utc_helper():
    """Verify format_iso_utc converts timestamps to second-precision UTC strings."""
    # Test naive datetime
    dt_naive = datetime(2026, 10, 16, 5, 54, 55, 406703)
    formatted = format_iso_utc(dt_naive)
    assert formatted == "2026-10-16T05:54:55Z"
    assert STANDARD_ISO_UTC_REGEX.match(formatted)

    # Test aware UTC datetime
    dt_utc = datetime(2026, 10, 16, 5, 54, 55, 406703, tzinfo=UTC)
    formatted_utc = format_iso_utc(dt_utc)
    assert formatted_utc == "2026-10-16T05:54:55Z"
    assert STANDARD_ISO_UTC_REGEX.match(formatted_utc)

    # Test None
    assert format_iso_utc(None) is None


def test_base_schema_datetime_serialization():
    """Verify BaseSchema models serialize datetimes in standard format when dumped."""
    dt = datetime(2026, 10, 16, 5, 54, 55, 999999, tzinfo=UTC)
    model = SampleResponseModel(name="Enterprise Co", created_at=dt)
    dumped = model.model_dump(mode="json")

    assert dumped["created_at"] == "2026-10-16T05:54:55Z"
    assert dumped["updated_at"] is None
    assert STANDARD_ISO_UTC_REGEX.match(dumped["created_at"])


def test_standard_json_response_microsecond_stripping():
    """Verify StandardJSONResponse strips microseconds and offsets from JSON output."""
    raw_payload = {
        "created_at": "2026-10-16T05:54:55.406703Z",
        "updated_at": "2026-10-16T16:12:44.762822+00:00",
        "items": [
            {"timestamp": "2026-10-16T12:00:00.123456+02:00"},
            {"plain_text": "Non-date string with T letter"},
        ],
    }

    response = StandardJSONResponse(content=raw_payload)
    rendered = response.body.decode("utf-8")

    assert "2026-10-16T05:54:55Z" in rendered
    assert "2026-10-16T16:12:44Z" in rendered
    assert "2026-10-16T10:00:00Z" in rendered
    assert "Non-date string with T letter" in rendered
    assert ".406703" not in rendered


def test_paged_response_datetime_serialization():
    """Verify PagedResponse encloses items with standardized dates."""
    items = [
        SampleResponseModel(
            name=f"Item {i}",
            created_at=datetime(2026, 10, 16, 10, i, 0, 123456, tzinfo=UTC),
        )
        for i in range(3)
    ]
    paged = PagedResponse.build(items=items, total=3, page=1, page_size=10)
    dumped = paged.model_dump(mode="json")

    for item in dumped["items"]:
        assert STANDARD_ISO_UTC_REGEX.match(item["created_at"])
        assert "." not in item["created_at"]


@pytest.mark.asyncio
async def test_api_endpoints_return_standard_dates():
    """Verify live API endpoints return standard dates without microsecond noise."""
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.security import create_access_token
    from app.infrastructure.database.session import SessionFactory
    from app.modules.users.models import User

    async with SessionFactory() as db:
        user_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        user = user_res.scalar_one_or_none()
        if not user:
            user_res = await db.execute(select(User).limit(1))
            user = user_res.scalar_one_or_none()
        token = create_access_token(user.id) if user else ""

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/organizations", headers=headers)
        if res.status_code == 200:
            data = res.json()
            for item in data.get("items", []):
                created_at = item.get("created_at")
                if created_at:
                    assert STANDARD_ISO_UTC_REGEX.match(created_at), (
                        f"Invalid date: {created_at}"
                    )
                    assert "." not in created_at
                updated_at = item.get("updated_at")
                if updated_at:
                    assert STANDARD_ISO_UTC_REGEX.match(updated_at), (
                        f"Invalid date: {updated_at}"
                    )
                    assert "." not in updated_at


def test_base_schema_inbound_offset_datetime_normalized_to_utc():
    """Verify that inbound datetimes with regional offsets are normalized to UTC upon ingestion."""
    # 14:30 in EDT (-04:00) is 18:30 in UTC
    payload = {"name": "Inbound Deal", "created_at": "2026-10-16T14:30:00-04:00"}
    model = SampleResponseModel.model_validate(payload)

    assert model.created_at.tzinfo == UTC
    assert model.created_at.hour == 18
    assert model.created_at.minute == 30
    assert model.created_at.utcoffset().total_seconds() == 0


def test_base_schema_inbound_naive_datetime_interpreted_as_utc():
    """Verify that inbound naive datetimes are safely interpreted as UTC."""
    payload = {"name": "Naive Deal", "created_at": "2026-10-16T18:30:00"}
    model = SampleResponseModel.model_validate(payload)

    assert model.created_at.tzinfo == UTC
    assert model.created_at.hour == 18
    assert model.created_at.minute == 30
    assert model.created_at.utcoffset().total_seconds() == 0
