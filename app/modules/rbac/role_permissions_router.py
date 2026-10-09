from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.schemas import (
    RolePermissionListResponse,
    RolePermissionReplace,
)
from app.modules.rbac.service import (
    InactivePermissionError,
    InactiveRoleError,
    PermissionNotFoundError,
    RoleNotFoundError,
    RolePermissionAlreadyAssignedError,
    RolePermissionAssignmentNotFoundError,
    RoleService,
    SystemRoleError,
)
from app.modules.users.models import User

role_permissions_router = APIRouter(
    prefix="/roles/{role_id}/permissions",
    tags=["RBAC - Role Permissions"],
)


# ============================================================
# List permissions assigned to a role
# GET /api/v1/roles/{role_id}/permissions
# ============================================================


@role_permissions_router.get(
    "",
    response_model=RolePermissionListResponse,
)
async def list_role_permissions(
    role_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.read")),
    ],
) -> RolePermissionListResponse:
    service = RoleService(db)

    try:
        permissions = await service.list_role_permissions(role_id)
    except RoleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return RolePermissionListResponse(
        role_id=role_id,
        permissions=permissions,
    )


# ============================================================
# Assign a permission to a role
# POST /api/v1/roles/{role_id}/permissions/{permission_id}
# ============================================================


@role_permissions_router.post(
    "/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def assign_permission(
    role_id: UUID,
    permission_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.update")),
    ],
) -> Response:
    service = RoleService(db)

    try:
        await service.assign_permission(
            role_id=role_id,
            permission_id=permission_id,
        )
    except (RoleNotFoundError, PermissionNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (
        RolePermissionAlreadyAssignedError,
        SystemRoleError,
        InactiveRoleError,
        InactivePermissionError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# Replace all permissions assigned to a role
# PUT /api/v1/roles/{role_id}/permissions
# ============================================================


@role_permissions_router.put(
    "",
    response_model=RolePermissionListResponse,
)
async def replace_role_permissions(
    role_id: UUID,
    data: RolePermissionReplace,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.update")),
    ],
) -> RolePermissionListResponse:
    service = RoleService(db)

    try:
        permissions = await service.replace_role_permissions(
            role_id=role_id,
            permission_ids=data.permission_ids,
        )
    except (RoleNotFoundError, PermissionNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (
        RolePermissionAlreadyAssignedError,
        SystemRoleError,
        InactiveRoleError,
        InactivePermissionError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return RolePermissionListResponse(
        role_id=role_id,
        permissions=permissions,
    )


# ============================================================
# Remove a permission from a role
# DELETE /api/v1/roles/{role_id}/permissions/{permission_id}
# ============================================================


@role_permissions_router.delete(
    "/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_permission(
    role_id: UUID,
    permission_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.update")),
    ],
) -> Response:
    service = RoleService(db)

    try:
        await service.remove_permission(
            role_id=role_id,
            permission_id=permission_id,
        )
    except (
        RoleNotFoundError,
        RolePermissionAssignmentNotFoundError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except SystemRoleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)