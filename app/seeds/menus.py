from sqlalchemy import delete, select
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
        # Master Data Governance Root
        {
            "code": "master_data_root",
            "title": "Master Data",
            "path": "/masters",
            "icon": "database",
            "sort_order": 3,
            "roles": [],
            "permissions": ["masters:read"],
            "children": [
                {
                    "code": "masters_countries",
                    "title": "Countries",
                    "path": "/masters?tab=countries",
                    "icon": "globe",
                    "sort_order": 1,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_states",
                    "title": "States & Provinces",
                    "path": "/masters?tab=states",
                    "icon": "map-pin",
                    "sort_order": 2,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_cities",
                    "title": "Cities",
                    "path": "/masters?tab=cities",
                    "icon": "building",
                    "sort_order": 3,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_addresses",
                    "title": "Addresses",
                    "path": "/masters?tab=addresses",
                    "icon": "home",
                    "sort_order": 4,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_timezones",
                    "title": "Time Zones",
                    "path": "/masters?tab=time-zones",
                    "icon": "clock",
                    "sort_order": 5,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_currencies",
                    "title": "Currencies",
                    "path": "/masters?tab=currencies",
                    "icon": "coins",
                    "sort_order": 6,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_taxes",
                    "title": "Taxes & Tariffs",
                    "path": "/masters?tab=taxes",
                    "icon": "percent",
                    "sort_order": 7,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_uom",
                    "title": "Units of Measure",
                    "path": "/masters?tab=units-of-measure",
                    "icon": "scale",
                    "sort_order": 8,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_brands",
                    "title": "Brands & Trademarks",
                    "path": "/masters?tab=brands",
                    "icon": "sparkles",
                    "sort_order": 9,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_industries",
                    "title": "Industries",
                    "path": "/masters?tab=industries",
                    "icon": "briefcase",
                    "sort_order": 10,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_languages",
                    "title": "Languages",
                    "path": "/masters?tab=languages",
                    "icon": "languages",
                    "sort_order": 11,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_address_types",
                    "title": "Address Types",
                    "path": "/masters?tab=address-types",
                    "icon": "home",
                    "sort_order": 12,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_comm_types",
                    "title": "Communication Types",
                    "path": "/masters?tab=communication-types",
                    "icon": "message-square",
                    "sort_order": 13,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_doc_types",
                    "title": "Document Types",
                    "path": "/masters?tab=document-types",
                    "icon": "file-text",
                    "sort_order": 14,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
                {
                    "code": "masters_id_types",
                    "title": "Identification Types",
                    "path": "/masters?tab=identification-types",
                    "icon": "credit-card",
                    "sort_order": 15,
                    "roles": [],
                    "permissions": ["masters:read"],
                },
            ],
        },
        # Access Control & RBAC
        {
            "code": "access_control_root",
            "title": "Access Control",
            "path": "/rbac",
            "icon": "shield-check",
            "sort_order": 4,
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
        # System Settings & Administration Root
        {
            "code": "system_settings_root",
            "title": "System Settings",
            "path": "/settings",
            "icon": "settings",
            "sort_order": 5,
            "roles": ["super_admin", "admin"],
            "permissions": ["settings.read"],
            "children": [
                {
                    "code": "settings_general",
                    "title": "App Configurations",
                    "path": "/settings",
                    "icon": "sliders",
                    "sort_order": 1,
                    "roles": ["super_admin", "admin"],
                    "permissions": ["settings.read"],
                },
                {
                    "code": "settings_activity_logs",
                    "title": "System Activity",
                    "path": "/system-logs",
                    "icon": "activity",
                    "sort_order": 2,
                    "roles": ["super_admin", "admin"],
                    "permissions": ["activity_logs.read"],
                },
                {
                    "code": "settings_notifications",
                    "title": "Notifications & Alerts",
                    "path": "/notifications",
                    "icon": "bell",
                    "sort_order": 3,
                    "roles": ["super_admin", "admin", "sales_manager"],
                    "permissions": ["notification.read"],
                },
                {
                    "code": "settings_menus",
                    "title": "Menu Architecture",
                    "path": "/menus",
                    "icon": "menu",
                    "sort_order": 4,
                    "roles": [],
                    "permissions": ["menu.read"],
                },
                {
                    "code": "settings_profile",
                    "title": "Account & Security",
                    "path": "/profile",
                    "icon": "user",
                    "sort_order": 5,
                    "roles": ["super_admin", "admin", "sales_manager"],
                    "permissions": [],
                },
            ],
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
            parent.title = item["title"]
            parent.path = item["path"]
            parent.icon = item["icon"]
            parent.sort_order = item["sort_order"]
            existing += 1

            # Sync roles for existing parent
            await db.execute(delete(MenuRole).where(MenuRole.menu_id == parent.id))
            for r_code in item["roles"]:
                if r_code in roles:
                    db.add(MenuRole(menu_id=parent.id, role_id=roles[r_code].id))

            # Sync permissions for existing parent
            await db.execute(
                delete(MenuPermission).where(MenuPermission.menu_id == parent.id)
            )
            for p_code in item["permissions"]:
                if p_code in perms:
                    db.add(
                        MenuPermission(
                            menu_id=parent.id, permission_id=perms[p_code].id
                        )
                    )

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
                child.parent_id = parent.id
                child.title = child_item["title"]
                child.path = child_item["path"]
                child.icon = child_item["icon"]
                child.sort_order = child_item["sort_order"]
                existing += 1

                # Sync roles for existing child
                await db.execute(delete(MenuRole).where(MenuRole.menu_id == child.id))
                for r_code in child_item["roles"]:
                    if r_code in roles:
                        db.add(MenuRole(menu_id=child.id, role_id=roles[r_code].id))

                # Sync permissions for existing child
                await db.execute(
                    delete(MenuPermission).where(MenuPermission.menu_id == child.id)
                )
                for p_code in child_item["permissions"]:
                    if p_code in perms:
                        db.add(
                            MenuPermission(
                                menu_id=child.id, permission_id=perms[p_code].id
                            )
                        )

        await db.flush()
    print(f"Menus: {created} created, {existing} already existed.")
