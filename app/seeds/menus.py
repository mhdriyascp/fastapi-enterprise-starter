from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.menus.models import Menu, MenuPermission, MenuRole
from app.modules.rbac.models import Permission, Role


async def seed_menus(db: AsyncSession) -> None:
    """Seeds initial navigation menus and links them to roles/permissions."""
    # Fetch roles and permissions for mapping
    roles_res = await db.execute(select(Role))
    roles = {r.code: r for r in roles_res.scalars().all()}

    perms_res = await db.execute(select(Permission))
    perms = {p.code: p for p in perms_res.scalars().all()}

    menu_definitions = [
        # Dashboard (accessible by role)
        {
            "code": "dashboard",
            "title": "Dashboard",
            "path": "/",
            "icon": "layout-dashboard",
            "sort_order": 1,
            "roles": ["super_admin", "admin", "sales_manager"],
            "permissions": [],
            "children": [],
        },
        # Organizations
        {
            "code": "organizations_root",
            "title": "Organizations",
            "path": "/organizations",
            "icon": "building",
            "sort_order": 2,
            "roles": [],
            "permissions": ["organization.read"],
            "children": [
                {
                    "code": "org_all",
                    "title": "All Organizations",
                    "path": "/organizations",
                    "icon": "list",
                    "sort_order": 1,
                    "roles": [],
                    "permissions": ["organization.read"],
                },
            ],
        },
        # Access Control & RBAC
        {
            "code": "access_control_root",
            "title": "Access Control",
            "path": "/rbac",
            "icon": "shield-check",
            "sort_order": 3,
            "roles": [],
            "permissions": ["role.read"],
            "children": [
                {
                    "code": "rbac_roles",
                    "title": "Roles",
                    "path": "/rbac?tab=roles",
                    "icon": "user-check",
                    "sort_order": 1,
                    "roles": [],
                    "permissions": ["role.read"],
                },
                {
                    "code": "rbac_permissions",
                    "title": "Permissions",
                    "path": "/rbac?tab=permissions",
                    "icon": "key",
                    "sort_order": 2,
                    "roles": [],
                    "permissions": ["permission.read"],
                },
                {
                    "code": "rbac_matrix",
                    "title": "Access Matrix",
                    "path": "/rbac?tab=matrix",
                    "icon": "layers",
                    "sort_order": 3,
                    "roles": [],
                    "permissions": ["role.read"],
                },
                {
                    "code": "admin_users",
                    "title": "User Administration",
                    "path": "/users",
                    "icon": "users",
                    "sort_order": 4,
                    "roles": [],
                    "permissions": ["user.read"],
                },
            ],
        },
        # System Menus Management
        {
            "code": "settings_menus",
            "title": "Menu Management",
            "path": "/menus",
            "icon": "menu",
            "sort_order": 4,
            "roles": [],
            "permissions": ["menu.read"],
            "children": [],
        },
    ]

    created = 0
    existing = 0

    for item in menu_definitions:
        parent_stmt = select(Menu).where(Menu.code == item["code"])
        parent = (await db.execute(parent_stmt)).scalar_one_or_none()

        if not parent:
            parent = Menu(
                title=item["title"],
                code=item["code"],
                path=item["path"],
                icon=item["icon"],
                sort_order=item["sort_order"],
                is_active=True,
            )
            db.add(parent)
            await db.flush()
            created += 1

            # Map roles
            for r_code in item["roles"]:
                if r_code in roles:
                    db.add(MenuRole(menu_id=parent.id, role_id=roles[r_code].id))

            # Map permissions
            for p_code in item["permissions"]:
                if p_code in perms:
                    db.add(
                        MenuPermission(
                            menu_id=parent.id, permission_id=perms[p_code].id
                        )
                    )
        else:
            existing += 1

        # Process children
        for child_item in item["children"]:
            child_stmt = select(Menu).where(Menu.code == child_item["code"])
            child = (await db.execute(child_stmt)).scalar_one_or_none()

            if not child:
                child = Menu(
                    parent_id=parent.id,
                    title=child_item["title"],
                    code=child_item["code"],
                    path=child_item["path"],
                    icon=child_item["icon"],
                    sort_order=child_item["sort_order"],
                    is_active=True,
                )
                db.add(child)
                await db.flush()
                created += 1

                for r_code in child_item["roles"]:
                    if r_code in roles:
                        db.add(MenuRole(menu_id=child.id, role_id=roles[r_code].id))

                for p_code in child_item["permissions"]:
                    if p_code in perms:
                        db.add(
                            MenuPermission(
                                menu_id=child.id, permission_id=perms[p_code].id
                            )
                        )
            else:
                existing += 1

    print(f"Menus: {created} created, {existing} already existed.")
