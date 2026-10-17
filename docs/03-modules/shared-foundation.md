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

---

## 11. Enterprise Deletion Policy & Status Visibility Engine

Located in [`app/shared/deletion_policy.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/deletion_policy.py).

- **Two-Stage Deletion Lifecycle & Policy (Soft-Delete First)**:
  - System-generated hard-delete permissions (`organization.hard_delete`, `user.hard_delete`, `role.hard_delete`, `menu.hard_delete`, `masters:hard_delete`, `notification.hard_delete`) are granted to system administrators (`super_admin`, `admin`, `system_admin`).
  - Single-resource deletion endpoints accept an optional query parameter `?hard_delete=true|false`.
  - **Soft-Delete First**: All deletion actions default to soft-delete (`?hard_delete=false` or omitted `hard_delete=None` resolving to `False`), ensuring active records are NEVER permanently destroyed on first deletion.
  - **Two-Stage Action Workflow**:
    1. *Stage 1 (Active Record)*: Clicking Delete executes a soft-delete (marking `is_deleted = True` or `is_active = False` with `deleted_at` timestamp).
    2. *Stage 2 (Soft-Deleted Record)*: When viewing soft-deleted or inactive records, operators are presented with two distinct choices:
       - **Restore**: Reinstates the record back to active state.
       - **Permanent Delete (Purge)**: Prompts a strong confirmation modal and executes `DELETE ...?hard_delete=true` to permanently purge the record from the database.
- **Distinct Visual Styling for Restore Action (`.btn-restore`)**:
  - Restore buttons across all modules (`organizations`, `users`, `masters`, `menus`, `rbac`) feature a dedicated emerald-green visual theme (`.btn-restore`):
    - Text: `#34d399` (dark mode) / `#059669` (light mode)
    - Background: `rgba(16, 185, 129, 0.12)` (dark mode) / `rgba(16, 185, 129, 0.1)` (light mode)
    - Border: `1px solid rgba(16, 185, 129, 0.3)`
    - Hover: `rgba(16, 185, 129, 0.22)` with subtle emerald focus glow (`0 0 10px rgba(16, 185, 129, 0.2)`)
    - Icon: `<RotateCcw size={13} />` with label `Restore`
  - Visually differentiates constructive reactivation from destructive deletion (`.btn-danger`) or navigation (`.btn-secondary`).
- **Strict RBAC Enforcement for Other Users**:
  - Other users are governed strictly by the RBAC permissions explicitly granted to their roles.
  - Standard users with `{module}.delete` permission can ONLY perform soft-deletions (`is_deleted = True, deleted_at = UTC timestamp`).
  - If a user without `{module}.hard_delete` attempts to execute `?hard_delete=true`, the endpoint strictly intercepts the request and raises `403 Forbidden` (`detail="You do not have permission to permanently delete records in this module. Only soft-deletion is permitted based on your RBAC permissions."`).
- **Dynamic System Settings Configuration**:
  - `data_retention.permanent_delete_roles`: Configures authorized administrative roles dynamically without hardcoded application logic.
  - `data_retention.soft_delete_only_for_non_admins`: System-wide toggle enforcing soft deletion for non-admins.
  - `data_retention.permanent_delete_exceptions`: Allows operators to configure granular exceptions (e.g., `["audit_logs:soft_only"]`, `["notifications:hard"]`).
  - `data_retention.admin_view_all_statuses`: Enables platform administrators to view records across all statuses (active, inactive, soft-deleted) on their listings.
- **Administrator Listing Visibility**:
  - Listing endpoints inspect `should_user_view_all_statuses(db, user)`. For administrators, listings automatically default `effective_include_deleted = True`, allowing administrative operators full visibility into active, inactive, and soft-deleted entities with dedicated `Deleted` status badges and filter controls.
  - Non-administrative users are strictly shielded from soft-deleted entities.

---

## 12. Granular Restoration & Bulk Operations Engine

Standardizes record recovery, multi-select bulk operations, and real-time state updates across all CRM domains (`organizations`, `users`, `masters`, `menus`, `rbac`, `notifications`):
- **Granular RBAC Restoration Permissions**:
  - `organization.restore`: Restores soft-deleted organizations and their operational state.
  - `user.restore`: Restores deactivated/soft-deleted user accounts and clears suspension flags.
  - `masters:restore`: Restores deactivated or soft-deleted master reference records.
  - `menu.restore`: Restores deactivated navigation menu items and preserves hierarchy.
  - `role.restore`: Restores deactivated custom roles and re-enables assignment.
- **Dedicated Dual-Lookup Restoration Endpoints**:
  - `POST /api/v1/organizations/{identifier}/restore` (guarded by `organization.restore`)
  - `POST /api/v1/users/{identifier}/restore` (guarded by `user.restore`)
  - `POST /api/v1/masters/{entity}/{identifier}/restore` (guarded by `masters:restore`)
  - `POST /api/v1/menus/{identifier}/restore` (guarded by `menu.restore`)
  - `POST /api/v1/roles/{identifier}/restore` (guarded by `role.restore`)
  - Restores `is_deleted = False`, clears `deleted_at`, resets operational status to active, and updates audit timestamps.
- **Frontend Bulk Selection & Delete Operations**:
  - High-density data tables provide individual row checkboxes and a header "Select All" checkbox.
  - Contextual action bar appears with `Delete ({selectedCount})` trigger upon selection.
  - Modal confirmation (`ConfirmationModal`) confirms the batch operation and provides administrators an option for permanent hard-deletion when authorized.
- **Zero-Page-Reload Real-Time Rehydration**:
  - Full browser page reloads (`window.location.reload()`) are strictly eliminated.
  - All create, edit, delete, bulk delete, and restore mutations asynchronously rehydrate local component state (`loadOrganizations()`, `reloadUsers()`, `loadRecords()`, `loadMenus()`, `refreshNotifications()`, `loadRbacData()`) and update navigation sidebars in real-time.

---

## 13. Standardized Listing UX & Sequence Numbering

Enterprise listing tables implement continuous row sequence numbering and settings-driven pagination:
- **Global Row Sequence Numbering (`#`)**:
  - Every listing module (`organizations`, `users`, `masters`, `menus`, `notifications`, `rbac` roles/permissions, `system-logs`, `settings`) displays an explicit `#` sequence number column computed continuously as `(currentPage - 1) * pageSize + index + 1`.
  - Row numbering respects pagination boundaries, providing operators continuous, unambiguous numbering across pages without resetting per page.
- **Settings-Driven Dynamic Pagination (`default_page_size`)**:
  - System-wide default page size is backed by the database setting `default_page_size` (`GET /api/v1/settings/public`), initialized to `15` records per page.
  - Hook [`useDefaultPageSize`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/lib/use-page-size.ts) caches and supplies the active page size to all dashboard screens.
- **Accurate Counter Envelopes**:
  - Listing headers and pagination footers display detailed record metrics: `Showing X to Y of Z records (filtered from Total)`.


