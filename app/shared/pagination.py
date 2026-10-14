from dataclasses import dataclass

from fastapi import Query


@dataclass
class PaginationParams:
    """
    Resolved pagination parameters, injected via Depends(get_pagination).

    Provides .offset as a convenience property for SQLAlchemy queries.

    Usage in a service:
        .offset(pagination.offset)
        .limit(pagination.page_size)
    """

    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def get_pagination(
    page: int = Query(
        default=1,
        ge=1,
        description="Page number (1-indexed).",
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Number of items per page. Maximum 100.",
    ),
) -> PaginationParams:
    """
    FastAPI dependency that resolves and validates pagination query parameters.

    Usage in a router:
        pagination: Annotated[PaginationParams, Depends(get_pagination)]
    """
    return PaginationParams(page=page, page_size=page_size)
