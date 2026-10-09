from fastapi import FastAPI
from scalar_fastapi import get_scalar_api_reference

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.lifecycle import lifespan

# Initialize FastAPI application.
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production-ready CRM platform backend",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


# Register API v1 routes.
app.include_router(
    v1_router,
    prefix="/api/v1",
)


# Register Scalar API documentation.
@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )