from pydantic import BaseModel


class PagedResponse[T](BaseModel):
    """
    Standard paginated response envelope used by all list endpoints.

    Usage in a router:
        return PagedResponse.build(items=items, total=total, page=page, page_size=page_size)
    """

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
    ) -> PagedResponse[T]:
        total_pages = -(-total // page_size) if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
