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
   │ id: BigInteger (PK, autoincrement)                     │
   │ public_id: UUID (Unique, Index, default=uuid7)         │
   │ parent_id: BigInteger (FK -> menus.id, Cascade, Index) │
   │ title: String(100)                                     │
   │ code: String(50, Unique, Indexed)                      │
   │ path: String(255, Nullable)                            │
   │ icon: String(100, Nullable)                            │
   │ sort_order: Integer (Default 0)                        │
   │ is_active: Boolean (Default True)                      │
   │ show_in_header: Boolean (Default True)                 │
   └───────────────┬────────────────────────┬───────────────┘
                   │                        │
       1:N         │                        │ 1:N
                   ▼                        ▼
      ┌─────────────────────────┐   ┌──────────────────────────────┐
      │        MenuRole         │   │        MenuPermission        │
      ├─────────────────────────┤   ├──────────────────────────────┤
      │ menu_id: BigInteger(PK) │   │ menu_id: BigInteger(PK)      │
      │ role_id: UUID(PK, Index)│   │ permission_id: UUID(PK, Index│
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
| `GET` | `/api/v1/menus/{identifier}` | `menu.read` | Details of a specific menu item (dual-lookup: int ID or UUID public_id). |
| `PATCH` | `/api/v1/menus/{identifier}` | `menu.update` | Updates attributes, parent link, and access assignments (dual-lookup). |
| `DELETE` | `/api/v1/menus/{identifier}` | `menu.delete` | Soft-deletes a menu item (`is_deleted=True`, `deleted_at=now(UTC)`, dual-lookup). |
| `POST` | `/api/v1/menus/{identifier}/restore` | `menu.restore` | Restores soft-deleted menu item back to active status (dual-lookup). |
| `PUT` | `/api/v1/menus/{identifier}/roles` | `menu.update` | Replaces assigned roles for a menu item (dual-lookup). |
| `PUT` | `/api/v1/menus/{identifier}/permissions` | `menu.update` | Replaces assigned permissions for a menu item (dual-lookup). |

---

## 🛡️ Business Validations & Integrity

- **Unique Code Constraint**: Menu codes must be unique system identifiers (`^[A-Za-z0-9_-]+$`).
- **Soft Deletion & Lifecycle Management**: Soft-deleted menus (`is_deleted=True`) are excluded from operational views by default (`include_deleted=False`) and grouped into the `Deleted` status tab. Soft deletion sets `is_active=False` and timestamps `deleted_at`.
- **Restoration**: Restoring a menu item clears `is_deleted` and resets `is_active=True`.

---

## 🖥️ Frontend Management Workspace (`/menus`)

The Next.js management dashboard provides a full visual CRUD workspace for RBAC navigation:
- **Interactive Tree View**: Visualizes nested parent/child navigation nodes with real-time active status badges, `In Header: Yes/No` badges, quick `+ Add Child`, `Edit`, and `Delete` triggers.
- **High-Density Table View**: Searchable catalog of all menu items with search by title, code, or path, segmented status filters (`All (N)`, `Active (N)`, `Inactive (N)`, `Deleted (N)`), hierarchy level selector, and a dedicated **Header Nav** column with one-click toggles.
- **Top Header Display Toggle**: In addition to sidebar navigation, administrators can toggle `show_in_header` on any menu item or via Create/Edit modals (`Show in Top Header Navigation bar`), determining which items appear in the dedicated horizontal sub-header navigation.
- **Two-Tier Header Navigation & RBAC Filtering**:
  - The application header uses a two-tier layout:
    - **Top Row**: Full-width global search (`maxWidth: 560px`) and top-right actions (Theme, Notifications, Profile Menu, Pulse Status).
    - **Bottom Sub-Header Row**: Horizontal navigation bar rendered directly underneath the search bar and top row, displaying active menus with icons and nested dropdowns.
  - Sub-header menus are strictly governed by RBAC (`/api/v1/menus/my-menus`) and filtered by `show_in_header !== false`. Visibility can also be toggled globally via System Settings (`enable_top_header_menus`).
  - **Parent-Anchored Dropdown Menus**: Floating submenu popovers are rendered via `createPortal` to `document.body` to bypass stacking context and blur filter clipping. The dropdown's position is strictly anchored directly below the parent menu button (`top: Math.round(rect.bottom + 2)`), aligning horizontally with the parent button's left edge (`rect.left`), or shifting to right-aligned with the parent button (`rect.right - width`) if approaching the viewport boundary. When open, the parent button receives an active highlight with an inverted chevron.
  - **Full Viewport Responsiveness & Sliding Track**: The navigation track supports smooth horizontal sliding via left/right chevron buttons (`<` and `>`), mousewheel scrolling, and native touch swipe (`-webkit-overflow-scrolling: touch`), ensuring full accessibility across desktop, tablet (1024px, 768px), and mobile (640px, 480px, 390px) viewports without truncation. Outside clicks, page scrolling, and window resizing automatically dismiss open dropdowns.
- **Context-Aware Bulk Action Bar**: Checkbox multi-selection for bulk deletion, restoration (`.btn-restore`), and permanent purging (`.btn-danger`).
- **Create & Edit Modals**: Spacious glassmorphism modal layout (`maxWidth: 740px`) with 2-column responsive input grids, real-time code generator preview, SearchableSelect hierarchy picker, icon taxonomy mapping, and header navigation display checkbox.
- **Live Synchronization**: Creating, modifying, or toggling any menu item automatically triggers `refreshMenus()`, synchronizing both the active sidebar and the top header navigation immediately.

---

## 🏛️ Standard Enterprise Menu Hierarchy & Sort Order

The platform standardizes the sidebar hierarchy across database seeds and client fallback trees to guarantee consistent information architecture:

1. **Dashboard** (`path: /`, `sort_order: 1`, Icon: `layout-dashboard`)
2. **Organizations** (`path: /organizations`, `sort_order: 2`, Icon: `building-2`)
3. **Master Data** (`path: /masters`, `sort_order: 3`, Icon: `database`)
   - *Child Submenus (Ordered 1 to 15)*: General Masters (1), Customer Masters (2), Deal Types (3), Pipeline Stages (4), Lead Sources (5), Loss Reasons (6), Contact Roles (7), Activity Types (8), Task Statuses (9), Priority Levels (10), Document Types (11), Billing Frequencies (12), Address Types (13), Countries (14), Currencies (15).
4. **Access Control** (`path: /rbac`, `sort_order: 4`, Icon: `shield-check`)
   - *Child Submenus (Ordered 1 to 4)*: Roles & Groups (1, `/access-control/roles`), Permissions Catalog (2, `/access-control/permissions`), Permission Matrix (3, `/access-control/matrix`), User Directory (4, `/users`).
5. **System Settings** (`path: /settings`, `sort_order: 5`, Icon: `sliders`)
   - *Child Submenus (Ordered 1 to 5)*: Application Configuration (1, `/settings`), System Activity Logs (2, `/system-logs`), Notifications & Alerts (3, `/notifications`), Menu Architecture (4, `/menus`), Operator Profile (5, `/profile`).
