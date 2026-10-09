import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.rbac.models import Role, UserRole
from app.modules.users.models import User

logger = logging.getLogger(__name__)


USER_ROLE_MAP = (
    {
        "user_setting": "seed_super_admin_email",
        "role_code": "super_admin",
    },
    {
        "user_setting": "seed_admin_email",
        "role_code": "admin",
    },
)


async def seed_user_roles(db: AsyncSession) -> None:
    """Assign initial administrator roles without duplicating assignments."""
    created = 0
    existing = 0

    for mapping in USER_ROLE_MAP:
        email = getattr(settings, mapping["user_setting"])

        if not email:
            raise ValueError(
                f"Missing configuration: {mapping['user_setting']}."
            )

        user_result = await db.execute(
            select(User).where(
                User.email == email,
                User.deleted_at.is_(None),
                User.status == "active",
            )
        )
        user = user_result.scalar_one_or_none()

        if user is None:
            raise ValueError(
                f"Cannot assign role {mapping['role_code']!r}: "
                f"active user {email!r} was not found."
            )

        role_result = await db.execute(
            select(Role).where(
                Role.code == mapping["role_code"],
                Role.is_active.is_(True),
            )
        )
        role = role_result.scalar_one_or_none()

        if role is None:
            raise ValueError(
                f"Cannot assign role: active role "
                f"{mapping['role_code']!r} was not found."
            )

        assignment_result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == role.id,
            )
        )

        if assignment_result.scalar_one_or_none() is not None:
            existing += 1
            continue

        db.add(
            UserRole(
                user_id=user.id,
                role_id=role.id,
            )
        )
        created += 1

    await db.flush()

    print(
        f"User roles: {created} created, "
        f"{existing} already existed."
    )