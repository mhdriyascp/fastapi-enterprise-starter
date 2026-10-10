from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.masters.schemas.state import (
    StateCreate,
    StateResponse,
    StateUpdate,
)
from app.modules.masters.states_service import (
    StateConflictError,
    StateNotFoundError,
    create_state,
    deactivate_state,
    get_state,
    list_states,
    update_state,
)

router = APIRouter(
    prefix="/masters/states",
    tags=["Master Data - States"],
)


@router.post(
    "",
    response_model=StateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("masters:create"))],
)
async def create_state_endpoint(
    payload: StateCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> StateResponse:
    try:
        return await create_state(db, payload.model_dump())
    except StateNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None
    except StateConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None


@router.get(
    "",
    dependencies=[Depends(require_permission("masters:read"))],
)
async def list_states_endpoint(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    is_active: bool | None = True,
    country_public_id: UUID | None = None,
) -> dict:
    try:
        items, total = await list_states(
            db,
            offset=offset,
            limit=limit,
            search=search,
            is_active=is_active,
            country_public_id=country_public_id,
        )
    except StateNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None

    return {
        "items": [
            StateResponse.model_validate(item)
            for item in items
        ],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get(
    "/{public_id}",
    response_model=StateResponse,
    dependencies=[Depends(require_permission("masters:read"))],
)
async def get_state_endpoint(
    public_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> StateResponse:
    try:
        return await get_state(db, public_id)
    except StateNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None


@router.patch(
    "/{public_id}",
    response_model=StateResponse,
    dependencies=[Depends(require_permission("masters:update"))],
)
async def update_state_endpoint(
    public_id: UUID,
    payload: StateUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> StateResponse:
    try:
        return await update_state(
            db,
            public_id,
            payload.model_dump(exclude_unset=True),
        )
    except StateNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None
    except StateConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None


@router.delete(
    "/{public_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("masters:delete"))],
)
async def deactivate_state_endpoint(
    public_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    try:
        await deactivate_state(db, public_id)
    except StateNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from None
    except StateConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None

    return Response(status_code=status.HTTP_204_NO_CONTENT)