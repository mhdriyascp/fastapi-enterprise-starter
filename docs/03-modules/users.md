# 03. Modules — User Management

## Overview

The User module encapsulates identity profiles, credentials, state management, and user lifecycle rules. It is treated as a shared foundational domain, accessible across both API v1 and API v2 documentation portals.

- **Module Path**: [`app/modules/users/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/users/)
- **Database Model**: [`app/modules/users/models.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/users/models.py)
- **Service Layer**: [`app/modules/users/service.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/users/service.py)
- **API Router**: [`app/modules/users/router.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/users/router.py)

---

## Data Model (`users` table)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, UUIDv7 | Globally unique internal identifier. |
| `public_id` | `UUID` | Unique, Indexed, UUIDv7 | External public identifier. |
| `email` | `String(254)` | Unique, Indexed, Not Null | Normalized lowercase email address. |
| `password_hash` | `String(255)` | Not Null | Cryptographically hashed password. |
| `first_name` | `String(100)` | Nullable | User's given name. |
| `last_name` | `String(100)` | Nullable | User's surname. |
| `display_name` | `String(150)` | Nullable | Formatted display name. |
| `username` | `String(50)` | Unique, Nullable | Optional unique handle. |
| `phone` | `String(30)` | Nullable | Contact phone number. |
| `status` | `String(20)` | Default: `'active'` | Account status (`active`, `pending`, `suspended`, `disabled`). |
| `failed_login_attempts` | `Integer` | Default: `0` | Consecutive failed password attempts. |
| `locked_until` | `DateTime` | Nullable | Lockout expiry timestamp. |
| `deleted_at` | `DateTime` | Nullable | Soft-deletion timestamp. |
| `created_at` | `DateTime` | Default: UTC now | Audit creation timestamp. |
| `updated_at` | `DateTime` | Auto-update | Audit last update timestamp. |

---

## API Endpoints (`/api/v1/users`)

| Method | Endpoint | Required Permission | Summary | Response | Shared in v2 Doc? |
|---|---|---|---|---|---|
| `GET` | `/api/v1/users` | `user.read` | List users with pagination, enriched roles, and permissions | `PagedResponse[UserResponse]` | Yes |
| `POST` | `/api/v1/users` | `user.create` | Create a new user account with initial credentials, status, and role assignments | `UserResponse` (201 Created) | Yes |
| `GET` | `/api/v1/users/{identifier}` | `user.read` | Get user details (dual-lookup: UUID id or UUID public_id) with assigned roles and permissions | `UserResponse` | Yes |
| `PATCH` | `/api/v1/users/{identifier}` | `user.update` | Update profile, status, and assigned roles (dual-lookup) | `UserResponse` | Yes |
| `POST` | `/api/v1/users/{identifier}/toggle-status` | `user.update` | Toggle user status (active <-> suspended, dual-lookup) | `UserResponse` | Yes |
| `POST` | `/api/v1/users/{identifier}/restore` | `user.update` | Restore soft-deleted / disabled user account back to active | `UserResponse` | Yes |
| `DELETE` | `/api/v1/users/{identifier}` | `user.delete` | Soft-delete user account (`status='disabled'`, Super Admin protected, dual-lookup) | `204 No Content` | Yes |
| `DELETE` | `/api/v1/users/{identifier}?hard_delete=true` | `user.delete` | Permanently purge user account (Super Admin protected, dual-lookup) | `204 No Content` | Yes |

---

## User Lifecycle & Governance Cockpit (`frontend/src/app/(dashboard)/users/page.tsx`)

1. **Segmented Status Tab Pills with Live Badge Counts**:
   - `All (N)`: Active and suspended users (excludes disabled/soft-deleted users).
   - `Active (N)`: Operable accounts (`status === 'active'`).
   - `Suspended (N)`: Suspended accounts (`status === 'suspended'`).
   - `Disabled (N)`: Soft-deleted accounts (`status === 'disabled'`).
2. **Context-Aware Bulk Action Bar**:
   - Selecting users in `All`, `Active`, or `Suspended` renders standard `Delete (N)`.
   - Selecting users in `Disabled` renders `Restore (N)` (emerald `.btn-restore`) and `Purge (N)` (red `.btn-danger`) with explicit multi-user confirmation modals.
3. **Restoration Workflow**:
   - Single-user restore via row action icon or bulk restore via top action bar.
   - Restores user account status back to `active`.

---

## Super Administrator Governance & Security Rules

1. **Super Administrator Protection**:
   - Any user account with the `super_admin` role or configured as `seed_super_admin_email` is protected.
   - Non-superadmin operators cannot modify (`PATCH`), toggle status (`POST /toggle-status`), or delete (`DELETE`) a Super Administrator account. Doing so is rejected with `403 Forbidden`.
   - Only another authenticated Super Administrator can modify or delete a Super Administrator account.
2. **Role Assignment Restrictions**:
   - The `super_admin` role can only be granted by another Super Administrator. Attempts by standard admins to assign `super_admin` are rejected with `403 Forbidden`.
3. **Self-Governance Safety**:
   - Operators cannot delete their own account (`400 Bad Request`).
   - Operators cannot suspend their own active account (`400 Bad Request`).

---

## Pydantic Schemas

- **`UserCreate`**: Validates registration requests, ensuring `email` format and minimum password complexity.
- **`UserUpdate`**: Allows updates for `first_name`, `last_name`, `display_name`, `phone`, `status`, and `role_codes`.
- **`UserResponse`**: Safe serialization format returning `id`, `public_id`, `email`, `phone`, `first_name`, `last_name`, `display_name`, `status`, `roles`, `is_super_admin`, and timestamps. **Never exposes `password_hash`**.
- **`ChangePasswordRequest`**: Requires `current_password` and `new_password`.
