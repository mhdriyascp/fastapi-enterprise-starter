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
| **1** | **Architecturally Consistent** | Layered design: `Router` → `Service` → `Model` → `Schema`. Eager load relationships with `selectinload` to avoid `MissingGreenlet`. No raw SQL in routes. |
| **2** | **Human-Readable** | Descriptive naming (`fetch_active_organizations_by_tenant`). Full Python type hints on every function and parameter. 88-char line limits. |
| **3** | **Reusable** | Reuse `PagedResponse[T]` and `PaginationParams` from `app.shared`. Rule of Three before abstracting. |
| **4** | **Well-Documented** | Every route requires OpenAPI `tags`, `summary`, `description`, `status_code`, and `response_model`. **Mandatory**: Update `docs/` (`docs/03-modules/`, `docs/01-architecture/`, etc.) whenever adding or changing functionality. |
| **5** | **Reliable** | Explicit domain exceptions. Database operations committed explicitly and rolled back cleanly on error. Comprehensive tests. |
| **6** | **Secure** | Enforce RBAC via `require_permission()`. No hardcoded credentials. Sanitize user inputs with Pydantic `Field()`. Parameterized queries. |
| **7** | **Maintainable** | Single Responsibility Principle. Modular boundaries in `app/modules/<domain>/`. Strict Ruff compliance. |
| **8** | **Traceable** | Ticket references (`[CRM-102]`). Structured logging with Python's standard `logging` (never `print()`). Conventional Commits. |
| **9** | **Controlled** | Human-in-the-loop review. Non-destructive database operations only. Complete reproducible diffs. |


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
