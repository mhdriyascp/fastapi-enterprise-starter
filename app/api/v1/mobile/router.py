from fastapi import APIRouter

router = APIRouter(
    tags=["Mobile"],
)


@router.get("/health")
async def mobile_health() -> dict[str, str]:
    return {
        "module": "mobile",
        "status": "ok",
        "message": "Mobile API is working",
    }