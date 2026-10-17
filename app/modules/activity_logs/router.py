from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_admin, require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.activity_logs.schemas import (
    ActivityLogPagedResponse,
    ActivityLogResponse,
    BulkDeleteActivityLogsPayload,
)
from app.modules.activity_logs.service import ActivityLogService
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse

router = APIRouter(
    prefix="/system-logs",
    tags=["System Activity Logs"],
    dependencies=[
        Depends(require_admin("system activity logs")),
        Depends(require_permission("activity_logs.read")),
    ],
)


@router.get(
    "",
    response_model=ActivityLogPagedResponse,
    status_code=status.HTTP_200_OK,
    summary="List system activity logs",
    description="Retrieves a paginated stream of platform audit and mutation activity events with multi-criteria filtering.",
)
async def list_activity_logs(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    module: str | None = Query(
        default=None, description="Filter by domain module name"
    ),
    action: str | None = Query(
        default=None,
        description="Filter by mutation action type (CREATE, UPDATE, DELETE, etc.)",
    ),
    search: str | None = Query(
        default=None,
        description="Search across entity names, identifiers, or operator emails",
    ),
    start_date: datetime | None = Query(
        default=None, description="Filter logs starting at this timestamp"
    ),
    end_date: datetime | None = Query(
        default=None, description="Filter logs ending at this timestamp"
    ),
) -> ActivityLogPagedResponse:
    service = ActivityLogService(db)
    items, total = await service.list_logs(
        module=module,
        action=action,
        search=search,
        start_date=start_date,
        end_date=end_date,
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
    "/modules",
    response_model=list[str],
    status_code=status.HTTP_200_OK,
    summary="List available activity modules",
    description="Fetches distinct system modules that have generated activity log entries.",
)
async def list_activity_modules(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[str]:
    service = ActivityLogService(db)
    return await service.get_distinct_modules()


@router.post(
    "/clear-all",
    status_code=status.HTTP_200_OK,
    summary="Clear all system activity logs",
    description="Permanently purges all system activity logs from the database.",
    dependencies=[Depends(require_permission("activity_logs.delete"))],
)
@router.delete(
    "/clear-all",
    status_code=status.HTTP_200_OK,
    summary="Clear all system activity logs",
    description="Permanently purges all system activity logs from the database.",
    dependencies=[Depends(require_permission("activity_logs.delete"))],
)
async def clear_all_activity_logs(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, Any]:
    service = ActivityLogService(db)
    deleted_count = await service.clear_all_logs()
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Successfully cleared all {deleted_count} system activity log(s).",
    }


@router.get(
    "/{identifier}",
    response_model=ActivityLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Get activity log details",
    description="Fetches the full specification and change payload of an activity log by internal ID or public UUIDv7.",
)
async def get_activity_log(
    identifier: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ActivityLogResponse:
    clean_id = identifier.strip()
    if not clean_id or clean_id.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activity log identifier cannot be null or empty.",
        )

    service = ActivityLogService(db)
    record = await service.get_by_identifier(clean_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity log with identifier '{clean_id}' not found.",
        )
    return record


@router.delete(
    "/{identifier}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete system activity log",
    description="Permanently deletes a specific activity log entry by internal ID or public UUIDv7.",
    dependencies=[Depends(require_permission("activity_logs.delete"))],
)
async def delete_activity_log(
    identifier: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    clean_id = identifier.strip()
    if not clean_id or clean_id.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activity log identifier cannot be null or empty.",
        )

    service = ActivityLogService(db)
    deleted = await service.delete_log(clean_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity log with identifier '{clean_id}' not found.",
        )


@router.post(
    "/bulk-delete",
    status_code=status.HTTP_200_OK,
    summary="Bulk delete system activity logs",
    description="Permanently deletes multiple activity log entries by their identifiers in a single batch transaction.",
    dependencies=[Depends(require_permission("activity_logs.delete"))],
)
async def bulk_delete_activity_logs(
    payload: BulkDeleteActivityLogsPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, Any]:
    if not payload.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No activity log identifiers provided for bulk deletion.",
        )

    service = ActivityLogService(db)
    deleted_count = await service.bulk_delete_logs(payload.ids)
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Successfully deleted {deleted_count} activity log(s).",
    }
