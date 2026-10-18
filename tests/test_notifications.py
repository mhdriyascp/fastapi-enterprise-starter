import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.notifications.schemas import NotificationCreate
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_notification_service_crud() -> None:
    """Verifies NotificationService business methods directly against the database."""
    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()

        service = NotificationService(db)

        # 1. Create notification
        notif = await service.create_notification(
            NotificationCreate(
                title="Direct Service Test",
                message="Testing notification service CRUD operations.",
                type="security",
                link="/security-audit",
                user_id=super_admin.id,
            )
        )
        assert notif.id is not None
        assert notif.is_read is False

        # 2. Verify unread count
        unread = await service.get_unread_count(super_admin.id)
        assert unread >= 1

        # 3. Mark as read
        updated = await service.mark_as_read(notif.id, super_admin.id, is_read=True)
        assert updated is not None
        assert updated.is_read is True
        assert updated.read_at is not None

        # 4. List notifications
        items, total = await service.list_for_user(super_admin.id, limit=10)
        assert total >= 1
        assert any(item.id == notif.id for item in items)

        # 5. Delete notification
        deleted = await service.delete_notification(notif.id, super_admin.id)
        assert deleted is True


@pytest.mark.asyncio
async def test_notifications_api_endpoints() -> None:
    """Verifies the REST API endpoints for Notifications with JWT authentication."""
    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()
        token = create_access_token(super_admin.id)

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Get initial unread count
        count_resp = await client.get(
            "/api/v1/notifications/unread-count", headers=headers
        )
        assert count_resp.status_code == 200
        assert "unread_count" in count_resp.json()

        # 2. List notifications
        list_resp = await client.get("/api/v1/notifications", headers=headers)
        assert list_resp.status_code == 200
        paged = list_resp.json()
        assert "items" in paged
        assert "total" in paged

        # 3. Create a test notification via POST
        unique_title = f"Alert {uuid.uuid4().hex[:6]}"
        create_resp = await client.post(
            "/api/v1/notifications",
            json={
                "title": unique_title,
                "message": "Security compliance patch deployed successfully.",
                "type": "security",
                "link": "/rbac",
            },
            headers=headers,
        )
        assert create_resp.status_code == 201
        created_data = create_resp.json()
        notif_id = created_data["id"]
        public_id = created_data["public_id"]
        assert isinstance(notif_id, int)
        assert isinstance(public_id, str)
        assert created_data["title"] == unique_title
        assert created_data["is_read"] is False

        # 4a. Mark notification as read via PATCH using internal integer ID
        read_resp = await client.patch(
            f"/api/v1/notifications/{notif_id}/read",
            json={"is_read": True},
            headers=headers,
        )
        assert read_resp.status_code == 200
        assert read_resp.json()["is_read"] is True

        # 4b. Toggle notification via PATCH using external UUID public_id
        toggle_resp = await client.patch(
            f"/api/v1/notifications/{public_id}/read",
            json={"is_read": False},
            headers=headers,
        )
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["is_read"] is False

        # 4c. Reject null or empty identifier with 400 Bad Request
        bad_resp = await client.patch(
            "/api/v1/notifications/null/read",
            json={"is_read": True},
            headers=headers,
        )
        assert bad_resp.status_code == 400

        # 5. Mark all as read
        mark_all_resp = await client.post(
            "/api/v1/notifications/mark-all-read",
            headers=headers,
        )
        assert mark_all_resp.status_code == 200
        assert "updated" in mark_all_resp.json()

        # 6. Delete notification via DELETE
        del_resp = await client.delete(
            f"/api/v1/notifications/{notif_id}",
            headers=headers,
        )
        assert del_resp.status_code == 204

        # 7. Verify deletion 404
        del_again_resp = await client.delete(
            f"/api/v1/notifications/{notif_id}",
            headers=headers,
        )
        assert del_again_resp.status_code == 404

        # 8. Test GET /api/v1/notifications/modules
        modules_resp = await client.get(
            "/api/v1/notifications/modules",
            headers=headers,
        )
        assert modules_resp.status_code == 200
        module_list = modules_resp.json()
        assert isinstance(module_list, list)
        assert "organizations" in module_list
        assert "security" in module_list

        # 9. Test creating a notification with an arbitrary custom module
        custom_module = "pipeline_analytics"
        custom_resp = await client.post(
            "/api/v1/notifications",
            json={
                "title": "Custom Module Notification",
                "message": "Custom module notification created successfully.",
                "type": custom_module,
                "link": "/analytics",
            },
            headers=headers,
        )
        assert custom_resp.status_code == 201
        custom_data = custom_resp.json()
        assert custom_data["type"] == custom_module

        # Clean up custom notification
        await client.delete(
            f"/api/v1/notifications/{custom_data['id']}",
            headers=headers,
        )


@pytest.mark.asyncio
async def test_dynamic_notification_modules_from_settings() -> None:
    """Verifies that supported notification modules are dynamic from settings and can be added/removed."""
    from app.infrastructure.database.models.system.setting import SystemSetting

    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()
        token = create_access_token(super_admin.id)

        # Retrieve current setting
        setting_stmt = select(SystemSetting).where(
            SystemSetting.category == "notifications",
            SystemSetting.key == "notification_modules",
        )
        setting_obj = (await db.execute(setting_stmt)).scalar_one_or_none()
        original_value = (
            list(setting_obj.value)
            if setting_obj and isinstance(setting_obj.value, list)
            else []
        )

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # 1. Fetch baseline modules
        base_res = await client.get("/api/v1/notifications/modules", headers=headers)
        assert base_res.status_code == 200
        base_modules = base_res.json()
        assert isinstance(base_modules, list)

        # 2. Update setting dynamically: add "telephony" and remove "deal"
        new_modules = [m for m in base_modules if m != "deal"] + ["telephony"]
        async with SessionFactory() as db:
            s_obj = (await db.execute(setting_stmt)).scalar_one()
            s_obj.value = new_modules
            await db.commit()

        # 3. Query modules endpoint again: must reflect additions and removals
        updated_res = await client.get("/api/v1/notifications/modules", headers=headers)
        assert updated_res.status_code == 200
        updated_modules = updated_res.json()
        assert "telephony" in updated_modules
        assert "deal" not in updated_modules

        # 4. Restore original setting
        async with SessionFactory() as db:
            s_obj = (await db.execute(setting_stmt)).scalar_one()
            s_obj.value = original_value
            await db.commit()


@pytest.mark.asyncio
async def test_clear_all_notifications() -> None:
    """Verifies DELETE /api/v1/notifications/clear-all deletes user notifications."""
    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()
        token = create_access_token(super_admin.id)

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # Create a test notification
        await client.post(
            "/api/v1/notifications",
            json={
                "title": "Clear All Test Notification",
                "message": "Testing clear all endpoint routing.",
                "type": "system",
            },
            headers=headers,
        )

        # Clear all
        clear_resp = await client.delete(
            "/api/v1/notifications/clear-all",
            headers=headers,
        )
        assert clear_resp.status_code == 200
        assert "deleted" in clear_resp.json()
