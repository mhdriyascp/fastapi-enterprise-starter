# 01. Architecture — Frontend Dashboard Architecture

## Overview

The CRM platform frontend is an enterprise-grade, responsive dashboard built with **React and Next.js (App Router)** in TypeScript. It is integrated directly within the repository in the [`frontend/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/) directory as a modular monorepo.

---

## High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                     ENTERPRISE DASHBOARD ARCHITECTURE                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Next.js App Router (frontend/)                                        │
│  ├── 🔐 Auth Interceptor & Session Manager (JWT + Silent Refresh)      │
│  ├── 🛡️ Protected Layout Guard (Auth / Role Gates)                     │
│  ├── 🌲 Dynamic RBAC Sidebar (Fetched live from /api/v1/menus/my-menus)│
│  └── 🎨 Enterprise Design System (Tokens, Dark/Light, Micro-animations)│
│                                                                        │
│                          ▲                                             │
│                          │ REST API (Bearer Token)                     │
│                          ▼                                             │
│                                                                        │
│  FastAPI Backend (app/)                                                │
│  ├── /api/v1/auth/login    ➔ Issue Access & Refresh Tokens             │
│  ├── /api/v1/auth/me       ➔ Current User Identity & Details           │
│  ├── /api/v1/menus/my-menus➔ Dynamic Hierarchical Menu Tree for User   │
│  ├── /api/v1/users         ➔ User Management Data                      │
│  └── /api/v1/organizations ➔ Organizations Data                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Organization (`frontend/`)

```
frontend/
├── package.json
├── tsconfig.json
├── next.config.ts
├── public/                 # Static Assets (Logos, Icons)
└── src/
    ├── app/                # Next.js App Router
    │   ├── (auth)/         # Unauthenticated group
    │   │   └── login/      # /login page
    │   ├── (dashboard)/    # Authenticated protected group
    │   │   ├── layout.tsx  # App Shell (Dynamic Sidebar, Top Header)
    │   │   ├── page.tsx    # / (Executive CRM Dashboard: Pipeline, ARR, Receivables)
    │   │   ├── organizations/ # /organizations (Data table)
    │   │   ├── users/      # /users (User management table)
    │   │   ├── menus/      # /menus (RBAC Menu tree viewer)
    │   │   ├── rbac/       # /rbac (Enterprise RBAC Suite: Roles, Permissions, Access Matrix)
    │   │   └── profile/    # /profile (/auth/me editor)
    │   ├── globals.css     # Design Tokens, CSS Variables, Theme
    │   └── layout.tsx      # Root HTML/Font/ThemeProvider
    ├── components/         # Reusable UI Component Library
    │   ├── ui/             # Button, Card, Badge, Modal, Input, Table
    │   ├── navigation/     # Sidebar, Header, Breadcrumbs, MenuTreeItem
    │   └── feedback/       # Toast, SkeletonLoaders, ErrorState
    ├── lib/
    │   ├── api-client.ts   # Axios/Fetch wrapper with JWT 401 refresh interceptor
    │   ├── auth.ts         # Auth state persistence & session helpers
    │   ├── constants.ts    # API base URLs, routes, configuration
    │   └── types.ts        # TypeScript data contracts matching Pydantic
    └── hooks/
        ├── use-auth.ts     # Current user, login, logout hooks
        └── use-menus.ts    # Live dynamic menu tree hook
```

---

## Authentication & Session Lifecycle

1. **User Login (`/api/v1/auth/login`)**:
   - Submits email and password.
   - On success, stores `access_token` and `refresh_token`.
2. **Session Persistence (`/api/v1/auth/me`)**:
   - On initial app boot, retrieves the current user profile.
3. **Transparent Token Refresh (`/api/v1/auth/refresh`)**:
   - When any API request fails with `401 Unauthorized`, the client interceptor pauses requests, calls `/api/v1/auth/refresh`, updates the stored access token, and retries the original request seamlessly.
4. **Route Guarding**:
   - The `(dashboard)` layout validates session state; if unauthenticated, redirects to `/login?returnUrl=...`.

---

## Dynamic Role-Based Menu Architecture

Sidebar navigation items are **never hardcoded in frontend components**. Instead:
1. Upon login, the dashboard layout fetches:
   ```http
   GET /api/v1/menus/my-menus
   ```
2. The backend evaluates the user's roles and permissions, returning only authorized navigation items structured as a hierarchical tree.
3. The Sidebar dynamically renders:
   - **Deterministic Sort Order**: Recursively sorted by `sort_order` (or `order_no`) in ascending sequence at both parent and child levels, with stable alphabetical tie-breaking.
   - Top-level modules with icons and nested sub-menu accordions.
   - Active route highlighting based on `window.location.pathname`.

---

## Role-Based Access Control (RBAC) Suite (`/rbac`)

The dedicated RBAC administration suite provides granular security orchestration across 3 integrated workspaces:
1. **Roles Management**:
   - Table of all tenant and system roles with active indicators and system protection badges (`is_system`).
   - Create Role (`POST /api/v1/roles`) with automatic uppercase code validation.
   - Edit Role (`PATCH /api/v1/roles/{id}`) with name/description/status updates.
   - Delete Role (`DELETE /api/v1/roles/{id}`) with protection safeguards against deleting core system roles.
2. **Permissions Registry**:
   - Categorized by functional resource (`user`, `role`, `organization`, `menu`, etc.).
   - Permission creator (`POST /api/v1/permissions`) with code preview format (`resource.action`).
3. **Role-Permission Access Matrix**:
   - Interactive matrix mapping roles to permissions.
   - Live assignment toggle (`POST /api/v1/roles/{id}/permissions/{perm_id}` / `DELETE /api/v1/roles/{id}/permissions/{perm_id}`) with instant optimistic status badges.

---

## Enterprise Design System & Aesthetics

- **Multi-Mode Theme System (Dark, Light, System)**:
  - Supports three distinct modes: **Light**, **Dark**, and **System**.
  - Implements React 19 `useSyncExternalStore` in [`frontend/src/lib/theme-context.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/lib/theme-context.tsx) for zero-flash, zero-cascading-render theme hydration.
  - Automatically listens to OS color scheme changes (`prefers-color-scheme`) via `matchMedia` when set to `system`.
  - Persists preference in `localStorage.crm_theme` and applies `data-theme` to the root `<html>` element.
  - Interactive theme toggles provided via [`ThemeToggle`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/ui/theme-toggle.tsx) supporting segmented, compact, and dropdown variants (header uses the clean dropdown variant).
- **Curated Color Tokens**: Slate/zinc dark mode and crisp off-white light mode with vibrant accents (indigo/emerald) for active states, KPIs, and badges.
- **Header User Identity Popover**: Interactive user pill with hover and click details popover showing user credentials, status badge, tenant/role metadata, quick navigation shortcuts, and sign out trigger.
- **Glassmorphism & Depth**: Subtle translucent background blurs (`backdrop-filter: blur(16px)`), card hover glows, and hairline borders.
- **Micro-Interactions**: Smooth dropdown animations, non-jarring skeleton loaders, and responsive collapsible sidebar.
- **Header & Responsive Shell Architecture**:
  - **Global Route Search & Auto-Suggestions**:
    - Central search bar in [`frontend/src/components/navigation/header.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/navigation/header.tsx) with instant keyword-based route filtering and auto-suggestions dropdown across system modules (Dashboard, Organizations, Menus, Roles, Permissions, Access Control, Users, Settings).
    - Quick-keyboard access via `⌘K` / `Ctrl+K` global listener and category pill filtering.
  - **Compact Operational Health Indicator**:
    - Reduced from a text-heavy badge to an unobtrusive emerald pulsing indicator dot with rich tooltip info, preserving valuable header real estate.
  - **Interactive Notification Center**:
    - Notification bell with unread badge counter, tabbed popover (All / Unread), "Mark all as read" button, and mock enterprise alerts (Security, Billing, System, Role updates) with action links.
  - **Multi-Device Responsive Sidebar**: On desktop viewports (>= 1024px), renders as a persistent sticky sidebar; on tablets and mobile screens (< 1024px), transforms into an off-canvas drawer with smooth slide-in transition, dark blurred backdrop overlay, mobile hamburger toggle button in the header, and internal close button (`X`).
  - **Automatic Route Navigation Dismissal**: Mobile drawer automatically closes on navigation via state synchronization without cascading re-renders.
  - **Responsive Dashboard Grids**: Fluid utility classes (`.dashboard-grid-2col`, `.receivables-grid`, `.kpi-metrics-grid`, `.dashboard-toolbar-actions`) ensuring optimal rendering across phones (320px-640px), tablets (768px-1024px), and desktop displays without horizontal overflows.
- **Top-Right Toaster Notification System (`ToastProvider`)**:
  - Global notification hub in [`frontend/src/lib/toast-context.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/lib/toast-context.tsx) anchored fixed at the **top-right corner** (`top: 1.25rem; right: 1.25rem; zIndex: 9999`).
  - Provides semantic hooks (`toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`).
  - Automatic countdown dismissal (4000ms configurable) with animated progress bar indicator (`toastProgress`) and slide-in keyframe animation (`toastSlideIn`).
  - Manual dismiss button (`X`), glassmorphism backdrop blur, and accessible polite ARIA live regions.
  - Replaces all ad-hoc inline alert banners across Menus CRUD, RBAC Management, Organizations CRUD, Profile settings, and login flows.
- **Enterprise Organizations CRUD Workspace (`/organizations`)**:
  - Comprehensive client-side search across organization name, code, legal name, and tax ID.
  - Tabbed status filtering (All, Active, Inactive).
  - Modal-based Create and Edit forms with full contact and corporate tax registration fields.
  - One-click active/inactive status toggle and delete confirmation modal with toast notifications.
- **Individual Detail View Modals on Data Tables**:
  - **Organizations Workspace (`/organizations`)**: Dedicated `View` action button (`<Eye size={13} />`) and clickable title on every table row opening a comprehensive read-only modal with grouped General Identifiers, Corporate & Tax Registry, Digital Channels, and Audit Records, plus 1-click UUID copying and seamless transition to edit mode.
  - **Menus Management (`/menus`)**: Dedicated `View` action button in both High-Density Table View and Hierarchical Tree View, providing icon previews, routing information, hierarchy nesting, and quick-action child creation.
  - **RBAC Workspace (`/rbac`)**: Individual `View` inspector for Roles (scope, system protection flag, privileges link) and Permissions (contract details, system identifier, action type, description).
- **Light Theme Toaster Notifications with Prominent Icon Badges**:
  - Soft, high-contrast light tints (`#f0fdf4` success, `#fef2f2` error, `#fffbeb` warning, `#f0f9ff` notice) with deep readable foreground typography (`#14532d`, `#991b1b`, `#92400e`, `#075985`).
  - Dedicated circular 34px icon badges (`<Check />`, `<AlertCircle />`, `<AlertTriangle />`, `<Info />`) with matching tinted backgrounds and subtle borders, providing immediate visual feedback for all system events.
- **Automated System Code Generation (Zero User Prompts)**:
  - Centralized in [`frontend/src/lib/code-generator.ts`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/lib/code-generator.ts).
  - Eliminates manual input and validation of internal system identifiers (`code`) across Organizations, Menus, Roles, and Permissions.
  - Codes are automatically derived in real-time from input names/titles (`ACME_CORP` for organizations, `menu_title` for menus, `role_name` for roles, `resource.action` for permissions) and displayed in non-editable preview pills.
  - Backend services provide fallback auto-generation if omitted from API requests.
- **Universal Enterprise Dropdown & Select Standards (`.select-field`)**:
  - Defined in [`frontend/src/app/globals.css`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/globals.css).
  - Replaces erratic browser default `<select>` rendering across macOS, Safari, and Chrome with cross-browser SVG chevron down arrows, consistent padding (`padding: 0.55rem 2.5rem 0.55rem 0.85rem`), and theme-aware `<option>` backgrounds (`#1e293b` in dark mode, `#ffffff` in light mode).
  - Resolves option text contrast and selection desynchronization in the RBAC Access Matrix role toolbar ("Configuring Privileges for Role:"), Dashboard period selector, and Menu hierarchy selectors.
  - Only the active menu's parent category expands by default, while non-active categories remain collapsed to keep navigation clean and uncluttered. Users can still manually toggle any category open or closed.
  - Whenever an active route or query tab (e.g. `/rbac?tab=roles`, `/rbac?tab=matrix`) is visited, its parent category automatically expands to reveal the selected menu.
  - Exactly one menu item receives the active selection styling (`var(--accent-glow)` and primary border accent), preventing duplicate parent-child or sibling highlights.
  - Parent categories with children do NOT trigger route navigation; clicking anywhere on the parent row toggles the submenu expansion exclusively. Navigation is reserved for child/leaf menu items without children.
- **Select2-Style Searchable Combobox Primitive (`SearchableSelect`)**:
  - Implemented in [`frontend/src/components/ui/searchable-select.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/ui/searchable-select.tsx).
  - High-performance modern React Select2 equivalent providing searchable dropdown functionality without jQuery or external library bloat.
  - Features real-time keyword search across labels, sublabels, and system identifiers, keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`), active item checkmark, and click-outside dismissal.
  - Supports rich option rendering with Lucide icons, system/custom badges, and monospace secondary codes.
  - Deployed in the **RBAC Access Matrix** role selector ("Configuring Privileges for Role:"), **Menu Management** modal (`Parent Category` and `Icon Identifier` selections), and **Dashboard** period filter.





