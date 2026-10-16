"""Enterprise middleware for request correlation and distributed tracing."""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.request_context import set_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Ensures every HTTP request has an X-Request-ID and binds it to context."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        incoming_id = request.headers.get("X-Request-ID")
        req_id = (
            incoming_id.strip()
            if incoming_id and incoming_id.strip()
            else f"req_{uuid.uuid4().hex[:16]}"
        )
        set_request_id(req_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces enterprise HTTP security headers across all API responses."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
