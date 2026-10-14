# 00. Overview — Technology Stack & Architectural Decisions

## Technology Matrix

| Layer | Component | Version | Role in Architecture |
|---|---|---|---|
| **Runtime** | Python | 3.14+ (3.12+ compatible) | Core programming language leveraging modern type syntax (PEP 695). |
| **Package Manager** | `uv` | Latest | High-performance Rust-based dependency resolver and virtual environment manager. |
| **Web Framework** | FastAPI | 0.142+ | High-throughput asynchronous HTTP API framework with native OpenAPI 3.1 generation. |
| **ORM / Data Access** | SQLAlchemy | 2.0+ (Asyncio) | Asynchronous ORM utilizing Core 2.0 `select()` syntax and non-blocking I/O. |
| **Database Driver** | `asyncpg` | 0.32+ | High-performance pure-async PostgreSQL driver. |
| **Database Engine** | PostgreSQL | 16 / 17 | Enterprise relational database with JSONB and UUID support. |
| **Migrations** | Alembic | 1.20+ | Version-controlled database schema migrations. |
| **Data Contracts** | Pydantic | 2.x | Request validation, type coercion, and response serialization. |
| **Configuration** | `pydantic-settings` | 2.15+ | Strongly-typed environment variable loader from `.env`. |
| **Authentication** | PyJWT & Argon2/Bcrypt | Latest | Cryptographic JWT token generation and salted password hashing. |
| **Documentation UI**| Scalar FastAPI | 1.9+ | Modern, interactive API documentation replacing default Swagger UI. |
| **Testing** | Pytest & pytest-asyncio | 9.x / 1.4+ | Automated unit and integration testing suite. |
| **Linter & Formatter**| Ruff | 0.17+ | Fast Rust-based linter and formatter replacing Flake8, Black, and isort. |
| **Containerization** | Docker & Compose | Multi-stage | Lightweight production Alpine/Debian containerization. |

---

## Architectural Decision Records (ADRs)

### ADR 1: Why SQLAlchemy 2.0 Async over Sync ORMs?
- **Decision**: All database queries must use async/await with `AsyncSession`.
- **Rationale**: An enterprise CRM involves high I/O concurrency (fetching organizations, verifying JWTs on every request, paginating master lists). Async I/O prevents threads from blocking on database socket reads, increasing concurrent request throughput by 3-5x.

### ADR 2: Why Scalar over Default Swagger UI?
- **Decision**: Disable default Swagger/ReDoc and expose Scalar at `/scalar` and `/scalar/v2`.
- **Rationale**: Scalar provides a sleek, modern, searchable developer portal with built-in dark mode, interactive request runners, code generation in multiple languages, and support for multi-version documentation schemas.

### ADR 3: Why `uv` for Package Management?
- **Decision**: Standardize on Astral `uv` and commit `uv.lock`.
- **Rationale**: `uv` is 10-100x faster than traditional `pip` or `poetry`. Its lockfile guarantees 100% deterministic builds between local development, CI/CD, and production Docker builds.
