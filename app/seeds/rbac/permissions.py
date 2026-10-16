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
    {
        "name": "Delete Organizations",
        "code": "organization.delete",
        "description": "Delete or archive organizations.",
        "resource": "organization",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    # User management permissions.
    {
        "name": "Read Users",
        "code": "user.read",
        "description": "View user accounts and profiles.",
        "resource": "user",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Create Users",
        "code": "user.create",
        "description": "Create new user accounts.",
        "resource": "user",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Users",
        "code": "user.update",
        "description": "Update user profiles and change account status.",
        "resource": "user",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete Users",
        "code": "user.delete",
        "description": "Delete or suspend user accounts.",
        "resource": "user",
        "action": "delete",
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
    # Navigation menu management.
    {
        "name": "Read Menus",
        "code": "menu.read",
        "description": "View navigation menu structures and tree.",
        "resource": "menu",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Create Menus",
        "code": "menu.create",
        "description": "Create navigation menu items.",
        "resource": "menu",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Menus",
        "code": "menu.update",
        "description": "Update navigation menu items and access assignments.",
        "resource": "menu",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete Menus",
        "code": "menu.delete",
        "description": "Delete navigation menu items.",
        "resource": "menu",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    # Notification permissions.
    {
        "name": "Read Notifications",
        "code": "notification.read",
        "description": "View system notifications and alerts.",
        "resource": "notification",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Create Notifications",
        "code": "notification.create",
        "description": "Broadcast or create system notifications.",
        "resource": "notification",
        "action": "create",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update Notifications",
        "code": "notification.update",
        "description": "Mark notifications as read or update status.",
        "resource": "notification",
        "action": "update",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete Notifications",
        "code": "notification.delete",
        "description": "Delete or clear notifications.",
        "resource": "notification",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    # System settings management.
    {
        "name": "Read System Settings",
        "code": "settings.read",
        "description": "View system settings and application configurations.",
        "resource": "settings",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Update System Settings",
        "code": "settings.update",
        "description": "Modify system settings and application configurations.",
        "resource": "settings",
        "action": "update",
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
                key: value for key, value in permission_data.items() if key != "code"
            },
        )

        if was_created:
            created += 1
        else:
            existing += 1

    print(f"Permissions: {created} created, {existing} already existed.")
