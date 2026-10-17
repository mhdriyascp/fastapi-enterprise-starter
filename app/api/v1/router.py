from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.admin.router import router as admin_router
from app.api.v1.auth.router import router as auth_router
from app.api.v1.mobile.router import router as mobile_router
from app.api.v1.public.router import router as public_router
from app.infrastructure.database.session import get_db_session
from app.modules.activity_logs.router import router as activity_logs_router
from app.modules.masters.registry import (
    address_router,
    address_type_router,
    brand_router,
    city_router,
    communication_type_router,
    country_router,
    currency_router,
    document_type_router,
    identification_type_router,
    industry_router,
    language_router,
    state_router,
    tax_router,
    time_zone_router,
    unit_of_measure_router,
)
from app.modules.menus.router import router as menus_router
from app.modules.notifications.router import router as notifications_router
from app.modules.organizations.router import router as organizations_router
from app.modules.rbac.permissions_router import permissions_router
from app.modules.rbac.role_permissions_router import role_permissions_router
from app.modules.rbac.roles_router import roles_router
from app.modules.settings.router import router as settings_router
from app.modules.users.router import router as users_router

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

# User management routes.
router.include_router(users_router)


# RBAC routes.
router.include_router(admin_router, prefix="/admin")
router.include_router(mobile_router, prefix="/mobile")
router.include_router(public_router, prefix="/public")

router.include_router(roles_router)
router.include_router(permissions_router)
router.include_router(role_permissions_router)

# Navigation menus routes.
router.include_router(menus_router)

# Organization routes.
router.include_router(organizations_router)

# Notification routes.
router.include_router(notifications_router)

# System Settings routes.
router.include_router(settings_router)

# System Activity Logs routes.
router.include_router(activity_logs_router)

# Master Data routes.
router.include_router(country_router)
router.include_router(currency_router)
router.include_router(state_router)
router.include_router(city_router)
router.include_router(address_type_router)
router.include_router(communication_type_router)
router.include_router(document_type_router)
router.include_router(identification_type_router)
router.include_router(industry_router)
router.include_router(language_router)
router.include_router(tax_router)
router.include_router(time_zone_router)
router.include_router(unit_of_measure_router)
router.include_router(brand_router)
router.include_router(address_router)
