# 03. Modules — Role-Based Access Control (RBAC)

## Overview

The RBAC module provides centralized authorization management, decoupling permissions from application code.

- **Module Path**: [`app/modules/rbac/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/rbac/)
- **Database Models**: [`app/infrastructure/database/models/rbac/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/rbac/)
- **Routers**:
  - `roles_router`: CRUD on roles
  - `permissions_router`: Catalog of system permissions
  - `role_permissions_router`: Mapping permissions to roles

---

## API Endpoints

### 1. Roles Management (`/api/v1/roles`)
| Method | Endpoint | Required Permission | Response Model | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/roles` | `role.create` | `RoleResponse` | Create a new business role. |
| `GET` | `/api/v1/roles` | `role.read` | `PagedResponse[RoleResponse]` | Standardized paginated listing of roles prioritized hierarchically (`super_admin` first, then `admin`, followed by other system roles, and custom roles). |
| `GET` | `/api/v1/roles/{identifier}` | `role.read` | `RoleResponse` | Fetch role by UUID or unique code (dual-lookup). |
| `PATCH` | `/api/v1/roles/{identifier}` | `role.update` | `RoleResponse` | Update role name, description, or active status (dual-lookup). |
| `POST` | `/api/v1/roles/{identifier}/restore` | `role.restore` | `RoleResponse` | Restore soft-deleted or inactive role back to active status (dual-lookup). |
| `DELETE`| `/api/v1/roles/{identifier}` | `role.delete` | None (`204`) | Delete role (dual-lookup; system roles cannot be deleted). |

### 2. Permissions Catalog (`/api/v1/permissions`)
| Method | Endpoint | Required Permission | Response Model | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/permissions` | `permission.create` | `PermissionResponse` | Register a new custom permission. |
| `GET` | `/api/v1/permissions` | `permission.read` | `PagedResponse[PermissionResponse]` | Standardized paginated list of all registered system and custom permissions. |
| `GET` | `/api/v1/permissions/{identifier}` | `permission.read` | `PermissionResponse` | Get permission details (dual-lookup: UUID or unique code). |
| `PATCH`| `/api/v1/permissions/{identifier}` | `permission.update` | `PermissionResponse` | Update permission name, description, and active status (dual-lookup). |
| `POST` | `/api/v1/permissions/{identifier}/restore` | `permission.restore` | `PermissionResponse` | Restore soft-deleted or inactive custom permission (dual-lookup). |
| `DELETE`| `/api/v1/permissions/{identifier}`| `permission.delete` | None (`204`) | Delete or deactivate custom permission (dual-lookup; permanent purge requires `permission.hard_delete`). |

### 3. Role-Permission Mappings (`/api/v1/roles/{identifier}/permissions`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/roles/{identifier}/permissions` | `role.assign_permission` | Assign permission to a role. |
| `DELETE`| `/api/v1/roles/{identifier}/permissions/{permission_id}` | `role.revoke_permission` | Revoke permission from a role. |

---

## Standardized Module Lifecycle Permissions

All CRM domain modules adhere to standard lifecycle permission codes:
- **Soft Delete**: `{module}.delete` (or `masters:delete`)
- **Purge**: `{module}.hard_delete` (or `masters:hard_delete`)
- **Restore**: `{module}.restore` (or `masters:restore`)

Supported across: `role`, `permission`, `user`, `organization`, `masters`, `menu`, and `notification`.

---

## Role Governance & Hierarchical Permission Flow

- **`super_admin` (Root Governance Role)**:
  - Universal root access across all modules (`*.*`).
  - Protected from permission modification or deletion in both backend services and frontend matrix.
  - Automatically satisfies all permission dependencies via `require_permission`.
  - **Exclusive Permissions**: Root-governance permissions (`role.delete`, `role.hard_delete`, `permission.create`, `permission.update`, `permission.delete`, `permission.hard_delete`) are strictly reserved for `super_admin` and cannot be assigned to any other role.
- **`admin` (System Administrator Role)**:
  - Granted broad operational and administrative permissions across all standard modules:
    - Users: `user.read`, `user.create`, `user.update`, `user.delete`, `user.restore`
    - Organizations: `organization.read`, `organization.create`, `organization.update`, `organization.delete`, `organization.restore`
    - Master Data: `masters:read`, `masters:create`, `masters:update`, `masters:delete`, `masters:restore`
    - Menus: `menu.read`, `menu.create`, `menu.update`, `menu.delete`, `menu.restore`
    - Notifications: `notification.read`, `notification.create`, `notification.update`, `notification.delete`, `notification.restore`
    - Roles & Permissions: `role.read`, `role.create`, `role.update`, `role.restore`, `permission.read`, `permission.restore`
  - Fully customizable via the Access Control Matrix by Super Administrators.
- **Operational Roles (`sales_manager`, `sales_rep`, `support_agent`)**:
  - Modular permissions mapped dynamically based on functional domain requirements.
- **`is_system = True`**:
  - Protected from role deletion (`delete_role`), while permitting non-`super_admin` system roles (such as `admin`) to have granular permissions adjusted via the matrix.

---

## Complete Permission Catalog by Domain

| Module | Permission Code | Description |
|---|---|---|
| **Users** | `user.read` | View users list and profiles |
| | `user.create` | Register/create new users |
| | `user.update` | Update user details and toggle status |
| | `user.delete` | **Soft Delete Users** — Soft-delete user accounts (deactivates credentials, preserves profile and historical audit trails, allows restoration) |
| | `user.restore` | **Restore Soft-Deleted Users** — Restore soft-deleted or suspended user accounts back to active status |
| | `user.hard_delete` | **Purge Users** — Permanently purge user accounts and identity from database (irreversible physical deletion) |
| **Organizations** | `organization.read` | View organizations |
| | `organization.create` | Create organizations |
| | `organization.update` | Edit organization details |
| | `organization.delete` | **Soft Delete Organizations** — Soft-delete organization records (marks entity as deleted, preserves full audit history, and allows restoration) |
| | `organization.restore` | **Restore Soft-Deleted Organizations** — Restore soft-deleted organization records back to active status |
| | `organization.hard_delete` | **Purge Organizations** — Permanently purge organization records from database (irreversible physical deletion) |
| **Master Data** | `masters:read` | View master records |
| | `masters:create` | Create master records |
| | `masters:update` | Update master records |
| | `masters:delete` | **Soft Delete Master Records** — Soft-delete master reference records (marks record as inactive/deleted with complete restore capability) |
| | `masters:restore` | **Restore Soft-Deleted Master Records** — Restore soft-deleted or deactivated master reference records back to active status |
| | `masters:hard_delete` | **Purge Master Records** — Permanently purge master reference records from database (irreversible physical deletion) |
| **Menus** | `menu.read` | View navigation menus |
| | `menu.create` | Create navigation menu items |
| | `menu.update` | Update navigation menu items |
| | `menu.delete` | **Soft Delete Menus** — Soft-delete navigation menu items (hides menu item from navigation tree while preserving configuration for restore) |
| | `menu.restore` | **Restore Soft-Deleted Menus** — Restore soft-deleted navigation menu items back to active status |
| | `menu.hard_delete` | **Purge Menus** — Permanently purge navigation menu items from database (irreversible physical deletion) |
| **Notifications** | `notification.read` | View notifications |
| | `notification.create` | Create system notifications |
| | `notification.update` | Update notification states |
| | `notification.delete` | **Soft Delete Notifications** — Soft-delete notification alerts (dismisses from user inbox while preserving audit trail) |
| | `notification.hard_delete` | **Purge Notifications** — Permanently purge notifications from database (irreversible physical deletion) |
| **RBAC Roles** | `role.read` | View RBAC roles |
| | `role.create` | Create roles |
| | `role.update` | Update role details |
| | `role.delete` | **Soft Delete Roles** — Soft-delete custom roles (marks entity as deleted/inactive, preserves historical assignments and audit trails, enables restoration) |
| | `role.restore` | **Restore Soft-Deleted Roles** — Restore soft-deleted custom roles back to active status in the system |
| | `role.hard_delete` | **Purge Roles** — Permanently purge eligible custom roles from the database (irreversible physical deletion) |
| | `role.assign_permission` | Assign permission to role |
| | `role.revoke_permission` | Revoke permission from role |
| | `permission.read` | View permissions catalog |
| | `permission.create` | Create permissions |
| | `permission.update` | Edit permissions |
| | `permission.delete` | **Soft Delete Permissions** — Soft-delete custom permissions (deactivates privilege, preserves audit history, allows restoration) |
| | `permission.restore` | **Restore Soft-Deleted Permissions** — Restore soft-deleted custom permissions back to active status |
| | `permission.hard_delete` | **Purge Permissions** — Permanently purge custom permissions from the database (irreversible physical deletion) |

---

## Frontend Dashboard Integration

- **Route**: [`frontend/src/app/(dashboard)/rbac/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/%28dashboard%29/rbac/page.tsx) (`/rbac`)
- **Capabilities**:
  - Full CRUD operations on custom and system roles with deletion guards.
  - Resource-grouped system permissions catalog.
  - Interactive role-permission matrix with real-time assignment/revocation toggles.
  - Protected root governance indicator for `super_admin` role.
  - **Standardized Status Separations & Live Counts**: Both Roles and Permissions provide segmented status tabs (`All (N)`, `Active (N)`, `Inactive (N)`, `Deleted (N)`) with dynamic count badges matching Masters architecture.
  - **Context-Aware Bulk Action Bar**: Multi-select row and card checkboxes with smart bulk actions (`Delete (N)` for operational items; `Restore (N)` and `Purge (N)` when soft-deleted items are selected).
  - **Complete Confirmation Safeguards**: Modal confirmations for single and bulk soft deletion, restoration, and permanent purging with destructive danger styling.

