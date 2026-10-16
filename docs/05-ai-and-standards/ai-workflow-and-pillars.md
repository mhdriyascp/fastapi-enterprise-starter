# 05. Standards — AI Agent Workflow & The 9 Pillars

## The Mandatory Pre-Generation Gate

Every AI agent (Antigravity, Cursor, Copilot, Windsurf) and human engineer must check [`AGENTS.md`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/AGENTS.md) before writing or refactoring any code.

```
┌────────────────────────────────────────────────────────┐
│               AI Pre-Flight Checklist                  │
├────────────────────────────────────────────────────────┤
│ 1. Verify existing domain patterns in app/modules/     │
│ 2. Check app/shared/ before creating helpers           │
│ 3. Models live in app/infrastructure/database/models/  │
│ 4. Strictly adhere to the 9 pillars below              │
│ 5. Update docs/ (modules, architecture, config, etc.)  │
│ 6. Complete Definition of Done (ruff check, pytest)    │
└────────────────────────────────────────────────────────┘
```

---

## The 9 Pillars of Code Generation

| # | Pillar | Strict Requirement |
|---|---|---|
| **1** | **Architecturally Consistent** | Layered design: `Router` → `Service` → `Model` → `Schema`. Eager load relationships with `selectinload`. Dual Identifier Strategy (`BigInteger` PK/FK, UUIDv7 `public_id`). Standard ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`). |
| **2** | **Human-Readable** | Descriptive naming (`fetch_active_organizations_by_tenant`). Full Python type hints on all params & returns. Strict TypeScript interfaces on all React props (no `any`). Semantic HTML5 tags (`<time>`, `<nav>`, `<main>`). 88-char limits. |
| **3** | **Reusable** | Shared pagination, sorting, and `PagedResponse[T]` envelope. Frontend: atomic UI primitives (`components/ui/`), centralized utilities (`lib/`), and mandatory `<FormattedDate />` for all rendered dates. Zero duplicate local page helpers. |
| **4** | **Well-Documented** | Every route requires OpenAPI `tags`, `summary`, `description`. Service methods use Google docstrings. Frontend components/hooks require JSDoc. **Mandatory**: Update `docs/` whenever adding or changing functionality. |
| **5** | **Reliable** | Explicit custom domain exceptions. Database operations committed explicitly and rolled back cleanly on error. Comprehensive automated tests (`pytest`, `pytest-asyncio`). |
| **6** | **Secure** | Enforce RBAC via `require_permission()`. No hardcoded credentials. Sanitize user inputs with Pydantic `Field()`. Parameterized queries. Zero vendor brand names in code. |
| **7** | **Maintainable & Scalable** | Single Responsibility Principle. Modular boundaries. Complete UI state triad (Loading skeleton/spinner, Empty state CTA, Error toast/banner). Optimistic state updates with rollback. |
| **8** | **Traceable** | Ticket references (`[CRM-102]`). Request tracing (`X-Request-ID` propagation). Structured logging with Python's standard `logging` (never `print()`). Conventional Commits. |
| **9** | **Controlled** | Human-in-the-loop review. Non-destructive database operations only. Timestamped migration revisions. Complete reproducible diffs. |


---

## Ready-to-Use Task Prompt Template

When assigning tasks to an AI assistant:

```markdown
Task: [Describe the business feature or bug fix]
Ticket: [e.g. CRM-204]
Target Layer: [e.g. app/modules/contacts]

Strict Instructions:
1. Comply with all 9 pillars in AGENTS.md.
2. Use app.shared.response.PagedResponse and pagination dependencies.
3. Validate all inputs using Pydantic Field constraints.
4. Provide unit test stubs using pytest-asyncio.
5. Provide a verification summary upon completion.
```
