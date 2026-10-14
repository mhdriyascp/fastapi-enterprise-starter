from typing import Any

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from scalar_fastapi import get_scalar_api_reference

from app.api.v1.router import router as v1_router
from app.api.v2.router import router as v2_router
from app.core.config import settings
from app.core.lifecycle import lifespan

# Tags from shared general domains to include in dedicated v2 documentation.
V2_SHARED_TAGS = {
    "Authentication",
    "Users",
    "Menus",
    "Admin",
    "Mobile",
    "Public",
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

# Configure Cross-Origin Resource Sharing (CORS) for frontend clients.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


def get_v1_openapi_schema() -> dict[str, Any]:
    """Generates a filtered OpenAPI schema for API v1 consumers.

    Excludes all v2 endpoints to maintain strict version isolation.

    Returns:
        A dictionary containing the OpenAPI 3.1 specification for v1 consumers.
    """
    cached_schema: dict[str, Any] | None = getattr(app.state, "v1_openapi_schema", None)
    if cached_schema is not None:
        return cached_schema

    full_schema = app.openapi()

    v1_paths: dict[str, Any] = {}
    used_tags: set[str] = set()

    for path, path_item in full_schema.get("paths", {}).items():
        if path.startswith("/api/v1"):
            v1_paths[path] = path_item
            for op in path_item.values():
                if isinstance(op, dict):
                    used_tags.update(op.get("tags", []))

    v1_tags = [
        tag for tag in full_schema.get("tags", []) if tag.get("name") in used_tags
    ]

    schema: dict[str, Any] = {
        "openapi": full_schema.get("openapi", "3.1.0"),
        "info": {
            "title": f"{settings.app_name} - API v1",
            "version": "1.0.0",
            "description": "Dedicated API documentation for v1 services and master data.",
        },
        "paths": v1_paths,
        "components": full_schema.get("components", {}),
    }
    if v1_tags:
        schema["tags"] = v1_tags

    app.state.v1_openapi_schema = schema
    return schema


def get_v2_openapi_schema() -> dict[str, Any]:
    """Generates a filtered OpenAPI schema for API v2 plus shared general APIs.

    Includes v2 endpoints along with shared foundational APIs: Authentication,
    RBAC (Roles, Permissions), Users, Menus, Admin, Mobile, and Public.

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
                    tag in V2_SHARED_TAGS or tag.startswith("RBAC") for tag in op_tags
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
                "Dedicated API documentation for v2 including shared General APIs "
                "(Authentication, RBAC, Users, Menus)."
            ),
        },
        "paths": v2_paths,
        "components": full_schema.get("components", {}),
    }
    if v2_tags:
        schema["tags"] = v2_tags

    app.state.v2_openapi_schema = schema
    return schema


# Dedicated OpenAPI JSON schema for API v1 consumers.
@app.get("/api/v1/openapi.json", include_in_schema=False)
async def v1_openapi() -> dict[str, Any]:
    """Returns the OpenAPI JSON specification filtered strictly for API v1."""
    return get_v1_openapi_schema()


# Dedicated OpenAPI JSON schema for API v2 consumers.
@app.get("/api/v2/openapi.json", include_in_schema=False)
async def v2_openapi() -> dict[str, Any]:
    """Returns the OpenAPI JSON specification filtered for API v2 and shared General APIs."""
    return get_v2_openapi_schema()


# Dedicated Scalar documentation reference for API v1 consumers.
@app.get("/scalar/v1", include_in_schema=False)
async def scalar_v1_docs():
    """Renders the Scalar API reference restricted to v1 services."""
    return get_scalar_api_reference(
        openapi_url="/api/v1/openapi.json",
        title=f"{settings.app_name} - API v1",
    )


# Dedicated Scalar documentation reference for API v2 consumers.
@app.get("/scalar/v2", include_in_schema=False)
async def scalar_v2_docs():
    """Renders the Scalar API reference restricted to v2 and shared General APIs."""
    return get_scalar_api_reference(
        openapi_url="/api/v2/openapi.json",
        title=f"{settings.app_name} - API v2",
    )


# Default Scalar redirect to API v1 documentation.
@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    """Redirects default /scalar path to the isolated API v1 documentation."""
    return RedirectResponse(
        url="/scalar/v1",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
