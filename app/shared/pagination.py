"""Shared pagination utilities.

Provides validated pagination parameters for list endpoints and
SQLAlchemy queries.
"""

from dataclasses import dataclass

from fastapi import Query


@dataclass(frozen=True, slots=True)
class PaginationParams:
    """Validated pagination parameters.

    Attributes:
        page: Current page number, starting at 1.
        page_size: Number of records requested per page.

    The offset property converts page-based pagination into the
    zero-based offset required by SQLAlchemy.
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
    limit: int | None = Query(
        default=None,
        ge=1,
        le=100,
        description="Optional alias for page_size.",
    ),
    offset: int | None = Query(
        default=None,
        ge=0,
        description="Optional zero-based record offset.",
    ),
) -> PaginationParams:
    """Resolve and validate pagination query parameters.

    Supports both standard enterprise page/page_size pagination and
    legacy offset/limit queries seamlessly.
    """
    effective_page_size = limit if limit is not None else page_size
    effective_page = page
    if offset is not None and limit is not None:
        effective_page = (offset // effective_page_size) + 1

    return PaginationParams(
        page=effective_page,
        page_size=effective_page_size,
    )
