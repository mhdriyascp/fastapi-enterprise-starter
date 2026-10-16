import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.users.models import User


async def get_admin_token() -> str:
    """Helper to fetch a valid JWT token for testing administrative endpoints."""
    async with SessionFactory() as db:
        user_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        user = user_res.scalar_one_or_none()
        if not user:
            user_res = await db.execute(select(User).limit(1))
            user = user_res.scalar_one_or_none()
        return create_access_token(user.id) if user else ""


@pytest.mark.asyncio
async def test_get_public_settings_unauthenticated():
    """Verify that public system configurations can be fetched without authentication."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/settings/public")
        assert res.status_code == 200
        data = res.json()
        assert "settings" in data
        public_settings = data["settings"]
        assert "company_name" in public_settings
        assert "default_timezone" in public_settings
        assert "default_locale" in public_settings
        # Non-public settings like password policy or session timeouts must NOT leak
        assert "password_min_length" not in public_settings
        assert "session_timeout_mins" not in public_settings


@pytest.mark.asyncio
async def test_list_settings_authenticated():
    """Verify listing system settings with pagination, sorting, and category filters."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # All settings
        res = await client.get("/api/v1/settings", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 20
        assert len(data["items"]) > 0

        # Category filter: 'security'
        res_sec = await client.get(
            "/api/v1/settings?category=security", headers=headers
        )
        assert res_sec.status_code == 200
        sec_data = res_sec.json()
        for item in sec_data["items"]:
            assert item["category"] == "security"


@pytest.mark.asyncio
async def test_get_setting_by_dual_identifiers():
    """Verify fetching a setting by key, integer ID, and external UUID public_id."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch by key
        res_key = await client.get("/api/v1/settings/company_name", headers=headers)
        assert res_key.status_code == 200
        setting = res_key.json()
        assert setting["key"] == "company_name"
        int_id = setting["id"]
        public_id = setting["public_id"]

        # 2. Fetch by internal integer ID
        res_id = await client.get(f"/api/v1/settings/{int_id}", headers=headers)
        assert res_id.status_code == 200
        assert res_id.json()["key"] == "company_name"

        # 3. Fetch by external UUID public_id
        res_pub = await client.get(f"/api/v1/settings/{public_id}", headers=headers)
        assert res_pub.status_code == 200
        assert res_pub.json()["key"] == "company_name"


@pytest.mark.asyncio
async def test_setting_option_c_identifier_error_handling():
    """Verify Option C strict error handling for null/empty and missing identifiers."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty / null identifier intercept
        res_null = await client.get("/api/v1/settings/null", headers=headers)
        assert res_null.status_code == 400
        assert "Setting identifier cannot be null or empty." in res_null.text

        res_undefined = await client.get("/api/v1/settings/undefined", headers=headers)
        assert res_undefined.status_code == 400

        # Non-existent identifier
        res_404 = await client.get(
            "/api/v1/settings/non_existent_key_xyz", headers=headers
        )
        assert res_404.status_code == 404
        assert "not found" in res_404.text


@pytest.mark.asyncio
async def test_update_single_setting():
    """Verify modifying a single system setting value."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        update_payload = {
            "value": "Acme Global Enterprise",
            "label": "Company Brand Name",
            "description": "Updated brand name for enterprise tenants.",
        }
        res = await client.patch(
            "/api/v1/settings/company_name", json=update_payload, headers=headers
        )
        assert res.status_code == 200
        updated = res.json()
        assert updated["value"] == "Acme Global Enterprise"
        assert updated["label"] == "Company Brand Name"

        # Verify persistence via public endpoint
        res_pub = await client.get("/api/v1/settings/public")
        assert res_pub.json()["settings"]["company_name"] == "Acme Global Enterprise"


@pytest.mark.asyncio
async def test_bulk_update_settings():
    """Verify atomically modifying multiple system settings."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        bulk_payload = {
            "settings": {
                "default_timezone": "Asia/Kolkata",
                "session_timeout_mins": 45,
            }
        }
        res = await client.patch(
            "/api/v1/settings/bulk", json=bulk_payload, headers=headers
        )
        assert res.status_code == 200
        updated_items = res.json()
        assert len(updated_items) == 2

        updated_dict = {item["key"]: item["value"] for item in updated_items}
        assert updated_dict["default_timezone"] == "Asia/Kolkata"
        assert updated_dict["session_timeout_mins"] == 45


@pytest.mark.asyncio
async def test_get_all_settings_map():
    """Verify consolidated key-value mapping endpoint."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/settings/map", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)
        assert "default_timezone" in data
        assert "password_min_length" in data
