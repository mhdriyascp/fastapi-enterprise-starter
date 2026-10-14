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

| Method | Endpoint | Summary | Response | Shared in v2 Doc? |
|---|---|---|---|---|
| `GET` | `/api/v1/users` | List users with pagination | `PagedResponse[UserResponse]` | Yes |
| `GET` | `/api/v1/users/{user_id}` | Get user details by ID | `UserResponse` | Yes |
| `PATCH` | `/api/v1/users/{user_id}` | Update user profile | `UserResponse` | Yes |

---

## Pydantic Schemas

- **`UserCreate`**: Validates registration requests, ensuring `email` format and minimum password complexity.
- **`UserUpdate`**: Allows partial updates for `first_name`, `last_name`, `display_name`, and `phone`.
- **`UserResponse`**: Safe serialization format returning `id`, `public_id`, `email`, `first_name`, `last_name`, `display_name`, `status`, and timestamps. **Never exposes `password_hash`**.
- **`ChangePasswordRequest`**: Requires `current_password` and `new_password`.
