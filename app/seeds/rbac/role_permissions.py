from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rbac.models import Permission, Role, RolePermission

ROLE_PERMISSION_MAP: dict[str, tuple[str, ...]] = {
    "super_admin": (
        # Roles & Permissions
        "role.read",
        "role.create",
        "role.update",
        "role.delete",
        "permission.read",
        "permission.create",
        "permission.update",
        "permission.delete",
        # User management
        "user.read",
        "user.create",
        "user.update",
        "user.delete",
        # Organizations
        "organization.read",
        "organization.create",
        "organization.update",
        "organization.delete",
        # Master data
        "masters:create",
        "masters:read",
        "masters:update",
        "masters:delete",
        # Navigation menus
        "menu.read",
        "menu.create",
        "menu.update",
        "menu.delete",
        # Notifications
        "notification.read",
        "notification.create",
        "notification.update",
        "notification.delete",
        # System Settings
        "settings.read",
        "settings.update",
    ),
    "admin": (
        # Roles & Permissions (Read/Create/Update non-system roles)
        "role.read",
        "role.create",
        "role.update",
        "permission.read",
        # User management
        "user.read",
        "user.create",
        "user.update",
        "user.delete",
        # Organizations
        "organization.read",
        "organization.create",
        "organization.update",
        "organization.delete",
        # Master data
        "masters:create",
        "masters:read",
        "masters:update",
        "masters:delete",
        # Navigation menus
        "menu.read",
        "menu.create",
        "menu.update",
        "menu.delete",
        # Notifications
        "notification.read",
        "notification.create",
        "notification.update",
        "notification.delete",
        # System Settings
        "settings.read",
        "settings.update",
    ),
    "sales_manager": (
        "organization.read",
        "organization.create",
        "organization.update",
        "masters:read",
        "notification.read",
    ),
    "sales_rep": (
        "organization.read",
        "masters:read",
        "notification.read",
    ),
    "support_agent": (
        "masters:read",
        "notification.read",
    ),
}


async def seed_role_permissions(db: AsyncSession) -> None:
    role_codes = set(ROLE_PERMISSION_MAP)

    permission_codes = {
        permission_code
        for codes in ROLE_PERMISSION_MAP.values()
        for permission_code in codes
    }

    roles_result = await db.execute(select(Role).where(Role.code.in_(role_codes)))
    roles = {role.code: role for role in roles_result.scalars().all()}

    permissions_result = await db.execute(
        select(Permission).where(Permission.code.in_(permission_codes))
    )
    permissions = {
        permission.code: permission for permission in permissions_result.scalars().all()
    }

    missing_roles = role_codes - roles.keys()
    missing_permissions = permission_codes - permissions.keys()

    if missing_roles or missing_permissions:
        details = []

        if missing_roles:
            details.append(f"Missing roles: {sorted(missing_roles)}")

        if missing_permissions:
            details.append(f"Missing permissions: {sorted(missing_permissions)}")

        raise ValueError("Cannot seed role permissions. " + "; ".join(details))

    created = 0
    existing = 0

    for role_code, permission_codes_for_role in ROLE_PERMISSION_MAP.items():
        role = roles[role_code]

        for permission_code in permission_codes_for_role:
            permission = permissions[permission_code]

            result = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == permission.id,
                )
            )

            if result.scalar_one_or_none() is not None:
                existing += 1
                continue

            db.add(
                RolePermission(
                    role_id=role.id,
                    permission_id=permission.id,
                )
            )
            created += 1

    await db.flush()

    print(f"Role permissions: {created} created, {existing} already existed.")
