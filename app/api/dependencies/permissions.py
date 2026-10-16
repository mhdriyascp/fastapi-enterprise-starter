from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.models import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from app.modules.users.models import User


# Dependency to require a specific permission for the current user.
def require_permission(permission_code: str):
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
        # This replaces 2 sequential queries with 1 single index-backed EXISTS check.
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
                        Permission.code == permission_code,
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
