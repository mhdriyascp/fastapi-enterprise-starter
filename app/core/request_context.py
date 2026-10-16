"""Request context management for enterprise distributed tracing."""

import uuid
from contextvars import ContextVar

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Retrieves the current request ID from context, or generates one if missing."""
    req_id = _request_id_ctx.get()
    if not req_id:
        req_id = f"req_{uuid.uuid4().hex[:16]}"
        _request_id_ctx.set(req_id)
    return req_id


def set_request_id(request_id: str) -> None:
    """Sets the current request ID in context."""
    _request_id_ctx.set(request_id)
