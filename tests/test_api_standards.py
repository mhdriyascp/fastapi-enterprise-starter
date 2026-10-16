"""Tests verifying enterprise API standards: Request IDs and structured error envelopes."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_request_id_and_structured_error_envelope() -> None:
    """Verifies that API returns X-Request-ID header and structured error envelope."""
    async with SessionFactory() as db:
        user_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        user = user_res.scalar_one()
        token = create_access_token(user.id)

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # 1. Successful response includes X-Request-ID
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert "x-request-id" in res.headers
        assert res.headers["x-request-id"].startswith("req_")

        # 2. 404 Error includes structured error envelope and X-Request-ID
        err_res = await client.get("/api/v1/organizations/99999999", headers=headers)
        assert err_res.status_code == 404
        assert "x-request-id" in err_res.headers

        data = err_res.json()
        assert "error" in data
        assert "code" in data["error"]
        assert data["error"]["code"] == "NOT_FOUND"
        assert data["error"]["type"] == "not_found_error"
        assert "message" in data["error"]
        assert "request_id" in data["error"]
        assert data["error"]["request_id"] == err_res.headers["x-request-id"]
        assert "detail" in data

        # 3. 422 Validation error returns param and VALIDATION_ERROR code
        val_res = await client.post(
            "/api/v1/organizations",
            headers=headers,
            json={"name": "X"},  # min_length is 2
        )
        assert val_res.status_code == 422
        val_data = val_res.json()
        assert "error" in val_data
        assert val_data["error"]["code"] == "VALIDATION_ERROR"
        assert val_data["error"]["type"] == "invalid_request_error"
        assert val_data["error"]["param"] == "name"

        # 4. Null and empty identifier checks return clean messages
        org_null_res = await client.get("/api/v1/organizations/null", headers=headers)
        assert org_null_res.status_code == 400
        assert (
            "Organization identifier cannot be null or empty"
            in org_null_res.json()["error"]["message"]
        )

        addr_null_res = await client.get(
            "/api/v1/masters/addresses/null", headers=headers
        )
        assert addr_null_res.status_code == 400
        assert (
            "Address identifier cannot be empty or null"
            in addr_null_res.json()["error"]["message"]
        )

        addr_post_null = await client.post(
            "/api/v1/masters/addresses",
            headers=headers,
            json={"address_type_id": None},
        )
        assert addr_post_null.status_code == 422
        assert (
            "Field 'address_type_id' cannot be null"
            in addr_post_null.json()["error"]["message"]
        )
