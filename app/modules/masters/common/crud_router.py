from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.masters.common.crud_service import (
    MasterConflictError,
    MasterNotFoundError,
    MasterValidationError,
    create_record,
    deactivate_record,
    get_record,
    list_records,
    update_record,
)


def create_master_router(
    *,
    model: type,
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    response_schema: type[BaseModel],
    prefix: str,
    tag: str,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    # Create master record
    @router.post(
        "",
        response_model=response_schema,
        status_code=status.HTTP_201_CREATED,
        dependencies=[
            Depends(require_permission("masters:create")),
        ],
    )
    async def create_endpoint(
        payload: create_schema,
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ) -> Any:
        try:
            return await create_record(
                db,
                model,
                payload.model_dump(exclude_unset=True),
            )
        except MasterConflictError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A conflicting master record already exists.",
            ) from None

    # List master records
    @router.get(
        "",
        dependencies=[
            Depends(require_permission("masters:read")),
        ],
    )
    async def list_endpoint(
        db: Annotated[AsyncSession, Depends(get_db_session)],
        offset: int = Query(default=0, ge=0),
        limit: int = Query(default=20, ge=1, le=100),
        search: str | None = Query(default=None, max_length=100),
        is_active: bool | None = True,
    ) -> dict[str, Any]:
        records, total = await list_records(
            db,
            model,
            offset=offset,
            limit=limit,
            search=search,
            is_active=is_active,
        )

        return {
            "items": [
                response_schema.model_validate(record)
                for record in records
            ],
            "total": total,
            "offset": offset,
            "limit": limit,
        }

    # Get master record by public ID
    @router.get(
        "/{public_id}",
        response_model=response_schema,
        dependencies=[
            Depends(require_permission("masters:read")),
        ],
    )
    async def get_endpoint(
        public_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ) -> Any:
        try:
            return await get_record(db, model, public_id)
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Master record not found.",
            ) from None

    # Update master record
    @router.patch(
        "/{public_id}",
        response_model=response_schema,
        dependencies=[
            Depends(require_permission("masters:update")),
        ],
    )
    async def update_endpoint(
        public_id: UUID,
        payload: update_schema,
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ) -> Any:
        try:
            return await update_record(
                db,
                model,
                public_id,
                payload.model_dump(exclude_unset=True),
            )
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Master record not found.",
            ) from None
        except MasterConflictError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A conflicting master record already exists.",
            ) from None

    # Deactivate master record
    @router.delete(
        "/{public_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[
            Depends(require_permission("masters:delete")),
        ],
    )
    async def delete_endpoint(
        public_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ) -> Response:
        try:
            await deactivate_record(db, model, public_id)
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Master record not found.",
            ) from None
        except MasterValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router