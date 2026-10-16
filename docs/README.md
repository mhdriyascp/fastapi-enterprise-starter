# CRM Platform — Documentation Hub

Welcome to the central technical and business documentation for the **Enterprise CRM Platform Backend**. This directory contains modular, structured documentation designed for software engineers, solution architects, business analysts, and AI coding agents.

---

## 🧭 Documentation Index

### [00. Overview](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/00-overview/)
Foundational business objectives, use cases, and technical philosophy.
- [Business Context & Value Proposition](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/00-overview/business-context.md) — What this platform solves, intended SaaS/CRM/ERP applications, and core business capabilities.
- [Technology Stack & Decisions](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/00-overview/tech-stack.md) — Rationale for FastAPI, SQLAlchemy 2.0 Async, PostgreSQL, Pydantic v2, and UV.

### [01. Architecture](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/)
System design patterns, security infrastructure, and API versioning.
- [System Design & Layered Architecture](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/system-design.md) — Strict separation of Routers, Services, Models, and Schemas.
- [Project Structure Reference](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/project-structure.md) — Comprehensive directory and file-level architectural breakdown.
- [API Versioning & Dual Documentation](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/api-versioning-and-docs.md) — Multi-version API routing (`/api/v1`, `/api/v2`) and dual Scalar portals (`/scalar`, `/scalar/v2`).
- [Security & RBAC Architecture](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/01-architecture/security-and-rbac.md) — Cryptographic JWT sessions, session revocation, and fine-grained permission dependency injection.

### [02. Setup & Operations](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/02-setup/)
Step-by-step guides for spinning up local and containerized environments.
- [Local Development Setup](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/02-setup/local-development.md) — Installing prerequisites, PostgreSQL, `uv sync`, running server, and migrations.
- [Docker & Container Deployment](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/02-setup/docker-deployment.md) — Multi-stage production container build, Docker Compose workflows.
- [Configuration & Environment Variables](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/02-setup/configuration.md) — `.env` variables specification, Pydantic Settings, and secrets management.
- [CLI & Operations Cheat Sheet](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/02-setup/cli-commands.md) — Comprehensive developer terminal commands for Git, UV, Docker, testing, and DB maintenance.


### [03. Modules & Domain Implementations](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/)
In-depth technical contracts, business models, and service logic for each domain.
- [Identity & Authentication](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/identity-and-auth.md) — Registration, token refresh, sessions, account locking, password security.
- [User Management](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/users.md) — User entity, statuses, verification flags, and profile contracts.
- [Role-Based Access Control (RBAC)](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/rbac.md) — Roles, Permissions, RolePermissions, UserRoles, and endpoint security.
- [Organizations Domain](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/organizations.md) — Multi-tenant organization model, service transaction handling, status transitions.
- [Master Data Registry](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/master-data.md) — 11 standard lookup tables and the dynamic router factory.
- [System Settings & Configurations](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/settings.md) — Platform parameters, security thresholds, localization baselines, and feature toggles.
- [Shared Foundation Utilities](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/03-modules/shared-foundation.md) — Generic `PagedResponse[T]` envelope and `PaginationParams` dependency.

### [04. Database & Persistence](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/04-database/)
Schema lifecycle, migration protocols, and data seeding.
- [Database Migrations with Alembic](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/04-database/migrations-alembic.md) — Creating, inspecting, reviewing, and applying database migrations safely.
- [Seed Data Engine](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/04-database/seeding.md) — Idempotent seeding architecture for system roles, permissions, and ISO reference data.

### [05. AI Agent & Engineering Standards](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/05-ai-and-standards/)
Mandatory guidelines, team pillars, and quality gates for every code generation.
- [AI Workflow & The 9 Pillars](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/05-ai-and-standards/ai-workflow-and-pillars.md) — Standards from `AGENTS.md`, Async SQLAlchemy gotchas, and pre-generation protocol.
- [Testing & Quality Verification](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/docs/05-ai-and-standards/testing-and-quality.md) — Pytest suite, async testing with TestClient, and Ruff lint/format gates.
