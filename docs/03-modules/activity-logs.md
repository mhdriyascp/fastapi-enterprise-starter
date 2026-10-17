# 03. Modules — System Activity Logs (`app/modules/activity_logs`)

## Overview

The **System Activity Logs** module provides audit and platform mutation tracking for the CRM enterprise platform. It records data changes (CREATE, UPDATE, DELETE, and state transitions) across all platform modules (Organizations, Menus, Access Control/RBAC, Users, Master Data, and System Settings) with exact second-precision UTC timestamps, operator attribution, client metadata, and structured JSON payloads.

- **Source Code**: [`app/modules/activity_logs/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/activity_logs/)
- **Model**: [`app/infrastructure/database/models/system/activity_log.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/system/activity_log.py)
- **Schemas**: [`app/modules/activity_logs/schemas.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/activity_logs/schemas.py)
- **Service**: [`app/modules/activity_logs/service.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/activity_logs/service.py)
- **Router**: [`app/modules/activity_logs/router.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/activity_logs/router.py)
- **Frontend Dashboard**: [`frontend/src/app/(dashboard)/system-logs/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/(dashboard)/system-logs/page.tsx)

---

## 🏛️ Database Entity Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │                      ActivityLog                       │
   ├────────────────────────────────────────────────────────┤
   │ id: BigInteger (PK, autoincrement)                     │
   │ public_id: UUID (Unique, Index, default=uuid7)         │
   │ module: String(50, Index, Not Null)                    │
   │ action: String(50, Index, Not Null)                    │
   │ entity_type: String(100, Index, Not Null)              │
   │ entity_id: String(100, Index, Nullable)                │
   │ entity_name: String(255, Nullable)                     │
   │ details: JSONB (Indexed GIN, Nullable)                 │
   │ user_id: UUID (FK -> users.id, Index, Nullable)        │
   │ user_email: String(255, Nullable)                      │
   │ ip_address: String(45, Nullable)                       │
   │ request_id: String(100, Index, Nullable)               │
   │ created_at: DateTime(timezone=True, Index, UTC)        │
   └────────────────────────────────────────────────────────┘
```

- **Dual-Identifier Standard**: Internal 64-bit `BigInteger` for optimal index density and sequential append throughput; external RFC 9562 UUIDv7 `public_id` for secure REST lookup.
- **Foreign Key Indexing**: `user_id` is an explicitly indexed foreign key referencing `users.id(ondelete="SET NULL")` to preserve audit records even if a user account is purged.
- **Structured JSONB Details**: Stores old vs. new values, updated fields, parent IDs, and state transition details.

---

## ⚡ Non-Blocking Audit Recording Helper

All business domain mutations record audit entries via `record_activity()` in [`app/modules/activity_logs/service.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/activity_logs/service.py):

```python
await record_activity(
    db=self.db,
    module="organizations",
    action="UPDATE",
    entity_type="Organization",
    entity_id=str(org.public_id),
    entity_name=org.name,
    details={"updated_fields": list(update_dict.keys())},
    user_id=current_user.id if current_user else None,
    user_email=current_user.email if current_user else None,
    ip_address=request_ip,
    request_id=request_id,
)
```

The function is safely wrapped in exception guards so that audit logging anomalies will never interrupt or fail the primary transaction.

---

---

## 🔒 RBAC Security & Administrator-Only Policy (Restricted by Default)

- **Administrator-Only Access by Default**: All `/api/v1/system-logs` endpoints strictly enforce `require_admin("system activity logs")`. Access to mutation audit trails and operator IP histories is restricted to users with administrative roles (`super_admin`, `admin`, `system_admin`) or explicit `activity_logs.manage` permission.
- **Permissions Hierarchy**:
  - `activity_logs.read`: Allows viewing the paginated log stream, distinct module filters, and audit payload details.
  - `activity_logs.delete`: Allows single and bulk permanent deletion of system activity records (held by `super_admin`, `admin`, `system_admin`).
  - `activity_logs.manage`: Full administrative oversight of audit logging configuration, retention, and maintenance. Automatically grants read and delete capabilities.
- **Menu Hierarchy & Settings Integration**:
  - System Activity is integrated into the navigation system under **System Settings** (`code: settings_activity_logs`, path: `/system-logs`, icon: `activity`).
  - Available exclusively to `super_admin` and `admin` roles holding `activity_logs.read` permission.
  - System Settings dashboard provides seamless cross-navigation buttons between App Configurations and System Activity.
- **Frontend Access Guard**:
  - The System Logs feed verifies administrative status. Non-administrative users receive a dedicated **Administrator Access Only** card explaining the restriction with navigation links back to the main dashboard.

---

## 📡 REST API Endpoints

All endpoints are registered under `/api/v1/system-logs` with `require_admin("system activity logs")`:

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/system-logs` | Admin Only (`activity_logs.read`) | Paginated and filtered system activity logs. Supports query parameters `module`, `action`, `search`, `page`, `page_size`, `sort_by`, `sort_order`. Returns `PagedResponse[ActivityLogResponse]`. |
| `GET` | `/api/v1/system-logs/modules` | Admin Only (`activity_logs.read`) | Retrieves distinct registered module names (e.g., `organizations`, `menus`, `rbac`, `users`, `masters`, `settings`) for dynamic UI filtering. |
| `GET` | `/api/v1/system-logs/{identifier}` | Admin Only (`activity_logs.read`) | Retrieves a single audit log entry by its 64-bit internal `id` or UUIDv7 `public_id`. |
| `DELETE` | `/api/v1/system-logs/{identifier}` | Admin Only (`activity_logs.delete`) | Permanently deletes a single activity log entry by internal integer `id` or public UUID. |
| `POST` | `/api/v1/system-logs/bulk-delete` | Admin Only (`activity_logs.delete`) | Permanently deletes multiple activity log entries in a single batch transaction via `{ "identifiers": [...] }` or `{ "ids": [...] }` supporting mixed internal BigInt IDs and external UUIDs. |
| `POST` / `DELETE` | `/api/v1/system-logs/clear-all` | Admin Only (`activity_logs.delete`) | Permanently purges all system activity log records from the database in an atomic bulk transaction. Returns the total count of cleared logs. |

---

## 🖥️ Frontend Activity Logs Feed

Located at `/system-logs` on the dashboard:
1. **Interactive Metrics**: Real-time StatCards for total logs, creations, updates, and deletions.
2. **Dynamic Filtering**: Live search (entity name, entity ID, operator email, request ID), module selector, and action selector (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`).
3. **Audit Timestamp Standard**: Every timestamp renders via `<FormattedDate />` with microsecond-free second precision in the user's localized timezone, displaying UTC tooltips.
4. **Inspection Dialog**: Detailed modal showing full JSON payloads with syntax-highlighted monospace formatting and quick clipboard copy.
5. **Single & Bulk Deletion**: Multi-select row checkboxes with header toggle, toolbar `Delete ({selectedCount})` batch trigger, and individual row deletion actions with confirmation modals.
6. **Clear All Logs Feature**: Top-level header action button (`Clear All Logs`) with administrative permission guard (`canDelete`), automatic disabled state when total events is 0, and enterprise danger confirmation modal warning of irreversible database purge.

