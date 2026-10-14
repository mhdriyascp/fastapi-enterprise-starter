import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.security import create_access_token
from app.infrastructure.database.session import SessionFactory
from app.main import app
from app.modules.menus.schemas import MenuCreate, MenuUpdate
from app.modules.menus.service import (
    MenuAlreadyExistsError,
    MenuCycleError,
    MenuService,
)
from app.modules.rbac.models import Permission, Role, RolePermission, UserRole
from app.modules.users.models import User
from app.shared.pagination import PaginationParams


@pytest.mark.asyncio
async def test_menu_service_crud_and_cycles() -> None:
    """Tests MenuService CRUD operations and cycle detection."""
    async with SessionFactory() as db:
        service = MenuService(db)

        test_code_parent = f"test_parent_{uuid.uuid4().hex[:8]}"
        test_code_child = f"test_child_{uuid.uuid4().hex[:8]}"

        # 1. Create parent menu
        parent = await service.create_menu(
            MenuCreate(
                title="Test Parent",
                code=test_code_parent,
                path="/test-parent",
                sort_order=10,
            )
        )
        assert parent.id is not None
        assert parent.code == test_code_parent

        # 2. Create child menu
        child = await service.create_menu(
            MenuCreate(
                title="Test Child",
                code=test_code_child,
                path="/test-parent/child",
                parent_id=parent.id,
                sort_order=1,
            )
        )
        assert child.parent_id == parent.id

        # 3. Duplicate code error
        with pytest.raises(MenuAlreadyExistsError):
            await service.create_menu(
                MenuCreate(
                    title="Duplicate",
                    code=test_code_parent,
                )
            )

        # 4. Cycle prevention: cannot set parent to itself
        with pytest.raises(MenuCycleError):
            await service.update_menu(
                parent,
                MenuUpdate(parent_id=parent.id),
            )

        # 5. Cycle prevention: cannot set parent to child (descendant)
        with pytest.raises(MenuCycleError):
            await service.update_menu(
                parent,
                MenuUpdate(parent_id=child.id),
            )

        # 6. List menus
        items, total = await service.list_menus(
            PaginationParams(page=1, page_size=20),
            parent_id=parent.id,
        )
        assert total >= 1
        assert any(m.id == child.id for m in items)

        # 7. Clean up
        await service.delete_menu(child.id)
        await service.delete_menu(parent.id)


@pytest.mark.asyncio
async def test_menu_visibility_role_and_permission() -> None:
    """Verifies that user menu tree visibility strictly obeys assigned roles and permissions."""
    async with SessionFactory() as db:
        service = MenuService(db)

        # Create temporary role and permission
        role_code = f"role_{uuid.uuid4().hex[:8]}"
        perm_code = f"perm_{uuid.uuid4().hex[:8]}"

        role = Role(name="Test Menu Role", code=role_code, is_active=True)
        perm = Permission(
            name="Test Menu Perm",
            code=perm_code,
            resource="test",
            action="read",
            is_active=True,
        )
        user = User(
            id=uuid.uuid7(),
            public_id=uuid.uuid7(),
            email=f"{uuid.uuid4().hex[:8]}@example.com",
            password_hash="fake_hash",
            status="active",
        )
        db.add(role)
        db.add(perm)
        db.add(user)
        await db.commit()

        # Create two menus: one mapped to role, one mapped to permission
        menu_role_only = await service.create_menu(
            MenuCreate(
                title="Role Accessible",
                code=f"menu_r_{uuid.uuid4().hex[:8]}",
                role_ids=[role.id],
            )
        )
        menu_perm_only = await service.create_menu(
            MenuCreate(
                title="Permission Accessible",
                code=f"menu_p_{uuid.uuid4().hex[:8]}",
                permission_ids=[perm.id],
            )
        )

        # User has no roles yet -> tree must not include these test menus
        tree = await service.get_visible_menu_tree_for_user(user.id)
        assert not any(n.id in (menu_role_only.id, menu_perm_only.id) for n in tree)

        # Assign role to user -> menu_role_only should become visible
        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()

        tree_after_role = await service.get_visible_menu_tree_for_user(user.id)
        visible_ids = {n.id for n in tree_after_role}
        assert menu_role_only.id in visible_ids
        assert menu_perm_only.id not in visible_ids

        # Now link permission to role -> both menus should become visible
        db.add(RolePermission(role_id=role.id, permission_id=perm.id))
        await db.commit()

        tree_after_perm = await service.get_visible_menu_tree_for_user(user.id)
        visible_ids_both = {n.id for n in tree_after_perm}
        assert menu_role_only.id in visible_ids_both
        assert menu_perm_only.id in visible_ids_both

        # Cleanup test entities cleanly adhering to FK order
        await service.delete_menu(menu_role_only.id)
        await service.delete_menu(menu_perm_only.id)
        await db.execute(delete(RolePermission).where(RolePermission.role_id == role.id))
        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        await db.delete(user)
        await db.delete(role)
        await db.delete(perm)
        await db.commit()


@pytest.mark.asyncio
async def test_menus_full_api_endpoints() -> None:
    """Verifies all HTTP endpoints for the menus CRUD API using real JWT auth."""
    from app.core.config import settings

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
        unique_slug = uuid.uuid4().hex[:8]
        menu_code = f"api_test_{unique_slug}"

        # 1. Create Menu via POST /api/v1/menus
        create_payload = {
            "title": "API Test Menu",
            "code": menu_code,
            "path": "/api-test",
            "icon": "test-icon",
            "sort_order": 5,
            "is_active": True,
        }
        response = await client.post(
            "/api/v1/menus", json=create_payload, headers=headers
        )
        assert response.status_code == 201
        menu_data = response.json()
        assert menu_data["code"] == menu_code
        menu_id = menu_data["id"]

        # 2. Duplicate Menu Creation -> 409
        dup_resp = await client.post(
            "/api/v1/menus", json=create_payload, headers=headers
        )
        assert dup_resp.status_code == 409

        # 3. List Menus via GET /api/v1/menus
        list_resp = await client.get(
            "/api/v1/menus?page=1&page_size=10", headers=headers
        )
        assert list_resp.status_code == 200
        paged = list_resp.json()
        assert "items" in paged
        assert "total" in paged
        assert paged["page"] == 1

        # 4. Get Menu details via GET /api/v1/menus/{menu_id}
        detail_resp = await client.get(f"/api/v1/menus/{menu_id}", headers=headers)
        assert detail_resp.status_code == 200
        assert detail_resp.json()["id"] == menu_id

        # 5. Update Menu via PATCH /api/v1/menus/{menu_id}
        patch_resp = await client.patch(
            f"/api/v1/menus/{menu_id}",
            json={"title": "Updated API Title", "sort_order": 99},
            headers=headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["title"] == "Updated API Title"
        assert patch_resp.json()["sort_order"] == 99

        # 6. Tree endpoint GET /api/v1/menus/tree
        tree_resp = await client.get("/api/v1/menus/tree", headers=headers)
        assert tree_resp.status_code == 200
        assert isinstance(tree_resp.json(), list)

        # 7. My-menus endpoint GET /api/v1/menus/my-menus
        my_resp = await client.get("/api/v1/menus/my-menus", headers=headers)
        assert my_resp.status_code == 200
        assert isinstance(my_resp.json(), list)

        # 8. Delete Menu via DELETE /api/v1/menus/{menu_id}
        del_resp = await client.delete(f"/api/v1/menus/{menu_id}", headers=headers)
        assert del_resp.status_code == 204

        # 9. Verify deletion -> 404
        check_del = await client.get(f"/api/v1/menus/{menu_id}", headers=headers)
        assert check_del.status_code == 404
