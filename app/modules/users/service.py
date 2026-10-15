from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.modules.identity.exceptions import AccountLockedError
from app.modules.rbac.models import Permission, Role, RolePermission, UserRole
from app.modules.users.models import User
from app.modules.users.schemas import (
    ChangePasswordRequest,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)


# Service class for managing user-related operations.
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, data: UserCreate) -> User:
        # Normalize email before checking uniqueness and storing it.
        email = data.email.strip().lower()

        # Check whether the email is already registered.
        result = await self.db.execute(select(User).where(User.email == email))

        existing_user = result.scalar_one_or_none()

        if existing_user is not None:
            raise ValueError("Email is already registered")

        # Hash the password before it ever reaches the database.
        password_hash = hash_password(data.password)

        user = User(
            first_name=data.first_name,
            last_name=data.last_name,
            email=email,
            password_hash=password_hash,
        )

        self.db.add(user)

        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def authenticate(
        self,
        data: UserLogin,
    ) -> User | None:
        email = data.email.strip().lower()

        # Lock the user row so concurrent login attempts cannot
        # overwrite each other's failed_login_attempts value.
        result = await self.db.execute(
            select(User).where(User.email == email).with_for_update()
        )

        user = result.scalar_one_or_none()

        # Do not reveal whether the email exists.
        if user is None:
            return None

        now = datetime.now(UTC)

        # Check whether the account is currently locked.
        if user.locked_until is not None:
            if user.locked_until > now:
                raise AccountLockedError

            # Lockout has expired.
            # Start a fresh login-attempt window.
            user.locked_until = None
            user.failed_login_attempts = 0

        # Verify the supplied password.
        if not verify_password(
            data.password,
            user.password_hash,
        ):
            # Record the failed login attempt.
            user.failed_login_attempts += 1

            # Lock the account when the configured threshold is reached.
            if user.failed_login_attempts >= settings.max_login_attempts:
                user.locked_until = now + timedelta(
                    minutes=settings.login_lockout_minutes
                )

            return None

        # Successful login.
        #
        # Clear any previous failed attempts and remove
        # any expired lockout state.
        user.failed_login_attempts = 0
        user.locked_until = None

        return user

    async def change_password(
        self,
        user: User,
        data: ChangePasswordRequest,
    ) -> None:
        # Verify that the supplied current password is correct.
        if not verify_password(
            data.current_password,
            user.password_hash,
        ):
            raise ValueError("Current password is incorrect.")

        # Prevent the user from changing the password to the same
        # password they are already using.
        if verify_password(
            data.new_password,
            user.password_hash,
        ):
            raise ValueError(
                "New password must be different from the current password."
            )

        # Hash the new password before storing it.
        user.password_hash = hash_password(data.new_password)

        # Record when the password was changed.
        user.password_changed_at = datetime.now(UTC)

        # IMPORTANT:
        # Do not commit here.
        #
        # Password change and refresh-session revocation must happen
        # inside the same database transaction.
        #
        # The caller is responsible for committing the transaction.

    async def get_user_role_codes(self, user_id: UUID) -> list[str]:
        """Fetches active role codes assigned to a user."""
        stmt = (
            select(Role.code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id, Role.is_active.is_(True))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_users_role_codes_map(
        self, user_ids: list[UUID]
    ) -> dict[UUID, list[str]]:
        """Batches role code fetching for multiple users."""
        if not user_ids:
            return {}
        stmt = (
            select(UserRole.user_id, Role.code)
            .join(Role, UserRole.role_id == Role.id)
            .where(UserRole.user_id.in_(user_ids), Role.is_active.is_(True))
        )
        result = await self.db.execute(stmt)
        role_map: dict[UUID, list[str]] = {uid: [] for uid in user_ids}
        for uid, r_code in result.all():
            role_map[uid].append(r_code)
        return role_map

    async def get_users_permission_codes_map(
        self, user_ids: list[UUID]
    ) -> dict[UUID, list[str]]:
        """Batch-fetches permission codes for a list of user IDs via active roles."""
        if not user_ids:
            return {}
        perm_map: dict[UUID, list[str]] = {uid: [] for uid in user_ids}
        result = await self.db.execute(
            select(UserRole.user_id, Permission.code)
            .join(Role, Role.id == UserRole.role_id)
            .join(RolePermission, RolePermission.role_id == Role.id)
            .join(Permission, Permission.id == RolePermission.permission_id)
            .where(
                UserRole.user_id.in_(user_ids),
                Role.is_active.is_(True),
                Permission.is_active.is_(True),
            )
            .distinct()
        )
        for uid, p_code in result.all():
            perm_map[uid].append(p_code)
        return perm_map

    async def is_super_admin(self, user: User) -> bool:
        """Determines whether a user has Super Administrator authority."""
        if (
            settings.seed_super_admin_email
            and user.email.lower() == settings.seed_super_admin_email.lower()
        ):
            return True
        roles = await self.get_user_role_codes(user.id)
        return "super_admin" in roles

    async def build_user_response(
        self,
        user: User,
        role_codes: list[str] | None = None,
        permission_codes: list[str] | None = None,
    ) -> UserResponse:
        """Constructs an enriched UserResponse including roles and privileges."""
        roles = (
            role_codes
            if role_codes is not None
            else await self.get_user_role_codes(user.id)
        )
        is_super = "super_admin" in roles or (
            settings.seed_super_admin_email is not None
            and user.email.lower() == settings.seed_super_admin_email.lower()
        )

        if permission_codes is not None:
            permissions = permission_codes
        elif is_super:
            all_perm_res = await self.db.execute(
                select(Permission.code).where(Permission.is_active.is_(True))
            )
            permissions = list(all_perm_res.scalars().all())
        else:
            perm_map = await self.get_users_permission_codes_map([user.id])
            permissions = perm_map.get(user.id, [])

        return UserResponse(
            id=user.id,
            public_id=user.public_id,
            first_name=user.first_name,
            last_name=user.last_name,
            display_name=user.display_name,
            email=user.email,
            phone=user.phone,
            status=user.status,
            email_verified_at=user.email_verified_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            roles=roles,
            is_super_admin=is_super,
            permissions=permissions,
        )

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Fetches an active user by primary ID."""
        result = await self.db.execute(
            select(User).where(
                User.id == user_id,
                User.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_users(
        self,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[UserResponse], int]:
        """Lists active users with pagination and enriched roles.

        Args:
            offset: Number of items to skip.
            limit: Maximum number of items to return.

        Returns:
            A tuple of (UserResponse items, total_count).
        """
        count_result = await self.db.execute(
            select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        )
        total = count_result.scalar_one()

        query = (
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        user_ids = [u.id for u in users]
        role_map = await self.get_users_role_codes_map(user_ids)
        perm_map = await self.get_users_permission_codes_map(user_ids)

        items = [
            await self.build_user_response(
                user=u,
                role_codes=role_map.get(u.id, []),
                permission_codes=perm_map.get(u.id, []),
            )
            for u in users
        ]

        return items, total

    async def assign_roles(self, user_id: UUID, role_codes: list[str]) -> None:
        """Assigns the specified role codes to a user, replacing previous roles."""
        await self.db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        if not role_codes:
            await self.db.commit()
            return

        roles_res = await self.db.execute(
            select(Role).where(Role.code.in_(role_codes), Role.is_active.is_(True))
        )
        matched_roles = roles_res.scalars().all()
        for r in matched_roles:
            self.db.add(UserRole(user_id=user_id, role_id=r.id))
        await self.db.commit()

    async def update_user(
        self,
        user: User,
        data: UserUpdate,
        current_user: User,
    ) -> UserResponse:
        """Updates user profile information with strict Super Administrator guards.

        Args:
            user: The user entity to update.
            data: The update payload.
            current_user: The authenticated operator initiating the change.

        Returns:
            The enriched updated user response.
        """
        target_is_super = await self.is_super_admin(user)
        current_is_super = await self.is_super_admin(current_user)

        if target_is_super and not current_is_super:
            raise PermissionError(
                "A Super Administrator account cannot be modified by anyone other than a Super Administrator."
            )

        if data.role_codes is not None:
            if "super_admin" in data.role_codes and not current_is_super:
                raise PermissionError(
                    "Only a Super Administrator can assign the Super Administrator role."
                )
            await self.assign_roles(user.id, data.role_codes)

        update_data = data.model_dump(exclude_unset=True, exclude={"role_codes"})
        for key, value in update_data.items():
            setattr(user, key, value)

        await self.db.commit()
        await self.db.refresh(user)
        return await self.build_user_response(user)

    async def delete_user(self, user: User, current_user: User) -> None:
        """Soft-deletes a user with Super Administrator safety checks.

        Args:
            user: The user entity to delete.
            current_user: The authenticated operator initiating deletion.
        """
        if user.id == current_user.id:
            raise ValueError("You cannot delete your own account.")

        target_is_super = await self.is_super_admin(user)
        current_is_super = await self.is_super_admin(current_user)

        if target_is_super and not current_is_super:
            raise PermissionError(
                "A Super Administrator account cannot be deleted by anyone other than a Super Administrator."
            )

        user.deleted_at = datetime.now(UTC)
        user.status = "disabled"
        await self.db.commit()

    async def toggle_user_status(self, user: User, current_user: User) -> UserResponse:
        """Toggles user active status with Super Administrator safety checks.

        Args:
            user: The user entity to toggle.
            current_user: The authenticated operator initiating status change.

        Returns:
            The enriched updated user response.
        """
        target_is_super = await self.is_super_admin(user)
        current_is_super = await self.is_super_admin(current_user)

        if target_is_super and not current_is_super:
            raise PermissionError(
                "A Super Administrator account status cannot be modified by anyone other than a Super Administrator."
            )

        if user.id == current_user.id and user.status == "active":
            raise ValueError("You cannot suspend your own account.")

        user.status = "suspended" if user.status == "active" else "active"
        await self.db.commit()
        await self.db.refresh(user)
        return await self.build_user_response(user)
