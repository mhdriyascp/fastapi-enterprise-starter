from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.schemas import (
    PermissionCreate,
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
from app.shared.deletion_policy import is_user_authorized_for_hard_delete
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse

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
    response_model=PagedResponse[PermissionResponse],
    status_code=status.HTTP_200_OK,
    summary="List permissions",
    description="Retrieves a paginated list of granular access permissions.",
)
async def list_permissions(
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.read")),
    ],
) -> PagedResponse[PermissionResponse]:
    service = PermissionService(db)

    items, total = await service.list_permissions(
        offset=pagination.offset,
        limit=pagination.page_size,
    )

    return PagedResponse.build(
        items=[PermissionResponse.model_validate(item) for item in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@permissions_router.get(
    "/{identifier}",
    response_model=PermissionResponse,
)
async def get_permission(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the permission (UUID or code)",
            examples=["user.read", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.read")),
    ],
) -> PermissionResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission identifier cannot be null or empty.",
        )
    service = PermissionService(db)

    try:
        return await service.get_permission(str_val)
    except PermissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@permissions_router.patch(
    "/{identifier}",
    response_model=PermissionResponse,
)
async def update_permission(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the permission (UUID or code)",
            examples=["user.read", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
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
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission identifier cannot be null or empty.",
        )
    service = PermissionService(db)

    try:
        return await service.update_permission(
            str_val,
            data,
        )
    except PermissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (SystemPermissionError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except PermissionInUseError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@permissions_router.delete(
    "/{identifier}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete or deactivate permission",
    description="Soft-deletes or permanently purges a permission based on operator privileges.",
)
async def delete_permission(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the permission (UUID or code)",
            examples=["user.read", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.delete")),
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
            detail="Permission identifier cannot be null or empty.",
        )
    can_hard_delete = await is_user_authorized_for_hard_delete(db, current_user, "rbac")
    if hard_delete is True and not can_hard_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to permanently delete permissions. Only soft-deletion is permitted based on your RBAC permissions.",
        )
    effective_hard_delete = bool(hard_delete)
    service = PermissionService(db)

    try:
        await service.delete_permission(str_val, hard_delete=effective_hard_delete)
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


@permissions_router.post(
    "/{identifier}/restore",
    response_model=PermissionResponse,
    status_code=status.HTTP_200_OK,
    summary="Restore soft-deleted or inactive permission",
    description="Restores a previously deactivated permission back to active status.",
)
async def restore_permission(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the permission (UUID or code)",
            examples=["user.read", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    current_user: Annotated[
        User,
        Depends(require_permission("permission.restore")),
    ],
) -> PermissionResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission identifier cannot be null or empty.",
        )
    service = PermissionService(db)

    try:
        permission = await service.restore_permission(str_val)
    except PermissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except PermissionInUseError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return PermissionResponse.model_validate(permission)
