# 03. Modules — Organizations Domain

## Overview

The Organizations module acts as the core tenant foundation for CRM and multi-tenant SaaS capabilities. It represents legal corporate entities, branch offices, and client accounts.

- **Module Path**: [`app/modules/organizations/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/organizations/)
- **Database Model**: [`app/infrastructure/database/models/organization/organization.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/organization/organization.py)

---

## Data Model (`organizations` table)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BigInteger` | Primary Key | Incremental primary key for internal relations. |
| `public_id` | `UUID` | Unique, Not Null | External UUID v4 identifier for REST APIs. |
| `code` | `String(30)` | Unique, Indexed, Not Null | Normalized uppercase identifier (e.g., `ACME_CORP`). |
| `name` | `String(150)` | Not Null | Operating business name. |
| `legal_name` | `String(200)` | Nullable | Full legal business name. |
| `registration_number`| `String(100)` | Nullable | Business registration or tax ID. |
| `tax_registration_number`| `String(100)` | Nullable | Corporate tax number. |
| `email` | `String(255)` | Nullable | Primary contact email address. |
| `phone` | `String(30)` | Nullable | Primary contact phone number. |
| `website` | `String(255)` | Nullable | Corporate website URL. |
| `is_active` | `Boolean` | Default: `true` | Operational tenant active state. |
| `created_by_id` | `UUID` | Nullable, Indexed | Operator UUID who created the record. |
| `updated_by_id` | `UUID` | Nullable | Operator UUID who last updated the record. |
| `is_deleted` | `Boolean` | Default: `false`, Indexed | Soft-deletion indicator. |
| `deleted_at` | `DateTime(tz)` | Nullable | Timestamp when record was soft-deleted. |

### Relationships & Child Entity Integrity

- **Audit & Soft Deletion (`AuditEntityBase`)**:
  - `Organization` and all child organizational units (`Branch`, `Department`, `Team`, `CostCenter`, etc.) inherit from `AuditEntityBase`.
  - Default service queries automatically filter out soft-deleted records (`is_deleted = False`).
  - `OrganizationService.delete()` performs soft-deletion by setting `is_deleted = True` and recording `deleted_at`, preserving historical transactional data.
- **ORM Relationships**:
  - `Organization.addresses`: 1-to-many relationship with `Address` (`cascade="all, delete-orphan"`, `back_populates="organization"`).
  - `Address.organization`: Many-to-1 back-reference to `Organization`.
- **Tenant Scope Integrity (`UniqueConstraint("organization_id", "code")`)**:
  - `Branch`: Unique `code` per organization (`uq_branches_org_code`).
  - `Department`: Unique `code` per organization (`uq_departments_org_code`).
  - `Team`: Unique `code` per organization (`uq_teams_org_code`).
  - `CostCenter`: Unique `code` per organization (`uq_cost_centers_org_code`).

---

## Service Layer Pattern (`OrganizationService`)

The `OrganizationService` class embodies the team's transactional pattern with dual-lookup and soft-deletion:

```python
class OrganizationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        search: str | None = None,
        is_active: bool | None = None,
        include_deleted: bool = False,
    ) -> tuple[list[Organization], int]: ...

    async def get(
        self,
        identifier: int | UUID | str,
        include_deleted: bool = False,
    ) -> Organization | None: ...

    async def delete(
        self,
        organization: Organization,
        deleted_by_id: UUID | None = None,
        hard_delete: bool = False,
    ) -> None: ...
```

---

## API Endpoints (`/api/v1/organizations`)

Single-item endpoints support the **Dual-Lookup Strategy**: external callers can provide either the UUID `public_id` or the legacy integer `id`.

| Method | Endpoint | Required Permission | Response Model | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/organizations` | `organization.create` | `OrganizationResponse` | Register a new organization account. |
| `GET` | `/api/v1/organizations` | `organization.read` | `PagedResponse[OrganizationResponse]` | Paginated and dynamic sorted listing of organizations with search and active status filter. |
| `GET` | `/api/v1/organizations/{identifier}` | `organization.read` | `OrganizationResponse` | Get organization details by UUID `public_id` or integer ID. |
| `PATCH`| `/api/v1/organizations/{identifier}` | `organization.update` | `OrganizationResponse` | Update organization profile by UUID `public_id` or integer ID. |
| `PATCH`| `/api/v1/organizations/{identifier}/status` | `organization.update` | `OrganizationResponse` | Update operational active status. |
| `DELETE`| `/api/v1/organizations/{identifier}` | `organization.delete` | None (`204`) | Two-stage delete: soft-deletes active records by default (`is_deleted=true`, `is_active=false`); permanently purges from DB when `?hard_delete=true`. |
| `POST` | `/api/v1/organizations/{identifier}/restore` | `organization.restore` | `OrganizationResponse` | Restores a previously soft-deleted organization back to active state. |

---

## Frontend Integration (`/organizations`)

The frontend application provides a complete enterprise CRUD interface:
- **Location**: [`frontend/src/app/(dashboard)/organizations/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/%28dashboard%29/organizations/page.tsx)
- **Features**:
  - **Live Filter & Search**: Client-side query matching against name, uppercase code, legal entity name, and tax ID.
  - **Status Tabs**: Instant filter between All, Active, Inactive, and Deleted organizations.
  - **Create Modal**: Validated form with Code, Name, Legal Name, Tax Registration Number, Email, Phone, and Website.
  - **Edit Modal**: Full attribute updates with optimistic state refresh.
  - **Status Quick-Toggle**: Inline activation/deactivation button triggering `PATCH /api/v1/organizations/{identifier}/status`.
  - **Two-Stage Deletion & Safeguards**:
    - Active records offer a soft-delete button, immediately moving records to the "Deleted" tab and removing them from the "All" and "Active" views.
    - Soft-deleted records show an emerald green **Restore** button (`.btn-restore`) and a red **Purge** button for permanent database removal.
    - Status tabs dynamically display live record counts for immediate feedback: `All (N)`, `Active (N)`, `Inactive (N)`, and `Deleted (N)`.
  - **Bulk Operations (Delete, Purge & Restore)**:
    - Multi-select rows with header select-all control.
    - When selecting active records: Bulk **Delete** soft-deletes and moves records to the "Deleted" tab.
    - When viewing the "Deleted" tab or selecting deleted records: Toolbar offers **Restore ({count})** and **Purge ({count})** buttons with dedicated confirmation dialogs.
    - Detailed error toast notification reporting exact constraint restrictions on deletion failure.

