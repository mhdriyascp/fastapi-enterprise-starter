"""Standardized structured error contracts for enterprise API consistency."""

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error object matching enterprise platform API standards.

    Attributes:
        code: Machine-readable unique error identifier (e.g. 'DUPLICATE_RECORD').
        message: Human-readable error description safe for user display.
        type: Category of error ('invalid_request_error', 'authentication_error', 'api_error').
        param: The specific query/body field parameter that triggered the error, if applicable.
        request_id: Globally unique request identifier for log correlation and support tickets.
    """

    code: str = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable explanation of error")
    type: str = Field(
        default="invalid_request_error",
        description="High-level category of error",
    )
    param: str | None = Field(
        default=None,
        description="Parameter or field associated with error",
    )
    request_id: str = Field(description="Unique request tracing ID")


class ErrorResponse(BaseModel):
    """Universal error envelope returned by all HTTP exception handlers."""

    error: ErrorDetail
    detail: str = Field(description="Backward-compatible detail message")
