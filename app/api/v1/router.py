from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.admin.router import router as admin_router
from app.api.v1.auth.router import router as auth_router
from app.api.v1.mobile.router import router as mobile_router
from app.api.v1.public.router import router as public_router
from app.infrastructure.database.session import get_db_session
from app.modules.masters.cities_router import router as cities_router
from app.modules.masters.countries_router import router as countries_router
from app.modules.masters.registry import (
    address_type_router,
    communication_type_router,
    currency_router,
    document_type_router,
    identification_type_router,
    industry_router,
    language_router,
    time_zone_router,
    unit_of_measure_router,
)
from app.modules.masters.states_router import router as states_router
from app.modules.organizations.router import router as organizations_router
from app.modules.rbac.permissions_router import permissions_router
from app.modules.rbac.role_permissions_router import role_permissions_router
from app.modules.rbac.roles_router import roles_router

router = APIRouter()


# Health check endpoint.
@router.get("/health", tags=["Health"])
async def health_check(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, str | int]:
    result = await db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": result.scalar_one(),
    }


# Authentication routes.
router.include_router(auth_router)

# RBAC routes.
router.include_router(admin_router, prefix="/admin")
router.include_router(mobile_router, prefix="/mobile")
router.include_router(public_router, prefix="/public")

router.include_router(roles_router)
router.include_router(permissions_router)
router.include_router(role_permissions_router)

# Organization routes.
router.include_router(organizations_router)

# Master Data routes.
router.include_router(countries_router)
router.include_router(currency_router)
router.include_router(states_router)
router.include_router(cities_router)

router.include_router(address_type_router)
router.include_router(communication_type_router)
router.include_router(document_type_router)
router.include_router(identification_type_router)
router.include_router(industry_router)
router.include_router(language_router)
router.include_router(time_zone_router)
router.include_router(unit_of_measure_router)