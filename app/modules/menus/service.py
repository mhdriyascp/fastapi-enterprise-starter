import logging
import re
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.menus.models import Menu, MenuPermission, MenuRole
from app.modules.menus.schemas import (
    MenuCreate,
    MenuResponse,
    MenuTreeNode,
    MenuUpdate,
)
from app.modules.rbac.models import Permission, Role, RolePermission, UserRole
from app.shared.pagination import PaginationParams

logger = logging.getLogger(__name__)


# ============================================================
# Menu domain exceptions
# ============================================================


class MenuNotFoundError(Exception):
    """Raised when a requested menu does not exist."""


class MenuAlreadyExistsError(Exception):
    """Raised when attempting to create a menu with a duplicate code."""


class MenuParentNotFoundError(Exception):
    """Raised when the specified parent menu does not exist."""


class MenuCycleError(Exception):
    """Raised when creating a cycle in the menu hierarchy."""


class MenuService:
    """Domain service managing navigation menu lifecycle and role/permission visibility."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def to_response(self, menu: Menu) -> MenuResponse:
        """Converts a Menu entity to its response schema."""
        role_ids = [r.id for r in (menu.roles or [])]
        permission_ids = [p.id for p in (menu.permissions or [])]

        return MenuResponse(
            id=menu.id,
            public_id=menu.public_id,
            parent_id=menu.parent_id,
            title=menu.title,
            code=menu.code,
            path=menu.path,
            icon=menu.icon,
            sort_order=menu.sort_order,
            is_active=menu.is_active,
            role_ids=role_ids,
            permission_ids=permission_ids,
            created_at=menu.created_at,
            updated_at=menu.updated_at,
        )

    async def get_menu_by_id(self, menu_id: UUID) -> Menu | None:
        """Fetches a menu by its primary UUID with eager loaded roles and permissions."""
        stmt = (
            select(Menu)
            .options(
                selectinload(Menu.roles),
                selectinload(Menu.permissions),
            )
            .where(Menu.id == menu_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_menu_by_code(self, code: str) -> Menu | None:
        """Fetches a menu by its unique system code."""
        stmt = (
            select(Menu)
            .options(
                selectinload(Menu.roles),
                selectinload(Menu.permissions),
            )
            .where(Menu.code == code.strip().lower())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_menu(self, data: MenuCreate) -> Menu:
        """Creates a new menu item with optional parent, roles, and permissions."""
        if data.code and data.code.strip():
            clean_code = data.code.strip().lower()
        else:
            clean_code = re.sub(r"[^a-z0-9_]+", "_", data.title.strip().lower()).strip(
                "_"
            )[:50]
            if not clean_code:
                clean_code = "menu_item"

        existing = await self.get_menu_by_code(clean_code)
        if existing:
            raise MenuAlreadyExistsError(
                f"Menu with code '{clean_code}' already exists."
            )

        if data.parent_id:
            parent = await self.get_menu_by_id(data.parent_id)
            if not parent:
                raise MenuParentNotFoundError("Parent menu does not exist.")

        menu = Menu(
            title=data.title.strip(),
            code=clean_code,
            path=data.path.strip() if data.path else None,
            icon=data.icon.strip() if data.icon else None,
            sort_order=data.sort_order,
            parent_id=data.parent_id,
            is_active=data.is_active,
        )
        self.db.add(menu)
        await self.db.flush()

        # Assign initial roles if provided
        if data.role_ids:
            for role_id in set(data.role_ids):
                self.db.add(MenuRole(menu_id=menu.id, role_id=role_id))

        # Assign initial permissions if provided
        if data.permission_ids:
            for perm_id in set(data.permission_ids):
                self.db.add(MenuPermission(menu_id=menu.id, permission_id=perm_id))

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            logger.warning("Integrity error creating menu: %s", exc)
            raise MenuAlreadyExistsError(
                "A menu with this code already exists."
            ) from exc

        loaded = await self.get_menu_by_id(menu.id)
        if not loaded:
            raise MenuNotFoundError("Failed to retrieve created menu.")
        return loaded

    async def list_menus(
        self,
        pagination: PaginationParams,
        parent_id: UUID | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[Menu], int]:
        """Lists menus with pagination and filtering."""
        query = select(Menu).options(
            selectinload(Menu.roles),
            selectinload(Menu.permissions),
        )

        if parent_id is not None:
            query = query.where(Menu.parent_id == parent_id)
        if is_active is not None:
            query = query.where(Menu.is_active == is_active)

        # Count total
        count_stmt = select(func.count(Menu.id))
        if parent_id is not None:
            count_stmt = count_stmt.where(Menu.parent_id == parent_id)
        if is_active is not None:
            count_stmt = count_stmt.where(Menu.is_active == is_active)

        total = (await self.db.execute(count_stmt)).scalar_one()

        items_stmt = (
            query.order_by(Menu.sort_order, Menu.title)
            .offset(pagination.offset)
            .limit(pagination.page_size)
        )
        items = list((await self.db.execute(items_stmt)).scalars().all())

        return items, total

    async def update_menu(self, menu: Menu, data: MenuUpdate) -> Menu:
        """Updates a menu item, validating codes, parent references, and role/permission links."""
        if data.code is not None:
            clean_code = data.code.strip().lower()
            if clean_code != menu.code:
                existing = await self.get_menu_by_code(clean_code)
                if existing and existing.id != menu.id:
                    raise MenuAlreadyExistsError(
                        f"Menu with code '{clean_code}' already exists."
                    )
                menu.code = clean_code

        if data.parent_id is not None:
            if data.parent_id == menu.id:
                raise MenuCycleError("A menu cannot be its own parent.")

            # Check if target parent is a descendant of current menu
            descendant_ids = await self._get_all_descendant_ids(menu.id)
            if data.parent_id in descendant_ids:
                raise MenuCycleError(
                    "Cannot set parent to a descendant menu item (circular hierarchy)."
                )

            parent = await self.get_menu_by_id(data.parent_id)
            if not parent:
                raise MenuParentNotFoundError("Parent menu does not exist.")
            menu.parent_id = data.parent_id

        if data.title is not None:
            menu.title = data.title.strip()
        if data.path is not None:
            menu.path = data.path.strip() if data.path else None
        if data.icon is not None:
            menu.icon = data.icon.strip() if data.icon else None
        if data.sort_order is not None:
            menu.sort_order = data.sort_order
        if data.is_active is not None:
            menu.is_active = data.is_active

        # Update role assignments if provided
        if data.role_ids is not None:
            await self.db.execute(delete(MenuRole).where(MenuRole.menu_id == menu.id))
            for role_id in set(data.role_ids):
                self.db.add(MenuRole(menu_id=menu.id, role_id=role_id))

        # Update permission assignments if provided
        if data.permission_ids is not None:
            await self.db.execute(
                delete(MenuPermission).where(MenuPermission.menu_id == menu.id)
            )
            for perm_id in set(data.permission_ids):
                self.db.add(MenuPermission(menu_id=menu.id, permission_id=perm_id))

        await self.db.commit()
        loaded = await self.get_menu_by_id(menu.id)
        if not loaded:
            raise MenuNotFoundError("Failed to retrieve updated menu.")
        return loaded

    async def delete_menu(self, menu_id: UUID) -> None:
        """Deletes a menu item and its cascaded children and assignments."""
        menu = await self.get_menu_by_id(menu_id)
        if not menu:
            raise MenuNotFoundError("Menu not found.")

        await self.db.delete(menu)
        await self.db.commit()

    async def set_menu_roles(self, menu_id: UUID, role_ids: list[UUID]) -> Menu:
        """Replaces role assignments for a menu."""
        menu = await self.get_menu_by_id(menu_id)
        if not menu:
            raise MenuNotFoundError("Menu not found.")

        await self.db.execute(delete(MenuRole).where(MenuRole.menu_id == menu.id))
        for role_id in set(role_ids):
            self.db.add(MenuRole(menu_id=menu.id, role_id=role_id))

        await self.db.commit()
        loaded = await self.get_menu_by_id(menu.id)
        if not loaded:
            raise MenuNotFoundError("Menu not found.")
        return loaded

    async def set_menu_permissions(
        self, menu_id: UUID, permission_ids: list[UUID]
    ) -> Menu:
        """Replaces permission assignments for a menu."""
        menu = await self.get_menu_by_id(menu_id)
        if not menu:
            raise MenuNotFoundError("Menu not found.")

        await self.db.execute(
            delete(MenuPermission).where(MenuPermission.menu_id == menu.id)
        )
        for perm_id in set(permission_ids):
            self.db.add(MenuPermission(menu_id=menu.id, permission_id=perm_id))

        await self.db.commit()
        loaded = await self.get_menu_by_id(menu.id)
        if not loaded:
            raise MenuNotFoundError("Menu not found.")
        return loaded

    async def get_full_tree(self, is_active_only: bool = False) -> list[MenuTreeNode]:
        """Returns the full hierarchical menu tree for management/administration."""
        stmt = select(Menu).order_by(Menu.sort_order, Menu.title)
        if is_active_only:
            stmt = stmt.where(Menu.is_active.is_(True))

        result = await self.db.execute(stmt)
        menus = list(result.scalars().all())

        return self._build_tree(menus)

    async def get_visible_menu_tree_for_user(self, user_id: UUID) -> list[MenuTreeNode]:
        """Returns the hierarchical menu tree visible to the specific user.

        Visibility criteria:
        1. If user is super_admin (or has role 'super_admin'): returns all active menus.
        2. Regular users see active menus that either:
           - Match any of their assigned active roles, OR
           - Match any of their assigned active permissions (via their roles).
        3. If a child menu is visible, its parent menus are automatically included in the tree
           so that the user can navigate to the child.
        """
        # 1. Fetch user's active roles
        user_roles_stmt = (
            select(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(
                UserRole.user_id == user_id,
                Role.is_active.is_(True),
            )
        )
        roles_res = await self.db.execute(user_roles_stmt)
        active_roles = list(roles_res.scalars().all())
        user_role_ids = {r.id for r in active_roles}

        # Check for super admin role
        is_super_admin = any(
            r.code == "super_admin" or r.is_system for r in active_roles
        )
        if is_super_admin:
            return await self.get_full_tree(is_active_only=True)

        # 2. Fetch user's active permissions through active roles
        user_perms_stmt = (
            select(Permission)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(
                UserRole.user_id == user_id,
                Role.is_active.is_(True),
                Permission.is_active.is_(True),
            )
        )
        perms_res = await self.db.execute(user_perms_stmt)
        active_permissions = list(perms_res.scalars().all())
        user_perm_ids = {p.id for p in active_permissions}

        if not user_role_ids and not user_perm_ids:
            return []

        # 3. Fetch all active menus with their role and permission associations
        all_active_menus_stmt = (
            select(Menu)
            .options(
                selectinload(Menu.roles),
                selectinload(Menu.permissions),
            )
            .where(Menu.is_active.is_(True))
            .order_by(Menu.sort_order, Menu.title)
        )
        active_menus_res = await self.db.execute(all_active_menus_stmt)
        all_active_menus = list(active_menus_res.scalars().all())

        menu_by_id: dict[UUID, Menu] = {m.id: m for m in all_active_menus}

        # 4. Find directly accessible menu IDs
        directly_visible_ids: set[UUID] = set()
        for menu in all_active_menus:
            menu_role_ids = {r.id for r in (menu.roles or [])}
            menu_perm_ids = {p.id for p in (menu.permissions or [])}

            has_role_access = bool(menu_role_ids & user_role_ids)
            has_perm_access = bool(menu_perm_ids & user_perm_ids)

            if has_role_access or has_perm_access:
                directly_visible_ids.add(menu.id)

        # 5. Include ancestor menus so the tree structure is maintained
        all_visible_ids: set[UUID] = set(directly_visible_ids)
        for menu_id in directly_visible_ids:
            curr = menu_by_id.get(menu_id)
            while curr and curr.parent_id:
                parent = menu_by_id.get(curr.parent_id)
                if parent:
                    all_visible_ids.add(parent.id)
                    curr = parent
                else:
                    break

        # Filter active menus to only visible ones
        visible_menus = [m for m in all_active_menus if m.id in all_visible_ids]
        return self._build_tree(visible_menus)

    async def _get_all_descendant_ids(self, menu_id: UUID) -> set[UUID]:
        """Recursively retrieves all descendant menu IDs for cycle detection."""
        descendants: set[UUID] = set()
        stmt = select(Menu.id).where(Menu.parent_id == menu_id)
        res = await self.db.execute(stmt)
        child_ids = list(res.scalars().all())

        for child_id in child_ids:
            descendants.add(child_id)
            sub_descendants = await self._get_all_descendant_ids(child_id)
            descendants.update(sub_descendants)

        return descendants

    def _build_tree(self, menus: list[Menu]) -> list[MenuTreeNode]:
        """Builds a hierarchical tree from a flat list of menus, sorted by sort_order."""
        nodes: dict[UUID, MenuTreeNode] = {}
        for m in menus:
            nodes[m.id] = MenuTreeNode(
                id=m.id,
                public_id=m.public_id,
                parent_id=m.parent_id,
                title=m.title,
                code=m.code,
                path=m.path,
                icon=m.icon,
                sort_order=m.sort_order,
                is_active=m.is_active,
                children=[],
            )

        roots: list[MenuTreeNode] = []
        for m in menus:
            node = nodes[m.id]
            if m.parent_id and m.parent_id in nodes:
                nodes[m.parent_id].children.append(node)
            else:
                roots.append(node)

        # Sort roots and children by sort_order then title
        def sort_nodes(item_list: list[MenuTreeNode]) -> None:
            item_list.sort(key=lambda x: (x.sort_order, x.title))
            for item in item_list:
                sort_nodes(item.children)

        sort_nodes(roots)
        return roots
