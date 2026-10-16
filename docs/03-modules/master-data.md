# 03. Modules — Master Data Registry & Governance Hub

## Overview

The Master Data module provides centralized governance and CRUD administration for 12 core reference lookup catalogs required by enterprise business systems.

- **Backend Module Path**: [`app/modules/masters/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/masters/)
- **Database Models**: [`app/infrastructure/database/models/general_master/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/general_master/)
- **Registry & Router Factory**: [`app/modules/masters/registry.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/masters/registry.py)
- **Frontend Workspace**: [`frontend/src/app/(dashboard)/masters/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/(dashboard)/masters/page.tsx)
- **Frontend Layout**: [`frontend/src/app/(dashboard)/masters/layout.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/(dashboard)/masters/layout.tsx)

---

## 12 Supported Master Catalogs

The platform groups master data into four functional enterprise domains:

### 1. Geographic & Regional Catalogs
| Catalog | Endpoint Slug | Key Attributes | Lookup Constraints |
|---|---|---|---|
| **Countries** | `/masters/countries` | `name`, `code` (ISO-2), `iso3_code`, `phone_code`, `is_active` | Root entity |
| **States / Provinces** | `/masters/states` | `name`, `code`, `country_id`, `is_active` | Cascades to `Country` |
| **Cities** | `/masters/cities` | `name`, `country_id`, `state_id`, `is_active` | Cascades to `Country` & `State` |
| **Time Zones** | `/masters/time-zones` | `name` (IANA canonical), `label`, `utc_offset`, `is_active` | Root entity |

### 2. Financial & Commerce Catalogs
| Catalog | Endpoint Slug | Key Attributes | Notes |
|---|---|---|---|
| **Currencies** | `/masters/currencies` | `name`, `code` (ISO 4217), `symbol`, `decimal_places`, `is_active` | Monetary precision formatting |
| **Units of Measure** | `/masters/units-of-measure` | `name`, `code`, `category`, `is_active` | Weight, Volume, Length, Quantity |

### 3. Classifications & Taxonomies
| Catalog | Endpoint Slug | Key Attributes | Notes |
|---|---|---|---|
| **Industries** | `/masters/industries` | `name`, `code`, `description`, `is_active` | Standard industrial classification |
| **Languages** | `/masters/languages` | `name`, `code` (ISO 639), `native_name`, `is_active` | Vernacular script support |

### 4. System Types & Taxonomies
| Catalog | Endpoint Slug | Key Attributes | Standard Instances |
|---|---|---|---|
| **Address Types** | `/masters/address-types` | `name`, `code`, `description`, `is_active` | Billing, Shipping, Headquarters, Warehouse |
| **Addresses** | `/masters/addresses` | `address_line1`, `address_type_id`, `country_id`, `postal_code`, `is_default` | Physical & operational site location addresses |
| **Communication Types** | `/masters/communication-types` | `name`, `code`, `description`, `is_active` | Work Email, Personal Phone, Mobile, Slack |
| **Document Types** | `/masters/document-types` | `name`, `code`, `description`, `is_active` | Contract, Invoice, PO, NDA, Certification |
| **Identification Types** | `/masters/identification-types` | `name`, `code`, `description`, `is_active` | Passport, National ID, Tax Number, SSN |

---

## Dynamic Router Factory Pattern

To adhere to DRY (Don't Repeat Yourself), standardized lookup catalogs utilize `create_master_router`:

```python
from app.infrastructure.database.models.general_master.currency import Currency
from app.modules.masters.common.router_factory import create_master_router
from app.modules.masters.schemas.currency import CurrencyCreate, CurrencyResponse

currency_router = create_master_router(
    model=Currency,
    create_schema=CurrencyCreate,
    response_schema=CurrencyResponse,
    prefix="/masters/currencies",
    tag="Master Data - Currencies",
)
```

Each generated router automatically provides standardized HTTP endpoints (e.g., `/api/v1/masters/addresses/{identifier}`, `/api/v1/masters/countries/{identifier}`):
- `POST /api/v1/masters/<catalog>` — Create new master record with strict null validation for non-nullable columns
- `GET /api/v1/masters/<catalog>` — Paginated list with `is_active` filtering and injection-safe sorting
- `GET /api/v1/masters/<catalog>/{identifier}` — Dual-lookup: fetch detailed record by UUIDv7 `public_id` or internal integer `id` (e.g., `GET /api/v1/masters/addresses/{identifier}`)
- `PATCH /api/v1/masters/<catalog>/{identifier}` — Dual-lookup update with null-safety checks on non-nullable columns
- `DELETE /api/v1/masters/<catalog>/{identifier}` — Dual-lookup deactivation / soft-delete (returns 204 No Content)

> **Foreign Keys & Dual Identification**:
> - Individual record operations (`GET`, `PATCH`, `DELETE`) support **dual lookup**: accepting either sequential RFC 9562 UUIDv7 `public_id` or internal integer `id`.
> - Empty, null, or undefined identifiers in path parameters trigger explicit HTTP 400 errors (`"<Entity> identifier cannot be empty or null."`).
> - Updating non-nullable attributes to `null` raises HTTP 422 validation errors (`"Field '<column>' cannot be null."`) instead of database integrity conflicts.
> - Relational foreign keys in request payloads (`Address`, `City`, `State`) use integer IDs (`country_id`, `state_id`, `city_id`, `address_type_id`, `organization_id`, `branch_id`).
> - Responses include both integer `id` and UUID `public_id`.

---

## Service Layer & Transaction Safety

All mutations and queries are orchestrated through `MasterCRUDService`:
- **Deactivation & Reactivation**: `update_record` retrieves entities with `include_inactive=True`, enabling seamless re-activation of archived entries via `PATCH`.
- **Integrity Constraints**: Unique violations (such as duplicate ISO codes or duplicate names within parent regions) raise `DuplicateRecordError` (HTTP 409).
- **Eager Loading**: Foreign key dependencies (e.g. `Country` for `State`, `Country`/`State` for `City`) are loaded cleanly without ORM greenlet errors.

---

## Frontend Architecture (`frontend/src/app/(dashboard)/masters/page.tsx`)

The Master Data workspace provides an enterprise governance cockpit:

1. **KPI Ribbon**:
   - Master Domain & Category summary
   - Total registered catalog records
   - Active ratio & operational health metrics
   - Total available system catalogs (12)
2. **Category Navigation Bar**:
   - Horizontal pill tab bar with synchronized URL query parameters (`/masters?tab=<entity>`).
   - Deep links and browser back/forward history synchronization.
3. **Live Search & Filter Controls**:
   - Debounced search query across names, codes, labels, phone codes, and descriptions.
   - Status filters: `All Statuses`, `Active Only`, `Inactive Only`.
4. **CRUD Modals**:
   - **Create Modal**: Tailored input fields per entity type (ISO codes, decimal precisions, offsets, dynamic Country/State selector dropdowns).
   - **View Modal**: Enterprise `.detail-spec-table` displaying system identity (UUID with quick-copy), lifecycle badges, and formatted domain attributes.
   - **Edit Modal**: Pre-populated form fields with support for active/inactive state toggles.
   - **Deactivation Dialog**: Confirmation modal with danger state warnings before marking records as inactive.
   - **Quick Toggle**: Direct row-level button to flip operational state between active and inactive.
5. **Dynamic Navigation & Submenus**:
   - Integrated into the sidebar under the `Master Data` collapsible group dynamically populated from `GET /api/v1/menus/my-menus`.
