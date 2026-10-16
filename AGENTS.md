# AI Team Coding Standards & Generation Instructions

> **MANDATORY FOR ALL AI AGENTS & ASSISTANTS**  
> Before generating, modifying, or refactoring ANY code in this repository, you **MUST** read and strictly comply with the instructions and standards set out in this document.  
> Do not bypass these rules. If a user prompt conflicts with these standards, prioritize these standards and explain the discrepancy to the developer.

---

## 🚦 Pre-Generation Gate (The "Check-First" Protocol)

Before generating any code, every AI agent must execute this 4-step checklist:

1. **Verify Context & Codebase Paths**:
   - Models live under [`app/infrastructure/database/models/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/).
   - Domain modules live under `app/modules/<domain>/` containing:
     - `schemas.py`: Pydantic v2 request/response data contracts.
     - `service.py`: Domain business logic and database transactions.
     - `router.py`: FastAPI endpoints and dependency bindings.
   - Reference implementation for standard patterns: [`app/modules/organizations`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/organizations).
2. **Reuse Existing Utilities**:
   - Response envelope: [`app.shared.response.PagedResponse[T]`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/response.py).
   - Pagination parameters: [`app.shared.pagination.PaginationParams`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/pagination.py) via `Depends(get_pagination)`.
   - Dynamic sorting: [`app.shared.sorting.SortParams`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/shared/sorting.py) via `Depends(get_sorting)`.
   - Database session: `Annotated[AsyncSession, Depends(get_db_session)]` from [`app.infrastructure.database.session`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/session.py).
   - Application configuration: `from app.core.config import settings`.
3. **Verify Dependencies & Language Standards**:
   - Check [`pyproject.toml`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/pyproject.toml). Python 3.14+ / 3.12+ syntax (e.g. `class MyClass[T]:`, `str | None`).
   - Do **NOT** introduce new external libraries or packages without explicit approval.
4. **Enforce the Pre-Completion Gate ("Definition of Done")**:
   - Before handing code back to the developer, verify code health via CLI:
     ```bash
     # Backend verification
     uv run ruff check .
     uv run ruff format --check .
     uv run pytest

     # Frontend verification (when frontend code is added or modified)
     cd frontend && npm run lint && npm run build
     ```


---

## 🏛️ The 9 Pillars of Team AI Coding Standards

```
┌────────────────────────────────────────────────────────────────────────┐
│                        9 PILLARS OF CODE GENERATION                    │
├───────────────────┬────────────────────┬───────────────────────────────┤
│ 1. Architecture   │ 2. Human-Readable  │ 3. Reusable                   │
│ 4. Documented     │ 5. Reliable        │ 6. Secure                     │
│ 7. Maintainable   │ 8. Traceable       │ 9. Controlled (Human-in-Loop) │
└───────────────────┴────────────────────┴───────────────────────────────┘
```

---

### Pillar 1: Architecturally Consistent
*Same design principles across the whole team.*

- **Strict Layered Architecture**:
  - `schemas.py`: Pydantic v2 data models. No database queries or business operations here.
  - `models`: SQLAlchemy 2.0 Declarative models in `app/infrastructure/database/models/`.
  - `service.py`: Encapsulates all query building, mutations, business validations, and commits.
  - `router.py`: Handles HTTP requests, dependency injection, and status codes. **Never execute raw SQL queries inside route functions.**
- **Async SQLAlchemy 2.0 Strict Guidelines**:
  - **No `db.query()`**: Always use 2.0 Core/ORM style `select(Model).where(...)`.
  - **Async Execution**: Always `(await db.execute(query)).scalars().all()` or `.scalar_one_or_none()`.
  - **Avoid `MissingGreenlet` Errors**: When querying entities that have relationships, **always** explicitly eager load using `selectinload` or `joinedload`:
    ```python
    from sqlalchemy.orm import selectinload

    query = select(Organization).options(selectinload(Organization.contacts))
    ```
- **Enterprise API Consistency & Data Contracts (Production-Grade Standards)**:
  - **Unified Collection Response Envelopes**:
    - **Never** return bare JSON arrays (`list[Item]`) from collection/list endpoints.
    - **Always** return `PagedResponse[ItemResponse]` via `PagedResponse.build(items=items, total=total, page=pagination.page, page_size=pagination.page_size)`.
    - Every collection endpoint must consume `pagination: Annotated[PaginationParams, Depends(get_pagination)]` and `sorting: Annotated[SortParams, Depends(get_sorting)]`.
  - **Standardized Enterprise Model Architecture (Performance + Security at Scale)**:
    - **Dual Identifier Strategy (Relational, Master, Navigation, & System Models)**:
      - **Internal Primary Key**: Always use 64-bit `BigInteger` with autoincrement (`id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)`). 64-bit integers occupy 8 bytes in B-Tree index pages, maximizing CPU cache line density in RAM, eliminating 32-bit overflow risk, and delivering optimal join throughput across high-volume relational tables. Applied to `organizations`, `branches`, `masters`, `addresses`, `menus`, and `notifications`.
      - **External REST Public Identifier**: Always use native `Uuid(as_uuid=True)` with RFC 9562 time-ordered `default=uuid7` (`public_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), unique=True, index=True, nullable=False, default=uuid7)`). UUIDv7 embeds a millisecond UNIX timestamp in the most significant bits, preventing B-Tree index page-splitting and table fragmentation inherent to random UUIDv4, while shielding sequential database IDs from enumeration/scraping attacks.
      - **Relational Foreign Keys**: Always use 64-bit `BigInteger` for foreign key columns (`organization_id`, `branch_id`, `country_id`, `state_id`, `city_id`, `parent_id`, `menu_id`, etc.).
      - **Mandatory Foreign Key Indexing (PostgreSQL Rule)**: PostgreSQL does NOT automatically create indexes on foreign keys. AI agents **MUST** explicitly specify `index=True` on every `ForeignKey` column (e.g. `mapped_column(BigInteger, ForeignKey(...), index=True)`). Missing FK indexes trigger catastrophic full table scans and table-level locks during parent table `UPDATE` or `DELETE` cascades.
    - **Identity & Access Management Entities**:
      - Core security and decoupled identity root entities (`User`, `Role`, `Permission`) use direct RFC 9562 time-ordered UUID primary keys (`id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)`). `User` also defines `public_id: UUIDv7`.
      - Junction tables (`UserRole`, `RolePermission`, `MenuRole`, `MenuPermission`) with composite primary keys **MUST** define `index=True` on reverse lookup foreign key columns (`role_id`, `permission_id`) to ensure O(log N) reverse permission queries and fast cascade checks.
    - **Clean Mutation Payloads**: Never expose or accept `_public_id` foreign keys in mutation request bodies when integer IDs are available.
    - **Option C Standard: Mandatory `{identifier}` Path Parameter & Dual-Lookup Resolution**:
      - **Universal Path Parameter Naming (`{identifier}`)**: Single-resource endpoints (`GET /{identifier}`, `PATCH /{identifier}`, `DELETE /{identifier}`) across **ALL current and upcoming domain modules** (e.g., `/api/v1/masters/addresses/{identifier}`, `/api/v1/organizations/{identifier}`, `/api/v1/users/{identifier}`, `/api/v1/menus/{identifier}`, `/api/v1/roles/{identifier}`) MUST name the path parameter `{identifier}`. Never name path variables `{id}`, `{public_id}`, `{model}_id`, or `{domain}_id`.
      - **Dual-Lookup Resolution Service Contract**: Every domain service must implement dual resolution (e.g. `_build_identifier_clause(identifier)`) to resolve either internal integer `id` (via primary key index) or external UUIDv7 `public_id` (via unique index), or unique `code` for system records.
      - **Strict Input Interception**: Empty strings, `"null"`, `"undefined"`, `"none"`, or whitespace-only path parameters MUST be intercepted immediately in the router, returning a structured `400 Bad Request` error: `detail="{Entity} identifier cannot be null or empty."`.
      - **Entity Not Found Error Envelope**: If a properly formatted identifier does not match any record, return structured `404 Not Found` with `detail="{Entity} with identifier '{identifier}' not found."`.
  - **SQL-Injection Safe Dynamic Sorting**:
    - Sort parameters from `get_sorting` (`sort_by`, `sort_order`) must be validated against SQLAlchemy model inspection metadata (`inspect(model).columns`).
    - If a requested column does not exist on the model, safely fallback to `"created_at"` or `"id"`. Never interpolate raw string column names directly into SQL statements.
  - **Standardized Structured Error Contracts**:
    - All API error responses must adhere to the structured error envelope:
      ```json
      {
        "error": {
          "code": "RESOURCE_NOT_FOUND",
          "message": "Human-readable description of error.",
          "type": "invalid_request_error",
          "param": "field_name_or_none",
          "request_id": "req_uuid_here"
        }
      }
      ```
    - Domain exceptions must define a machine-readable `code` (e.g. `DUPLICATE_CODE`, `INVALID_STAGE_TRANSITION`).
  - **Zero Vendor Brand Names Policy**:
    - Never include proprietary vendor names (e.g., Stripe, Salesforce, HubSpot, Zoho) in program code, comments, docstrings, variable names, or test assertions. Reference is only permitted in architectural documentation for pattern comparisons.
  - **Request Tracing & Observability (`X-Request-ID`)**:
    - Every HTTP request must be traced with a unique `X-Request-ID` header.
    - Errors, structured logs, and audit records must be correlated using this request ID.
  - **Enterprise Audit Trail & Soft-Deletion (`AuditEntityBase`)**:
    - High-value transactional and CRM domain records must inherit from `AuditEntityBase` with:
      - `created_by_id: Mapped[UUID | None]`
      - `updated_by_id: Mapped[UUID | None]`
      - `is_deleted: Mapped[bool]` (default `False`, indexed)
      - `deleted_at: Mapped[datetime | None]`
    - Regular queries must filter out soft-deleted records (`where(Model.is_deleted.is_(False))`) by default.
  - **Decoupled Identity Foundation**:
    - Do **NOT** bind `User` models directly to `Organization` unless explicitly instructed. Keep identity and RBAC decoupled from specific CRM tenant account models.
- **Pydantic v2 Standards**:
  - Use `model_config = ConfigDict(from_attributes=True)` instead of v1 `class Config: orm_mode = True`.
  - Use `@field_validator` and `@model_validator(mode="before"|"after")` instead of deprecated `@validator`.
  - Use modern typing: `list[str]`, `dict[str, Any]`, `str | None`.
- **API Versioning**:
  - v1 routes live under `app/api/v1/` and `app/modules/` with prefix `/api/v1`.
  - v2 routes live under `app/api/v2/` with prefix `/api/v2`.
  - Never introduce breaking changes to existing v1 schemas or endpoints.

---

### Pillar 2: Human-Readable
*Understandable regardless of who or what generated the code.*

- **Naming Conventions**:
  - Functions and variables: Clear, descriptive `snake_case` (e.g., `fetch_active_organizations_by_tenant`, not `get_orgs`).
  - Classes: `PascalCase` (e.g., `OrganizationService`, `UserProfileResponse`).
  - Constants: `UPPER_SNAKE_CASE`.
  - No cryptic abbreviations, single-letter variables (except indices `i`), or confusing acronyms.
- **Strict Typing**:
  - Explicit Python type hints on **all** parameters and returns.
  - Use `Annotated[...]` for FastAPI dependencies, query params, and path params:
    ```python
    async def list_items(
        db: Annotated[AsyncSession, Depends(get_db_session)],
        pagination: Annotated[PaginationParams, Depends(get_pagination)],
        sorting: Annotated[SortParams, Depends(get_sorting)],
    ) -> PagedResponse[ItemResponse]:
    ```
- **Formatting Standards**:
  - Maximum line length: 88 characters (Black / Ruff standard).
  - Code must pass `ruff check .` and `ruff format .` without manual interventions.
  - No dense one-liners or nested ternary chains.

---

### Pillar 3: Reusable
*Shared where it makes sense, without unnecessary abstractions.*

- **Shared Components First**:
  - Always use `app.shared.pagination.PaginationParams` via `Annotated[PaginationParams, Depends(get_pagination)]`.
  - Always use `app.shared.sorting.SortParams` via `Annotated[SortParams, Depends(get_sorting)]`.
  - Always envelope paginated list responses with `app.shared.response.PagedResponse[T].build(...)`.
  - Always reuse auth dependencies from `app.core.security` and `app.modules.rbac`.
- **Rule of Three**:
  - Do not create abstract base classes or generic utilities until a pattern is independently repeated across at least three domains.
  - Prefer composition and explicit service methods over deep class inheritance.
- **Domain Independence**:
  - Sibling domain modules under `app/modules/` must remain decoupled. Cross-domain interactions should go through service contracts, not direct imports of another domain's private internals.

---

### Pillar 4: Well-Documented
*At code, module, and system levels.*

- **FastAPI OpenAPI Annotations**:
  - Every endpoint must declare: `tags`, `summary`, `description`, `status_code`, and `response_model`.
  ```python
  @router.get(
      "/{organization_id}",
      response_model=OrganizationResponse,
      status_code=status.HTTP_200_OK,
      summary="Get organization details",
      description="Fetches detailed information for a specific organization by ID.",
      tags=["Organizations"],
  )
  async def get_organization(...) -> OrganizationResponse:
  ```
- **Docstrings**:
  - Include Google-style docstrings on all service methods and complex helper functions:
  ```python
  async def get_by_code(self, code: str) -> Organization | None:
      """Fetches an organization by its unique system code.

      Args:
          code: The unique upper-case alphanumeric identifier (e.g., 'ORG-001').

      Returns:
          The matching Organization entity or None if not found.
      """
  ```
- **Continuous Documentation Synchronization (MANDATORY)**:
  - **Zero Stale Docs Policy**: Every AI generation that adds, refactors, or deletes code MUST update the corresponding documentation under `docs/` before concluding the task:
    - New or modified API endpoints / business logic ➔ update [`docs/03-modules/<domain>.md`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/).
    - New or modified database entities / columns ➔ update [`docs/01-architecture/project-structure.md`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/project-structure.md) and [`docs/04-database/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/04-database/).
    - New or modified environment variables / settings ➔ update [`docs/02-setup/configuration.md`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/02-setup/configuration.md) and `.env.example`.
    - Architectural changes (routers, auth, versions) ➔ update [`docs/01-architecture/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/).
  - A task is strictly **INCOMPLETE** if code changes are made without updating the corresponding documentation in `docs/`.



---

### Pillar 5: Reliable
*Predictable exception handling and testing.*

- **Exception Standards**:
  - Use custom domain exceptions mapped to appropriate HTTP status codes (e.g., `EntityNotFoundError` → 404, `DuplicateRecordError` → 409).
  - **NEVER** use bare `except:` or `except Exception: pass`.
  - Catch specific exceptions (e.g. `IntegrityError`, `SQLAlchemyError`) and log with context before raising domain errors.
- **Transactional Integrity**:
  - Ensure database operations are committed explicitly and rolled back cleanly on error:
  ```python
  try:
      self.db.add(entity)
      await self.db.commit()
      await self.db.refresh(entity)
  except IntegrityError as exc:
      await self.db.rollback()
      logger.warning("Duplicate record violation: %s", exc)
      raise DuplicateRecordError("Record already exists") from exc
  except SQLAlchemyError:
      await self.db.rollback()
      logger.exception("Database transaction failed")
      raise DatabaseError("Unable to persist record")
  ```
- **Automated Testing**:
  - Every new endpoint or service MUST include corresponding unit or integration tests under `tests/`.
  - Use `pytest` and `pytest-asyncio` with isolated test database sessions or mock fixtures.

---

### Pillar 6: Secure
*Enforced access controls and automated checks.*

- **Zero Hardcoded Secrets**:
  - API keys, JWT secrets, database credentials, and certificates must NEVER appear in code. All values must be loaded via `settings` from `.env`.
- **Enforced RBAC**:
  - Endpoints exposing tenant or administrative data must enforce permissions via RBAC dependencies (`require_permissions(...)`).
- **Input Sanitization & Validation**:
  - Always validate incoming payload structures via Pydantic `Field()` (e.g. `min_length`, `max_length`, `ge`, regex patterns).
  - Use `EmailStr`, `HttpUrl`, and constrained numeric types where applicable.
- **SQL Injection Prevention**:
  - Never format or concatenate strings into raw SQL queries. Always use SQLAlchemy Core / ORM `select()` or parameterized queries with `text()`.

---

### Pillar 7: Maintainable
*Sustainable as the codebase and team grow.*

- **Single Responsibility Principle (SRP)**:
  - Routers handle HTTP translation and validation.
  - Services handle logic and orchestration.
  - Repositories/Models define database structure.
- **Code Health Automation**:
  - Code must pass `ruff check .` and `ruff format .` without manual interventions.
  - Keep modules cohesive and focused.

---

### Pillar 8: Traceable
*Business requirement to implementation, testing, and documentation.*

- **Requirement Linking**:
  - In commit messages and PR summaries, cite the relevant ticket / issue ID (e.g., `feat(orgs): [CRM-104] implement organization tenant filter`).
- **Structured Logging**:
  - **NEVER use `print()` statements** in production code.
  - Use standard library `logging.getLogger(__name__)`.
  - Include contextual fields: user ID, organization ID, and request action.
- **Conventional Commits**:
  - Follow standard prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

---

### Pillar 9: Controlled
*Human engineering decisions and governed changes.*

- **Human-in-the-Loop Principle**:
  - AI operates as an assistant, never as an unreviewed autonomous committer.
  - Provide complete, reproducible diffs or files for human engineering review.
- **Alembic Database Migration Protocol**:
  - **Timestamped Revisions (No Random Hashing)**:
    - Every migration file and revision ID MUST use a UTC timestamp (`YYYYMMDDHHMMSS`, e.g. `20261014120001`) as both the `revision` identifier and file prefix.
    - **Never** use random hexadecimal hashes (such as `732700ee0bae` or `aeafa3d4d6aa`).
    - `alembic.ini` is configured with `file_template = %%(rev)s_%%(slug)s` and `revision_environment = true`.
    - `alembic/env.py` implements `process_revision_directives` to automatically inject UTC timestamps into generated migration scripts.
  - **Modular Migrations by Domain**:
    - Keep migrations organized and modular per domain/module (e.g., `organizations`, `users/identity`, `rbac/menus`, `masters`). Do not combine unrelated domains into monolithic migration files.
    - Foreign key dependencies dictate the `down_revision` chain across domain boundaries.
  - **Generation & Safety Protocol**:
    - AI **MAY** generate migrations via:
      ```bash
      uv run alembic revision --autogenerate -m "descriptive_migration_name"
      ```
    - AI **MUST** inspect the generated migration script to verify `nullable` constraints, column types, foreign keys, and ensure `downgrade()` is fully implemented.
    - AI **MUST NEVER** execute `alembic downgrade` or drop database tables autonomously in production environments.
- **Frontend Architecture & Next.js Standards**:
  - **Strict Layered Structure (`frontend/src/`)**:
    - `lib/types.ts`: TypeScript contracts mirroring backend Pydantic schemas.
    - `lib/api-client.ts`: Centralized fetch wrapper with automatic JWT Bearer injection and 401 silent refresh interceptor.
    - `lib/auth-context.tsx`: Authentication state machine (`user`, `login`, `logout`, session initialization).
    - `components/ui/`: Reusable, atomic UI primitives (`Button`, `Card`, `Badge`, `StatCard`).
    - `components/navigation/`: App shell components (`Sidebar`, `Header`).
    - `hooks/`: Domain and data hooks (`useMenus`, `useAuth`).
    - `app/`: Next.js 15 App Router pages and route groups (`(auth)`, `(dashboard)`).
  - **Dynamic Navigation (Zero Hardcoded Links)**:
    - Navigation items must always be loaded dynamically from `GET /api/v1/menus/my-menus` using `useMenus()`. Never hardcode static route lists for authenticated navigation.
  - **Type Safety & Linting**:
    - Strict TypeScript without `any` types.
    - Every exported component and hook must declare complete prop interfaces and JSDoc summaries.
    - Code must pass `npm run lint` and `npm run build` with **0 errors and 0 warnings**.
  - **Design System Consistency**:
    - Rely on CSS variables and design tokens defined in `globals.css` (dark slate theme, glassmorphism, micro-animations). Avoid arbitrary ad-hoc inline styling.
- **Review Checklist**:
  - AI generations must conclude with a self-verification checklist:
    - [ ] Type hints verified on all params & returns (Python & TypeScript)
    - [ ] Modern Async SQLAlchemy 2.0 (eager loading, no greenlet errors)
    - [ ] Standardized collection endpoints: `PagedResponse[T]` envelope (never raw JSON arrays)
    - [ ] Reused `PaginationParams`, `get_pagination`, `SortParams`, and `get_sorting` from `app.shared`
    - [ ] Dual Identifier Strategy enforced: 64-bit BigInteger PKs/FKs with index=True on all FKs, time-ordered UUIDv7 public_id for external URL paths
    - [ ] Identity roots (User, Role, Permission) use direct UUIDv7 primary keys; navigation/communication entities (Menu, Notification) use BigInteger PKs and UUIDv7 public_id
    - [ ] Option C Standard enforced: universal `/{identifier}` path parameter naming for single-resource endpoints (never `{id}` or `{domain}_id`)
    - [ ] Dual-lookup resolution supported (int ID or UUID public_id or unique code) with strict validation rejecting empty/null path parameters
    - [ ] Standardized structured error responses formatted with code, message, and request_id (no vendor-specific terms in code)
    - [ ] Zero vendor brand names in program code, comments, docstrings, or test assertions
    - [ ] Request tracing enabled (X-Request-ID propagation)
    - [ ] Decoupled identity maintained (No direct User-to-Organization link without explicit authorization)
    - [ ] Security & RBAC verified on both backend routers and frontend layouts
    - [ ] Transaction rollback & exception handling covered
    - [ ] Migrations use UTC timestamps for revision IDs and modular domain structure (no hex hashes)
    - [ ] Frontend navigation dynamically consumed from /api/v1/menus/my-menus
    - [ ] Documentation updated in docs/ (docs/03-modules/, docs/01-architecture/, docs/04-database/, etc.)
    - [ ] Backend passes ruff check . and pytest
    - [ ] Frontend passes npm run lint and npm run build with 0 errors



