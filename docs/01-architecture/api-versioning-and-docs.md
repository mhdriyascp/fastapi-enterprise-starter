# 01. Architecture — API Versioning & Dual Documentation

## Overview

The CRM platform is engineered to support seamless API evolution without disrupting existing API consumers. The system exposes multiple API namespaces alongside dedicated, interactive **Scalar** documentation interfaces.

---

## Route Namespaces

| Version | Prefix | Router Path | Purpose |
|---|---|---|---|
| **API v1** | `/api/v1` | `app/api/v1/router.py` | Stable production APIs for authentication, RBAC, master registries, and organizations. |
| **API v2** | `/api/v2` | `app/api/v2/router.py` | Next-generation API endpoints, enriched payloads, and future business workflows. |

---

## Dual Interactive Documentation Architecture

FastAPI projects typically provide a single `/docs` endpoint containing an overwhelming mixture of old, new, and administrative endpoints. This platform separates concerns into two distinct portals:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Engine (app/main.py)                    │
├───────────────────────────────────┬────────────────────────────────────┤
│  1. Global Documentation Portal   │  2. Dedicated v2 Documentation     │
│  - Endpoint: /scalar              │  - Endpoint: /scalar/v2            │
│  - OpenAPI URL: /openapi.json     │  - OpenAPI URL: /api/v2/openapi.json│
│  - Contents:                      │  - Contents:                       │
│    * All /api/v1/* endpoints      │    * Only /api/v2/* endpoints      │
│    * All /api/v2/* endpoints      │    * Shared "Authentication" APIs  │
│    * All Master catalogs          │    * Shared "RBAC - *" APIs        │
│    * All Admin & Public routes    │    * Excludes legacy v1 routes     │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## Dynamic OpenAPI Schema Filtering

The dedicated v2 documentation is powered by dynamic OpenAPI derivation inside `app/main.py`:

```python
def get_v2_openapi_schema() -> dict[str, Any]:
    cached = getattr(app.state, "v2_openapi_schema", None)
    if cached:
        return cached

    full_schema = app.openapi()
    v2_paths = {}

    for path, path_item in full_schema.get("paths", {}).items():
        is_v2 = path.startswith("/api/v2")
        has_shared_tag = any(
            tag == "Authentication" or tag.startswith("RBAC")
            for op in path_item.values() if isinstance(op, dict)
            for tag in op.get("tags", [])
        )
        if is_v2 or has_shared_tag:
            v2_paths[path] = path_item

    schema = {
        "openapi": full_schema.get("openapi", "3.1.0"),
        "info": {"title": f"{settings.app_name} - API v2", "version": "2.0.0"},
        "paths": v2_paths,
        "components": full_schema.get("components", {}),
    }
    app.state.v2_openapi_schema = schema
    return schema
```

### Benefits
1. **Zero Route Duplication**: Shared authentication and authorization endpoints are written once and automatically presented to both v1 and v2 consumers.
2. **High Performance**: The generated schema is computed and cached in `app.state.v2_openapi_schema` on first access.
3. **Clean Client Experience**: External partners integrating with v2 see an uncluttered, modern documentation interface.
