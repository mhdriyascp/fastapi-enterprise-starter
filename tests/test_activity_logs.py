import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.activity_logs.service import ActivityLogService, record_activity
from app.modules.organizations.schemas import OrganizationCreate
from app.modules.organizations.service import OrganizationService
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_activity_log_service_and_recording() -> None:
    """Verifies that record_activity and ActivityLogService queries function correctly."""
    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()

        unique_key = f"TEST_AUDIT_{uuid.uuid4().hex[:6]}"

        # 1. Record an activity
        log = await record_activity(
            db=db,
            module="test_module",
            action="CREATE",
            entity_type="TestEntity",
            entity_id=unique_key,
            entity_name="Test Entity Name",
            details={"key": unique_key, "value": 123},
            user_id=super_admin.id,
            user_email=super_admin.email,
        )
        await db.commit()

        assert log is not None
        assert log.id is not None
        assert log.public_id is not None
        assert log.module == "test_module"
        assert log.action == "CREATE"

        # 2. Query logs via service
        service = ActivityLogService(db)
        logs, total = await service.list_logs(
            module="test_module",
            search=unique_key,
        )
        assert total >= 1
        assert any(item.entity_id == unique_key for item in logs)

        # 3. Dual lookup by public_id and integer id
        by_uuid = await service.get_by_identifier(log.public_id)
        assert by_uuid is not None
        assert by_uuid.entity_id == unique_key

        by_int = await service.get_by_identifier(log.id)
        assert by_int is not None
        assert by_int.entity_id == unique_key

        # 4. Check distinct modules
        modules = await service.get_distinct_modules()
        assert "test_module" in modules


@pytest.mark.asyncio
async def test_organization_mutation_triggers_activity_log() -> None:
    """Verifies that creating and updating an organization writes audit logs."""
    async with SessionFactory() as db:
        org_service = OrganizationService(db)
        log_service = ActivityLogService(db)

        unique_code = f"AUDIT_ORG_{uuid.uuid4().hex[:6].upper()}"
        unique_name = f"Audit Corporation {uuid.uuid4().hex[:4]}"

        created_org = await org_service.create(
            OrganizationCreate(
                name=unique_name,
                code=unique_code,
                legal_name="Audit Corp Ltd",
            )
        )

        # Verify activity log was recorded
        logs, total = await log_service.list_logs(
            module="organizations",
            action="CREATE",
            search=unique_name,
        )
        assert total >= 1
        assert any(log.entity_name == unique_name for log in logs)

        # Cleanup
        await org_service.delete(created_org, hard_delete=True)


@pytest.mark.asyncio
async def test_system_logs_api_endpoints() -> None:
    """Verifies GET /api/v1/system-logs, /modules, and /{identifier} API responses."""
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
        # 1. Test paged response
        res = await client.get(
            "/api/v1/system-logs?page=1&page_size=10", headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

        # 2. Test modules list
        res_modules = await client.get("/api/v1/system-logs/modules", headers=headers)
        assert res_modules.status_code == 200
        assert isinstance(res_modules.json(), list)

        # 3. Test detail endpoint if items exist
        if data["items"]:
            first_log = data["items"][0]
            res_detail = await client.get(
                f"/api/v1/system-logs/{first_log['public_id']}",
                headers=headers,
            )
            assert res_detail.status_code == 200
            assert res_detail.json()["public_id"] == first_log["public_id"]


@pytest.mark.asyncio
async def test_system_logs_restricted_to_administrators() -> None:
    """Verifies that non-admin accounts without activity_logs permissions receive 403 Forbidden."""
    async with SessionFactory() as db:
        user = User(
            first_name="Regular",
            last_name="Auditor",
            display_name="Regular Auditor",
            email="regular_auditor_logs_test@example.com",
            password_hash="mock_hash",
            status="active",
        )
        existing = (
            await db.scalars(
                select(User).where(
                    User.email == "regular_auditor_logs_test@example.com"
                )
            )
        ).first()
        if existing:
            await db.delete(existing)
            await db.commit()

        db.add(user)
        await db.commit()
        await db.refresh(user)
        non_admin_token = create_access_token(user.id)
        user_id = user.id

    headers = {"Authorization": f"Bearer {non_admin_token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated access returns 401 Unauthorized
        unauth_res = await client.get("/api/v1/system-logs")
        assert unauth_res.status_code == 401

        # 2. Non-admin accessing /api/v1/system-logs returns 403 Forbidden
        list_res = await client.get("/api/v1/system-logs", headers=headers)
        assert list_res.status_code == 403
        assert "restricted" in list_res.json().get("detail", "").lower()

        # 3. Non-admin accessing /api/v1/system-logs/modules returns 403 Forbidden
        modules_res = await client.get("/api/v1/system-logs/modules", headers=headers)
        assert modules_res.status_code == 403

    # Cleanup test user
    async with SessionFactory() as db:
        user_to_delete = await db.get(User, user_id)
        if user_to_delete:
            await db.delete(user_to_delete)
            await db.commit()


@pytest.mark.asyncio
async def test_delete_and_bulk_delete_activity_logs() -> None:
    """Verifies single delete and bulk delete endpoints for system activity logs."""
    async with SessionFactory() as db:
        res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = res.scalar_one()
        token = create_access_token(super_admin.id)

        # Create 3 test activity logs
        log1 = await record_activity(
            db=db,
            module="deletion_test",
            action="TEST_DELETE_1",
            entity_type="TestItem",
            entity_id="del-1",
        )
        log2 = await record_activity(
            db=db,
            module="deletion_test",
            action="TEST_DELETE_2",
            entity_type="TestItem",
            entity_id="del-2",
        )
        log3 = await record_activity(
            db=db,
            module="deletion_test",
            action="TEST_DELETE_3",
            entity_type="TestItem",
            entity_id="del-3",
        )
        await db.commit()

        log1_id = str(log1.public_id)
        log2_id = str(log2.public_id)
        log3_id = str(log3.id)

    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Single delete log1 by UUID
        del_res = await client.delete(f"/api/v1/system-logs/{log1_id}", headers=headers)
        assert del_res.status_code == 204

        # Confirm log1 is gone
        get_res = await client.get(f"/api/v1/system-logs/{log1_id}", headers=headers)
        assert get_res.status_code == 404

        # 2. Bulk delete log2 (by UUID) and log3 (by int ID) using identifiers
        bulk_res = await client.post(
            "/api/v1/system-logs/bulk-delete",
            json={"identifiers": [log2_id, log3_id]},
            headers=headers,
        )
        assert bulk_res.status_code == 200
        data = bulk_res.json()
        assert data["success"] is True
        assert data["deleted_count"] == 2

        # 3. Clear all activity logs
        clear_res = await client.post(
            "/api/v1/system-logs/clear-all",
            headers=headers,
        )
        assert clear_res.status_code == 200
        clear_data = clear_res.json()
        assert clear_data["success"] is True
        assert "deleted_count" in clear_data

        # Verify list returns 0 logs
        list_after = await client.get("/api/v1/system-logs", headers=headers)
        assert list_after.status_code == 200
        assert list_after.json()["total"] == 0
