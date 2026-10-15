import pytest

from app.infrastructure.database.session import SessionFactory
from app.modules.rbac.service import RoleService


@pytest.mark.asyncio
async def test_roles_priority_ordering() -> None:
    """Verifies that RoleService.list_roles orders super_admin and admin first."""
    async with SessionFactory() as db:
        service = RoleService(db)
        roles, total = await service.list_roles(page=1, page_size=100)

        assert total >= 2
        assert len(roles) >= 2

        # Role codes in returned order
        role_codes = [r.code for r in roles]

        # super_admin must be 1st
        assert role_codes[0] == "super_admin", (
            f"Expected super_admin first, got {role_codes[0]}"
        )

        # admin must be 2nd
        assert role_codes[1] == "admin", f"Expected admin second, got {role_codes[1]}"
