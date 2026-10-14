from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.modules.identity.exceptions import AccountLockedError
from app.modules.users.models import User
from app.modules.users.schemas import (
    ChangePasswordRequest,
    UserCreate,
    UserLogin,
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
    ) -> tuple[list[User], int]:
        """Lists active users with pagination.

        Args:
            offset: Number of items to skip.
            limit: Maximum number of items to return.

        Returns:
            A tuple of (items, total_count).
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
        items = list(result.scalars().all())

        return items, total

    async def update_user(self, user: User, data: UserUpdate) -> User:
        """Updates user profile information.

        Args:
            user: The user entity to update.
            data: The update payload.

        Returns:
            The updated user entity.
        """
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user
