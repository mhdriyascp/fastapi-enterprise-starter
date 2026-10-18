from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.permissions import require_admin, require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.settings.schemas import (
    BulkSettingsUpdate,
    PublicSettingsResponse,
    SettingsOptionsResponse,
    SystemSettingResponse,
    SystemSettingUpdate,
)
from app.modules.settings.service import SystemSettingService
from app.modules.users.models import User
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse
from app.shared.sorting import SortParams, get_sorting

router = APIRouter(
    prefix="/settings",
    tags=["System Settings"],
)


@router.get(
    "/public",
    response_model=PublicSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public system settings",
    description="Returns public non-sensitive configurations for frontend bootstrapping and guest views.",
)
async def get_public_settings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PublicSettingsResponse:
    service = SystemSettingService(db)
    public_map = await service.get_public_settings_map()
    return PublicSettingsResponse(settings=public_map)


@router.get(
    "",
    response_model=PagedResponse[SystemSettingResponse],
    status_code=status.HTTP_200_OK,
    summary="List all system settings",
    description="Retrieves a paginated and filtered list of system settings. Restricted to administrators with settings.read.",
    dependencies=[
        Depends(require_admin()),
        Depends(require_permission("settings.read")),
    ],
)
async def list_settings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    sorting: Annotated[SortParams, Depends(get_sorting)],
    category: Annotated[
        str | None,
        Query(
            description="Filter by category (general, security, notifications, governance, features)"
        ),
    ] = None,
    is_public: Annotated[
        bool | None,
        Query(description="Filter by public visibility status"),
    ] = None,
    search: Annotated[
        str | None,
        Query(description="Search in setting key, label, or description"),
    ] = None,
) -> PagedResponse[SystemSettingResponse]:
    service = SystemSettingService(db)
    items, total = await service.list(
        category=category,
        is_public=is_public,
        search=search,
        offset=pagination.offset,
        limit=pagination.page_size,
        sort_by=sorting.sort_by,
        sort_order=sorting.sort_order,
    )
    return PagedResponse.build(
        items=[SystemSettingResponse.model_validate(item) for item in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/map",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get all settings as key-value map",
    description="Returns a consolidated dictionary of all system configuration keys and values.",
    dependencies=[
        Depends(require_admin()),
        Depends(require_permission("settings.read")),
    ],
)
async def get_all_settings_map(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, Any]:
    service = SystemSettingService(db)
    return await service.get_all_settings_map()


@router.patch(
    "/bulk",
    response_model=list[SystemSettingResponse],
    status_code=status.HTTP_200_OK,
    summary="Bulk update system settings",
    description="Atomically updates multiple system setting values by key. Restricted to administrators with settings.update.",
    dependencies=[
        Depends(require_admin()),
        Depends(require_permission("settings.update")),
    ],
)
async def bulk_update_settings(
    payload: BulkSettingsUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[SystemSettingResponse]:
    service = SystemSettingService(db)
    updated = await service.bulk_update(payload, updated_by_id=current_user.id)
    return [SystemSettingResponse.model_validate(item) for item in updated]


@router.get(
    "/options",
    response_model=SettingsOptionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get dynamic setting dropdown options",
    description="Returns live active master records (roles, currencies, timezones, languages, and modules) for dynamic UI dropdowns.",
    dependencies=[
        Depends(require_admin()),
        Depends(require_permission("settings.read")),
    ],
)
async def get_settings_options(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SettingsOptionsResponse:
    service = SystemSettingService(db)
    options_data = await service.get_options_metadata()
    return SettingsOptionsResponse.model_validate(options_data)


@router.get(
    "/{identifier}",
    response_model=SystemSettingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system setting details",
    description="Fetches a specific system setting by internal integer ID, UUIDv7 public_id, or configuration key.",
    dependencies=[
        Depends(require_admin()),
        Depends(require_permission("settings.read")),
    ],
)
async def get_setting(
    identifier: Annotated[
        str,
        Path(description="Setting identifier (int ID, UUID public_id, or unique key)"),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SystemSettingResponse:
    clean_identifier = identifier.strip()
    if not clean_identifier or clean_identifier.lower() in (
        "null",
        "undefined",
        "none",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setting identifier cannot be null or empty.",
        )

    service = SystemSettingService(db)
    setting = await service.get_by_identifier(clean_identifier)

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with identifier '{identifier}' not found.",
        )

    return SystemSettingResponse.model_validate(setting)


@router.patch(
    "/{identifier}",
    response_model=SystemSettingResponse,
    status_code=status.HTTP_200_OK,
    summary="Update system setting",
    description="Updates a single system setting value and metadata. Restricted to administrators with settings.update.",
    dependencies=[
        Depends(require_admin()),
        Depends(require_permission("settings.update")),
    ],
)
async def update_setting(
    identifier: Annotated[
        str,
        Path(description="Setting identifier (int ID, UUID public_id, or unique key)"),
    ],
    payload: SystemSettingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SystemSettingResponse:
    clean_identifier = identifier.strip()
    if not clean_identifier or clean_identifier.lower() in (
        "null",
        "undefined",
        "none",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setting identifier cannot be null or empty.",
        )

    service = SystemSettingService(db)
    setting = await service.update(
        clean_identifier, payload, updated_by_id=current_user.id
    )

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with identifier '{identifier}' not found.",
        )

    return SystemSettingResponse.model_validate(setting)
