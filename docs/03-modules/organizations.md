# 03. Modules — Organizations Domain

## Overview

The Organizations module acts as the core tenant foundation for CRM and multi-tenant SaaS capabilities. It represents legal corporate entities, branch offices, and client accounts.

- **Module Path**: [`app/modules/organizations/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/organizations/)
- **Database Model**: [`app/infrastructure/database/models/organization/organization.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/organization/organization.py)

---

## Data Model (`organizations` table)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BigInteger` | Primary Key | Incremental primary key. |
| `code` | `String(50)` | Unique, Indexed, Not Null | Normalized uppercase identifier (e.g., `ACME_CORP`). |
| `name` | `String(255)` | Not Null | Operating business name. |
| `legal_name` | `String(255)` | Nullable | Full legal business name. |
| `registration_number`| `String(100)` | Nullable | Business registration or tax ID. |
| `email` | `String(255)` | Nullable | Primary contact email address. |
| `phone` | `String(50)` | Nullable | Primary contact phone number. |
| `website` | `String(255)` | Nullable | Corporate website URL. |
| `status` | `Enum` | Default: `ACTIVE` | Operational status (`ACTIVE`, `SUSPENDED`, `INACTIVE`). |

---

## Service Layer Pattern (`OrganizationService`)

The `OrganizationService` class embodies the team's transactional pattern:

```python
class OrganizationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: OrganizationCreate) -> Organization:
        organization = Organization(
            code=data.code.strip().upper(),
            name=data.name.strip(),
            legal_name=data.legal_name,
            email=str(data.email) if data.email else None,
        )
        self.db.add(organization)
        try:
            await self.db.commit()
            await self.db.refresh(organization)
        except IntegrityError as exc:
            await self.db.rollback()
            raise ValueError("An organization with this code already exists.") from exc
        return organization
```

---

## API Endpoints (`/api/v1/organizations`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/organizations` | `organization.create` | Register a new organization account. |
| `GET` | `/api/v1/organizations` | `organization.read` | Paginated listing of organizations. |
| `GET` | `/api/v1/organizations/{id}` | `organization.read` | Get organization details by ID. |
| `PATCH`| `/api/v1/organizations/{id}` | `organization.update` | Update organization profile, contacts, and tax info. |
| `PATCH`| `/api/v1/organizations/{id}/status` | `organization.update` | Update operational status. |
| `DELETE`| `/api/v1/organizations/{id}` | `organization.delete` | Delete an organization by ID (`204 No Content`). |

---

## Frontend Integration (`/organizations`)

The frontend application provides a complete enterprise CRUD interface:
- **Location**: [`frontend/src/app/(dashboard)/organizations/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/%28dashboard%29/organizations/page.tsx)
- **Features**:
  - **Live Filter & Search**: Client-side query matching against name, uppercase code, legal entity name, and tax ID.
  - **Status Tabs**: Instant filter between All, Active, and Inactive organizations.
  - **Create Modal**: Validated form with Code, Name, Legal Name, Tax Registration Number, Email, Phone, and Website.
  - **Edit Modal**: Full attribute updates with optimistic state refresh.
  - **Status Quick-Toggle**: Inline activation/deactivation button triggering `PATCH /api/v1/organizations/{id}/status`.
  - **Delete Safeguard**: Dedicated confirmation dialog with red destructive action and toast notification.

