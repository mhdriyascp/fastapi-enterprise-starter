from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationStatusUpdate,
    OrganizationUpdate,
)
from app.modules.organizations.service import OrganizationService
from app.modules.users.models import User
from app.shared.deletion_policy import (
    is_user_authorized_for_hard_delete,
    should_user_view_all_statuses,
)
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse
from app.shared.sorting import SortParams, get_sorting

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("organization.create"))],
)
async def create_organization(
    data: OrganizationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    service = OrganizationService(db)

    try:
        return await service.create(data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=PagedResponse[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary="List organizations",
    description="Retrieves a paginated and sorted list of enterprise organizations.",
)
async def list_organizations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    sorting: Annotated[SortParams, Depends(get_sorting)],
    current_user: Annotated[User, Depends(require_permission("organization.read"))],
    search: Annotated[
        str | None, Query(description="Search by name, code, legal name")
    ] = None,
    is_active: Annotated[
        bool | None, Query(description="Filter by active status")
    ] = None,
    include_deleted: Annotated[
        bool | None, Query(description="Include soft-deleted organizations")
    ] = None,
) -> PagedResponse[OrganizationResponse]:
    service = OrganizationService(db)
    view_all = await should_user_view_all_statuses(db, current_user)
    effective_include_deleted = (
        include_deleted if include_deleted is not None else view_all
    )
    items, total = await service.list(
        offset=pagination.offset,
        limit=pagination.page_size,
        sort_by=sorting.sort_by,
        sort_order=sorting.sort_order,
        search=search,
        is_active=is_active,
        include_deleted=effective_include_deleted,
    )
    return PagedResponse.build(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/{identifier}",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get organization details",
    description="Fetches an organization by external UUID public_id or internal ID.",
)
async def get_organization(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("organization.read"))],
) -> OrganizationResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization identifier cannot be null or empty.",
        )

    view_all = await should_user_view_all_statuses(db, current_user)
    organization = await OrganizationService(db).get(str_val, include_deleted=view_all)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with identifier '{str_val}' not found.",
        )

    return organization


@router.patch(
    "/{identifier}",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update organization",
    description="Updates organization profile fields by external UUID public_id or internal ID.",
    dependencies=[Depends(require_permission("organization.update"))],
)
async def update_organization(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    data: OrganizationUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization identifier cannot be null or empty.",
        )

    service = OrganizationService(db)
    organization = await service.get(str_val)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with identifier '{str_val}' not found.",
        )

    try:
        return await service.update(organization, data)
    except ValueError as exc:
        err_msg = str(exc)
        if "cannot be null" in err_msg or "cannot be empty" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=err_msg,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=err_msg,
        ) from exc


@router.patch(
    "/{identifier}/status",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update organization active status",
    description="Activates or deactivates an organization by external UUID public_id or internal ID.",
    dependencies=[Depends(require_permission("organization.update"))],
)
async def update_organization_status(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    data: OrganizationStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization identifier cannot be null or empty.",
        )

    service = OrganizationService(db)
    organization = await service.get(str_val)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with identifier '{str_val}' not found.",
        )

    return await service.update_status(organization, data.is_active)


@router.delete(
    "/{identifier}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete organization",
    description="Deletes an organization record by external UUID public_id or internal ID (soft-delete or purge based on permissions and options).",
)
async def delete_organization(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("organization.delete"))],
    hard_delete: Annotated[
        bool | None,
        Query(
            description="Set true for permanent purge, false for soft-delete. Defaults based on user permissions.",
        ),
    ] = None,
) -> None:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization identifier cannot be null or empty.",
        )

    can_hard_delete = await is_user_authorized_for_hard_delete(
        db, current_user, "organizations"
    )
    if hard_delete is True and not can_hard_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to purge organizations. Only soft-deletion is permitted based on your RBAC permissions.",
        )
    effective_hard_delete = bool(hard_delete)

    service = OrganizationService(db)
    organization = await service.get(str_val, include_deleted=True)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with identifier '{str_val}' not found.",
        )

    if not effective_hard_delete and organization.is_deleted:
        return None

    try:
        await service.delete(
            organization,
            deleted_by_id=current_user.id,
            hard_delete=effective_hard_delete,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post(
    "/{identifier}/restore",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Restore soft-deleted organization",
    description="Restores a previously soft-deleted organization back to active state.",
)
async def restore_organization(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(require_permission("organization.restore"))],
) -> OrganizationResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization identifier cannot be null or empty.",
        )

    service = OrganizationService(db)
    organization = await service.get(str_val, include_deleted=True)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with identifier '{str_val}' not found.",
        )

    if not organization.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization is not deleted and does not require restoration.",
        )

    restored = await service.restore(organization, restored_by_id=current_user.id)
    return OrganizationResponse.model_validate(restored)
