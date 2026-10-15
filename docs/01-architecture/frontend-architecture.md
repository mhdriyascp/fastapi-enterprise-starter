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
├── public/                 # Static Assets (Logos, Icons, Favicon)
└── src/
    ├── config/
    │   └── site.ts         # Central enterprise SEO, metadata tokens & environment URLs
    ├── app/                # Next.js App Router (Turbopack)
    │   ├── layout.tsx      # Root HTML/Font/ThemeProvider + OpenGraph & Schema.org JSON-LD
    │   ├── loading.tsx     # Instant route transition skeleton loader
    │   ├── not-found.tsx   # Branded, accessible enterprise HTTP 404 page
    │   ├── error.tsx       # Segment error boundary with retry triggers & digest reporting
    │   ├── global-error.tsx# Isolated root layout crash boundary
    │   ├── sitemap.ts      # Automated XML sitemap generator with canonical URLs
    │   ├── robots.ts       # Crawler compliance with endpoint security restrictions
    │   ├── manifest.ts     # PWA Web Application Manifest generator
    │   ├── globals.css     # Design Tokens, CSS Variables, Theme, Select Standards
    │   ├── login/
    │   │   ├── layout.tsx  # Dedicated SEO metadata for authentication portal
    │   │   └── page.tsx    # Secure multi-factor sign in workspace
    │   └── (dashboard)/    # Authenticated protected group (Server Layout + SEO)
    │       ├── layout.tsx  # Server Layout with metadata & interactive DashboardShell wrapper
    │       ├── page.tsx    # / (Executive CRM Dashboard: Pipeline, ARR, Receivables)
    │       ├── organizations/
    │       │   ├── layout.tsx # Dedicated metadata: Organizations & Multi-Tenant Registry
    │       │   └── page.tsx   # Complete CRUD data table & modal workspace
    │       ├── users/
    │       │   ├── layout.tsx # Dedicated metadata: Identity & User Management
    │       │   └── page.tsx   # User directory and profile administration
    │       ├── menus/
    │       │   ├── layout.tsx # Dedicated metadata: Navigation & Dynamic Menus
    │       │   └── page.tsx   # RBAC menu hierarchy tree & table manager
    │       ├── rbac/
    │       │   ├── layout.tsx # Dedicated metadata: RBAC & Access Control Matrix
    │       │   └── page.tsx   # Roles, Permissions & Access Matrix Suite
    │       └── profile/
    │           ├── layout.tsx # Dedicated metadata: Operator Profile & Security
    │           └── page.tsx   # Operator profile, credentials & theme preferences
    ├── components/         # Reusable Atomic UI Component Library
    │   ├── ui/             # Button, Card, Badge, Modal, Input, Table, SearchableSelect
    │   ├── navigation/     # Sidebar, Header, Breadcrumbs, DashboardShell
    │   └── seo/            # JsonLd Schema.org structured data component
    ├── lib/
    │   ├── api-client.ts   # Fetch wrapper with auto-JWT & 401 refresh interceptor
    │   ├── auth-context.tsx# Enterprise auth state machine & session initializer
    │   ├── theme-context.tsx# Dark/Light/System theme engine with local storage sync
    │   ├── toast-context.tsx# High-contrast light tint toast notification engine
    │   ├── code-generator.ts# Automated system identifier derivation algorithms
    │   └── types.ts        # TypeScript data contracts strictly mirroring backend Pydantic
    └── hooks/
        ├── use-auth.ts     # Current authenticated operator session hook
        └── use-menus.ts    # Dynamic RBAC menu tree consumer hook
```

---

## Enterprise SEO & Metadata Architecture

The application adopts a **Server Component Metadata Cascade** paired with client interactivity:

1. **Centralized Configuration ([`frontend/src/config/site.ts`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/config/site.ts))**:
   - Single source of truth for base URLs, default titles, OpenGraph imagery, and author credentials.
2. **Dynamic Route Metadata Cascade**:
   - Every route segment defines an independent Server Component `layout.tsx` exporting a typed `Metadata` object.
   - Generates unique browser title templates (`%s | Enterprise CRM`), canonical URLs, OpenGraph social cards, and route descriptions.
3. **Automated Search Engine Compliance**:
   - **XML Sitemap ([`frontend/src/app/sitemap.ts`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/sitemap.ts))**: Exposes canonical URLs, crawl priorities, and update frequencies.
   - **Robots Policy ([`frontend/src/app/robots.ts`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/robots.ts))**: Disallows crawlers from private API and settings endpoints while allowing public indexation.
   - **PWA Manifest ([`frontend/src/app/manifest.ts`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/manifest.ts))**: Generates `/manifest.webmanifest` for desktop installability and theme color mapping.
   - **Schema.org JSON-LD ([`frontend/src/components/seo/json-ld.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/seo/json-ld.tsx))**: Injects `WebApplication` metadata into `<head>` for rich snippet compliance.
4. **Resilience & Fault Isolation**:
   - **[`app/not-found.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/not-found.tsx)**: Semantic 404 page with recovery navigation.
   - **[`app/error.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/error.tsx)**: Segment runtime error boundary with digest tracking and retry handlers.
   - **[`app/global-error.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/global-error.tsx)**: Root layout boundary with self-contained fallback.
   - **[`app/loading.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/loading.tsx)**: Route streaming transition skeleton.
5. **Heading Hierarchy Standards**:
   - Strict rule of a single `<h1>` per page (welcome header, workspace titles) followed by logical `<h2>` and `<h3>` section cards.

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
  - **Compact Operational Health Indicator & Glassmorphic Hover Tooltip**:
    - Emerald pulsing indicator dot in the top-right header with an enterprise hover tooltip displaying live system status: "Online & Operational", 99.98% rolling SLA uptime, service latency metrics (Core API Gateway 24ms, PostgreSQL Cluster connected, RBAC policy synced), and accessible ARIA attributes.
  - **Dynamic Notification Center & Activity Stream**:
    - Notification bell with dynamic unread badge counter in [`frontend/src/components/navigation/header.tsx`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/components/navigation/header.tsx).
    - Directly integrated with the backend API (`/api/v1/notifications`): fetches real-time activity stream on mount/login, executes non-blocking 30-second polling for unread counters, and features tabbed filtering (All / Unread).
    - Full interactive controls: "Mark all as read" (`POST /api/v1/notifications/mark-all-read`), toggle individual read/unread status (`PATCH /api/v1/notifications/{id}/read`), deep-link navigation for actionable items, and individual / batch dismissal (`DELETE /api/v1/notifications/{id}`, `DELETE /api/v1/notifications/clear-all`).
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
- **Individual Detail View Modals Across All Workspaces**:
  - **User Administration (`/users`)**: Dedicated `View` action button (`<Eye size={13} />`) and clickable profile row opening an enterprise Detail Inspector Modal with grouped Profile & Account details, Identity & System Identifiers (1-click UUID copy), Verified Email, and Audit Trail & Timestamps.
  - **Organizations Workspace (`/organizations`)**: Dedicated `View` action button (`<Eye size={13} />`) and clickable title on every table row opening a comprehensive read-only modal with grouped General Identifiers, Corporate & Tax Registry, Digital Channels, and Audit Records, plus 1-click UUID copying and seamless transition to edit mode.
  - **Menus Management (`/menus`)**: Dedicated `View` action button in both High-Density Table View and Hierarchical Tree View, providing icon previews, routing information, hierarchy nesting, and quick-action child creation.
  - **RBAC Workspace (`/rbac`)**: Individual `View` inspector for Roles (scope, system protection flag, privileges link) and Permissions (contract details, system identifier, action type, description).
- **Light Theme Toaster Notifications with Prominent Icon Badges**:
  - Soft, high-contrast light tints (`#f0fdf4` success, `#fef2f2` error, `#fffbeb` warning, `#f0f9ff` notice) with deep readable foreground typography (`#14532d`, `#991b1b`, `#92400e`, `#075985`).
  - Dedicated circular 34px icon badges (`<Check />`, `<AlertCircle />`, `<AlertTriangle />`, `<Info />`) with matching tinted backgrounds and subtle borders, providing immediate visual feedback for all system events.
- **API-Level System Code Generation & Non-Editable UI**:
  - **API-Level Generation**: Handled automatically on the backend API for all entities (Organizations, Menus, Roles, Permissions). Employs deterministic derivation with collision-avoidance loops (`_1`, `_2`) so creation never fails with duplicate key constraint violations.
  - **Non-Editable Frontend Standard**: Forms across all modules never prompt the user to input system codes. Codes are displayed strictly in non-editable, dashed read-only preview pills labeled `(Auto-generated by API • Read-Only)`, eliminating user confusion and manual input burdens.
- **Universal Z-Index Layering Hierarchy Standard**:
  - Eliminates stacking context bugs and dropdown clipping across header menus, in-modal comboboxes, and sticky table toolbars by establishing strict z-index tiers in [`frontend/src/app/globals.css`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/globals.css):
    - **In-Page Content & Sticky Toolbars**: `z-index: 1 - 50`
    - **Desktop Sidebar (`.sidebar`)**: `z-index: 900`
    - **Top Header (`.top-header`)**: `z-index: 1000` (prevents in-page sticky toolbars at z-index 40/45 from occluding header popovers)
    - **Header Popovers & Suggestions**: `z-index: 1050` (search autocomplete, theme menu, notifications popover, user identity card)
    - **Mobile Sidebar Drawer & Backdrop**: `z-index: 1450 - 1500`
    - **Modal Backdrops & Dialogs (`.modal-backdrop`, `.modal-dialog`)**: `z-index: 2000 - 2010` (replaces all legacy inline `zIndex: 100` overlays)
    - **In-Modal Searchable Comboboxes (`.modal-backdrop .searchable-select-popover`)**: `z-index: 2150 - 2200 !important` (ensures dropdown options always float above modal dialog bodies)
    - **Global Toaster Notifications (`ToastProvider`)**: `z-index: 9999`
- **Production-Grade Formatted Detail Modals (`.detail-spec-table`)**:
  - Replaces unstructured plain text cards and loose grids across all entity view modals with standardized two-column key-value specification tables defined in [`frontend/src/app/globals.css`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/frontend/src/app/globals.css).
  - Deployed uniformly across:
    - **Organizations (`/organizations`)**: General & Operational Identifiers, Corporate & Tax Registry, Contact & Digital Channels, Audit Trail & Timestamps.
    - **Users (`/users`)**: Profile Identity, System Identifiers & Role Access, Verified Communications, Audit Trail.
    - **Menus (`/menus`)**: Navigation Route & Hierarchy, System Identifiers & Access State (1-click UUID copy).
    - **RBAC Roles (`/rbac?tab=roles`)**: Role Specifications & Scope, Security & Identifier Audit.
    - **RBAC Permissions (`/rbac?tab=permissions`)**: Permission Specification Contract, System Identifiers & Audit.
    - **Notifications (`/notifications`)**: Event Specification, Content Payload & Message, Audit Identifiers & Deep-Link Action.
- **Dedicated Notifications Center & Read-Only Audit Page (`/notifications`)**:
  - Accessible via System Settings navigation menu and direct header bell link.
  - Implements executive KPI summary statistics cards (Total Alerts, Unread Notices, Security Advisories, Commercial Updates).
  - High-performance search and filter bar (keyword search, event taxonomy filter, unread/read filter).
  - Read-only viewing modal powered by `.detail-spec-table` without manual data mutation burdens.
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





