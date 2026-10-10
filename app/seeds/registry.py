from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.seeds.masters.reference_data import seed_reference_data
from app.seeds.rbac.permissions import seed_permissions
from app.seeds.rbac.role_permissions import seed_role_permissions
from app.seeds.rbac.roles import seed_roles
from app.seeds.rbac.user_roles import seed_user_roles
from app.seeds.rbac.users import seed_users

SeedFunction = Callable[[AsyncSession], Awaitable[None]]

SEED_REGISTRY: tuple[tuple[str, SeedFunction], ...] = (
# 1. Create permissions before assigning them to roles.
( "RBAC permissions", seed_permissions),

# 2. Create roles before creating role-permission mappings.
("RBAC roles", seed_roles),

# 3. Assign permissions to the appropriate roles.
("RBAC role permissions", seed_role_permissions),

# 4. Create initial administrator accounts.
("Administrator users", seed_users),

# 5. Assign roles to the administrator accounts.
("Administrator user roles", seed_user_roles),

# 6. Seed reference data after setting up RBAC and initial users.
("Reference data", seed_reference_data),
)