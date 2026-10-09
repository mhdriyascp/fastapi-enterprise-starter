from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.schemas import (
    RoleCreate,
    RoleListResponse,
    RoleResponse,
    RoleUpdate,
)
from app.modules.rbac.service import (
    RoleAlreadyExistsError,
    RoleInUseError,
    RoleNotFoundError,
    RoleService,
    SystemRoleError,
)
from app.modules.users.models import User

roles_router = APIRouter(
    prefix="/roles",
    tags=["RBAC - Roles"],
)


# ============================================================
# Create role
# ============================================================


@roles_router.post(
    "",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_role(
    data: RoleCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.create")),
    ],
) -> RoleResponse:
    service = RoleService(db)

    try:
        return await service.create_role(data)
    except RoleAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


# ============================================================
# List roles
# ============================================================


@roles_router.get(
    "",
    response_model=RoleListResponse,
)
async def list_roles(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.read")),
    ],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> RoleListResponse:
    service = RoleService(db)

    items, total = await service.list_roles(
        page=page,
        page_size=page_size,
    )

    return RoleListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================
# Get role
# ============================================================


@roles_router.get(
    "/{role_id}",
    response_model=RoleResponse,
)
async def get_role(
    role_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.read")),
    ],
) -> RoleResponse:
    service = RoleService(db)

    try:
        return await service.get_role(role_id)
    except RoleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# Update role
# ============================================================


@roles_router.patch(
    "/{role_id}",
    response_model=RoleResponse,
)
async def update_role(
    role_id: UUID,
    data: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.update")),
    ],
) -> RoleResponse:
    service = RoleService(db)

    try:
        return await service.update_role(role_id, data)
    except RoleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (RoleAlreadyExistsError, SystemRoleError) as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


# ============================================================
# Delete role
# ============================================================


@roles_router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_role(
    role_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.delete")),
    ],
) -> Response:
    service = RoleService(db)

    try:
        await service.delete_role(role_id)
    except RoleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (RoleInUseError, SystemRoleError) as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )