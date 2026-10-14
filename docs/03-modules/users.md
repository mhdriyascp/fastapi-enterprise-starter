# 03. Modules — User Management

## Overview

The User module encapsulates identity profiles, credentials, state management, and user lifecycle rules.

- **Module Path**: [`app/modules/users/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/users/)
- **Database Model**: [`app/infrastructure/database/models/user/user.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/user/user.py)

---

## Data Model (`users` table)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key | Globally unique identifier. |
| `email` | `String(255)` | Unique, Indexed, Not Null | Normalized lowercase email address. |
| `hashed_password` | `String(255)` | Not Null | Cryptographically hashed password. |
| `first_name` | `String(100)` | Nullable | User's given name. |
| `last_name` | `String(100)` | Nullable | User's surname. |
| `is_active` | `Boolean` | Default: `true` | Inactive users cannot log in. |
| `is_verified` | `Boolean` | Default: `false` | Email verification flag. |
| `is_superuser` | `Boolean` | Default: `false` | Bypasses all RBAC permission checks. |
| `timezone` | `String(50)` | Default: `"UTC"` | Preferred user timezone. |
| `created_at` | `DateTime` | Default: `utcnow` | Audit creation timestamp. |
| `updated_at` | `DateTime` | Auto-update | Audit last update timestamp. |

---

## Pydantic Schemas

- **`UserCreate`**: Validates registration requests, ensuring `email` format and minimum password complexity.
- **`UserResponse`**: Safe serialization format returning `id`, `email`, `first_name`, `last_name`, and `is_active`. **Never exposes `hashed_password`**.
- **`ChangePasswordRequest`**: Requires `current_password` and `new_password`.
