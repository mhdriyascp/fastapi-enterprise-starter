from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
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
    restore_record,
    update_record,
)
from app.modules.users.models import User
from app.shared.deletion_policy import (
    is_user_authorized_for_hard_delete,
    should_user_view_all_statuses,
)
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse
from app.shared.sorting import SortParams, get_sorting


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
        except MasterValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc
        except MasterConflictError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A conflicting master record already exists.",
            ) from None

    # List master records
    @router.get(
        "",
        response_model=PagedResponse[response_schema],
        dependencies=[
            Depends(require_permission("masters:read")),
        ],
    )
    async def list_endpoint(
        db: Annotated[AsyncSession, Depends(get_db_session)],
        pagination: Annotated[PaginationParams, Depends(get_pagination)],
        sorting: Annotated[SortParams, Depends(get_sorting)],
        current_user: Annotated[User, Depends(get_current_user)],
        search: str | None = Query(default=None, max_length=100),
        is_active: bool | None = None,
        include_deleted: bool | None = None,
        country_id: int | None = None,
        state_id: int | None = None,
        city_id: int | None = None,
        organization_id: int | None = None,
        branch_id: int | None = None,
        address_type_id: int | None = None,
        default_currency_id: int | None = None,
    ) -> PagedResponse[response_schema]:
        filters: dict[str, Any] = {}

        if country_id is not None:
            filters["country_id"] = country_id
        if state_id is not None:
            filters["state_id"] = state_id
        if city_id is not None:
            filters["city_id"] = city_id
        if organization_id is not None:
            filters["organization_id"] = organization_id
        if branch_id is not None:
            filters["branch_id"] = branch_id
        if address_type_id is not None:
            filters["address_type_id"] = address_type_id
        if default_currency_id is not None:
            filters["default_currency_id"] = default_currency_id

        view_all = await should_user_view_all_statuses(db, current_user)
        effective_include_deleted = (
            include_deleted if include_deleted is not None else view_all
        )

        records, total = await list_records(
            db,
            model,
            offset=pagination.offset,
            limit=pagination.page_size,
            search=search,
            sort_by=sorting.sort_by,
            sort_order=sorting.sort_order,
            is_active=is_active,
            filters=filters or None,
            include_deleted=effective_include_deleted,
        )

        return PagedResponse.build(
            items=[response_schema.model_validate(record) for record in records],
            total=total,
            page=pagination.page,
            page_size=pagination.page_size,
        )

    # Get master record by public ID or internal integer ID
    @router.get(
        "/{identifier}",
        response_model=response_schema,
        dependencies=[
            Depends(require_permission("masters:read")),
        ],
    )
    async def get_endpoint(
        identifier: Annotated[
            str,
            Path(description="Master record public UUID or internal integer ID"),
        ],
        db: Annotated[AsyncSession, Depends(get_db_session)],
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> Any:
        str_val = identifier.strip() if identifier else ""
        if not str_val or str_val.lower() in ("null", "undefined", "none"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{model.__name__} identifier cannot be empty or null.",
            )
        try:
            view_all = await should_user_view_all_statuses(db, current_user)
            return await get_record(
                db,
                model,
                str_val,
                include_inactive=view_all,
                include_deleted=view_all,
            )
        except MasterValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} with identifier '{str_val}' not found.",
            ) from None

    # Update master record by public ID or internal integer ID
    @router.patch(
        "/{identifier}",
        response_model=response_schema,
        dependencies=[
            Depends(require_permission("masters:update")),
        ],
    )
    async def update_endpoint(
        identifier: Annotated[
            str,
            Path(description="Master record public UUID or internal integer ID"),
        ],
        payload: update_schema,
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ) -> Any:
        str_val = identifier.strip() if identifier else ""
        if not str_val or str_val.lower() in ("null", "undefined", "none"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{model.__name__} identifier cannot be empty or null.",
            )
        try:
            return await update_record(
                db,
                model,
                str_val,
                payload.model_dump(exclude_unset=True),
            )
        except MasterValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} with identifier '{str_val}' not found.",
            ) from None
        except MasterConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc) or "A conflicting master record already exists.",
            ) from None

    # Deactivate or permanently delete master record by public ID or internal integer ID
    @router.delete(
        "/{identifier}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    async def delete_endpoint(
        identifier: Annotated[
            str,
            Path(description="Master record public UUID or internal integer ID"),
        ],
        db: Annotated[AsyncSession, Depends(get_db_session)],
        current_user: Annotated[User, Depends(require_permission("masters:delete"))],
        hard_delete: Annotated[
            bool | None,
            Query(
                description="Set true for permanent purge, false for soft-delete. Defaults based on user permissions.",
            ),
        ] = None,
    ) -> Response:
        str_val = identifier.strip() if identifier else ""
        if not str_val or str_val.lower() in ("null", "undefined", "none"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{model.__name__} identifier cannot be empty or null.",
            )
        can_hard_delete = await is_user_authorized_for_hard_delete(
            db, current_user, "masters"
        )
        if hard_delete is True and not can_hard_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to permanently delete master records. Only soft-deletion is permitted based on your RBAC permissions.",
            )
        effective_hard_delete = bool(hard_delete)
        try:
            await deactivate_record(
                db, model, str_val, hard_delete=effective_hard_delete
            )
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} with identifier '{str_val}' not found.",
            ) from None
        except MasterValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except MasterConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    # Restore deactivated or soft-deleted master record back to active state
    @router.post(
        "/{identifier}/restore",
        response_model=response_schema,
        status_code=status.HTTP_200_OK,
        summary=f"Restore soft-deleted {model.__name__}",
        description=f"Restores a previously deactivated or soft-deleted {model.__name__} back to active state.",
    )
    async def restore_endpoint(
        identifier: Annotated[
            str,
            Path(description="Master record public UUID or internal integer ID"),
        ],
        db: Annotated[AsyncSession, Depends(get_db_session)],
        current_user: Annotated[User, Depends(require_permission("masters:restore"))],
    ) -> Any:
        str_val = identifier.strip() if identifier else ""
        if not str_val or str_val.lower() in ("null", "undefined", "none"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{model.__name__} identifier cannot be empty or null.",
            )
        try:
            return await restore_record(db, model, str_val)
        except MasterNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} with identifier '{str_val}' not found.",
            ) from None
        except MasterConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

    return router
