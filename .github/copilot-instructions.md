# GitHub Copilot Instructions

Before generating or suggesting code in this repository, strictly review and adhere to the guidelines set in:
`AGENTS.md`

Key Standards Checklist:
1. **Architecturally Consistent**: Layered design (`router` -> `service` -> `model` -> `schema`).
   - Use SQLAlchemy 2.0 async syntax (`select()`, eager load relationships with `selectinload` / `joinedload` to prevent `MissingGreenlet` errors).
   - Use Pydantic v2 `ConfigDict(from_attributes=True)`.
   - Models reside in `app/infrastructure/database/models/`.
2. **Human-Readable**: Explicit type hints on all parameters and returns. Descriptive naming.
3. **Reusable**: Reuse `app.shared.response.PagedResponse` and `app.shared.pagination.get_pagination`.
4. **Well-Documented**: OpenAPI docstrings, tags, summary, response_model on all endpoints. **Mandatory**: Update corresponding files in `docs/` (`docs/03-modules/`, `docs/01-architecture/`, etc.) whenever adding or changing functionality.

5. **Reliable**: Custom domain exceptions, transactional commit/rollback, pytest coverage.
6. **Secure**: RBAC enforcement, no secrets in code, Pydantic Field() validation.
7. **Maintainable**: Strict domain isolation in `app/modules/<domain>/`. Ruff compliant.
8. **Traceable**: Structured logging with standard library `logging` (never `print()`).
9. **Controlled**: Human-governed verification, non-destructive database actions only.
   - **Modular Timestamped Migrations**: Alembic migrations must strictly use UTC timestamp revision IDs (`YYYYMMDDHHMMSS`, e.g. `20261014120001`) and descriptive slugs. Random hex hashes are prohibited. Migrations must be modularized by domain with valid FK dependency sequencing (`down_revision`).
10. **Enterprise Model Standards & Dual Identifier Strategy**:
   - 64-bit `BigInteger` for internal PKs and relational FKs.
   - Mandatory `index=True` on every `ForeignKey` column for PostgreSQL.
   - External public identifiers use native `Uuid(as_uuid=True)` with sequential RFC 9562 `default=uuid7`.
   - Core IAM root entities (`User`, `Role`, `Permission`) use direct UUIDv7 primary keys with index on secondary composite FKs. Navigation and communication entities (`Menu`, `Notification`) use BigInteger PKs and UUIDv7 public_id.
   - **Option C Standard: Universal `{identifier}` & Dual-Lookup Resolution**:
     - Single-resource endpoints (`GET /{identifier}`, `PATCH /{identifier}`, `DELETE /{identifier}`) across ALL current and upcoming modules (e.g., `/api/v1/masters/addresses/{identifier}`, `/api/v1/organizations/{identifier}`, `/api/v1/users/{identifier}`, `/api/v1/menus/{identifier}`) MUST name the path parameter `{identifier}`. Never use `{id}`, `{public_id}`, or `{domain}_id`.
     - Services must implement dual lookup resolving by internal integer `id` (PK) or UUIDv7 `public_id`, or unique `code`.
     - Strict input interception: empty strings, `"null"`, `"undefined"`, `"none"`, or whitespace-only inputs must immediately return structured `400 Bad Request`.
     - Missing entities must return structured `404 Not Found`.
   - Zero proprietary vendor names in program code, comments, or docstrings.

