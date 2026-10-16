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
| `POST` | `/api/v1/notifications` | `notification.create` | Dispatch notification | `NotificationResponse` (201) | Creates a new notification (defaults target to `current_user.id`). |
| `PATCH` | `/api/v1/notifications/{identifier}/read` | `notification.update` | Mark read / unread | `NotificationResponse` | Toggles read status (dual-lookup: int ID or UUID public_id) and sets `read_at` timestamp. |
| `POST` | `/api/v1/notifications/mark-all-read` | `notification.update` | Mark all read | `{"updated": int}` | Batch marks all unread notifications visible to user as read. |
| `DELETE` | `/api/v1/notifications/{identifier}` | `notification.delete` | Dismiss notification | 204 No Content | Deletes single notification (dual-lookup: int ID or UUID public_id) visible to user. |
| `DELETE` | `/api/v1/notifications/clear-all` | `notification.delete` | Clear all | `{"deleted": int}` | Deletes all notifications visible to user. |

---

## 🖥️ Frontend Dynamic Integration

The global Next.js header ([`frontend/src/components/navigation/header.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/navigation/header.tsx)) connects directly to the Notifications API:

1. **Initial Hydration & Periodic Polling**:
   - On user login, parallel queries fetch initial notifications (`GET /notifications?page=1&page_size=25`) and unread count (`GET /notifications/unread-count`).
   - A non-blocking 30-second background polling cycle automatically synchronizes the unread counter badge.
2. **Optimistic Updates**:
   - Toggling read/unread status immediately adjusts local counter badges before committing the `PATCH` request.
   - Marking all read or dismissing notifications reflects instantly with seamless error rollback.
3. **Deep Linking**:
   - Notifications with a target route destination (`link`) render an external navigation anchor, navigating the operator directly to the relevant entity (e.g. `/organizations`).
4. **Dedicated System Settings Notification Workspace (`/notifications`)**:
   - Accessible via the **System Settings ➔ Notifications & Alerts** sidebar menu item or the "View All Notifications" link in the header bell popover.
   - **Executive KPI Cards**: Aggregates Total Alerts, Unread Notices, Security Advisories, and Commercial Updates.
   - **Data Filtering & Search**: Instant keyword filtering across titles and messages, event taxonomy selection (`deal`, `security`, `tenant`, `system`), and status tabs (All, Unread, Read).
   - **Read-Only Detail Inspector Modal**: Formatted with `.detail-spec-table` two-column key-value tables:
     - *Event Specification*: Title, event taxonomy category, audience scope (Broadcast vs Recipient), operational read status with timestamp.
     - *Content Payload*: Full message body with styled callout.
     - *Audit Identifiers*: Primary UUID with 1-click clipboard copy, and direct action deep-link button.
   - Strictly read-only ("no updation required"), satisfying security requirements without exposing unnecessary mutation endpoints.

