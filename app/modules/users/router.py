from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.users.models import User
from app.modules.users.schemas import UserResponse, UserUpdate
from app.modules.users.service import UserService
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "",
    response_model=PagedResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List users",
    description="Retrieves a paginated list of registered users.",
)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    current_user: Annotated[User, Depends(require_permission("user.read"))],
) -> PagedResponse[UserResponse]:
    """Lists users with pagination and role data."""
    service = UserService(db)
    items, total = await service.list_users(
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return PagedResponse.build(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user by ID",
    description="Retrieves details for a specific user by their unique identifier.",
)
async def get_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("user.read"))],
) -> UserResponse:
    """Fetches user details by user ID."""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return await service.build_user_response(user)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user details",
    description="Updates editable profile attributes for a specific user.",
)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("user.update"))],
) -> UserResponse:
    """Updates user attributes with Super Administrator protection."""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    try:
        return await service.update_user(user, data, current_user)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc


@router.post(
    "/{user_id}/toggle-status",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle user active status",
    description="Toggles user status between active and suspended.",
)
async def toggle_status(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("user.update"))],
) -> UserResponse:
    """Toggles user active status with Super Administrator protection."""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    try:
        return await service.toggle_user_status(user, current_user)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Soft-deletes a user from the platform.",
)
async def delete_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("user.delete"))],
) -> None:
    """Deletes a user account with Super Administrator protection."""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    try:
        await service.delete_user(user, current_user)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
