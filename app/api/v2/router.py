from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session

router = APIRouter()


# Health check endpoint (v2) - returns extended info.
@router.get("/health", tags=["Health"])
async def health_check(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, str | int]:
    result = await db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "version": "v2",
        "database": result.scalar_one(),
    }
