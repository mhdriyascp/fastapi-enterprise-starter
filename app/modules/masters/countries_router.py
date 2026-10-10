from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.masters.countries_service import (
    CountryConflictError,
    CountryNotFoundError,
    create_country,
    deactivate_country,
    get_country,
    list_countries,
    update_country,
)
from app.modules.masters.schemas.country import (
    CountryCreate,
    CountryResponse,
    CountryUpdate,
)

router = APIRouter(
    prefix="/masters/countries",
    tags=["Master Data - Countries"],
)


@router.post(
    "",
    response_model=CountryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_permission("masters:create")),
    ],
)
async def create_country_endpoint(
    payload: CountryCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CountryResponse:
    try:
        return await create_country(db, payload)
    except CountryConflictError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Country code or ISO3 code already exists.",
        ) from None


@router.get(
    "",
    dependencies=[
        Depends(require_permission("masters:read")),
    ],
)
async def list_countries_endpoint(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    is_active: bool | None = True,
) -> dict:
    countries, total = await list_countries(
        db,
        offset=offset,
        limit=limit,
        search=search,
        is_active=is_active,
    )

    return {
        "items": [
            CountryResponse.model_validate(country)
            for country in countries
        ],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get(
    "/{public_id}",
    response_model=CountryResponse,
    dependencies=[
        Depends(require_permission("masters:read")),
    ],
)
async def get_country_endpoint(
    public_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CountryResponse:
    try:
        return await get_country(db, public_id)
    except CountryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found.",
        ) from None


@router.patch(
    "/{public_id}",
    response_model=CountryResponse,
    dependencies=[
        Depends(require_permission("masters:update")),
    ],
)
async def update_country_endpoint(
    public_id: UUID,
    payload: CountryUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CountryResponse:
    try:
        return await update_country(db, public_id, payload)
    except CountryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found.",
        ) from None
    except CountryConflictError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Country code or ISO3 code already exists.",
        ) from None


@router.delete(
    "/{public_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_permission("masters:delete")),
    ],
)
async def deactivate_country_endpoint(
    public_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    try:
        await deactivate_country(db, public_id)
    except CountryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found.",
        ) from None

    return Response(status_code=status.HTTP_204_NO_CONTENT)