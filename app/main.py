import logging
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from scalar_fastapi import get_scalar_api_reference
from starlette.requests import Request

from app.api.v1.router import router as v1_router
from app.api.v2.router import router as v2_router
from app.core.config import settings
from app.core.lifecycle import lifespan
from app.core.middleware import RequestIDMiddleware, SecurityHeadersMiddleware
from app.core.request_context import get_request_id
from app.shared.error_response import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)

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

# Request ID tracing middleware for distributed request correlation
app.add_middleware(RequestIDMiddleware)
# Security headers middleware for response hardening
app.add_middleware(SecurityHeadersMiddleware)

# Configure Cross-Origin Resource Sharing (CORS) for frontend clients.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_error_type(status_code: int) -> str:
    if status_code in (401, 403):
        return "authentication_error"
    if status_code == 404:
        return "not_found_error"
    if status_code == 409:
        return "conflict_error"
    if status_code in (400, 422):
        return "invalid_request_error"
    if status_code >= 500:
        return "api_error"
    return "invalid_request_error"


def _get_default_code(status_code: int) -> str:
    codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_SERVER_ERROR",
    }
    return codes.get(status_code, "ERROR")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = get_request_id()
    msg = str(exc.detail)
    status_code = exc.status_code
    error_type = _get_error_type(status_code)
    code = getattr(exc, "code", _get_default_code(status_code))

    error_response = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=msg,
            type=error_type,
            param=getattr(exc, "param", None),
            request_id=request_id,
        ),
        detail=msg,
    )
    headers = dict(getattr(exc, "headers", None) or {})
    headers["X-Request-ID"] = request_id
    return JSONResponse(
        status_code=status_code,
        content=error_response.model_dump(),
        headers=headers,
    )


def _format_validation_error(err: dict[str, Any]) -> str:
    loc = err.get("loc", [])
    field_name = str(loc[-1]) if loc else "field"
    err_type = str(err.get("type", ""))
    err_msg = str(err.get("msg", "Validation error"))
    inp = err.get("input")

    if err_type == "missing":
        return f"Field '{field_name}' is required."
    if inp is None:
        return f"Field '{field_name}' cannot be null."
    if isinstance(inp, str) and (
        inp.lower() in ("null", "undefined") or not inp.strip()
    ):
        return f"Parameter '{field_name}' cannot be empty or null."
    if "uuid" in err_type:
        return f"Parameter '{field_name}' must be a valid UUID."
    if "int" in err_type:
        return f"Field '{field_name}' must be a valid integer."
    if "string" in err_type:
        return f"Field '{field_name}' must be a valid string."
    return f"Field '{field_name}': {err_msg}."


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = get_request_id()
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    loc = first_error.get("loc", [])
    param = str(loc[-1]) if loc else None

    formatted_messages = [_format_validation_error(e) for e in errors]
    first_msg = (
        formatted_messages[0]
        if formatted_messages
        else str(first_error.get("msg", "Validation error."))
    )
    full_message = " ".join(formatted_messages) if formatted_messages else first_msg

    error_response = ErrorResponse(
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message=first_msg,
            type="invalid_request_error",
            param=param,
            request_id=request_id,
        ),
        detail=full_message,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=error_response.model_dump(),
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = get_request_id()
    logger.exception("Unhandled server error: %s [Request-ID: %s]", exc, request_id)
    error_response = ErrorResponse(
        error=ErrorDetail(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected internal server error occurred. Please contact system support.",
            type="api_error",
            param=None,
            request_id=request_id,
        ),
        detail="An unexpected internal server error occurred.",
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(),
        headers={"X-Request-ID": request_id},
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
