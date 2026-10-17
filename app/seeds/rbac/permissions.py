from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rbac.models import Permission

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
        "name": "Soft Delete Roles",
        "code": "role.delete",
        "description": "Soft-delete custom roles (marks entity as deleted/inactive, preserves historical assignments and audit trails, enables restoration).",
        "resource": "role",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Roles",
        "code": "role.hard_delete",
        "description": "Hard-delete custom roles (permanently purges eligible roles from the database; irreversible physical deletion).",
        "resource": "role",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Roles",
        "code": "role.restore",
        "description": "Restore soft-deleted custom roles back to active status in the system.",
        "resource": "role",
        "action": "restore",
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
        "name": "Soft Delete Permissions",
        "code": "permission.delete",
        "description": "Soft-delete custom permissions (deactivates privilege, preserves audit history, allows restoration).",
        "resource": "permission",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Permissions",
        "code": "permission.hard_delete",
        "description": "Hard-delete custom permissions (permanently purges privilege from the database; irreversible physical deletion).",
        "resource": "permission",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Permissions",
        "code": "permission.restore",
        "description": "Restore soft-deleted or inactive custom permissions back to active status.",
        "resource": "permission",
        "action": "restore",
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
        "name": "Soft Delete Organizations",
        "code": "organization.delete",
        "description": "Soft-delete organization records (marks entity as deleted, preserves full audit history, and allows restoration).",
        "resource": "organization",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Organizations",
        "code": "organization.hard_delete",
        "description": "Hard-delete organization records (permanently purges tenant and related records from the database; irreversible physical deletion).",
        "resource": "organization",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Organizations",
        "code": "organization.restore",
        "description": "Restore soft-deleted organization records back to active status.",
        "resource": "organization",
        "action": "restore",
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
        "name": "Soft Delete Users",
        "code": "user.delete",
        "description": "Soft-delete user accounts (deactivates credentials, preserves profile and historical audit trails, allows account restoration).",
        "resource": "user",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Users",
        "code": "user.hard_delete",
        "description": "Hard-delete user accounts (permanently purges user account and identity from database; irreversible physical deletion).",
        "resource": "user",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Users",
        "code": "user.restore",
        "description": "Restore soft-deleted or suspended user accounts back to active status.",
        "resource": "user",
        "action": "restore",
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
        "name": "Soft Delete Master Records",
        "code": "masters:delete",
        "description": "Soft-delete master reference records (marks record as inactive/deleted with complete restore capability).",
        "resource": "masters",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Master Records",
        "code": "masters:hard_delete",
        "description": "Hard-delete master reference records (permanently purges catalog data from the database; irreversible physical deletion).",
        "resource": "masters",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Master Records",
        "code": "masters:restore",
        "description": "Restore soft-deleted or deactivated master reference records back to active status.",
        "resource": "masters",
        "action": "restore",
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
        "name": "Soft Delete Menus",
        "code": "menu.delete",
        "description": "Soft-delete navigation menu items (hides menu item from navigation tree while preserving configuration for restore).",
        "resource": "menu",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Menus",
        "code": "menu.hard_delete",
        "description": "Hard-delete navigation menu items (permanently purges menu records from the database; irreversible physical deletion).",
        "resource": "menu",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Menus",
        "code": "menu.restore",
        "description": "Restore soft-deleted navigation menu items back to active status.",
        "resource": "menu",
        "action": "restore",
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
        "name": "Soft Delete Notifications",
        "code": "notification.delete",
        "description": "Soft-delete notification alerts (dismisses from user inbox while preserving audit trail).",
        "resource": "notification",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Hard Delete Notifications",
        "code": "notification.hard_delete",
        "description": "Hard-delete notifications (permanently purges alert records from the database; irreversible physical deletion).",
        "resource": "notification",
        "action": "hard_delete",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Restore Soft-Deleted Notifications",
        "code": "notification.restore",
        "description": "Restore soft-deleted notification alerts back to active status.",
        "resource": "notification",
        "action": "restore",
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
    {
        "name": "Manage System Settings",
        "code": "settings.manage",
        "description": "Full administrative control, ordering, and management of system and app configurations.",
        "resource": "settings",
        "action": "manage",
        "is_system": True,
        "is_active": True,
    },
    # System Activity Logs permissions
    {
        "name": "Read System Activity Logs",
        "code": "activity_logs.read",
        "description": "View system activity and audit logs.",
        "resource": "activity_logs",
        "action": "read",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Manage System Activity Logs",
        "code": "activity_logs.manage",
        "description": "Full administrative control and audit management of system activity logs.",
        "resource": "activity_logs",
        "action": "manage",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Delete System Activity Logs",
        "code": "activity_logs.delete",
        "description": "Permanently delete system activity and audit trail records.",
        "resource": "activity_logs",
        "action": "delete",
        "is_system": True,
        "is_active": True,
    },
)


async def seed_permissions(db: AsyncSession) -> None:
    created = 0
    updated = 0
    existing = 0

    for permission_data in PERMISSIONS:
        stmt = select(Permission).where(Permission.code == permission_data["code"])
        permission = (await db.execute(stmt)).scalar_one_or_none()

        if permission is not None:
            # Synchronize name, description, and metadata
            needs_update = False
            for field in ["name", "description", "resource", "action"]:
                if getattr(permission, field) != permission_data[field]:
                    setattr(permission, field, permission_data[field])
                    needs_update = True
            if needs_update:
                updated += 1
            else:
                existing += 1
        else:
            permission = Permission(**permission_data)
            db.add(permission)
            await db.flush()
            created += 1

    print(
        f"Permissions: {created} created, {updated} updated with descriptive definitions, {existing} unchanged."
    )
