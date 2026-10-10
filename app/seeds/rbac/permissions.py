from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rbac.models import Permission
from app.seeds.helpers import get_or_create

PERMISSIONS = (
    # Role permissions.
    {
        "name": "Read Roles",
        "code": "role.read",
        "description": "View roles.",
        "resource": "role",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Create Roles",
        "code": "role.create",
        "description": "Create roles.",
        "resource": "role",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Roles",
        "code": "role.update",
        "description": "Update roles and their permission assignments.",
        "resource": "role",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete Roles",
        "code": "role.delete",
        "description": "Delete eligible roles.",
        "resource": "role",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },

    # Permission management.
    {
        "name": "Read Permissions",
        "code": "permission.read",
        "description": "View permissions.",
        "resource": "permission",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Create Permissions",
        "code": "permission.create",
        "description": "Create permissions.",
        "resource": "permission",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Permissions",
        "code": "permission.update",
        "description": "Update permissions.",
        "resource": "permission",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete Permissions",
        "code": "permission.delete",
        "description": "Delete eligible permissions.",
        "resource": "permission",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },

    # Organization permissions.
    {
        "name": "Create Organizations",
        "code": "organization.create",
        "description": "Create organizations.",
        "resource": "organization",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Read Organizations",
        "code": "organization.read",
        "description": "View organizations.",
        "resource": "organization",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Organizations",
        "code": "organization.update",
        "description": "Update organization details and status.",
        "resource": "organization",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },

    # Master data permissions.
    {
        "name": "Create Master Records",
        "code": "masters:create",
        "description": "Create master data records.",
        "resource": "masters",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Read Master Records",
        "code": "masters:read",
        "description": "View master data records.",
        "resource": "masters",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Master Records",
        "code": "masters:update",
        "description": "Update master data records.",
        "resource": "masters",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete Master Records",
        "code": "masters:delete",
        "description": "Deactivate master data records.",
        "resource": "masters",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
)


async def seed_permissions(db: AsyncSession) -> None:
    created = 0
    existing = 0

    for permission_data in PERMISSIONS:
        _, was_created = await get_or_create(
            db,
            Permission,
            lookup={"code": permission_data["code"]},
            defaults={
                key: value
                for key, value in permission_data.items()
                if key != "code"
            },
        )

        if was_created:
            created += 1
        else:
            existing += 1

    print(
        f"Permissions: {created} created, "
        f"{existing} already existed."
    )