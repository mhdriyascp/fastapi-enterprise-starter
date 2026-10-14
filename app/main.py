from typing import Any

from fastapi import FastAPI
from scalar_fastapi import get_scalar_api_reference

from app.api.v1.router import router as v1_router
from app.api.v2.router import router as v2_router
from app.core.config import settings
from app.core.lifecycle import lifespan

# Tags from shared domains to include in dedicated v2 documentation.
V2_SHARED_TAGS = {
    "Authentication",
    "RBAC - Roles",
    "RBAC - Permissions",
    "RBAC - Role Permissions",
}

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


# Register API v2 routes.
app.include_router(
    v2_router,
    prefix="/api/v2",
)


def get_v2_openapi_schema() -> dict[str, Any]:
    """Generates a filtered OpenAPI schema for API v2 plus shared Auth and RBAC.

    Returns:
        A dictionary containing the OpenAPI 3.1 specification for v2 consumers.
    """
    cached_schema: dict[str, Any] | None = getattr(app.state, "v2_openapi_schema", None)
    if cached_schema is not None:
        return cached_schema

    full_schema = app.openapi()

    v2_paths: dict[str, Any] = {}
    used_tags: set[str] = set()

    for path, path_item in full_schema.get("paths", {}).items():
        is_v2_path = path.startswith("/api/v2")
        has_shared_tag = False

        for operation in path_item.values():
            if isinstance(operation, dict):
                op_tags = operation.get("tags", [])
                if any(
                    tag == "Authentication" or tag.startswith("RBAC") for tag in op_tags
                ):
                    has_shared_tag = True
                    break

        if is_v2_path or has_shared_tag:
            v2_paths[path] = path_item
            for op in path_item.values():
                if isinstance(op, dict):
                    used_tags.update(op.get("tags", []))

    v2_tags = [
        tag for tag in full_schema.get("tags", []) if tag.get("name") in used_tags
    ]

    schema: dict[str, Any] = {
        "openapi": full_schema.get("openapi", "3.1.0"),
        "info": {
            "title": f"{settings.app_name} - API v2",
            "version": "2.0.0",
            "description": (
                "Dedicated API documentation for v2 including shared "
                "Authentication and RBAC."
            ),
        },
        "paths": v2_paths,
        "components": full_schema.get("components", {}),
    }
    if v2_tags:
        schema["tags"] = v2_tags

    app.state.v2_openapi_schema = schema
    return schema


# Dedicated OpenAPI JSON schema for API v2 consumers.
@app.get("/api/v2/openapi.json", include_in_schema=False)
async def v2_openapi() -> dict[str, Any]:
    """Returns the OpenAPI JSON specification filtered for API v2 and Auth/RBAC."""
    return get_v2_openapi_schema()


# Dedicated Scalar documentation reference for API v2 consumers.
@app.get("/scalar/v2", include_in_schema=False)
async def scalar_v2_docs():
    """Renders the Scalar API reference restricted to v2 and shared Auth/RBAC."""
    return get_scalar_api_reference(
        openapi_url="/api/v2/openapi.json",
        title=f"{settings.app_name} - API v2",
    )


# Global Scalar API documentation (includes all v1, v2, and shared routes).
@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    """Renders the global Scalar API reference across all API versions."""
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )
