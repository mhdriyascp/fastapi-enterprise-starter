from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.seeds.rbac.permissions import seed_permissions
from app.seeds.rbac.role_permissions import seed_role_permissions
from app.seeds.rbac.roles import seed_roles
from app.seeds.rbac.user_roles import seed_user_roles
from app.seeds.rbac.users import seed_users

SeedFunction = Callable[[AsyncSession], Awaitable[None]]

SEED_REGISTRY: tuple[tuple[str, SeedFunction], ...] = (
    ("RBAC roles", seed_roles),
    ("RBAC permissions", seed_permissions),
    ("RBAC role permissions", seed_role_permissions),
    ("Administrator users", seed_users),
    ("Administrator user roles", seed_user_roles),
)