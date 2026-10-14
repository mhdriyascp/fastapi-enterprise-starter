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
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/roles` | `role.create` | Create a new business role. |
| `GET` | `/api/v1/roles` | `role.read` | Paginated listing of roles. |
| `GET` | `/api/v1/roles/{role_id}` | `role.read` | Fetch role by UUID. |
| `PUT` | `/api/v1/roles/{role_id}` | `role.update` | Update role name or description. |
| `DELETE`| `/api/v1/roles/{role_id}` | `role.delete` | Delete role (system roles cannot be deleted). |

### 2. Permissions Catalog (`/api/v1/permissions`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/permissions` | `permission.create` | Register a new custom permission. |
| `GET` | `/api/v1/permissions` | `permission.read` | List all registered system and custom permissions. |
| `GET` | `/api/v1/permissions/{id}` | `permission.read` | Get permission details. |
| `PATCH`| `/api/v1/permissions/{id}` | `permission.update` | Update permission name, description, and active status. |
| `DELETE`| `/api/v1/permissions/{id}`| `permission.delete` | Delete custom permission (system permissions are protected). |

### 3. Role-Permission Mappings (`/api/v1/roles/{role_id}/permissions`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/roles/{role_id}/permissions` | `role.assign_permission` | Assign permission to a role. |
| `DELETE`| `/api/v1/roles/{role_id}/permissions/{permission_id}` | `role.revoke_permission` | Revoke permission from a role. |

---

## System vs Custom Roles

- **`is_system = True`**: Hardcoded core roles (e.g., `SUPER_ADMIN`, `ADMIN`). Protected from deletion to prevent administrative lockout.
- **`is_system = False`**: Tenant-defined custom roles (e.g., `REGIONAL_SALES_MANAGER`, `INVENTORY_AUDITOR`).

---

## Frontend Dashboard Integration

- **Route**: [`frontend/src/app/(dashboard)/rbac/page.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/%28dashboard%29/rbac/page.tsx) (`/rbac`)
- **Capabilities**:
  - Full CRUD operations on custom and system roles with deletion guards.
  - Resource-grouped system permissions catalog.
  - Interactive role-permission matrix with real-time assignment/revocation toggles.

