from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.notifications.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
    UnreadCountResponse,
)
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=PagedResponse[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="List user notifications",
    description="Fetches paginated system notifications for the current authenticated user.",
)
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.read"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    unread_only: bool = Query(
        default=False, description="Filter strictly to unread notifications"
    ),
) -> PagedResponse[NotificationResponse]:
    service = NotificationService(db)
    items, total = await service.list_for_user(
        current_user.id,
        unread_only=unread_only,
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return PagedResponse.build(
        items=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unread notification count",
    description="Returns the total number of unread notifications for the active user.",
)
async def get_unread_count(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.read"))],
) -> UnreadCountResponse:
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.get(
    "/modules",
    response_model=list[str],
    status_code=status.HTTP_200_OK,
    summary="List available notification modules",
    description="Returns standard and active operational modules supported for notification dispatches.",
)
async def list_notification_modules(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.read"))],
) -> list[str]:
    service = NotificationService(db)
    return await service.get_supported_modules()


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new notification",
    description="Dispatches a new system notification for a specific user or broadcast system-wide.",
)
async def create_notification(
    data: NotificationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.create"))],
) -> NotificationResponse:
    service = NotificationService(db)
    # Default to targeting current user if user_id is omitted
    if data.user_id is None:
        data.user_id = current_user.id
    notification = await service.create_notification(data)
    return NotificationResponse.model_validate(notification)


@router.patch(
    "/{identifier}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read or unread",
    description="Updates the read flag for a notification owned by or visible to the user.",
)
async def toggle_read(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the notification (internal ID or public UUIDv7)",
            examples=["1", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    data: NotificationUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.update"))],
) -> NotificationResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification identifier cannot be null or empty.",
        )
    service = NotificationService(db)
    notification = await service.mark_as_read(
        str_val,
        current_user.id,
        is_read=data.is_read,
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with identifier '{str_val}' not found.",
        )
    return NotificationResponse.model_validate(notification)


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read",
    description="Marks all unread notifications visible to the active user as read.",
)
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.update"))],
) -> dict[str, int]:
    service = NotificationService(db)
    updated = await service.mark_all_read(current_user.id)
    return {"updated": updated}


@router.delete(
    "/clear-all",
    status_code=status.HTTP_200_OK,
    summary="Clear all notifications",
    description="Deletes all notifications visible to the user.",
)
async def clear_all(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.delete"))],
) -> dict[str, int]:
    service = NotificationService(db)
    deleted = await service.clear_all(current_user.id)
    return {"deleted": deleted}


@router.delete(
    "/{identifier}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notification",
    description="Deletes a notification visible to the user.",
)
async def delete_notification(
    identifier: Annotated[
        str,
        Path(
            description="Unique identifier of the notification (internal ID or public UUIDv7)",
            examples=["1", "018f3a2b-c4d5-7e8f-9a0b-1c2d3e4f5a6b"],
        ),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("notification.delete"))],
) -> None:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification identifier cannot be null or empty.",
        )
    service = NotificationService(db)
    deleted = await service.delete_notification(str_val, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with identifier '{str_val}' not found.",
        )
