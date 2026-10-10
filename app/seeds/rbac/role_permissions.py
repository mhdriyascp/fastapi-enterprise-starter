from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rbac.models import Permission, Role, RolePermission

ROLE_PERMISSION_MAP: dict[str, tuple[str, ...]] = {
    "super_admin": (
        # Role permissions.
        "role.read",
        "role.create",
        "role.update",
        "role.delete",
        # Permission management.
        "permission.read",
        "permission.create",
        "permission.update",
        "permission.delete",
        # Organization permissions.
        "organization.create",
        "organization.read",
        "organization.update",
        # Master data permissions.
        "masters:create",
        "masters:read",
        "masters:update",
        "masters:delete",
    ),
    "admin": (
        "role.read",
        "role.create",
        "role.update",
        "permission.read",
        "organization.read",
        # Master data permissions.
        "masters:create",
        "masters:read",
        "masters:update",
        "masters:delete",
    ),
    "sales_manager": (
        "organization.read",
        "masters:read",
    ),
    "sales_rep": (),
    "support_agent": (
        "masters:read",
    ),
}


async def seed_role_permissions(db: AsyncSession) -> None:
    role_codes = set(ROLE_PERMISSION_MAP)

    permission_codes = {
        permission_code
        for codes in ROLE_PERMISSION_MAP.values()
        for permission_code in codes
    }

    roles_result = await db.execute(
        select(Role).where(Role.code.in_(role_codes))
    )
    roles = {
        role.code: role
        for role in roles_result.scalars().all()
    }

    permissions_result = await db.execute(
        select(Permission).where(
            Permission.code.in_(permission_codes)
        )
    )
    permissions = {
        permission.code: permission
        for permission in permissions_result.scalars().all()
    }

    missing_roles = role_codes - roles.keys()
    missing_permissions = permission_codes - permissions.keys()

    if missing_roles or missing_permissions:
        details = []

        if missing_roles:
            details.append(
                f"Missing roles: {sorted(missing_roles)}"
            )

        if missing_permissions:
            details.append(
                f"Missing permissions: {sorted(missing_permissions)}"
            )

        raise ValueError(
            "Cannot seed role permissions. " + "; ".join(details)
        )

    created = 0
    existing = 0

    for role_code, permission_codes_for_role in (
        ROLE_PERMISSION_MAP.items()
    ):
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

    print(
        f"Role permissions: {created} created, "
        f"{existing} already existed."
    )