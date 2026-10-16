"""Shared API response schemas.

Provides reusable response structures for standard API operations,
paginated list endpoints, and enterprise-grade standardized JSON responses.
"""

import re
from datetime import datetime
from http import HTTPStatus
from typing import Any, TypeVar

from fastapi.responses import JSONResponse
from pydantic import Field

from app.shared.base_schema import BaseSchema, format_iso_utc

T = TypeVar("T")

_ISO_MICROSECONDS_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+(?:Z|[+-]\d{2}:\d{2})?$"
)


class StandardJSONResponse(JSONResponse):
    """FastAPI JSONResponse subclass that standardizes all datetimes to ISO 8601 UTC.

    Format: YYYY-MM-DDTHH:MM:SSZ (e.g. 2026-10-16T05:54:55Z).
    Guarantees that all API responses across existing and upcoming modules strip
    sub-second microsecond noise and standardize to explicit UTC.
    """

    @classmethod
    def normalize_datetimes(cls, val: Any) -> Any:
        if isinstance(val, dict):
            return {k: cls.normalize_datetimes(v) for k, v in val.items()}
        if isinstance(val, list):
            return [cls.normalize_datetimes(item) for item in val]
        if isinstance(val, datetime):
            return format_iso_utc(val)
        if isinstance(val, str) and len(val) >= 20 and "T" in val:
            if _ISO_MICROSECONDS_RE.match(val):
                try:
                    dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                    return format_iso_utc(dt)
                except ValueError, TypeError:
                    return val
        return val

    def render(self, content: Any) -> bytes:
        return super().render(self.normalize_datetimes(content))


class APIResponse[T](BaseSchema):
    """Standard response envelope for individual API operations.

    Attributes:
        success: Indicates whether the operation succeeded.
        status_code: HTTP status code associated with the response.
        message: Human-readable operation result.
        data: Response payload.

    Example:
        APIResponse(
            success=True,
            status_code=201,
            message="Address created successfully.",
            data=address_response,
        )
    """

    success: bool = True
    status_code: int = Field(
        default=HTTPStatus.OK,
        description="HTTP status code associated with the response.",
    )
    message: str
    data: T


class PagedResponse[T](BaseSchema):
    """Standard paginated response envelope used by list endpoints.

    Attributes:
        status_code: HTTP status code associated with the response.
        items: Records on the current page.
        total: Total number of matching records.
        page: Current page number, starting at 1.
        page_size: Maximum number of records per page.
        total_pages: Total number of available pages.

    Example:
        PagedResponse.build(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )
    """

    status_code: int = Field(
        default=HTTPStatus.OK,
        description="HTTP status code associated with the response.",
    )
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def build(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
        status_code: int = HTTPStatus.OK,
    ) -> PagedResponse[T]:
        """Build a paginated response with calculated total pages."""
        total_pages = -(-total // page_size) if page_size > 0 else 0

        return cls(
            status_code=status_code,
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


def success_response(
    message: str,
    data: Any = None,
    status_code: int = HTTPStatus.OK,
) -> APIResponse[Any]:
    """Build a standardized successful API response.

    Args:
        message: Human-readable success message.
        data: Response payload.
        status_code: HTTP status code to include in the response body.

    Returns:
        APIResponse[Any]: Standardized success response.
    """
    return APIResponse[Any](
        success=True,
        status_code=status_code,
        message=message,
        data=data,
    )
