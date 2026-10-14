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

