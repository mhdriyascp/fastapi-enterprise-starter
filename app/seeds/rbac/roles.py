from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rbac.models import Role
from app.seeds.helpers import get_or_create

ROLES = (
    {
        "name": "Super Administrator",
        "code": "super_admin",
        "description": "Full system administration.",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Administrator",
        "code": "admin",
        "description": "Manages CRM administration and configuration.",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Sales Manager",
        "code": "sales_manager",
        "description": "Manages sales operations and representatives.",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Sales Representative",
        "code": "sales_rep",
        "description": "Manages assigned sales opportunities and customers.",
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "Support Agent",
        "code": "support_agent",
        "description": "Handles customer support activities.",
        "is_system": True,
        "is_active": True,
    },
)


async def seed_roles(db: AsyncSession) -> None:
    created = 0
    existing = 0

    for role_data in ROLES:
        _, was_created = await get_or_create(
            db,
            Role,
            lookup={"code": role_data["code"]},
            defaults={
                key: value
                for key, value in role_data.items()
                if key != "code"
            },
        )

        if was_created:
            created += 1
        else:
            existing += 1

    print(
        f"Roles: {created} created, {existing} already existed."
    )