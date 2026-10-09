from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.schemas import (
    PermissionCreate,
    PermissionListResponse,
    PermissionResponse,
    PermissionUpdate,
)
from app.modules.rbac.service import (
    PermissionAlreadyExistsError,
    PermissionInUseError,
    PermissionNotFoundError,
    PermissionService,
    SystemPermissionError,
)
from app.modules.users.models import User

permissions_router = APIRouter(
    prefix="/permissions",
    tags=["RBAC - Permissions"],
)


@permissions_router.post(
    "",
    response_model=PermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_permission(
    data: PermissionCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.create")),
    ],
) -> PermissionResponse:
    service = PermissionService(db)

    try:
        return await service.create_permission(data)
    except PermissionAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@permissions_router.get(
    "",
    response_model=PermissionListResponse,
)
async def list_permissions(
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.read")),
    ],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PermissionListResponse:
    service = PermissionService(db)

    items, total = await service.list_permissions(
        page=page,
        page_size=page_size,
    )

    return PermissionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@permissions_router.get(
    "/{permission_id}",
    response_model=PermissionResponse,
)
async def get_permission(
    permission_id: UUID,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.read")),
    ],
) -> PermissionResponse:
    service = PermissionService(db)

    try:
        return await service.get_permission(permission_id)
    except PermissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@permissions_router.patch(
    "/{permission_id}",
    response_model=PermissionResponse,
)
async def update_permission(
    permission_id: UUID,
    data: PermissionUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.update")),
    ],
) -> PermissionResponse:
    service = PermissionService(db)

    try:
        return await service.update_permission(
            permission_id,
            data,
        )
    except PermissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@permissions_router.delete(
    "/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_permission(
    permission_id: UUID,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.delete")),
    ],
) -> Response:
    service = PermissionService(db)

    try:
        await service.delete_permission(permission_id)
    except PermissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (PermissionInUseError, SystemPermissionError) as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )