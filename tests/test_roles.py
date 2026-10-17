import pytest

from app.infrastructure.database.session import SessionFactory
from app.modules.rbac.service import RoleService


@pytest.mark.asyncio
async def test_roles_priority_ordering() -> None:
    """Verifies that RoleService.list_roles orders super_admin and admin first."""
    async with SessionFactory() as db:
        service = RoleService(db)
        roles, total = await service.list_roles(page=1, page_size=100)

        assert total >= 2
        assert len(roles) >= 2

        # Role codes in returned order
        role_codes = [r.code for r in roles]

        # super_admin must be 1st
        assert role_codes[0] == "super_admin", (
            f"Expected super_admin first, got {role_codes[0]}"
        )

        # admin must be 2nd
        assert role_codes[1] == "admin", f"Expected admin second, got {role_codes[1]}"


@pytest.mark.asyncio
async def test_composite_primary_keys_user_role_and_role_permission() -> None:
    """Verifies that UserRole and RolePermission use composite primary keys without synthetic id."""
    from sqlalchemy.inspection import inspect

    from app.modules.rbac.models import RolePermission, UserRole

    ur_pk = [c.name for c in inspect(UserRole).primary_key]
    assert sorted(ur_pk) == ["role_id", "user_id"]
    assert "id" not in [c.key for c in inspect(UserRole).columns]

    rp_pk = [c.name for c in inspect(RolePermission).primary_key]
    assert sorted(rp_pk) == ["permission_id", "role_id"]
    assert "id" not in [c.key for c in inspect(RolePermission).columns]


@pytest.mark.asyncio
async def test_roles_and_permissions_paged_response_api() -> None:
    """Verifies that GET /roles and GET /permissions return standardized PagedResponse envelopes."""
    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.security import create_access_token
    from app.main import app
    from app.modules.users.models import User

    async with SessionFactory() as db:
        super_admin_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = super_admin_res.scalar_one()
        token = create_access_token(super_admin.id)

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # 1. Test /roles pagination envelope
        res_roles = await client.get(
            "/api/v1/roles?page=1&page_size=5", headers=headers
        )
        assert res_roles.status_code == 200
        roles_data = res_roles.json()
        assert "items" in roles_data
        assert "total" in roles_data
        assert "page" in roles_data
        assert "page_size" in roles_data
        assert "total_pages" in roles_data
        assert roles_data["page"] == 1
        assert roles_data["page_size"] == 5
        assert isinstance(roles_data["items"], list)

        # 2. Test /permissions pagination envelope
        res_perms = await client.get(
            "/api/v1/permissions?page=1&page_size=10", headers=headers
        )
        assert res_perms.status_code == 200
        perms_data = res_perms.json()
        assert "items" in perms_data
        assert "total" in perms_data
        assert "page" in perms_data
        assert "page_size" in perms_data
        assert "total_pages" in perms_data
        assert perms_data["page"] == 1
        assert perms_data["page_size"] == 10
        assert isinstance(perms_data["items"], list)

        # 3. Test /roles/{identifier} dual lookup (by UUID and by code)
        role_item = roles_data["items"][0]
        role_uuid = role_item["id"]
        role_code = role_item["code"]

        # by UUID
        res_by_uuid = await client.get(f"/api/v1/roles/{role_uuid}", headers=headers)
        assert res_by_uuid.status_code == 200
        assert res_by_uuid.json()["id"] == role_uuid

        # by code
        res_by_code = await client.get(f"/api/v1/roles/{role_code}", headers=headers)
        assert res_by_code.status_code == 200
        assert res_by_code.json()["code"] == role_code

        # null identifier rejection
        res_bad = await client.get("/api/v1/roles/null", headers=headers)
        assert res_bad.status_code == 400


@pytest.mark.asyncio
async def test_permission_soft_delete_and_restore() -> None:
    """Verifies that Permission supports soft-deletion (deactivation) and restoration."""
    import uuid

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.security import create_access_token
    from app.main import app
    from app.modules.users.models import User

    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()
        token = create_access_token(super_admin.id)

    headers = {"Authorization": f"Bearer {token}"}
    test_resource = f"res_{uuid.uuid4().hex[:6]}"
    test_action = "inspect"
    test_code = f"{test_resource}.{test_action}"

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # 1. Create custom permission
        create_res = await client.post(
            "/api/v1/permissions",
            json={
                "name": "Test Permission",
                "code": test_code,
                "resource": test_resource,
                "action": test_action,
                "description": "Permission for soft delete test",
            },
            headers=headers,
        )
        assert create_res.status_code == 201, create_res.text
        perm_id = create_res.json()["id"]

        # 2. Soft-delete permission
        soft_del_res = await client.delete(
            f"/api/v1/permissions/{perm_id}?hard_delete=false",
            headers=headers,
        )
        assert soft_del_res.status_code == 204

        # 3. Verify it is inactive
        get_res = await client.get(f"/api/v1/permissions/{perm_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["is_active"] is False

        # 4. Restore permission
        restore_res = await client.post(
            f"/api/v1/permissions/{perm_id}/restore",
            headers=headers,
        )
        assert restore_res.status_code == 200
        assert restore_res.json()["is_active"] is True

        # 5. Hard delete permission
        hard_del_res = await client.delete(
            f"/api/v1/permissions/{perm_id}?hard_delete=true",
            headers=headers,
        )
        assert hard_del_res.status_code == 204

        # Verify not found
        get_after = await client.get(f"/api/v1/permissions/{perm_id}", headers=headers)
        assert get_after.status_code == 404
