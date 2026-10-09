from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_permission
from app.api.v1.auth import router as auth_router
from app.infrastructure.database.session import get_db_session
from app.modules.rbac.permissions_router import permissions_router
from app.modules.rbac.role_permissions_router import role_permissions_router
from app.modules.rbac.roles_router import roles_router

router = APIRouter()


# Health check endpoint.
@router.get("/health", tags=["Health"])
async def health_check(
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": result.scalar_one(),
    }


# Authentication routes.
router.include_router(auth_router)

# RBAC routes.
router.include_router(roles_router)

# RBAC permissions routes.
router.include_router(permissions_router)

# RBAC role permissions routes.
router.include_router(role_permissions_router)