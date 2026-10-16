import re
from typing import Final
from uuid import UUID

from sqlalchemy import case, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rbac.models import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from app.modules.rbac.schemas import (
    PermissionCreate,
    PermissionUpdate,
    RoleCreate,
    RoleUpdate,
)

SUPER_ADMIN_EXCLUSIVE_PERMISSIONS: Final[set[str]] = {
    "role.delete",
    "permission.create",
    "permission.update",
    "permission.delete",
}

# ============================================================
# Role exceptions
# ============================================================


class RoleNotFoundError(Exception):
    pass


class RoleAlreadyExistsError(Exception):
    pass


class RoleInUseError(Exception):
    pass


class SystemRoleError(Exception):
    pass


class InactiveRoleError(Exception):
    pass


# ============================================================
# Permission exceptions
# ============================================================


class PermissionNotFoundError(Exception):
    pass


class PermissionAlreadyExistsError(Exception):
    pass


class PermissionInUseError(Exception):
    pass


class SystemPermissionError(Exception):
    pass


class InactivePermissionError(Exception):
    pass


# ============================================================
# Role-Permission assignment exceptions
# ============================================================


class RolePermissionAlreadyAssignedError(Exception):
    pass


class RolePermissionAssignmentNotFoundError(Exception):
    pass


# ============================================================
# Role service
# ============================================================


class RoleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_role(
        self,
        data: RoleCreate,
    ) -> Role:
        if data.code and data.code.strip():
            code = data.code.strip().lower()
            result = await self.db.execute(select(Role.id).where(Role.code == code))
            if result.scalar_one_or_none() is not None:
                raise RoleAlreadyExistsError("A role with this code already exists.")
        else:
            base_code = re.sub(r"[^a-z0-9_]+", "_", data.name.strip().lower()).strip(
                "_"
            )[:50]
            if not base_code or not base_code[0].isalpha():
                base_code = f"role_{base_code}"[:50]

            candidate = base_code
            counter = 1
            while True:
                result = await self.db.execute(
                    select(Role.id).where(Role.code == candidate)
                )
                if result.scalar_one_or_none() is None:
                    code = candidate
                    break
                candidate = f"{base_code[:44]}_{counter}"
                counter += 1

        role = Role(
            name=data.name,
            code=code,
            description=data.description,
            is_system=False,
            is_active=True,
        )

        self.db.add(role)

        try:
            await self.db.commit()
            await self.db.refresh(role)
        except IntegrityError as exc:
            await self.db.rollback()
            raise RoleAlreadyExistsError(
                "The role could not be created because of a database constraint."
            ) from exc

        return role

    async def list_roles(
        self,
        offset: int | None = None,
        limit: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Role], int]:
        total_result = await self.db.execute(select(func.count()).select_from(Role))
        total = total_result.scalar_one()

        role_priority = case(
            (Role.code.in_(("super_admin", "superadmin")), 0),
            (Role.code.in_(("admin", "administrator")), 1),
            (Role.is_system.is_(True), 2),
            else_=3,
        )

        query_offset = offset if offset is not None else (page - 1) * page_size
        query_limit = limit if limit is not None else page_size

        result = await self.db.execute(
            select(Role)
            .order_by(role_priority, Role.name.asc(), Role.id.asc())
            .offset(query_offset)
            .limit(query_limit)
        )

        return list(result.scalars().all()), total

    async def get_role(
        self,
        identifier: UUID | str,
    ) -> Role:
        if isinstance(identifier, UUID):
            role = await self.db.get(Role, identifier)
        else:
            str_val = str(identifier).strip()
            try:
                parsed_uuid = UUID(str_val)
                role = await self.db.get(Role, parsed_uuid)
            except ValueError, TypeError:
                res = await self.db.execute(
                    select(Role).where(Role.code == str_val.lower())
                )
                role = res.scalar_one_or_none()

        if role is None:
            raise RoleNotFoundError("Role not found.")

        return role

    async def update_role(
        self,
        identifier: UUID | str,
        data: RoleUpdate,
    ) -> Role:
        role = await self.get_role(identifier)

        changes = data.model_dump(exclude_unset=True)

        if not changes:
            raise ValueError("At least one field must be provided.")

        if role.is_system and "is_active" in changes:
            raise SystemRoleError(
                "The active status of a system role cannot be changed."
            )

        for field, value in changes.items():
            setattr(role, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(role)
        except IntegrityError as exc:
            await self.db.rollback()
            raise RoleAlreadyExistsError(
                "The role could not be updated because of a database constraint."
            ) from exc

        return role

    async def delete_role(
        self,
        identifier: UUID | str,
    ) -> None:
        role = await self.get_role(identifier)

        if role.is_system:
            raise SystemRoleError("System roles cannot be deleted.")

        result = await self.db.execute(
            select(UserRole.user_id).where(UserRole.role_id == role.id).limit(1)
        )

        if result.scalar_one_or_none() is not None:
            raise RoleInUseError(
                "This role is assigned to users and cannot be deleted."
            )

        await self.db.delete(role)

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise RoleInUseError(
                "This role cannot be deleted because it is referenced by another record."
            ) from exc

    # ========================================================
    # Role-Permission assignment methods
    # ========================================================

    async def list_role_permissions(
        self,
        role_id: UUID,
    ) -> list[Permission]:
        """
        Return all permissions assigned to a role.
        """
        await self.get_role(role_id)

        result = await self.db.execute(
            select(Permission)
            .join(
                RolePermission,
                RolePermission.permission_id == Permission.id,
            )
            .where(RolePermission.role_id == role_id)
            .order_by(
                Permission.resource,
                Permission.action,
                Permission.id,
            )
        )

        return list(result.scalars().all())

    async def assign_permission(
        self,
        role_id: UUID,
        permission_id: UUID,
    ) -> Permission:
        """
        Assign one permission to a role.
        """
        role = await self.get_role(role_id)

        if role.code in ("super_admin", "superadmin"):
            raise SystemRoleError(
                "Permissions assigned to the Super Administrator role are fixed and cannot be modified."
            )

        if not role.is_active:
            raise InactiveRoleError(
                "Permissions cannot be assigned to an inactive role."
            )

        permission = await self.db.get(
            Permission,
            permission_id,
        )

        if permission is None:
            raise PermissionNotFoundError("Permission not found.")

        if permission.code in SUPER_ADMIN_EXCLUSIVE_PERMISSIONS and role.code not in (
            "super_admin",
            "superadmin",
        ):
            raise SystemRoleError(
                f"Permission '{permission.code}' is exclusively reserved for the Super Administrator role."
            )

        if not permission.is_active:
            raise InactivePermissionError(
                "Inactive permissions cannot be assigned to a role."
            )

        existing_result = await self.db.execute(
            select(RolePermission.role_id).where(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id,
            )
        )

        if existing_result.scalar_one_or_none() is not None:
            raise RolePermissionAlreadyAssignedError(
                "This permission is already assigned to the role."
            )

        assignment = RolePermission(
            role_id=role_id,
            permission_id=permission_id,
        )

        self.db.add(assignment)

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise RolePermissionAlreadyAssignedError(
                "The permission is already assigned to the role or the assignment violates a database constraint."
            ) from exc

        return permission

    async def replace_role_permissions(
        self,
        role_id: UUID,
        permission_ids: list[UUID],
    ) -> list[Permission]:
        """
        Replace all permissions assigned to a role.

        An empty permission_ids list removes all assignments.
        """
        role = await self.get_role(role_id)

        if role.code in ("super_admin", "superadmin"):
            raise SystemRoleError(
                "Permissions assigned to the Super Administrator role are fixed and cannot be modified."
            )

        if not role.is_active:
            raise InactiveRoleError(
                "Permissions cannot be assigned to an inactive role."
            )

        # Defensively validate duplicates even if the request
        # has already passed through Pydantic validation.
        if len(permission_ids) != len(set(permission_ids)):
            raise RolePermissionAlreadyAssignedError(
                "Duplicate permission IDs are not allowed."
            )

        permissions: list[Permission] = []

        if permission_ids:
            result = await self.db.execute(
                select(Permission).where(Permission.id.in_(permission_ids))
            )

            permissions = list(result.scalars().all())

            if len(permissions) != len(permission_ids):
                raise PermissionNotFoundError(
                    "One or more specified permissions were not found."
                )

            if role.code not in ("super_admin", "superadmin"):
                exclusive_violations = [
                    p.code
                    for p in permissions
                    if p.code in SUPER_ADMIN_EXCLUSIVE_PERMISSIONS
                ]
                if exclusive_violations:
                    raise SystemRoleError(
                        f"Permissions {exclusive_violations} are exclusively reserved for the Super Administrator role."
                    )

            permissions_by_id = {
                permission.id: permission for permission in permissions
            }

            missing_ids = [
                permission_id
                for permission_id in permission_ids
                if permission_id not in permissions_by_id
            ]

            if missing_ids:
                raise PermissionNotFoundError("One or more permissions were not found.")

            inactive_permissions = [
                permission for permission in permissions if not permission.is_active
            ]

            if inactive_permissions:
                raise InactivePermissionError(
                    "Inactive permissions cannot be assigned to a role."
                )

            # Preserve the order supplied by the caller.
            permissions = [
                permissions_by_id[permission_id] for permission_id in permission_ids
            ]

        try:
            # Delete the existing assignments for this role only.
            await self.db.execute(
                delete(RolePermission).where(RolePermission.role_id == role_id)
            )

            # Add the requested assignments.
            for permission_id in permission_ids:
                self.db.add(
                    RolePermission(
                        role_id=role_id,
                        permission_id=permission_id,
                    )
                )

            # Commit the replacement as one transaction.
            await self.db.commit()

        except IntegrityError as exc:
            await self.db.rollback()
            raise RolePermissionAlreadyAssignedError(
                "The role's permissions could not be replaced because of a database constraint."
            ) from exc

        return permissions

    async def remove_permission(
        self,
        role_id: UUID,
        permission_id: UUID,
    ) -> None:
        """
        Remove one permission assignment from a role.
        The permission record itself is not deleted.
        """
        role = await self.get_role(role_id)

        if role.code in ("super_admin", "superadmin"):
            raise SystemRoleError(
                "Permissions assigned to the Super Administrator role are fixed and cannot be modified."
            )

        result = await self.db.execute(
            select(RolePermission).where(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id,
            )
        )

        assignment = result.scalar_one_or_none()

        if assignment is None:
            raise RolePermissionAssignmentNotFoundError(
                "This permission is not assigned to the role."
            )

        await self.db.delete(assignment)

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise RolePermissionAssignmentNotFoundError(
                "The permission assignment could not be removed."
            ) from exc


# ============================================================
# Permission service
# ============================================================


class PermissionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_permission(
        self,
        data: PermissionCreate,
    ) -> Permission:
        result = await self.db.execute(
            select(Permission.id).where(Permission.code == data.code)
        )

        if result.scalar_one_or_none() is not None:
            raise PermissionAlreadyExistsError(
                "A permission with this code already exists."
            )

        permission = Permission(
            name=data.name,
            code=data.code,
            description=data.description,
            resource=data.resource,
            action=data.action,
            is_system=False,
            is_active=True,
        )

        self.db.add(permission)

        try:
            await self.db.commit()
            await self.db.refresh(permission)
        except IntegrityError as exc:
            await self.db.rollback()
            raise PermissionAlreadyExistsError(
                "The permission could not be created because of a database constraint."
            ) from exc

        return permission

    async def list_permissions(
        self,
        offset: int | None = None,
        limit: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Permission], int]:
        total_result = await self.db.execute(
            select(func.count()).select_from(Permission)
        )
        total = total_result.scalar_one()

        query_offset = offset if offset is not None else (page - 1) * page_size
        query_limit = limit if limit is not None else page_size

        result = await self.db.execute(
            select(Permission)
            .order_by(
                Permission.resource,
                Permission.action,
                Permission.id,
            )
            .offset(query_offset)
            .limit(query_limit)
        )

        return list(result.scalars().all()), total

    async def get_permission(
        self,
        identifier: UUID | str,
    ) -> Permission:
        if isinstance(identifier, UUID):
            permission = await self.db.get(Permission, identifier)
        else:
            str_val = str(identifier).strip()
            try:
                parsed_uuid = UUID(str_val)
                permission = await self.db.get(Permission, parsed_uuid)
            except ValueError, TypeError:
                res = await self.db.execute(
                    select(Permission).where(Permission.code == str_val.lower())
                )
                permission = res.scalar_one_or_none()

        if permission is None:
            raise PermissionNotFoundError("Permission not found.")

        return permission

    async def update_permission(
        self,
        identifier: UUID | str,
        data: PermissionUpdate,
    ) -> Permission:
        permission = await self.get_permission(identifier)

        changes = data.model_dump(exclude_unset=True)

        if not changes:
            return permission

        if (
            permission.is_system
            and "is_active" in changes
            and changes["is_active"] != permission.is_active
        ):
            raise SystemPermissionError(
                "The active status of a system permission cannot be changed."
            )

        for field, value in changes.items():
            setattr(permission, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(permission)
        except IntegrityError as exc:
            await self.db.rollback()
            raise PermissionInUseError(
                "The permission could not be updated because of a database constraint."
            ) from exc

        return permission

    async def delete_permission(
        self,
        identifier: UUID | str,
    ) -> None:
        permission = await self.get_permission(identifier)

        if permission.is_system:
            raise SystemPermissionError("System permissions cannot be deleted.")

        result = await self.db.execute(
            select(RolePermission.role_id)
            .where(RolePermission.permission_id == permission.id)
            .limit(1)
        )

        if result.scalar_one_or_none() is not None:
            raise PermissionInUseError(
                "This permission is assigned to roles and cannot be deleted."
            )

        await self.db.delete(permission)

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise PermissionInUseError(
                "This permission cannot be deleted because it is referenced by another record."
            ) from exc
