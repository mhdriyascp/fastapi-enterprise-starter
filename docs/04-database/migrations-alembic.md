# 04. Database — Migrations with Alembic

## Overview

Database schema changes are strictly managed through version-controlled Alembic migrations located in [`alembic/versions/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/alembic/versions/).

Direct, manual `ALTER TABLE` execution against development or production databases is prohibited.

---

## 🏗️ Modular Architecture & Migration Sequence

Migrations in this project are decoupled into **domain-based modular migration files** rather than monolithic mega-migrations. Every migration uses a **UTC timestamp** as its revision ID (no random hex hashes).

```
   ┌────────────────────────────────────────────────────────┐
   │                        <base>                          │ (Empty Database)
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 20261014120001_create_organizations_schema.py           │
   │ (Organizations, Business Units, Fiscal Years, etc.)    │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 20261014120002_create_users_identity_schema.py         │
   │ (Users, Auth Sessions)                                 │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 20261014120003_create_rbac_schema.py                   │
   │ (Permissions, Roles, Role Permissions, User Roles)     │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 20261014120004_create_master_tables_schema.py          │
   │ (Countries, States, Cities, Currencies, Timezones, etc)│
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 20261014071532_create_menus_schema.py                  │
   │ (Navigation Menus, Menu Roles, Menu Permissions)       │
   └────────────────────────────────────────────────────────┘
```

### Applied Modular Migrations:
1. **`20261014120001_create_organizations_schema.py`**:
   - `revision = "20261014120001"`, `down_revision = None`
   - Defines the core multi-tenant organizational structure: `organizations`, `legal_entities`, `branches`, `business_units`, `departments`, `teams`, `job_titles`, `cost_centers`, `profit_centers`, `fiscal_years`, `fiscal_periods`, `holidays`, `business_hours`, `document_sequences`.
2. **`20261014120002_create_users_identity_schema.py`**:
   - `revision = "20261014120002"`, `down_revision = "20261014120001"`
   - Defines user identity and authentication credentials: `users`, `auth_sessions`.
3. **`20261014120003_create_rbac_schema.py`**:
   - `revision = "20261014120003"`, `down_revision = "20261014120002"`
   - Defines role-based access control and user assignments: `permissions`, `roles`, `role_permissions`, `user_roles`.
4. **`20261014120004_create_master_tables_schema.py`**:
   - `revision = "20261014120004"`, `down_revision = "20261014120003"`
   - Defines 12 global lookup tables: `address_types`, `communication_types`, `countries`, `states`, `cities`, `currencies`, `document_types`, `identification_types`, `industries`, `languages`, `time_zones`, `units_of_measure`.
5. **`20261014071532_create_menus_schema.py`**:
   - `revision = "20261014071532"`, `down_revision = "20261014120004"`
   - Defines navigation hierarchy and access control links: `menus`, `menu_roles`, `menu_permissions`.
6. **`20261015054331_create_addresses_table.py`**:
   - `revision = "20261015054331"`, `down_revision = "20261014071532"`
   - Creates centralized `addresses` table linked to organizations, branches, address types, countries, states, and cities.
7. **`20261015085540_add_taxes_master.py`**:
   - `revision = "20261015085540"`, `down_revision = "20261015054331"`
   - Adds fiscal taxes master registry (`taxes`).
8. **`20261015090109_add_brands_master.py`**:
   - `revision = "20261015090109"`, `down_revision = "20261015085540"`
   - Adds commercial product brands master registry (`brands`).
9. **`20261016055340_db_optimization_and_integrity.py`**:
   - `revision = "20261016055340"`, `down_revision = "20261015090109"`
   - Phase 2 Optimization: Adds `UniqueConstraint("organization_id", "code")` on `branches`, `departments`, `teams`, `cost_centers`, converts `user_roles` and `role_permissions` to composite primary keys, and declares ORM `relationship()` bindings between `Organization` and `Address`.
10. **`20261016084523_add_audit_and_soft_delete_to_organizations_and_addresses.py`**:
    - `revision = "20261016084523"`, `down_revision = "20261016055340"`
    - Phase B Migration: Inherits `AuditEntityBase` across all organizational hierarchy tables (`organizations`, `branches`, `departments`, `teams`, `cost_centers`, `legal_entities`, `business_units`, `profit_centers`, `fiscal_years`, `fiscal_periods`, `holidays`, `business_hours`, `document_sequences`, `job_titles`) and `addresses`. Adds indexed `is_deleted` (default `false`), `deleted_at`, `created_by_id`, and `updated_by_id`.
11. **`20261016095142_standardize_model_ids_and_fk_indexes.py`**:
    - `revision = "20261016095142"`, `down_revision = "20261016084523"`
    - Model Standardization: Enforces the Dual Identifier Strategy across all relational and master models. Standardizes primary keys and relational foreign keys to 64-bit `BigInteger`, adds mandatory `index=True` on all PostgreSQL foreign keys (`parent_id`, `branch_id`, `business_unit_id`, `department_id`), converts external `public_id` to native binary `Uuid(as_uuid=True)` with sequential RFC 9562 `uuid.uuid7` defaults, and adds reverse lookup indexes on RBAC junction tables (`user_roles.role_id`, `role_permissions.permission_id`).
12. **`20261016101951_standardize_menus_and_notifications_.py`**:
    - `revision = "20261016101951"`, `down_revision = "20261016095142"`
    - Menus & Notifications Standardization: Enforces the Dual Identifier Strategy on `Menu` and `Notification` models. Converts `menus.id` and `menus.parent_id` to 64-bit `BigInteger`, adds sequential RFC 9562 `public_id: UUID` (with `uuid.uuid7` default) to `notifications`, converts `notifications.id` to 64-bit `BigInteger`, and refactors `menu_roles` and `menu_permissions` to composite primary keys `(menu_id, role_id)` and `(menu_id, permission_id)` with reverse FK indexing.

---

## 🕒 Timestamp Revision IDs (No Random Hashing)

### The Problem with Default Hashes
By default, Alembic generates random hex hashes like `732700ee0bae` or `aeafa3d4d6aa`. This causes:
- Unordered file lists in your IDE file tree.
- Confusion about which migration was applied when.
- Opaque revision identifiers in error logs and commit histories.

### The Solution: Automated UTC Timestamps
Our configuration enforces timestamp revision IDs:
1. **`alembic.ini`**:
   ```ini
   file_template = %%(rev)s_%%(slug)s
   revision_environment = true
   ```
2. **`alembic/env.py` (`process_revision_directives`)**:
   ```python
   def process_revision_directives(context, revision, directives):
       for directive in directives:
           if not directive.rev_id or len(directive.rev_id) < 14:
               directive.rev_id = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
   ```
Every new migration automatically receives a format like:
- **Filename**: `20261014143000_add_customer_deals.py`
- **Revision ID**: `revision: str = "20261014143000"`

---

## ❓ Why Does `alembic_version` Only Save the Last Migration?

When you query PostgreSQL:
```sql
SELECT * FROM alembic_version;
```
You will notice it only contains **one single row** (e.g. `20261014120004`).

### The Design Rationale (Git-like Pointer Architecture)
Alembic models database migrations as a **Directed Acyclic Graph (DAG) / Linked List**, similar to Git commits:
1. Each Python migration script in `alembic/versions/` defines:
   - `revision = "20261014120004"` (this migration's timestamp)
   - `down_revision = "20261014120003"` (the parent migration timestamp)
2. The database table `alembic_version` only acts as the **`HEAD` pointer**, marking where the database currently sits on the tree.
3. When Alembic executes, it reads the current pointer in PostgreSQL, inspects the migration files in `alembic/versions/`, and traverses the entire chain of parent revisions back to `<base>`.

---

## 🔍 How to Inspect Applied vs Pending Migrations

Use Alembic's built-in inspection commands:

### 1. View Migration Tree with Current Pointer
```bash
uv run alembic history --indicate-current
```
**Example Output:**
```text
20261014120003 -> 20261014120004 (head) (current), create general master tables schema
20261014120002 -> 20261014120003, create rbac schema
20261014120001 -> 20261014120002, create users and identity schema
<base> -> 20261014120001, create organizations schema
```
- `(current)` indicates where your database is currently positioned.
- `(head)` indicates the latest available migration in `alembic/versions/`.

### 2. View Detailed History with Timestamps and Authors
```bash
uv run alembic history --verbose
```
Displays the exact file path, author, creation timestamp, revision ID, and parent revision for every migration in the repository.

### 3. Check Current Database Version
```bash
uv run alembic current
```

---

## ⏪ How to Revoke (Roll Back) and Replay Migrations

Alembic provides bidirectional migration operations via `upgrade()` and `downgrade()`:

### 1. Revoke the Last Migration (Step Back by 1)
```bash
uv run alembic downgrade -1
```
Executes the `downgrade()` function of the current migration and steps the database back to its parent revision.

### 2. Revoke to a Specific Revision
```bash
uv run alembic downgrade 20261014120002
```
Rolls back all intermediate migrations until the database reaches `20261014120002`.

### 3. Revoke All Migrations (Clean Slate)
```bash
uv run alembic downgrade base
```
Rolls back all migrations back to the initial blank schema.

### 4. Replay / Apply Migrations (Forward)
```bash
# Apply only the next pending migration:
uv run alembic upgrade +1

# Replay all pending migrations up to the latest head:
uv run alembic upgrade head
```

---

## 🛡️ Migration Best Practices for Teams & AI Agents

1. **Keep Migrations Modular**: Decouple changes by domain or functional module. Never combine unrelated entities into a single mega-migration.
2. **Always Implement `downgrade()`**: When authoring or autogenerating migrations, verify that `downgrade()` accurately drops or reverses tables, columns, indexes, and constraints.
3. **Never Edit an Applied Migration in Production**: Once a migration has been committed and applied to staging or production, generate a **new forward migration** to apply fixes or alterations.
4. **Enforce Verification Checklist**:
   - `uv run alembic check` (detects any model vs schema discrepancies)
   - `uv run pytest` (verifies tests against schema)
   - `uv run ruff check .` (verifies syntax and formatting)
