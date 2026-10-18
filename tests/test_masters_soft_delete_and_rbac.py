from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.models.base_entity import AuditEntityBase
from app.infrastructure.database.models.masters import (
    Address,
    AddressType,
    Brand,
    City,
    CommunicationType,
    Country,
    Currency,
    DocumentType,
    IdentificationType,
    Industry,
    Language,
    State,
    Tax,
    TimeZone,
    UnitOfMeasure,
)
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.masters.common.crud_service import (
    create_record,
    deactivate_record,
    list_records,
    restore_record,
)
from app.modules.rbac.models import Permission, Role, RolePermission, UserRole
from app.modules.users.models import User
from app.shared.deletion_policy import (
    is_user_authorized_for_hard_delete,
    is_user_authorized_for_restore,
)

ALL_MASTER_MODELS = [
    Address,
    AddressType,
    Brand,
    City,
    CommunicationType,
    Country,
    Currency,
    DocumentType,
    IdentificationType,
    Industry,
    Language,
    State,
    Tax,
    TimeZone,
    UnitOfMeasure,
]


def test_all_15_master_models_inherit_audit_entity_base() -> None:
    """Verifies that all 15 master models inherit from AuditEntityBase with soft delete fields."""
    for model in ALL_MASTER_MODELS:
        assert issubclass(model, AuditEntityBase), (
            f"{model.__name__} must inherit from AuditEntityBase"
        )
        assert hasattr(model, "is_deleted"), f"{model.__name__} missing is_deleted"
        assert hasattr(model, "deleted_at"), f"{model.__name__} missing deleted_at"
        assert hasattr(model, "created_by_id"), (
            f"{model.__name__} missing created_by_id"
        )
        assert hasattr(model, "updated_by_id"), (
            f"{model.__name__} missing updated_by_id"
        )


@pytest.mark.asyncio
async def test_master_service_soft_delete_and_restore_lifecycle() -> None:
    """Verifies soft delete, restore, and hard delete in crud_service with operator tracking."""
    async with SessionFactory() as db:
        # Get admin user for operator tracking
        user = (
            await db.scalars(
                select(User).where(User.email == settings.seed_super_admin_email)
            )
        ).first()
        assert user is not None

        # Create a test Industry
        industry_data = {
            "code": "TEST_IND_SOFT_DEL",
            "name": "Soft Delete Test Industry",
            "description": "Testing soft delete lifecycle",
        }

        # Cleanup existing if any
        existing = (
            await db.scalars(
                select(Industry).where(Industry.code == "TEST_IND_SOFT_DEL")
            )
        ).first()
        if existing:
            await db.delete(existing)
            await db.commit()

        ind = await create_record(db, Industry, industry_data, operator_id=user.id)
        assert ind.is_deleted is False
        assert ind.deleted_at is None
        assert ind.is_active is True
        assert ind.created_by_id == user.id

        # Perform soft delete
        await deactivate_record(
            db, Industry, ind.public_id, hard_delete=False, operator_id=user.id
        )
        await db.refresh(ind)

        assert ind.is_deleted is True
        assert isinstance(ind.deleted_at, datetime)
        assert ind.is_active is False
        assert ind.updated_by_id == user.id

        # Verify excluded in regular list_records
        records, total = await list_records(db, Industry, include_deleted=False)
        assert not any(r.code == "TEST_IND_SOFT_DEL" for r in records)

        # Verify included when include_deleted=True
        records_all, total_all = await list_records(db, Industry, include_deleted=True)
        assert any(r.code == "TEST_IND_SOFT_DEL" for r in records_all)

        # Perform restore
        restored = await restore_record(
            db, Industry, ind.public_id, operator_id=user.id
        )
        assert restored.is_deleted is False
        assert restored.deleted_at is None
        assert restored.is_active is True
        assert restored.updated_by_id == user.id

        # Perform hard delete
        await deactivate_record(
            db, Industry, ind.public_id, hard_delete=True, operator_id=user.id
        )
        purged = (
            await db.scalars(
                select(Industry).where(Industry.code == "TEST_IND_SOFT_DEL")
            )
        ).first()
        assert purged is None


@pytest.mark.asyncio
async def test_rbac_master_soft_delete_restore_and_hard_delete() -> None:
    """Verifies that non-admin roles perform actions only when granted explicit RBAC permissions."""
    async with SessionFactory() as db:
        # Create or find a test role
        role = (
            await db.scalars(select(Role).where(Role.code == "test_master_operator"))
        ).first()
        if not role:
            role = Role(
                name="Test Master Operator",
                code="test_master_operator",
                description="Custom role for testing RBAC",
                is_system=False,
                is_active=True,
            )
            db.add(role)
            await db.commit()
            await db.refresh(role)

        # Create or find a test user
        test_user = (
            await db.scalars(
                select(User).where(User.email == "test_operator@example.com")
            )
        ).first()
        if not test_user:
            test_user = User(
                email="test_operator@example.com",
                first_name="Test",
                last_name="Operator",
                password_hash="test_hash",
                status="active",
            )
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)

        # Assign role to user
        ur = (
            await db.scalars(
                select(UserRole).where(
                    UserRole.user_id == test_user.id,
                    UserRole.role_id == role.id,
                )
            )
        ).first()
        if not ur:
            db.add(UserRole(user_id=test_user.id, role_id=role.id))
            await db.commit()

        # Ensure permissions exist
        perm_read = (
            await db.scalars(
                select(Permission).where(Permission.code == "masters:read")
            )
        ).first()
        perm_delete = (
            await db.scalars(
                select(Permission).where(Permission.code == "masters:delete")
            )
        ).first()
        perm_restore = (
            await db.scalars(
                select(Permission).where(Permission.code == "masters:restore")
            )
        ).first()
        perm_hard = (
            await db.scalars(
                select(Permission).where(Permission.code == "masters:hard_delete")
            )
        ).first()

        assert perm_read and perm_delete and perm_restore and perm_hard

        # Clear existing permissions for this role
        existing_rps = (
            await db.scalars(
                select(RolePermission).where(RolePermission.role_id == role.id)
            )
        ).all()
        for rp in existing_rps:
            await db.delete(rp)
        await db.commit()

        # Phase 1: Only masters:read and masters:delete assigned
        db.add(RolePermission(role_id=role.id, permission_id=perm_read.id))
        db.add(RolePermission(role_id=role.id, permission_id=perm_delete.id))
        await db.commit()

        # Verify deletion_policy evaluations
        assert (
            await is_user_authorized_for_hard_delete(db, test_user, "masters") is False
        )
        assert await is_user_authorized_for_restore(db, test_user, "masters") is False

        # Phase 2: Add masters:restore
        db.add(RolePermission(role_id=role.id, permission_id=perm_restore.id))
        await db.commit()
        assert await is_user_authorized_for_restore(db, test_user, "masters") is True
        assert (
            await is_user_authorized_for_hard_delete(db, test_user, "masters") is False
        )

        # Phase 3: Add masters:hard_delete
        db.add(RolePermission(role_id=role.id, permission_id=perm_hard.id))
        await db.commit()
        assert (
            await is_user_authorized_for_hard_delete(db, test_user, "masters") is True
        )

        # Test API endpoints via client
        token = create_access_token(test_user.id)
        headers = {"Authorization": f"Bearer {token}"}

        # Create a brand record to test API endpoints
        brand_data = {
            "code": "BRAND_RBAC_TEST",
            "name": "RBAC Test Brand",
            "description": "API testing RBAC",
        }
        existing_brand = (
            await db.scalars(select(Brand).where(Brand.code == "BRAND_RBAC_TEST"))
        ).first()
        if existing_brand:
            await db.delete(existing_brand)
            await db.commit()

        test_brand = await create_record(db, Brand, brand_data)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # Soft delete via API
        del_res = await client.delete(
            f"/api/v1/masters/brands/{test_brand.public_id}",
            headers=headers,
        )
        assert del_res.status_code == 204

        # Restore via API
        restore_res = await client.post(
            f"/api/v1/masters/brands/{test_brand.public_id}/restore",
            headers=headers,
        )
        assert restore_res.status_code == 200
        restored_json = restore_res.json()
        assert restored_json["is_deleted"] is False
        assert restored_json["is_active"] is True

        # Permanent purge via API with hard_delete=true
        hard_del_res = await client.delete(
            f"/api/v1/masters/brands/{test_brand.public_id}?hard_delete=true",
            headers=headers,
        )
        assert hard_del_res.status_code == 204

        # Confirm 404 after permanent deletion
        get_res = await client.get(
            f"/api/v1/masters/brands/{test_brand.public_id}",
            headers=headers,
        )
        assert get_res.status_code == 404
