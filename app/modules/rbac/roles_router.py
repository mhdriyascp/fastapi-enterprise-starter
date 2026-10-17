from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.schemas import (
    RoleCreate,
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
from app.shared.deletion_policy import is_user_authorized_for_hard_delete
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse

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
    response_model=PagedResponse[RoleResponse],
    status_code=status.HTTP_200_OK,
    summary="List roles",
    description="Retrieves a paginated list of security roles.",
)
async def list_roles(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.read")),
    ],
) -> PagedResponse[RoleResponse]:
    service = RoleService(db)

    items, total = await service.list_roles(
        offset=pagination.offset,
        limit=pagination.page_size,
    )

    return PagedResponse.build(
        items=[RoleResponse.model_validate(item) for item in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


# ============================================================
# Get role
# ============================================================


@roles_router.get(
    "/{identifier}",
    response_model=RoleResponse,
)
async def get_role(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the role (UUID or unique role code)",
            examples=["super_admin", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.read")),
    ],
) -> RoleResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role identifier cannot be null or empty.",
        )
    service = RoleService(db)

    try:
        return await service.get_role(str_val)
    except RoleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# Update role
# ============================================================


@roles_router.patch(
    "/{identifier}",
    response_model=RoleResponse,
)
async def update_role(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the role (UUID or unique role code)",
            examples=["super_admin", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    data: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.update")),
    ],
) -> RoleResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role identifier cannot be null or empty.",
        )
    service = RoleService(db)

    try:
        return await service.update_role(str_val, data)
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
    "/{identifier}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_role(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the role (UUID or unique role code)",
            examples=["super_admin", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.delete")),
    ],
    hard_delete: Annotated[
        bool | None,
        Query(
            description="Set true for permanent purge, false for soft-delete. Defaults based on user permissions.",
        ),
    ] = None,
) -> Response:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role identifier cannot be null or empty.",
        )
    can_hard_delete = await is_user_authorized_for_hard_delete(db, current_user, "rbac")
    if hard_delete is True and not can_hard_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to permanently delete roles. Only soft-deletion is permitted based on your RBAC permissions.",
        )
    effective_hard_delete = bool(hard_delete)
    service = RoleService(db)

    try:
        await service.delete_role(str_val, hard_delete=effective_hard_delete)
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


@roles_router.post(
    "/{identifier}/restore",
    response_model=RoleResponse,
    status_code=status.HTTP_200_OK,
    summary="Restore soft-deleted or inactive role",
    description="Restores a previously deactivated role back to active status.",
)
async def restore_role(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the role (UUID or unique role code)",
            examples=["sales_manager", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[
        User,
        Depends(require_permission("role.restore")),
    ],
) -> RoleResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role identifier cannot be null or empty.",
        )

    service = RoleService(db)
    try:
        role = await service.restore_role(str_val)
        return RoleResponse.model_validate(role)
    except RoleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except RoleAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
