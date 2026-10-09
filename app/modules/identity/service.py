import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_refresh_token,
)
from app.modules.identity.models import AuthSession
from app.modules.users.models import User
from app.modules.users.schemas import UserLogin
from app.modules.users.service import UserService
from app.modules.identity.exceptions import AccountLockedError


class IdentityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

   
    # Authenticate a user and create a new session
    # with access and refresh tokens.
    async def login(self, data: UserLogin) -> tuple[str, str]:
        try:
            user = await self.user_service.authenticate(data)

        except AccountLockedError:
            # authenticate() may have an active transaction.
            # Roll it back before propagating the domain exception.
            await self.db.rollback()
            raise

        if user is None:
            # authenticate() may have incremented failed_login_attempts.
            # Commit that change before returning the authentication error.
            await self.db.commit()

            raise ValueError("Invalid email or password.")

        if user.status != "active":
            await self.db.rollback()

            raise ValueError("Invalid email or password.")

        now = datetime.now(UTC)

        token_family_id = uuid.uuid7()

        refresh_token = create_refresh_token(user.id)

        auth_session = AuthSession(
            user_id=user.id,
            token_family_id=token_family_id,
            token_id=refresh_token.token_id,
            refresh_token_hash=hash_refresh_token(
                refresh_token.token
            ),
            expires_at=refresh_token.expires_at,
        )

        user.last_login_at = now

        self.db.add(auth_session)

        await self.db.commit()

        return (
            create_access_token(user.id),
            refresh_token.token,
        )
   
    # Refresh an existing refresh token and issue a new one.
    async def refresh(
        self,
        refresh_token: str,
    ) -> tuple[str, str]:
        decoded = decode_refresh_token(refresh_token)

        if decoded is None:
            raise ValueError("Invalid or expired refresh token.")

        user_id, token_id = decoded

        result = await self.db.execute(
            select(AuthSession)
            .where(
                AuthSession.token_id == token_id,
                AuthSession.user_id == user_id,
            )
            .with_for_update()
        )

        session = result.scalar_one_or_none()

        if session is None:
            raise ValueError("Invalid refresh token.")

        if session.revoked_at is not None:
            await self._revoke_token_family(
                session.token_family_id
            )

            await self.db.commit()

            raise ValueError(
                "Refresh token reuse detected."
            )

        now = datetime.now(UTC)

        if session.expires_at <= now:
            raise ValueError(
                "Refresh token has expired."
            )

        expected_hash = hash_refresh_token(
            refresh_token
        )

        if session.refresh_token_hash != expected_hash:
            raise ValueError(
                "Invalid refresh token."
            )

        user = await self.db.get(
            User,
            user_id,
        )

        if user is None or user.deleted_at is not None:
            raise ValueError(
                "User no longer exists."
            )

        if user.status != "active":
            raise ValueError(
                "User account is not active."
            )

        # Revoke the current refresh token.
        session.revoked_at = now
        session.last_used_at = now

        # Create the replacement refresh token.
        new_refresh_token = create_refresh_token(
            user.id
        )

        new_session = AuthSession(
            user_id=user.id,
            token_family_id=session.token_family_id,
            token_id=new_refresh_token.token_id,
            refresh_token_hash=hash_refresh_token(
                new_refresh_token.token
            ),
            expires_at=new_refresh_token.expires_at,
        )

        self.db.add(new_session)

        await self.db.commit()

        return (
            create_access_token(user.id),
            new_refresh_token.token,
        )

    # Revoke all active sessions belonging to a token family.
    #
    # This is used internally when refresh token reuse
    # is detected.
    #
    # This method does NOT commit. The caller controls
    # the transaction.
    async def _revoke_token_family(
        self,
        token_family_id: uuid.UUID,
    ) -> None:
        result = await self.db.execute(
            select(AuthSession).where(
                AuthSession.token_family_id == token_family_id,
                AuthSession.revoked_at.is_(None),
            )
        )

        now = datetime.now(UTC)

        for session in result.scalars():
            session.revoked_at = now

    # Logout the session represented by a refresh token.
    async def logout(
        self,
        refresh_token: str,
    ) -> None:
        decoded = decode_refresh_token(
            refresh_token
        )

        if decoded is None:
            raise ValueError(
                "Invalid or expired refresh token."
            )

        user_id, token_id = decoded

        result = await self.db.execute(
            select(AuthSession)
            .where(
                AuthSession.token_id == token_id,
                AuthSession.user_id == user_id,
            )
            .with_for_update()
        )

        session = result.scalar_one_or_none()

        if session is None:
            raise ValueError(
                "Invalid refresh token."
            )

        if session.revoked_at is not None:
            # Already logged out.
            # Treat logout as idempotent.
            return

        now = datetime.now(UTC)

        expected_hash = hash_refresh_token(
            refresh_token
        )

        if session.refresh_token_hash != expected_hash:
            raise ValueError(
                "Invalid refresh token."
            )

        session.revoked_at = now
        session.last_used_at = now

        await self.db.commit()

    # Revoke all active sessions for a user.
    #
    # This is the transaction-safe operation that can be
    # combined with another database operation, such as
    # changing a password.
    #
    # IMPORTANT: This method does NOT commit.
    async def revoke_all_sessions(
        self,
        user_id: uuid.UUID,
    ) -> None:
        result = await self.db.execute(
            select(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .with_for_update()
        )

        sessions = result.scalars().all()

        if not sessions:
            return

        now = datetime.now(UTC)

        for session in sessions:
            session.revoked_at = now

    # Logout all active sessions for a user.
    #
    # This is a standalone operation, so it owns
    # the transaction and commits the changes.
    async def logout_all(
        self,
        user_id: uuid.UUID,
    ) -> None:
        await self.revoke_all_sessions(
            user_id
        )

        await self.db.commit()