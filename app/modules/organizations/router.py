from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    response_model=list[OrganizationResponse],
    dependencies=[Depends(require_permission("organization.read"))],
)
async def list_organizations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[OrganizationResponse]:
    service = OrganizationService(db)
    return await service.list(offset=offset, limit=limit)


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
    dependencies=[Depends(require_permission("organization.read"))],
)
async def get_organization(
    organization_id: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    organization = await OrganizationService(db).get(organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    return organization


@router.patch(
    "/{organization_id}",
    response_model=OrganizationResponse,
    dependencies=[Depends(require_permission("organization.update"))],
)
async def update_organization(
    organization_id: int,
    data: OrganizationUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    service = OrganizationService(db)
    organization = await service.get(organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    try:
        return await service.update(organization, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{organization_id}/status",
    response_model=OrganizationResponse,
    dependencies=[Depends(require_permission("organization.update"))],
)
async def update_organization_status(
    organization_id: int,
    data: OrganizationStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse:
    service = OrganizationService(db)
    organization = await service.get(organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    return await service.update_status(organization, data.is_active)