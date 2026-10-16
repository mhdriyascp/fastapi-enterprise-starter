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
    dependencies=[Depends(require_permission("organization.read"))],
)
async def list_organizations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    sorting: Annotated[SortParams, Depends(get_sorting)],
    search: Annotated[
        str | None, Query(description="Search by name, code, legal name")
    ] = None,
    is_active: Annotated[
        bool | None, Query(description="Filter by active status")
    ] = None,
) -> PagedResponse[OrganizationResponse]:
    service = OrganizationService(db)
    items, total = await service.list(
        offset=pagination.offset,
        limit=pagination.page_size,
        sort_by=sorting.sort_by,
        sort_order=sorting.sort_order,
        search=search,
        is_active=is_active,
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
    dependencies=[Depends(require_permission("organization.read"))],
)
async def get_organization(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    str_val = identifier.strip() if identifier else ""
    if not str_val or str_val.lower() in ("null", "undefined", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization identifier cannot be null or empty.",
        )

    organization = await OrganizationService(db).get(str_val)

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
    description="Deletes an organization record by external UUID public_id or internal ID.",
    dependencies=[Depends(require_permission("organization.delete"))],
)
async def delete_organization(
    identifier: Annotated[
        str,
        Path(description="Organization UUID (public_id) or internal ID"),
    ],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
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

    await service.delete(organization)
