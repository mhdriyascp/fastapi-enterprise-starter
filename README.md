# Enterprise CRM Platform — Backend Foundation

> **A modular, production-ready enterprise backend built with FastAPI, SQLAlchemy 2.0 (Async), PostgreSQL, Pydantic v2, and UV.**  
> Designed for scalable SaaS, CRM, and ERP applications with centralized Role-Based Access Control (RBAC), multi-version API architecture, and strict AI-assisted development standards.

> 📖 **Comprehensive Modular Documentation**:  
> For in-depth architectural guides, domain specifications, and operational runbooks, visit the [Documentation Hub](docs/README.md).

---

## 📑 Table of Contents

- [Overview & Architecture](#overview--architecture)
- [AI & Team Engineering Standards](#ai--team-engineering-standards)
- [Complete Project Structure](#complete-project-structure)
- [Module Implementations & Capabilities](#module-implementations--capabilities)
  - [1. Identity & Authentication](#1-identity--authentication)
  - [2. User Management](#2-user-management)
  - [3. Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
  - [4. Organizations Domain](#4-organizations-domain)
  - [5. Master Data Registry](#5-master-data-registry)
  - [6. Shared Foundation Utilities](#6-shared-foundation-utilities)
  - [7. Database Infrastructure & Models](#7-database-infrastructure--models)
  - [8. Seed Data Engine](#8-seed-data-engine)
- [API Versioning & Dual Documentation](#api-versioning--dual-documentation)
- [Local Development Setup](#local-development-setup)
- [Docker & Containerized Setup](#docker--containerized-setup)
- [Database Migrations (Alembic)](#database-migrations-alembic)
- [Testing & Quality Verification](#testing--quality-verification)
- [Common Command Reference](#common-command-reference)

---

## Overview & Architecture

The application adopts a **strict, decoupled layered architecture** where concerns are segregated across routing, orchestration, database persistence, and contract validation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Applications                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP (REST)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Application (app/main.py)                    │
│      ├── /api/v1 (Primary Business APIs, Auth, RBAC, Masters)           │
│      ├── /api/v2 (Next-Gen APIs, Extended Payloads)                    │
│      ├── /scalar (Global API Documentation)                             │
│      └── /scalar/v2 (Dedicated v2 + Auth/RBAC Documentation)            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              ▼                                             ▼
   FastAPI Route Handlers                        FastAPI Dependencies
   (app/modules/<domain>/router.py)              (app/api/dependencies/)
              │                                  ├── get_current_user
              │                                  ├── require_permission(...)
              │                                  ├── get_pagination
              │                                  └── get_db_session
              ▼                                             │
   Business Services (service.py) ◄─────────────────────────┘
   ├── Domain business rules
   ├── Explicit async transactions (commit / rollback)
   └── Entity eager loading (selectinload / joinedload)
              │
              ├──► Request/Response Serialization: Pydantic v2 (schemas.py)
              │
              ▼
   SQLAlchemy 2.0 Async ORM (app/infrastructure/database/models/)
              │
              ▼
   PostgreSQL 17+ (via asyncpg driver)
```

---

## AI & Team Engineering Standards

> **MANDATORY**: Before generating or refactoring any code in this repository, all human engineers and AI coding agents (Antigravity, Cursor, Copilot, Claude Code) **must** comply with the guidelines defined in [`AGENTS.md`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/AGENTS.md) and [`.cursor/rules/crm-coding-standards.mdc`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/.cursor/rules/crm-coding-standards.mdc).

### The 9 Pillars of Code Generation

1. **Architecturally Consistent**: Layered structure: `Router` → `Service` → `Model` → `Schema`. Never execute raw SQL queries inside route functions.
2. **Human-Readable**: Explicit Python type hints on **all** parameters and returns. Descriptive naming (`fetch_active_organizations_by_tenant`, not `get_orgs`).
3. **Reusable**: Reuse [`app.shared.response.PagedResponse[T]`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/response.py) and [`app.shared.pagination.get_pagination`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/pagination.py).
4. **Well-Documented**: FastAPI OpenAPI metadata (`summary`, `description`, `tags`, `response_model`, `status_code`) and Google-style docstrings. **Mandatory**: Update `docs/` whenever introducing or modifying features.
5. **Reliable**: Custom domain exceptions mapped to HTTP codes. Transactional commit and rollback on failure. Automated `pytest-asyncio` coverage.
6. **Secure**: RBAC enforcement via `require_permission()`. Zero hardcoded secrets (use `app.core.config.settings`). Pydantic `Field()` validation.
7. **Maintainable**: Single responsibility per module. Entity models live in `app/infrastructure/database/models/`.
8. **Traceable**: Structured logging with Python's standard `logging` (never `print()`). Conventional commits.
9. **Controlled**: Human-in-the-loop review. AI is forbidden from running autonomous database drops or migrations without review.

### Pre-Flight Checklist Before Submitting Code ("Definition of Done")
```bash
uv run ruff check app tests
uv run ruff format --check app tests
uv run pytest
```

---

## Complete Project Structure

```
crm-platform/
│
├── AGENTS.md                                # Authoritative AI coding standards contract
├── .cursorrules                             # Cursor AI rules pointer
├── .cursor/
│   └── rules/
│       └── crm-coding-standards.mdc         # Modern Cursor YAML-frontmatter rule
├── .github/
│   └── copilot-instructions.md              # GitHub Copilot instructions
├── .dockerignore                            # Docker build exclusions
├── .gitignore                               # Git ignore specification
├── pyproject.toml                           # Python project metadata, deps & pytest config
├── uv.lock                                  # Locked reproducible dependencies
├── alembic.ini                              # Alembic migration configuration
├── Dockerfile                               # Multi-stage production container image
├── compose.yaml                             # Docker Compose multi-service orchestrator
├── README.md                                # Root documentation
│
├── alembic/                                 # Database migration history
│   ├── env.py                               # Alembic runtime environment
│   ├── script.py.mako                       # Migration template
│   └── versions/                            # Migration script revisions
│
├── app/
│   ├── __init__.py
│   ├── main.py                              # FastAPI app entry point & dual doc portals
│   │
│   ├── api/                                 # HTTP Routing & Dependencies Layer
│   │   ├── dependencies/
│   │   │   ├── auth.py                      # get_current_user JWT dependency
│   │   │   └── permissions.py               # require_permission() RBAC dependency
│   │   │
│   │   ├── v1/
│   │   │   ├── router.py                    # Root v1 router assembling domains & health
│   │   │   ├── admin/router.py              # Administrative sub-routes
│   │   │   ├── auth/router.py               # Authentication API endpoints
│   │   │   ├── mobile/router.py             # Mobile client endpoints
│   │   │   └── public/router.py             # Publicly exposed endpoints
│   │   │
│   │   └── v2/
│   │       ├── __init__.py
│   │       └── router.py                    # API v2 routes & extended endpoints
│   │
│   ├── core/                                # Core Engine & Lifecycle
│   │   ├── config.py                        # Pydantic Settings (.env configuration)
│   │   ├── lifecycle.py                     # Async lifespan (startup/shutdown)
│   │   ├── security.py                      # JWT encode/decode & password hashing
│   │   └── timezone.py                      # UTC datetime & timezone helpers
│   │
│   ├── infrastructure/
│   │   └── database/                        # Persistence Layer
│   │       ├── base.py                      # Metadata registry imports
│   │       ├── session.py                   # AsyncSession factory & get_db_session
│   │       └── models/                      # Declarative SQLAlchemy 2.0 Models
│   │           ├── base_entity.py           # BaseEntity (id, created_at, updated_at)
│   │           ├── general_master/          # 11 Master reference table entities
│   │           ├── identity/                # AuthSession entity
│   │           ├── organization/            # Organization entity
│   │           ├── rbac/                    # Role, Permission, RolePermission, UserRole
│   │           └── user/                    # User entity
│   │
│   ├── modules/                             # Domain Modules (Logic & Contracts)
│   │   ├── identity/                        # Identity exceptions & session management
│   │   ├── masters/                         # Master data schemas & generic router factory
│   │   ├── organizations/                   # Organization service, schemas & router
│   │   ├── rbac/                            # Roles & Permissions services & routers
│   │   └── users/                           # User models, schemas & services
│   │
│   ├── seeds/                               # Idempotent Database Seed Engine
│   │   ├── __main__.py                      # Seed CLI runner entry point
│   │   ├── registry.py                      # Ordered seed execution registry
│   │   ├── runner.py                        # Database seeder execution logic
│   │   ├── helpers.py                       # Upsert helpers & transaction utilities
│   │   ├── masters/                         # Seed data for countries, currencies, etc.
│   │   └── rbac/                            # Seed data for system roles & permissions
│   │
│   └── shared/                              # Cross-Domain Reusable Components
│       ├── pagination.py                    # PaginationParams & get_pagination dependency
│       └── response.py                      # PagedResponse[T] generic response envelope
│
├── docs/                                    # Modular Technical & Business Documentation
│   ├── README.md                            # Central documentation hub
│   ├── 00-overview/                         # Business context & tech stack
│   ├── 01-architecture/                     # Layered design, project structure & RBAC
│   ├── 02-setup/                            # Local setup, Docker, config & CLI cheatsheet
│   ├── 03-modules/                          # Detailed domain implementation guides
│   ├── 04-database/                         # Alembic migrations & seed data engine
│   └── 05-ai-and-standards/                 # AI 9 pillars & testing quality gates
│
└── tests/                                   # Automated Test Suite (pytest)
    ├── api/
    │   └── test_openapi_v2.py               # Tests for OpenAPI & Scalar v2 filtering
    ├── test_security.py                     # Password hashing & JWT token tests
    └── test_timezone.py                     # Timezone utility tests
```

---

## Module Implementations & Capabilities

### 1. Identity & Authentication
- **Location**: [`app/modules/identity/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/identity/) & [`app/api/v1/auth/router.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/api/v1/auth/router.py)
- **Key Models**: `AuthSession` tracks active refresh tokens, client user-agents, IP addresses, and revocation states.
- **Implemented Endpoints**:
  - `POST /api/v1/auth/register`: User self-registration with password complexity validation.
  - `POST /api/v1/auth/login`: Issue short-lived access JWT and cryptographically hashed refresh token.
  - `POST /api/v1/auth/refresh`: Refresh access token and rotate refresh tokens safely.
  - `GET /api/v1/auth/me`: Fetch authenticated user profile and assigned roles.
  - `POST /api/v1/auth/logout`: Revoke the current active session.
  - `POST /api/v1/auth/logout-all`: Invalidate all active sessions for the current user.
  - `POST /api/v1/auth/change-password`: Verified password change with session invalidation.

### 2. User Management
- **Location**: [`app/modules/users/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/users/)
- **Key Models**: `User` entity featuring UUID primary key, normalized email, hashed password, account status flags (`is_active`, `is_verified`, `is_superuser`), and timezone preferences.
- **Capabilities**: Password hashing via Argon2/Bcrypt, user profile serialization, and tenant isolation.

### 3. Role-Based Access Control (RBAC)
- **Location**: [`app/modules/rbac/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/rbac/)
- **Data Model**:
  ```
  User ──< UserRole >── Role ──< RolePermission >── Permission
  ```
- **Permission Dependency**:
  ```python
  from app.api.dependencies.permissions import require_permission


  @router.post("/roles")
  async def create_role(
      data: RoleCreate,
      current_user: Annotated[User, Depends(require_permission("role.create"))],
  ): ...
  ```
- **Implemented Endpoints**:
  - `GET /api/v1/roles`: List all system and custom roles.
  - `POST /api/v1/roles`: Create new role (`role.create`).
  - `GET /api/v1/roles/{role_id}`: Get role details by UUID (`role.read`).
  - `PUT /api/v1/roles/{role_id}`: Update role name/description (`role.update`).
  - `DELETE /api/v1/roles/{role_id}`: Delete non-system role (`role.delete`).
  - `GET /api/v1/permissions`: Paginated catalog of all permissions (`permission.read`).
  - `POST /api/v1/roles/{role_id}/permissions`: Assign permission to role (`role.assign_permission`).
  - `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}`: Revoke permission.

### 4. Organizations Domain
- **Location**: [`app/modules/organizations/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/organizations/)
- **Gold Standard Reference**: Demonstrates ideal service layer patterns:
  - `OrganizationCreate` & `OrganizationUpdate` with strict Pydantic `Field()` sanitization.
  - `OrganizationService`: Encapsulates atomic database transactions with rollback on `IntegrityError`.
  - Organization status transitions (e.g., `ACTIVE`, `SUSPENDED`).
  - Eager relationship querying.

### 5. Master Data Registry
- **Location**: [`app/modules/masters/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/masters/)
- **Architecture**: Employs a dynamic generic router factory (`create_master_router`) to eliminate boilerplate for standard lookup tables:
  - Countries, States, Cities, Currencies, Time Zones, Languages, Industries
  - Address Types, Communication Types, Document Types, Identification Types, Units of Measure
- **Endpoints**: Standardized `/api/v1/masters/<resource>` providing full CRUD with public UUID identification.

### 6. Shared Foundation Utilities
- **Location**: [`app/shared/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/)
- **`PagedResponse[T]`**: Standardized response envelope returning `items`, `total`, `page`, `page_size`, and computed `total_pages`.
- **`PaginationParams`**: Reusable query parameter dependency:
  ```python
  from app.shared.pagination import PaginationParams, get_pagination
  from app.shared.response import PagedResponse


  @router.get("", response_model=PagedResponse[ItemResponse])
  async def list_items(
      db: Annotated[AsyncSession, Depends(get_db_session)],
      pagination: Annotated[PaginationParams, Depends(get_pagination)],
  ) -> PagedResponse[ItemResponse]:
      items, total = await service.list(
          offset=pagination.offset, limit=pagination.page_size
      )
      return PagedResponse.build(
          items=items, total=total, page=pagination.page, page_size=pagination.page_size
      )
  ```

### 7. Database Infrastructure & Models
- **Location**: [`app/infrastructure/database/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/)
- Async engine created via `create_async_engine(settings.database_url)`.
- Base entity provides `id` (bigint or UUID), `created_at` (UTC timestamp), and `updated_at`.
- All models inherit from `Base` and register with Alembic automatically via `app/infrastructure/database/base.py`.

### 8. Seed Data Engine
- **Location**: [`app/seeds/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/seeds/)
- Deterministic, idempotent seeding via `python -m app.seeds`.
- Pre-populates administrative roles, permission hierarchies, and standard reference data (e.g. ISO countries, currencies).

---

## API Versioning & Dual Documentation

The application hosts two independent, interactive **Scalar** API documentation portals:

| Interface | URL | Description |
|---|---|---|
| **Global Scalar Docs** | `http://127.0.0.1:8000/scalar` | Complete documentation for all v1, v2, and shared system APIs. |
| **Dedicated v2 Scalar Docs** | `http://127.0.0.1:8000/scalar/v2` | Dedicated view for v2 consumers: includes only `/api/v2/*` routes plus shared **Authentication** and **RBAC** APIs. |
| **Global OpenAPI Schema** | `http://127.0.0.1:8000/openapi.json` | Full OpenAPI 3.1 specification. |
| **Dedicated v2 OpenAPI Schema** | `http://127.0.0.1:8000/api/v2/openapi.json` | Dynamically filtered OpenAPI 3.1 specification. |

---

## Local Development Setup

### 1. Prerequisites
- [uv](https://docs.astral.sh/uv/) (v0.5+)
- Python 3.14+ (or Python 3.12+ satisfying `pyproject.toml`)
- PostgreSQL 16+ running locally or in Docker

### 2. Environment Configuration
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```

Configure your local `.env`:
```dotenv
DATABASE_URL=postgresql+asyncpg://crm_user:local_password@localhost:5432/crm_platform
JWT_SECRET_KEY=generate_a_secure_random_secret_with_openssl_rand_hex_32
APP_TIMEZONE=UTC
DEBUG=true
```

### 3. Install Dependencies
Synchronize dependencies using `uv`:
```bash
uv sync
```

### 4. Database Initialization & Seeding
```bash
# Apply migrations to database
uv run alembic upgrade head

# Seed initial roles, permissions and master data
uv run python -m app.seeds
```

### 5. Launch the Development Server
```bash
uv run fastapi dev app/main.py
```
Open [http://127.0.0.1:8000/scalar](http://127.0.0.1:8000/scalar) to view the API documentation.

---

## Docker & Containerized Setup

### Option 1: PostgreSQL in Docker, FastAPI locally (Recommended for Dev)
```bash
# Start PostgreSQL container
docker compose up -d postgres

# Run migrations and start app locally
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

### Option 2: Full Docker Stack
```bash
# Build and run API and PostgreSQL
docker compose up --build -d

# Follow logs
docker compose logs -f api
```

---

## Database Migrations (Alembic)

All schema changes are tracked in `alembic/versions/`:

```bash
# 1. Generate new migration after editing a model in app/infrastructure/database/models/
uv run alembic revision --autogenerate -m "add_contact_table"

# 2. Inspect the generated migration in alembic/versions/ before applying!

# 3. Apply migration
uv run alembic upgrade head

# 4. Check current version
uv run alembic current
```

> **Safety Rule**: Never run `alembic downgrade` on production or shared databases without team engineering review.

---

## Testing & Quality Verification

All tests run asynchronously using `pytest` and `pytest-asyncio`:

```bash
# Run complete test suite
uv run pytest

# Run with verbose output
uv run pytest -v

# Run linting check
uv run ruff check app tests

# Run code format verification
uv run ruff format --check app tests
```

---

## Common Command Reference

| Action | Command |
|---|---|
| **Sync environment** | `uv sync` |
| **Add dependency** | `uv add <package>` |
| **Add dev dependency** | `uv add --dev <package>` |
| **Start dev server** | `uv run fastapi dev app/main.py` |
| **Start production server** | `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| **Run test suite** | `uv run pytest` |
| **Format codebase** | `uv run ruff format app tests` |
| **Lint codebase** | `uv run ruff check app tests` |
| **Run database seeds** | `uv run python -m app.seeds` |
| **Create Alembic revision** | `uv run alembic revision --autogenerate -m "description"` |
| **Apply migrations** | `uv run alembic upgrade head` |
| **Docker Compose start** | `docker compose up -d` |
| **Docker Compose logs** | `docker compose logs -f` |
