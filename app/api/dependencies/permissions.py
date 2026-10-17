from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.infrastructure.database.models.system.setting import SystemSetting
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.models import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from app.modules.users.models import User


def get_implied_permission_codes(permission_code: str) -> set[str]:
    """Dynamically expands a permission code into all implied hierarchical codes.

    Follows enterprise RBAC standards without hardcoding any domain modules:
    - Resource dot and colon forms: 'resource.action' <-> 'resource:action'
    - Resource management override: 'resource.manage', 'resource:manage'
    - Resource wildcard: 'resource.*', 'resource:*'
    - Global super-permission overrides: '*.manage', '*.*'
    """
    clean_code = permission_code.strip()
    delimiter = ":" if ":" in clean_code else "."
    parts = clean_code.split(delimiter, 1)
    resource = parts[0]

    return {
        clean_code,
        clean_code.replace(".", ":"),
        clean_code.replace(":", "."),
        f"{resource}.manage",
        f"{resource}:manage",
        f"{resource}.*",
        f"{resource}:*",
        "*.manage",
        "*.*",
    }


# Dependency to require a specific permission for the current user.
def require_permission(permission_code: str):
    normalized_codes = get_implied_permission_codes(permission_code)

    async def permission_checker(
        current_user: Annotated[
            User,
            Depends(get_current_user),
        ],
        db: Annotated[
            AsyncSession,
            Depends(get_db_session),
        ],
    ) -> User:
        # Optimized single-query authorization check:
        # User has super_admin role OR has the specifically assigned active permission.
        auth_query = (
            select(UserRole.user_id)
            .join(Role, Role.id == UserRole.role_id)
            .outerjoin(RolePermission, RolePermission.role_id == Role.id)
            .outerjoin(Permission, Permission.id == RolePermission.permission_id)
            .where(
                UserRole.user_id == current_user.id,
                Role.is_active.is_(True),
                or_(
                    Role.code.in_(("super_admin", "superadmin")),
                    and_(
                        Permission.code.in_(normalized_codes),
                        Permission.is_active.is_(True),
                    ),
                ),
            )
        )
        has_access = (await db.execute(select(exists(auth_query)))).scalar_one()

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have the required permission ({permission_code}) to perform this action.",
            )

        return current_user

    return permission_checker


async def get_authorized_administrator_roles(db: AsyncSession) -> list[str]:
    """Retrieves administrator roles dynamically from System Settings."""
    try:
        stmt = select(SystemSetting.value).where(
            SystemSetting.category == "security",
            SystemSetting.key == "administrator_roles",
        )
        res = (await db.execute(stmt)).scalar_one_or_none()
        if isinstance(res, list) and res:
            return [str(r).strip().lower() for r in res if str(r).strip()]
    except Exception:
        pass
    return ["super_admin", "admin"]


# Dependency to strictly restrict endpoints to platform administrators only by default.
def require_admin(resource_name: str | None = None):
    """Restricts access to platform administrators or users with management permissions.

    Evaluates authorization dynamically against System Settings configuration
    rather than hardcoded role codes or rigid permission lists.
    """

    async def admin_checker(
        current_user: Annotated[
            User,
            Depends(get_current_user),
        ],
        db: Annotated[
            AsyncSession,
            Depends(get_db_session),
        ],
    ) -> User:
        admin_roles = await get_authorized_administrator_roles(db)

        # Dynamic management permissions if resource specified
        management_permissions: set[str] = {"*.manage", "*.*"}
        if resource_name:
            clean_res = resource_name.strip().lower().replace(" ", "_")
            management_permissions.update(
                {
                    f"{clean_res}.manage",
                    f"{clean_res}:manage",
                    f"{clean_res}.*",
                    f"{clean_res}:*",
                }
            )
        else:
            management_permissions.update({"settings.manage", "settings:manage"})

        auth_query = (
            select(UserRole.user_id)
            .join(Role, Role.id == UserRole.role_id)
            .outerjoin(RolePermission, RolePermission.role_id == Role.id)
            .outerjoin(Permission, Permission.id == RolePermission.permission_id)
            .where(
                UserRole.user_id == current_user.id,
                Role.is_active.is_(True),
                or_(
                    func.lower(Role.code).in_(admin_roles),
                    and_(
                        Permission.code.in_(management_permissions),
                        Permission.is_active.is_(True),
                    ),
                ),
            )
        )
        is_authorized = (await db.execute(select(exists(auth_query)))).scalar_one()

        if not is_authorized:
            display_name = resource_name if resource_name else "system settings"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access to {display_name} is restricted to administrators only.",
            )

        return current_user

    return admin_checker
