from fastapi import APIRouter

router = APIRouter(
    tags=["Admin"],
)


@router.get("/health")
async def admin_health() -> dict[str, str]:
    return {
        "module": "admin",
        "status": "ok",
        "message": "Admin API is working",
    }