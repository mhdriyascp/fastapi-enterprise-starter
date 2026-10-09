from uuid import UUID

from sqlalchemy import delete, func, select
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
        result = await self.db.execute(
            select(Role.id).where(
                Role.code == data.code
            )
        )

        if result.scalar_one_or_none() is not None:
            raise RoleAlreadyExistsError(
                "A role with this code already exists."
            )

        role = Role(
            name=data.name,
            code=data.code,
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
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Role], int]:
        total_result = await self.db.execute(
            select(func.count()).select_from(Role)
        )
        total = total_result.scalar_one()

        result = await self.db.execute(
            select(Role)
            .order_by(Role.name, Role.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        return list(result.scalars().all()), total

    async def get_role(
        self,
        role_id: UUID,
    ) -> Role:
        role = await self.db.get(Role, role_id)

        if role is None:
            raise RoleNotFoundError("Role not found.")

        return role

    async def update_role(
        self,
        role_id: UUID,
        data: RoleUpdate,
    ) -> Role:
        role = await self.get_role(role_id)

        changes = data.model_dump(exclude_unset=True)

        if not changes:
            raise ValueError(
                "At least one field must be provided."
            )

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
        role_id: UUID,
    ) -> None:
        role = await self.get_role(role_id)

        if role.is_system:
            raise SystemRoleError(
                "System roles cannot be deleted."
            )

        result = await self.db.execute(
            select(UserRole.id)
            .where(UserRole.role_id == role_id)
            .limit(1)
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

        if role.is_system:
            raise SystemRoleError(
                "Permissions assigned to system roles cannot be modified."
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
            raise PermissionNotFoundError(
                "Permission not found."
            )

        if not permission.is_active:
            raise InactivePermissionError(
                "Inactive permissions cannot be assigned to a role."
            )

        existing_result = await self.db.execute(
            select(RolePermission.id).where(
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

        if role.is_system:
            raise SystemRoleError(
                "Permissions assigned to system roles cannot be modified."
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
                select(Permission).where(
                    Permission.id.in_(permission_ids)
                )
            )

            permissions = list(result.scalars().all())

            permissions_by_id = {
                permission.id: permission
                for permission in permissions
            }

            missing_ids = [
                permission_id
                for permission_id in permission_ids
                if permission_id not in permissions_by_id
            ]

            if missing_ids:
                raise PermissionNotFoundError(
                    "One or more permissions were not found."
                )

            inactive_permissions = [
                permission
                for permission in permissions
                if not permission.is_active
            ]

            if inactive_permissions:
                raise InactivePermissionError(
                    "Inactive permissions cannot be assigned to a role."
                )

            # Preserve the order supplied by the caller.
            permissions = [
                permissions_by_id[permission_id]
                for permission_id in permission_ids
            ]

        try:
            # Delete the existing assignments for this role only.
            await self.db.execute(
                delete(RolePermission).where(
                    RolePermission.role_id == role_id
                )
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

        if role.is_system:
            raise SystemRoleError(
                "Permissions assigned to system roles cannot be modified."
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
            select(Permission.id).where(
                Permission.code == data.code
            )
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
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Permission], int]:
        total_result = await self.db.execute(
            select(func.count()).select_from(Permission)
        )
        total = total_result.scalar_one()

        result = await self.db.execute(
            select(Permission)
            .order_by(
                Permission.resource,
                Permission.action,
                Permission.id,
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        return list(result.scalars().all()), total

    async def get_permission(
        self,
        permission_id: UUID,
    ) -> Permission:
        permission = await self.db.get(
            Permission,
            permission_id,
        )

        if permission is None:
            raise PermissionNotFoundError(
                "Permission not found."
            )

        return permission

    async def update_permission(
        self,
        permission_id: UUID,
        data: PermissionUpdate,
    ) -> Permission:
        permission = await self.get_permission(
            permission_id
        )

        changes = data.model_dump(exclude_unset=True)

        if not changes:
            raise ValueError(
                "At least one field must be provided."
            )

        if permission.is_system and "is_active" in changes:
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
        permission_id: UUID,
    ) -> None:
        permission = await self.get_permission(
            permission_id
        )

        if permission.is_system:
            raise SystemPermissionError(
                "System permissions cannot be deleted."
            )

        result = await self.db.execute(
            select(RolePermission.id)
            .where(
                RolePermission.permission_id == permission_id
            )
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