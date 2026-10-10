from fastapi import APIRouter

router = APIRouter(
    tags=["Public"],
)


@router.get("/health")
async def public_health() -> dict[str, str]:
    return {
        "module": "public",
        "status": "ok",
        "message": "Public API is working",
    }