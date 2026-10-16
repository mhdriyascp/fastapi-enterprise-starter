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
    # Also provides backwards-compatibility for legacy limit & offset query params
    offset = pagination.offset
    limit = pagination.page_size
```

---

## 3. Dynamic Sorting Dependency (`SortParams`)

Located in [`app/shared/sorting.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/sorting.py).

Resolves, validates, and normalizes column sorting parameters (`sort_by` and `sort_order`) while preventing SQL injection by validating requested column names against SQLAlchemy model inspection metadata:

```python
@dataclass(frozen=True, slots=True)
class SortParams:
    sort_by: str
    sort_order: Literal["asc", "desc"]
```

### Usage:
```python
from app.shared.sorting import SortParams, get_sorting


@router.get("")
async def list_items(
    sorting: Annotated[SortParams, Depends(get_sorting)],
):
    # sorting.sort_by (default: "created_at")
    # sorting.sort_order (default: "desc", accepts "asc" | "desc")
```

---

## 4. Standardized Error Contracts & Validation Formatting (`ErrorResponse`)

Located in [`app/shared/error_response.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/error_response.py) and [`app/main.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/main.py).

Provides machine-readable error contracts matching industry developer standards:

```python
class ErrorDetail(BaseModel):
    code: str
    message: str
    type: str = "invalid_request_error"
    param: str | None = None
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
    detail: str  # Human-readable consolidated detail string
```

### Validation Error & Null-Checking Protocol:
- **Missing Required Fields**: Formatted as `"Field '<name>' is required."`
- **Null Values in Non-Nullable Fields**: Formatted as `"Field '<name>' cannot be null."`
- **Empty or Null Path Identifiers**: Path parameters (`/null`, `/undefined`, `""`) are intercepted with HTTP 400 Bad Request: `"Parameter '<name>' cannot be empty or null."`
- **Dual-Lookup Identifier Support**: Single-item endpoints resolve both UUID v4 `public_id` and legacy sequential integer `id`.
- **Database Constraint Safety**: `NOT NULL` constraint violations in update mutations are caught and converted to explicit HTTP 422 Unprocessable Content messages instead of generic 409 conflict errors.

---

## 5. Request Tracing & Observability (`RequestIDMiddleware`)

Located in [`app/core/middleware.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/core/middleware.py) and [`app/core/request_context.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/core/request_context.py).

Every HTTP request receives or inherits an `X-Request-ID` (e.g. `req_a1b2c3d4e5f6...`), which is:
- Bound to an asynchronous ContextVar (`get_request_id()`).
- Injected into response headers (`response.headers["X-Request-ID"]`).
- Embedded in all structured error envelopes for fast bug tracking and log correlation.

---

## 6. Enterprise Audit & Soft-Deletion (`AuditEntityBase`)

Located in [`app/infrastructure/database/models/base_entity.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/base_entity.py).

Base declarative model for high-value business entities (Customer Accounts, Contacts, Leads, Deals) providing Salesforce/HubSpot parity:
- `created_by_id: Mapped[UUID | None]`
- `updated_by_id: Mapped[UUID | None]`
- `is_deleted: Mapped[bool]` (default `False`, indexed)
- `deleted_at: Mapped[datetime | None]`


