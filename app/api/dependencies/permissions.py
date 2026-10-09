from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import exists, select
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
        permission_exists = (
            select(Permission.id)
            .join(
                RolePermission,
                RolePermission.permission_id == Permission.id,
            )
            .join(
                Role,
                Role.id == RolePermission.role_id,
            )
            .join(
                UserRole,
                UserRole.role_id == Role.id,
            )
            .where(
                UserRole.user_id == current_user.id,
                Permission.code == permission_code,
                Permission.is_active.is_(True),
                Role.is_active.is_(True),
            )
        )

        result = await db.execute(
            select(
                exists(permission_exists)
            )
        )

        has_permission = result.scalar_one()

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return permission_checker