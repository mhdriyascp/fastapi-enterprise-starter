from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.masters.cities_service import (
    CityConflictError,
    CityNotFoundError,
    create_city,
    deactivate_city,
    get_city,
    list_cities,
    update_city,
)
from app.modules.masters.schemas.city import (
    CityCreate,
    CityResponse,
    CityUpdate,
)

router = APIRouter(
    prefix="/masters/cities",
    tags=["Master Data - Cities"],
)


@router.post(
    "",
    response_model=CityResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("masters:create"))],
)
async def create_city_endpoint(
    payload: CityCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CityResponse:
    try:
        return await create_city(db, payload.model_dump())
    except CityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None
    except CityConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None


@router.get(
    "",
    dependencies=[Depends(require_permission("masters:read"))],
)
async def list_cities_endpoint(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    is_active: bool | None = True,
    country_public_id: UUID | None = None,
    state_public_id: UUID | None = None,
) -> dict:
    try:
        items, total = await list_cities(
            db,
            offset=offset,
            limit=limit,
            search=search,
            is_active=is_active,
            country_public_id=country_public_id,
            state_public_id=state_public_id,
        )
    except CityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None

    return {
        "items": [
            CityResponse.model_validate(item)
            for item in items
        ],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get(
    "/{public_id}",
    response_model=CityResponse,
    dependencies=[Depends(require_permission("masters:read"))],
)
async def get_city_endpoint(
    public_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CityResponse:
    try:
        return await get_city(db, public_id)
    except CityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None


@router.patch(
    "/{public_id}",
    response_model=CityResponse,
    dependencies=[Depends(require_permission("masters:update"))],
)
async def update_city_endpoint(
    public_id: UUID,
    payload: CityUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CityResponse:
    try:
        return await update_city(
            db,
            public_id,
            payload.model_dump(exclude_unset=True),
        )
    except CityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None
    except CityConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None


@router.delete(
    "/{public_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("masters:delete"))],
)
async def deactivate_city_endpoint(
    public_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    try:
        await deactivate_city(db, public_id)
    except CityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None
    except CityConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None

    return Response(status_code=status.HTTP_204_NO_CONTENT)