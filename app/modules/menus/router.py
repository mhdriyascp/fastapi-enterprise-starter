from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.permissions import require_permission
from app.infrastructure.database.session import get_db_session
from app.modules.menus.schemas import (
    MenuCreate,
    MenuPermissionAssignment,
    MenuResponse,
    MenuRoleAssignment,
    MenuTreeNode,
    MenuUpdate,
)
from app.modules.menus.service import (
    MenuAlreadyExistsError,
    MenuCycleError,
    MenuNotFoundError,
    MenuParentNotFoundError,
    MenuService,
)
from app.modules.users.models import User
from app.shared.pagination import PaginationParams, get_pagination
from app.shared.response import PagedResponse

router = APIRouter(
    prefix="/menus",
    tags=["Menus"],
)


@router.get(
    "/my-menus",
    response_model=list[MenuTreeNode],
    status_code=status.HTTP_200_OK,
    summary="Get visible navigation menus for current user",
    description="Returns the hierarchical menu tree filtered by the current user's active roles and permissions.",
)
async def get_my_menus(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[MenuTreeNode]:
    service = MenuService(db)
    return await service.get_visible_menu_tree_for_user(current_user.id)


@router.get(
    "/tree",
    response_model=list[MenuTreeNode],
    status_code=status.HTTP_200_OK,
    summary="Get full navigation menu tree",
    description="Returns the complete hierarchical menu tree for administration.",
    dependencies=[Depends(require_permission("menu.read"))],
)
async def get_menu_tree(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    is_active_only: Annotated[
        bool,
        Query(description="Filter only active menus"),
    ] = False,
) -> list[MenuTreeNode]:
    service = MenuService(db)
    return await service.get_full_tree(is_active_only=is_active_only)


@router.post(
    "",
    response_model=MenuResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create navigation menu item",
    description="Creates a new navigation menu item with optional parent, roles, and permissions.",
    dependencies=[Depends(require_permission("menu.create"))],
)
async def create_menu(
    data: MenuCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MenuResponse:
    service = MenuService(db)
    try:
        menu = await service.create_menu(data)
        return service.to_response(menu)
    except MenuAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except MenuParentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=PagedResponse[MenuResponse],
    status_code=status.HTTP_200_OK,
    summary="List navigation menu items",
    description="Returns a paginated list of menu items with optional filtering by parent_id or active status.",
    dependencies=[Depends(require_permission("menu.read"))],
)
async def list_menus(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    parent_id: Annotated[
        UUID | None,
        Query(description="Filter by parent menu UUID"),
    ] = None,
    is_active: Annotated[
        bool | None,
        Query(description="Filter by active status"),
    ] = None,
) -> PagedResponse[MenuResponse]:
    service = MenuService(db)
    items, total = await service.list_menus(
        pagination=pagination,
        parent_id=parent_id,
        is_active=is_active,
    )
    responses = [service.to_response(m) for m in items]
    return PagedResponse[MenuResponse].build(
        items=responses,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/{menu_id}",
    response_model=MenuResponse,
    status_code=status.HTTP_200_OK,
    summary="Get menu item details",
    description="Fetches detailed information for a specific menu item by its UUID.",
    dependencies=[Depends(require_permission("menu.read"))],
)
async def get_menu(
    menu_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MenuResponse:
    service = MenuService(db)
    menu = await service.get_menu_by_id(menu_id)
    if not menu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu not found.",
        )
    return service.to_response(menu)


@router.patch(
    "/{menu_id}",
    response_model=MenuResponse,
    status_code=status.HTTP_200_OK,
    summary="Update menu item",
    description="Updates attributes, parent reference, or role/permission assignments of a menu item.",
    dependencies=[Depends(require_permission("menu.update"))],
)
async def update_menu(
    menu_id: UUID,
    data: MenuUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MenuResponse:
    service = MenuService(db)
    menu = await service.get_menu_by_id(menu_id)
    if not menu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu not found.",
        )

    try:
        updated = await service.update_menu(menu, data)
        return service.to_response(updated)
    except MenuAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except MenuParentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except MenuCycleError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{menu_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete menu item",
    description="Deletes a menu item, cascading to child items and access assignments.",
    dependencies=[Depends(require_permission("menu.delete"))],
)
async def delete_menu(
    menu_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    service = MenuService(db)
    try:
        await service.delete_menu(menu_id)
    except MenuNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.put(
    "/{menu_id}/roles",
    response_model=MenuResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign roles to menu item",
    description="Replaces role assignments for a menu item.",
    dependencies=[Depends(require_permission("menu.update"))],
)
async def set_menu_roles(
    menu_id: UUID,
    data: MenuRoleAssignment,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MenuResponse:
    service = MenuService(db)
    try:
        updated = await service.set_menu_roles(menu_id, data.role_ids)
        return service.to_response(updated)
    except MenuNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.put(
    "/{menu_id}/permissions",
    response_model=MenuResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign permissions to menu item",
    description="Replaces permission assignments for a menu item.",
    dependencies=[Depends(require_permission("menu.update"))],
)
async def set_menu_permissions(
    menu_id: UUID,
    data: MenuPermissionAssignment,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MenuResponse:
    service = MenuService(db)
    try:
        updated = await service.set_menu_permissions(menu_id, data.permission_ids)
        return service.to_response(updated)
    except MenuNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
