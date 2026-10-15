"""
Shared pagination utilities.

Provides validated pagination parameters for list endpoints and
SQLAlchemy queries.
"""

from dataclasses import dataclass

from fastapi import Query


@dataclass(frozen=True, slots=True)
class PaginationParams:
    """
    Validated pagination parameters.

    Attributes:
        page: Current page number, starting at 1.
        page_size: Number of records requested per page.

    The offset property converts page-based pagination into the
    zero-based offset required by SQLAlchemy.

    Example:
        page=2, page_size=20

        offset = (2 - 1) * 20 = 20
    """

    page: int
    page_size: int

    @property
    def offset(self) -> int:
        """Return the zero-based SQL query offset."""
        return (self.page - 1) * self.page_size


def get_pagination(
    page: int = Query(
        default=1,
        ge=1,
        description="Page number (1-indexed).",
        examples=[1, 2, 3],
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Number of items per page. Minimum 1, maximum 100.",
        examples=[10, 20, 50],
    ),
) -> PaginationParams:
    """
    Resolve and validate pagination query parameters.

    Inject this dependency into list endpoints using Depends(get_pagination).

    Returns:
        PaginationParams: Validated page, page size, and computed offset.
    """
    return PaginationParams(
        page=page,
        page_size=page_size,
    )