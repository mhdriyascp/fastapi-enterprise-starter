"""
Shared API response schemas.

Provides reusable response structures for standard API operations
and paginated list endpoints.
"""

from http import HTTPStatus
from typing import Any, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse[T](BaseModel):
    """
    Standard response envelope for individual API operations.

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


class PagedResponse[T](BaseModel):
    """
    Standard paginated response envelope used by list endpoints.

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
    """
    Build a standardized successful API response.

    Args:
        message: Human-readable success message.
        data: Response payload.
        status_code: HTTP status code to include in the response body.

    Returns:
        APIResponse[Any]: Standardized success response.

    Note:
        This helper sets the status code in the response body only.
        Set the actual HTTP status code in the FastAPI endpoint as well.
    """

    return APIResponse[Any](
        success=True,
        status_code=status_code,
        message=message,
        data=data,
    )