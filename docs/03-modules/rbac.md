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
| `DELETE`| `/api/v1/roles/{identifier}` | `role.delete` | None (`204`) | Delete role (dual-lookup; system roles cannot be deleted). |

### 2. Permissions Catalog (`/api/v1/permissions`)
| Method | Endpoint | Required Permission | Response Model | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/permissions` | `permission.create` | `PermissionResponse` | Register a new custom permission. |
| `GET` | `/api/v1/permissions` | `permission.read` | `PagedResponse[PermissionResponse]` | Standardized paginated list of all registered system and custom permissions. |
| `GET` | `/api/v1/permissions/{identifier}` | `permission.read` | `PermissionResponse` | Get permission details (dual-lookup: UUID or unique code). |
| `PATCH`| `/api/v1/permissions/{identifier}` | `permission.update` | `PermissionResponse` | Update permission name, description, and active status (dual-lookup). |
| `DELETE`| `/api/v1/permissions/{identifier}`| `permission.delete` | None (`204`) | Delete custom permission (dual-lookup; system permissions are protected). |

### 3. Role-Permission Mappings (`/api/v1/roles/{identifier}/permissions`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/roles/{identifier}/permissions` | `role.assign_permission` | Assign permission to a role. |
| `DELETE`| `/api/v1/roles/{identifier}/permissions/{permission_id}` | `role.revoke_permission` | Revoke permission from a role. |

---

## Role Governance & Hierarchical Permission Flow

- **`super_admin` (Root Governance Role)**:
  - Universal root access across all modules (`*.*`).
  - Protected from permission modification or deletion in both backend services and frontend matrix.
  - Automatically satisfies all permission dependencies via `require_permission`.
  - **Exclusive Permissions**: Root-governance permissions (`role.delete`, `permission.create`, `permission.update`, `permission.delete`) are strictly reserved for `super_admin` and cannot be assigned to any other role (enforced via `SystemRoleError` in backend and disabled matrix controls in frontend).
- **`admin` (System Administrator Role)**:
  - Granted broad operational and administrative permissions across all standard modules:
    - Users: `user.read`, `user.create`, `user.update`, `user.delete`
    - Organizations: `organization.read`, `organization.create`, `organization.update`, `organization.delete`
    - Master Data: `masters:read`, `masters:create`, `masters:update`, `masters:delete`
    - Menus: `menu.read`, `menu.create`, `menu.update`, `menu.delete`
    - Notifications: `notification.read`, `notification.create`, `notification.update`, `notification.delete`
    - Roles & Permissions: `role.read`, `role.create`, `role.update`, `permission.read`
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
| | `user.delete` | Delete user records |
| **Organizations** | `organization.read` | View organizations |
| | `organization.create` | Create organizations |
| | `organization.update` | Edit organization details |
| | `organization.delete` | Delete organizations |
| **Master Data** | `masters:read` | View master records |
| | `masters:create` | Create master records |
| | `masters:update` | Update master records |
| | `masters:delete` | Delete master records |
| **Menus** | `menu.read` | View navigation menus |
| | `menu.create` | Create navigation menu items |
| | `menu.update` | Update navigation menu items |
| | `menu.delete` | Delete navigation menu items |
| **Notifications** | `notification.read` | View notifications |
| | `notification.create` | Create system notifications |
| | `notification.update` | Update notification states |
| | `notification.delete` | Delete notifications |
| **RBAC Roles** | `role.read` | View RBAC roles |
| | `role.create` | Create roles |
| | `role.update` | Update role details |
| | `role.delete` | Delete custom roles |
| | `role.assign_permission` | Assign permission to role |
| | `role.revoke_permission` | Revoke permission from role |
| **RBAC Permissions** | `permission.read` | View permissions catalog |
| | `permission.create` | Create permissions |
| | `permission.update` | Edit permissions |
| | `permission.delete` | Delete permissions |

---

## Frontend Dashboard Integration

- **Route**: [`frontend/src/app/(dashboard)/rbac/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/%28dashboard%29/rbac/page.tsx) (`/rbac`)
- **Capabilities**:
  - Full CRUD operations on custom and system roles with deletion guards.
  - Resource-grouped system permissions catalog.
  - Interactive role-permission matrix with real-time assignment/revocation toggles.
  - Protected root governance indicator for `super_admin` role.

