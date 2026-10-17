# 03. Modules — Notifications (`app/modules/notifications`)

## Overview

The **Notifications** domain module provides real-time event alerts, activity streams, and operational dispatch for enterprise operators and tenant administrators. It supports targeted user notifications, event categorization (`deal`, `security`, `tenant`, `system`), broadcast notifications, read receipts, and live frontend synchronization.

- **Source Code**: [`app/modules/notifications/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/notifications/)
- **Models**: [`app/infrastructure/database/models/system/notification.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/system/notification.py)
- **Schemas**: [`app/modules/notifications/schemas.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/notifications/schemas.py)
- **Service**: [`app/modules/notifications/service.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/notifications/service.py)
- **Router**: [`app/modules/notifications/router.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/notifications/router.py)
- **Seed Data**: [`app/seeds/system/notifications.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/seeds/system/notifications.py)

---

## 🏛️ Database Entities & Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │                      Notification                      │
   ├────────────────────────────────────────────────────────┤
   │ id: BigInteger (PK, autoincrement)                     │
   │ public_id: UUID (Unique, Index, default=uuid7)         │
   │ user_id: UUID (FK -> users.id, Nullable, Index)        │
   │ title: String(150, Not Null)                           │
   │ message: Text (Not Null)                               │
   │ type: String(50, Default "system", Index)              │
   │ link: String(255, Nullable)                            │
   │ is_read: Boolean (Default False, Index)                │
   │ read_at: DateTime(UTC, Nullable)                       │
   │ created_at: DateTime(UTC, Default=now)                 │
   │ updated_at: DateTime(UTC, OnUpdate=now)                │
   └────────────────────────────────────────────────────────┘
```

> **Targeting Protocol**:
> - `user_id == <UUID>`: Dedicated notification dispatched to a specific recipient.
> - `user_id == None`: System-wide broadcast notification visible to all authenticated team members.

---

## 📡 REST API Specification

All endpoints are registered under `/api/v1/notifications` and require fine-grained RBAC authorization via `require_permission(...)`.

| Method | Endpoint | Required Permission | Summary | Response | Description |
|---|---|---|---|---|---|
| `GET` | `/api/v1/notifications` | `notification.read` | List user notifications | `PagedResponse[NotificationResponse]` | Fetches paginated activity stream for current user (supports `unread_only=true`). |
| `GET` | `/api/v1/notifications/unread-count` | `notification.read` | Get unread count | `UnreadCountResponse` | Returns number of unread notifications visible to current user. |
| `GET` | `/api/v1/notifications/modules` | `notification.read` | Get supported modules | `list[str]` | Returns standard module taxonomy dynamically resolved from `SystemSetting` (`notifications.notification_modules`), allowing administrators to add or remove modules at runtime. |
| `POST` | `/api/v1/notifications` | `notification.create` | Dispatch notification | `NotificationResponse` (201) | Creates a new notification tagged with any standard or custom domain module (defaults target to `current_user.id`). |
| `PATCH` | `/api/v1/notifications/{identifier}/read` | `notification.update` | Mark read / unread | `NotificationResponse` | Toggles read status (dual-lookup: int ID or UUID public_id) and sets `read_at` timestamp. |
| `POST` | `/api/v1/notifications/mark-all-read` | `notification.update` | Mark all read | `{"updated": int}` | Batch marks all unread notifications visible to user as read. |
| `DELETE` | `/api/v1/notifications/{identifier}` | `notification.delete` | Dismiss notification | 204 No Content | Deletes single notification (dual-lookup: int ID or UUID public_id) visible to user. |
| `DELETE` | `/api/v1/notifications/clear-all` | `notification.delete` | Clear all | `{"deleted": int}` | Deletes all notifications visible to user. |

---

## ⚡ Automated Notification Dispatch Engine

1. **Transactional Hook (`record_activity`)**:
   - System activities captured via `record_activity` in [`app/modules/activity_logs/service.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/activity_logs/service.py) automatically trigger `_dispatch_module_notification`.
   - **Create & Update Isolation**: Notifications are dispatched **strictly** for newly created (`action == "CREATE"`) or modified (`action == "UPDATE"`) records. Deletions, purges, restores, and reads do NOT trigger alerts.
   - **Dynamic Module Taxonomy**: Checked against the active `SystemSetting` key `notification_modules`. Administrators can configure which modules dispatch notifications dynamically via the Settings UI.
   - **In-App Notification Switch**: Respects `SystemSetting` flag `enable_in_app_notifications` (defaults to active).
   - **Deep Linking**: Automatically maps entity domains (`organizations` ➔ `/organizations`, `masters` ➔ `/masters`, `users` ➔ `/users`, `rbac` ➔ `/rbac`, `menus` ➔ `/menus`, `settings` ➔ `/settings`) to corresponding frontend routes.

---

## 🖥️ Frontend Dynamic Integration

The global Next.js header ([`frontend/src/components/navigation/header.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/navigation/header.tsx)) connects directly to the Notifications API:

1. **Header Bell Icon & Counter**:
   - The bell badge strictly reflects the count of **unread** notifications (`GET /notifications/unread-count`).
   - Non-blocking 30-second background polling keeps unread counters synchronized in real-time.
2. **Unread-Only Popover Experience**:
   - The header popover displays **strictly unread** notifications (`unread_only=true`).
   - Popover header displays `Unread Notifications` with `{unreadCount} new`.
   - **No Delete Action**: In accordance with enterprise design standards, row-level delete/trash buttons are excluded from the header bell dropdown to prevent accidental loss of audit alerts.
   - Clicking an unread item immediately marks it as read, removes it from the unread list, and navigates to the associated entity.
   - Popover footer directs operators to the full **Notification Center** (`/notifications`) for historical search, inspection, and dismissal.
3. **Dedicated System Settings Notification Workspace (`/notifications`)**:
   - Accessible via the **System Settings ➔ Notifications & Alerts** sidebar menu item or the "View Full Notification Center" link in the header bell popover.
   - **Executive KPI Cards**: Aggregates Total Alerts, Unread Notices, Security Advisories, and Commercial Updates.
   - **Dedicated Dispatch Modal**:
     - Operators with `notification.create` permission can trigger notifications across standard system modules (`organizations`, `masters`, `rbac`, `users`, `settings`, `menus`, `activity_logs`, `security`, `system`, `deal`) or enter arbitrary domain modules.
   - **Dynamic Module Options**:
     - Supported modules are retrieved live from `GET /api/v1/notifications/modules`, driven by `SystemSetting` (`notifications.notification_modules`) and database taxonomy.
   - **Data Filtering & Search**: Instant keyword filtering across titles and messages, dynamic module taxonomy selection, and status tabs (All, Unread, Read).
   - **Read-Only Detail Inspector Modal**: Formatted with `.detail-spec-table` two-column key-value tables:
     - *Event Specification*: Title, event taxonomy category, audience scope (Broadcast vs Recipient), operational read status with timestamp.
     - *Content Payload*: Full message body with styled callout.
     - *Audit Identifiers*: Primary UUID with 1-click clipboard copy, and direct action deep-link button.

