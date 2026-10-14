# 01. Architecture — API Versioning & Isolated Documentation

## Overview

The CRM platform is engineered to support seamless API evolution without disrupting existing API consumers. The system exposes multiple API namespaces alongside completely **isolated, interactive Scalar documentation portals** for each API version.

---

## Route Namespaces

| Version | Prefix | Router Path | Purpose |
|---|---|---|---|
| **API v1** | `/api/v1` | `app/api/v1/router.py` | Stable production APIs for authentication, RBAC, users, navigation menus, master registries, and organizations. |
| **API v2** | `/api/v2` | `app/api/v2/router.py` | Next-generation API endpoints, enriched payloads, and future business workflows. |

---

## Isolated Interactive Documentation Architecture

To prevent cross-version pollution (e.g., v2 health endpoints or experimental v2 routes leaking into the v1 documentation), the platform strictly isolates OpenAPI schemas and Scalar documentation portals:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Engine (app/main.py)                    │
├───────────────────────────────────┬────────────────────────────────────┤
│  1. Dedicated v1 Documentation    │  2. Dedicated v2 Documentation     │
│  - Primary URL: /scalar/v1        │  - Primary URL: /scalar/v2         │
│  - Default Redirect: /scalar      │  - OpenAPI URL: /api/v2/openapi.json│
│  - OpenAPI URL: /api/v1/openapi.json│ - Contents:                      │
│  - Contents:                      │    * All /api/v2/* endpoints       │
│    * Strictly only /api/v1/*      │    * Shared "Authentication" APIs  │
│    * Users, Menus, Auth, RBAC     │    * Shared "RBAC - *" APIs        │
│    * Master catalogs & Orgs       │    * Shared "Users" APIs           │
│    * Zero v2 endpoints            │    * Shared "Menus" APIs           │
│                                   │    * Excludes domain-specific v1   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## Dynamic OpenAPI Schema Filtering

The isolated documentation portals are powered by dynamic OpenAPI derivation inside `app/main.py`:

### 1. API v1 Schema Generation (`get_v1_openapi_schema`)
- Filters `app.openapi()` to include **only** routes whose paths start with `/api/v1`.
- Excludes `/api/v2/*` completely, ensuring no v2 endpoints appear in v1 documentation.
- Cached in `app.state.v1_openapi_schema`.

### 2. API v2 Schema Generation (`get_v2_openapi_schema`)
- Includes all routes whose paths start with `/api/v2`.
- Includes all foundational/general endpoints matching shared tags:
  - `Authentication`
  - `Users`
  - `Menus`
  - `RBAC - Roles`, `RBAC - Permissions`, `RBAC - Role Permissions`
  - `Admin`, `Mobile`, `Public`
- Excludes domain-specific v1 routes (such as Organizations and Master Data).
- Cached in `app.state.v2_openapi_schema`.

---

## Documentation URLs

| Documentation Portal | Endpoint | Schema Source | Description |
|---|---|---|---|
| **API v1 Scalar UI** | `/scalar/v1` | `/api/v1/openapi.json` | Isolated documentation for all production v1 endpoints. |
| **API v2 Scalar UI** | `/scalar/v2` | `/api/v2/openapi.json` | Dedicated documentation for v2 with shared General APIs. |
| **Default Scalar URL** | `/scalar` | Redirects (`307`) to `/scalar/v1` | Ensures browsing to `/scalar` displays strictly v1 APIs. |

---

## Benefits

1. **Version Isolation**: Clear separation between API versions avoids client confusion and eliminates cross-version schema bleeding.
2. **Zero Route Duplication**: Foundational services (Auth, RBAC, Users, Menus) are implemented once and automatically exposed across both versions.
3. **High Performance**: Derived schemas are dynamically created once and cached in memory for sub-millisecond response times.
