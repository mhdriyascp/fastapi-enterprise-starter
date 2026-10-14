# 03. Modules — Shared Foundation Utilities

## Overview

The `app/shared/` package houses cross-cutting components that must be reused across all domain modules rather than re-invented.

- **Package Path**: [`app/shared/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/)

---

## 1. Paginated Response Envelope (`PagedResponse[T]`)

Located in [`app/shared/response.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/response.py).

All paginated list endpoints return this generic, strongly-typed response envelope:

```python
class PagedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
```

### Usage:
```python
from app.shared.response import PagedResponse

@router.get("", response_model=PagedResponse[RoleResponse])
async def list_roles(...) -> PagedResponse[RoleResponse]:
    roles, total = await service.list(offset=pagination.offset, limit=pagination.page_size)
    return PagedResponse.build(
        items=roles,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )
```

---

## 2. Pagination Parameters Dependency (`PaginationParams`)

Located in [`app/shared/pagination.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/pagination.py).

Resolves, validates, and computes database query offsets from `page` and `page_size` query parameters:

```python
@dataclass
class PaginationParams:
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
```

### Usage:
```python
from app.shared.pagination import PaginationParams, get_pagination

@router.get("")
async def list_items(
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
):
    # Automatically validated: page >= 1, 1 <= page_size <= 100
    offset = pagination.offset
    limit = pagination.page_size
```
