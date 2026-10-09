import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.modules.users.models import User

logger = logging.getLogger(__name__)


ADMIN_USERS = (
    {
        "key": "super_admin",
        "first_name": "Super",
        "last_name": "Administrator",
        "display_name": "Super Administrator",
        "email_setting": "seed_super_admin_email",
        "username_setting": "seed_super_admin_username",
        "password_setting": "seed_super_admin_password",
    },
    {
        "key": "admin",
        "first_name": "System",
        "last_name": "Administrator",
        "display_name": "Administrator",
        "email_setting": "seed_admin_email",
        "username_setting": "seed_admin_username",
        "password_setting": "seed_admin_password",
    },
)


async def seed_users(db: AsyncSession) -> None:
    """Create initial administrator users without resetting existing accounts."""
    created = 0
    existing = 0

    for user_data in ADMIN_USERS:
        email = getattr(settings, user_data["email_setting"])
        username = getattr(settings, user_data["username_setting"])
        password = getattr(settings, user_data["password_setting"])

        if not email or not username or not password:
            raise ValueError(
                f"Missing configuration for the {user_data['key']} account. "
                "Configure its email, username, and password in .env."
            )

        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if user is not None:
            if user.deleted_at is not None:
                raise ValueError(
                    f"The configured email for {user_data['key']} "
                    "belongs to a deleted user. Resolve this manually."
                )

            if user.username != username:
                raise ValueError(
                    f"The configured email for {user_data['key']} already "
                    "exists with a different username. Resolve this manually."
                )

            if user.status != "active":
                raise ValueError(
                    f"The existing {user_data['key']} account is not active. "
                    "Resolve its status manually."
                )

            existing += 1
            logger.info(
                "Administrator user already exists: %s",
                user_data["key"],
            )
            continue

        # Detect a username collision before creating the user.
        result = await db.execute(
            select(User).where(User.username == username)
        )
        username_owner = result.scalar_one_or_none()

        if username_owner is not None:
            raise ValueError(
                f"Username {username!r} is already assigned to another user."
            )

        user = User(
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            display_name=user_data["display_name"],
            email=email,
            username=username,
            password_hash=hash_password(password),
            email_verified_at=datetime.now(UTC),
            status="active",
        )

        db.add(user)
        await db.flush()

        created += 1
        logger.info("Created administrator user: %s", user_data["key"])

    print(f"Users: {created} created, {existing} already existed.")