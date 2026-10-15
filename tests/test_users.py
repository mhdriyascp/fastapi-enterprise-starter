import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.users.models import User
from app.modules.users.schemas import UserUpdate
from app.modules.users.service import UserService


@pytest.mark.asyncio
async def test_users_service_roles_and_guards() -> None:
    """Verifies that UserService properly enriches roles and enforces super admin protection."""
    async with SessionFactory() as db:
        service = UserService(db)

        # 1. Fetch super admin user
        super_admin_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = super_admin_res.scalar_one_or_none()
        assert super_admin is not None

        # Verify super admin check
        assert await service.is_super_admin(super_admin) is True

        # 2. Create a normal test user
        test_email = f"operator_{uuid.uuid4().hex[:8]}@test.com"
        normal_user = User(
            first_name="Test",
            last_name="Operator",
            display_name="Test Operator",
            email=test_email,
            password_hash="mock_hash",
            status="active",
        )
        db.add(normal_user)
        await db.commit()
        await db.refresh(normal_user)

        assert await service.is_super_admin(normal_user) is False

        # 3. Non-superadmin cannot modify superadmin
        with pytest.raises(PermissionError):
            await service.update_user(
                super_admin,
                UserUpdate(first_name="Hacked"),
                current_user=normal_user,
            )

        # 4. Superadmin can update normal user
        updated_normal = await service.update_user(
            normal_user,
            UserUpdate(first_name="UpdatedName", phone="+1234567890"),
            current_user=super_admin,
        )
        assert updated_normal.first_name == "UpdatedName"
        assert updated_normal.phone == "+1234567890"

        # 5. Non-superadmin cannot delete superadmin
        with pytest.raises(PermissionError):
            await service.delete_user(super_admin, current_user=normal_user)

        # 6. Cannot delete self
        with pytest.raises(ValueError):
            await service.delete_user(super_admin, current_user=super_admin)

        # 7. Superadmin can toggle status of normal user
        toggled = await service.toggle_user_status(
            normal_user, current_user=super_admin
        )
        assert toggled.status == "suspended"

        toggled_back = await service.toggle_user_status(
            normal_user, current_user=super_admin
        )
        assert toggled_back.status == "active"

        # 8. Superadmin can delete normal user
        await service.delete_user(normal_user, current_user=super_admin)
        assert normal_user.deleted_at is not None
        assert normal_user.status == "disabled"


@pytest.mark.asyncio
async def test_users_api_endpoints() -> None:
    """Tests /api/v1/users endpoints with JWT authentication and RBAC guards."""
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
        # 1. GET /api/v1/users
        res = await client.get("/api/v1/users?page=1&page_size=10", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert len(data["items"]) > 0
        first_user = data["items"][0]
        assert "roles" in first_user
        assert "is_super_admin" in first_user

        # 2. GET /api/v1/auth/me includes roles and is_super_admin
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["is_super_admin"] is True
        assert "super_admin" in me_data["roles"]
