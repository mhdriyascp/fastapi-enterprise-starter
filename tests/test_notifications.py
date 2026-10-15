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
        assert created_data["title"] == unique_title
        assert created_data["is_read"] is False

        # 4. Mark notification as read via PATCH
        read_resp = await client.patch(
            f"/api/v1/notifications/{notif_id}/read",
            json={"is_read": True},
            headers=headers,
        )
        assert read_resp.status_code == 200
        assert read_resp.json()["is_read"] is True

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
