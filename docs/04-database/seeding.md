# 04. Database — Seed Data Engine

## Overview

The database seed engine establishes foundational reference records, system roles, and administrator permissions in an idempotent fashion (safe to re-run multiple times).

- **Seed Engine Path**: [`app/seeds/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/seeds/)

---

## Executing Seeds

To execute all registered seeders:
```bash
uv run python -m app.seeds
```

---

## Seed Execution Registry

The registry in [`app/seeds/registry.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/seeds/registry.py) defines strict dependency order:

1. **System Permissions**: Registers all operational strings (`role.create`, `user.read`, `org.read`).
2. **System Roles**: Seeds core roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `VIEWER`).
3. **Role-Permission Mappings**: Binds permissions to default system roles.
4. **Master Catalogs**: Seeds ISO 3166 countries, ISO 4217 currencies, document types, and address types.

---

## Writing New Seeders

When creating a new seeder, follow the idempotent `upsert` pattern:
```python
async def seed_custom_catalog(db: AsyncSession) -> None:
    for code, name in CATALOG_ITEMS:
        stmt = (
            insert(CustomModel)
            .values(code=code, name=name)
            .on_conflict_do_update(
                index_elements=["code"],
                set_={"name": name},
            )
        )
        await db.execute(stmt)
    await db.commit()
```
