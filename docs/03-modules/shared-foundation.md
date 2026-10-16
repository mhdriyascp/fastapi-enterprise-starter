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

---

## 7. Enterprise Datetime Standardization (`BaseSchema` & `StandardJSONResponse`)

Located in [`app/shared/base_schema.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/base_schema.py) and [`app/shared/response.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/response.py).

Enforces industry-standard ISO 8601 UTC date/time formatting (`YYYY-MM-DDTHH:MM:SSZ`, e.g. `2026-10-16T05:54:55Z`) across all current and upcoming API responses:
- **Zero Microsecond Clutter**: Eliminates variable 6-digit database sub-second microseconds (`.406703Z` $\rightarrow$ `Z`).
- **Pydantic v2 `BaseSchema`**: All response schemas inherit from `BaseSchema`, which provides `from_attributes=True` and a recursive `field_serializer("*")` normalizer.
- **FastAPI `StandardJSONResponse`**: Configured as `app = FastAPI(default_response_class=StandardJSONResponse)`. Intercepts all outgoing responses and normalizes any ISO strings with fractional microseconds to clean UTC timestamps.
- **FastAPI Type Encoders**: `fastapi.encoders.ENCODERS_BY_TYPE[datetime] = format_iso_utc` ensures any direct `jsonable_encoder()` calls follow the same standard.

---

## 8. Frontend User View Presentation (`date-utils.ts` & `FormattedDate`)

Located in [`frontend/src/lib/date-utils.ts`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/lib/date-utils.ts) and [`frontend/src/components/ui/formatted-date.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/ui/formatted-date.tsx).

Translates universal UTC API responses into user-localized view formats matching Tier-1 enterprise CRM patterns:
- **Timezone & Locale Dynamic Resolution**: Resolves user's preferred timezone (e.g. `America/New_York`, `Asia/Kolkata`) and locale from profile or browser default (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- **Semantic `<time>` Element**: Renders `<time dateTime={iso} title={auditTooltip} suppressHydrationWarning>{displayText}</time>`.
- **Variants Supported**:
  - `datetime`: Standard compact date and time (e.g. `Oct 16, 2026, 05:54 PM`).
  - `date`: Calendar date only without timezone skew (e.g. `Oct 16, 2026`).
  - `time`: Time of day only (e.g. `05:54 PM`).
  - `relative`: Human-friendly relative time (e.g. `Just now`, `5m ago`, `2h ago`, `Yesterday`).
- **Comprehensive Audit Tooltip**: Hovering on any date displays the exact localized second-precision timestamp with timezone name and universal UTC offset.

---

## 9. Universal Frontend Form Validation Standards

Enforced across all CRM domain forms (`Login`, `Organizations`, `Users`, `RBAC`, `Menus`, `Masters`, `Profile`):
- **Zero Browser Native / jQuery Popup Bubbles**: Every `<form>` element defines `noValidate`. Native HTML5 popup bubbles (`required`, `minLength`, `pattern`) are strictly eliminated.
- **Controlled Validation State**: Forms maintain a `fieldErrors: Record<string, string>` and `touched: Record<string, boolean>` state.
- **Input Error Highlighting**: Invalid input elements dynamically receive the `.has-error` class (`border-color: #f43f5e`, glow focus state).
- **Standardized Inline Error Component**: Field validation failures render inline below the input with animated slide-in:
  ```tsx
  {fieldErrors.name && (
    <div className="field-error-text" role="alert">
      <AlertCircle size={13} style={{ flexShrink: 0 }} />
      <span>{fieldErrors.name}</span>
    </div>
  )}
  ```
- **Top Error Banner**: Server rejection messages render in a structured `formError` banner at the top of modal containers.

---

## 10. Standardized Confirmation & Warning Dialogs (`ConfirmationModal`)

Located in [`frontend/src/components/ui/confirmation-modal.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/ui/confirmation-modal.tsx).

Standardizes all destructive, deactivation, and warning popups across all modules with complete visual and behavioral consistency:
- **Zero Native `window.confirm()`**: Replaces arbitrary browser prompts and ad-hoc modals.
- **Visual Parity**: Built upon the Master Data Governance warning design standard with glassmorphic backdrop, circular icon badge, and color variants (`danger`, `warning`, `primary`).
- **Full Accessibility**: Implements `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, keyboard `ESC` dismissal, and body scroll lock.
- **Loading State**: Displays inline spinner (`<Loader2 className="loading-spinner" />`) and disables action buttons while async operations are in progress.
