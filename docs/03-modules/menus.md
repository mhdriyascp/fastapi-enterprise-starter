# 03. Modules — Navigation Menus (`app/modules/menus`)

## Overview

The **Menus** domain module manages hierarchical navigation structures in the CRM platform. Menu visibility is dynamically determined and enforced based on the currently authenticated user's assigned **roles** and **permissions**.

- **Source Code**: [`app/modules/menus/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/menus/)
- **Models**: [`app/modules/menus/models.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/menus/models.py)
- **Schemas**: [`app/modules/menus/schemas.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/menus/schemas.py)
- **Service**: [`app/modules/menus/service.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/menus/service.py)
- **Router**: [`app/modules/menus/router.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/menus/router.py)

---

## 🏛️ Database Entities & Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │                          Menu                          │
   ├────────────────────────────────────────────────────────┤
   │ id: UUID (PK)                                          │
   │ public_id: UUID (Unique)                               │
   │ parent_id: UUID (FK -> menus.id, Cascade, Nullable)    │
   │ title: String(100)                                     │
   │ code: String(50, Unique, Indexed)                      │
   │ path: String(255, Nullable)                            │
   │ icon: String(100, Nullable)                            │
   │ sort_order: Integer (Default 0)                        │
   │ is_active: Boolean (Default True)                      │
   └───────────────┬────────────────────────┬───────────────┘
                   │                        │
       1:N         │                        │ 1:N
                   ▼                        ▼
      ┌─────────────────────────┐   ┌──────────────────────────────┐
      │        MenuRole         │   │        MenuPermission        │
      ├─────────────────────────┤   ├──────────────────────────────┤
      │ id: UUID (PK)           │   │ id: UUID (PK)                │
      │ menu_id: UUID (FK)      │   │ menu_id: UUID (FK)           │
      │ role_id: UUID (FK)      │   │ permission_id: UUID (FK)     │
      └─────────────────────────┘   └──────────────────────────────┘
```

---

## 🔒 Visibility & Access Control Engine

When a client queries `/api/v1/menus/my-menus`, the visibility engine executes the following evaluation:

1. **Super Administrator Bypass**:
   If the authenticated user has the `super_admin` role or a system-level administrative role (`is_system=True`), they receive all active menus (`is_active=True`).
2. **Role & Permission Matching**:
   For regular users, a menu is visible if and only if:
   - It is mapped to at least one of the user's active roles via `menu_roles`, **OR**
   - It is mapped to at least one of the user's active permissions (acquired via their active roles) via `menu_permissions`.
3. **Hierarchical Preservation (Ancestor Inclusion)**:
   If a child menu item is visible to the user, its parent menu items are automatically included in the tree so the user can navigate down to the accessible leaf node.
4. **Ordering**:
   Nodes and their nested children are deterministically sorted by `sort_order` ASC, followed by `title` ASC.

---

## 🔌 API Endpoints (`/api/v1/menus`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/menus/my-menus` | Authenticated User | Returns hierarchical menu tree visible to the current user. |
| `GET` | `/api/v1/menus/tree` | `menu.read` | Returns full hierarchical menu tree for management. |
| `POST` | `/api/v1/menus` | `menu.create` | Creates a new menu item with optional roles and permissions. |
| `GET` | `/api/v1/menus` | `menu.read` | Paginated list of menus (`PagedResponse[MenuResponse]`). |
| `GET` | `/api/v1/menus/{menu_id}` | `menu.read` | Details of a specific menu item. |
| `PATCH` | `/api/v1/menus/{menu_id}` | `menu.update` | Updates attributes, parent link, and access assignments. |
| `DELETE` | `/api/v1/menus/{menu_id}` | `menu.delete` | Deletes a menu item (cascades to children & links). |
| `PUT` | `/api/v1/menus/{menu_id}/roles` | `menu.update` | Replaces assigned roles for a menu item. |
| `PUT` | `/api/v1/menus/{menu_id}/permissions` | `menu.update` | Replaces assigned permissions for a menu item. |

---

## 🛡️ Business Validations & Integrity

- **Unique Code Constraint**: Menu codes must be unique system identifiers (`^[A-Za-z0-9_-]+$`).
- **Hierarchy Cycle Prevention**: A menu cannot be set as its own parent, nor can it be set to any of its descendant nodes. Cycles are detected and rejected with `422 Unprocessable Entity`.
- **Referential Integrity**: Setting a non-existent parent menu returns `404 Not Found`.
- **Soft Deactivation**: Inactive menus (`is_active=False`) are suppressed from user navigation while remaining editable by administrators.
