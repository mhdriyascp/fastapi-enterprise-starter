import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database.models.organization.organization import (
    Organization,
)
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.organizations.schemas import OrganizationCreate, OrganizationUpdate
from app.modules.organizations.service import OrganizationService
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_organization_service_crud_and_sorting() -> None:
    """Verifies OrganizationService CRUD, pagination, and dynamic sorting."""
    async with SessionFactory() as db:
        service = OrganizationService(db)

        unique_code = f"TEST_ORG_{uuid.uuid4().hex[:6].upper()}"
        unique_name = f"Zeta Corporation {uuid.uuid4().hex[:4]}"

        # 1. Create organization
        created = await service.create(
            OrganizationCreate(
                name=unique_name,
                code=unique_code,
                legal_name="Zeta Corp Ltd",
            )
        )
        assert created.id is not None
        assert created.code == unique_code
        assert created.name == unique_name
        assert created.is_active is True

        # 2. Dynamic sorting: ascending by name
        items_asc, total = await service.list(
            offset=0,
            limit=50,
            sort_by="name",
            sort_order="asc",
        )
        assert total >= 1
        assert len(items_asc) > 0
        names = [item.name for item in items_asc]
        assert names == sorted(names)

        # 3. Dynamic sorting: descending by name
        items_desc, _ = await service.list(
            offset=0,
            limit=50,
            sort_by="name",
            sort_order="desc",
        )
        names_desc = [item.name for item in items_desc]
        assert names_desc == sorted(names_desc, reverse=True)

        # 4. Search filtering
        searched_items, search_total = await service.list(
            search=unique_code,
        )
        assert search_total >= 1
        assert any(item.code == unique_code for item in searched_items)

        # 5. Update organization
        updated = await service.update(
            created,
            OrganizationUpdate(legal_name="Updated Zeta Corp Inc"),
        )
        assert updated.legal_name == "Updated Zeta Corp Inc"

        # 6. Status update
        deactivated = await service.update_status(created, False)
        assert deactivated.is_active is False

        # Cleanup
        await service.delete(created)


@pytest.mark.asyncio
async def test_organizations_api_paged_response() -> None:
    """Verifies that GET /api/v1/organizations returns a standardized PagedResponse envelope."""
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
        # GET /api/v1/organizations with pagination and sorting
        res = await client.get(
            "/api/v1/organizations?page=1&page_size=5&sort_by=name&sort_order=asc",
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()

        # Check PagedResponse envelope fields
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

        assert data["page"] == 1
        assert data["page_size"] == 5
        assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_branch_unique_constraint_per_org() -> None:
    """Verifies that Branch enforces UniqueConstraint("organization_id", "code")."""
    from sqlalchemy.exc import IntegrityError

    from app.infrastructure.database.models.organization.branch import Branch
    from app.infrastructure.database.models.organization.organization import (
        Organization,
    )

    async with SessionFactory() as db:
        org_code = f"BRANCH_TEST_{uuid.uuid4().hex[:6].upper()}"
        org = Organization(
            name="Branch Parent Org",
            code=org_code,
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # 1. First branch with code BR-01
        branch1 = Branch(
            organization_id=org.id,
            code="BR-01",
            name="Head Branch",
        )
        db.add(branch1)
        await db.commit()

        # 2. Duplicate branch code in same organization must fail
        branch2 = Branch(
            organization_id=org.id,
            code="BR-01",
            name="Duplicate Branch",
        )
        db.add(branch2)
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()

        # Cleanup
        await db.delete(branch1)
        await db.delete(org)
        await db.commit()


@pytest.mark.asyncio
async def test_organization_address_relationship() -> None:
    """Verifies ORM relationship() declarations on Organization and Address."""
    from app.infrastructure.database.models.masters.address import Address
    from app.infrastructure.database.models.organization.organization import (
        Organization,
    )

    async with SessionFactory() as db:
        org_code = f"REL_TEST_{uuid.uuid4().hex[:6].upper()}"
        org = Organization(
            name="Relationship Org",
            code=org_code,
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        addr = Address(
            organization_id=org.id,
            address_type_id=1,
            country_id=1,
            address_line1="100 Tech Park Blvd",
        )
        db.add(addr)
        await db.commit()
        await db.refresh(addr)

        # Check address -> organization relationship
        assert addr.organization is not None
        assert addr.organization.id == org.id

        # Reload organization with selectinload and verify addresses relationship
        from sqlalchemy.orm import selectinload

        reloaded_org_res = await db.execute(
            select(Organization)
            .options(selectinload(Organization.addresses))
            .where(Organization.id == org.id)
            .execution_options(populate_existing=True)
        )
        reloaded_org = reloaded_org_res.scalar_one()
        assert len(reloaded_org.addresses) >= 1
        assert any(
            a.address_line1 == "100 Tech Park Blvd" for a in reloaded_org.addresses
        )

        # Cleanup
        await db.delete(addr)
        await db.delete(org)
        await db.commit()


@pytest.mark.asyncio
async def test_organization_dual_lookup_api() -> None:
    """Verifies that single organization endpoints support both public_id UUID and integer ID."""
    async with SessionFactory() as db:
        super_admin_res = await db.execute(
            select(User).where(User.email == settings.seed_super_admin_email)
        )
        super_admin = super_admin_res.scalar_one()
        token = create_access_token(super_admin.id)

        service = OrganizationService(db)
        unique_code = f"DUAL_{uuid.uuid4().hex[:6].upper()}"
        created = await service.create(
            OrganizationCreate(
                name="Dual Lookup Corp",
                code=unique_code,
            )
        )
        org_id = created.id
        public_id_str = str(created.public_id)

    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # 1. Lookup by UUID public_id
        res_uuid = await client.get(
            f"/api/v1/organizations/{public_id_str}",
            headers=headers,
        )
        assert res_uuid.status_code == 200
        data_uuid = res_uuid.json()
        assert data_uuid["id"] == org_id
        assert data_uuid["public_id"] == public_id_str
        assert data_uuid["code"] == unique_code

        # 2. Lookup by internal integer ID (backwards-compatible)
        res_int = await client.get(
            f"/api/v1/organizations/{org_id}",
            headers=headers,
        )
        assert res_int.status_code == 200
        data_int = res_int.json()
        assert data_int["id"] == org_id
        assert data_int["public_id"] == public_id_str

        # 3. Patch status by UUID public_id
        res_patch = await client.patch(
            f"/api/v1/organizations/{public_id_str}/status",
            headers=headers,
            json={"is_active": False},
        )
        assert res_patch.status_code == 200
        assert res_patch.json()["is_active"] is False

        # 4. Delete by UUID public_id
        res_del = await client.delete(
            f"/api/v1/organizations/{public_id_str}",
            headers=headers,
        )
        assert res_del.status_code == 204

        # 5. Subsequent lookup must 404
        res_404 = await client.get(
            f"/api/v1/organizations/{public_id_str}",
            headers=headers,
        )
        assert res_404.status_code == 404

        # 6. Verify database record has is_deleted=True and deleted_at populated
        async with SessionFactory() as db:
            soft_deleted = await db.scalar(
                select(Organization).where(Organization.id == org_id)
            )
            assert soft_deleted is not None
            assert soft_deleted.is_deleted is True
            assert soft_deleted.deleted_at is not None

            # Hard cleanup
            await db.delete(soft_deleted)
            await db.commit()


@pytest.mark.asyncio
async def test_organization_audit_entity_base_columns() -> None:
    """Verifies that Organization properly inherits AuditEntityBase columns."""
    async with SessionFactory() as db:
        service = OrganizationService(db)
        unique_code = f"AUDIT_{uuid.uuid4().hex[:6].upper()}"
        created = await service.create(
            OrganizationCreate(
                name="Audit Entity Test Corp",
                code=unique_code,
            )
        )
        assert created.is_deleted is False
        assert created.deleted_at is None
        assert created.created_at is not None

        # Verify soft delete directly via service
        await service.delete(created)
        assert created.is_deleted is True
        assert created.deleted_at is not None

        # Excluded from default list
        items, _ = await service.list(search=unique_code)
        assert not any(item.code == unique_code for item in items)

        # Cleanup
        await service.delete(created, hard_delete=True)
