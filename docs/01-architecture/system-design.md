# 01. Architecture — System Design & Layered Architecture

## Layered Design Philosophy

The codebase enforces a strict separation of concerns across four distinct horizontal layers. Under no circumstances should business logic or database queries bleed into API routers, nor should presentation concerns pollute database models.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HTTP Presentation Layer (FastAPI Routers)                │
│    - Parses incoming HTTP headers, params, and JSON body    │
│    - Invokes dependency injection (Auth, RBAC, DB session)  │
│    - Maps exceptions to HTTP status codes                   │
│    - Returns validated Pydantic response models             │
├─────────────────────────────────────────────────────────────┤
│ 2. Domain Service Layer (service.py)                        │
│    - Executes pure business logic & validation rules        │
│    - Orchestrates database transactions (commit / rollback) │
│    - Applies eager loading on entity relationships          │
├─────────────────────────────────────────────────────────────┤
│ 3. Persistence Layer (SQLAlchemy 2.0 Async Models)          │
│    - Located in app/infrastructure/database/models/         │
│    - Defines table columns, indexes, foreign keys           │
│    - Inherits from BaseEntity (UUID/int, created_at, etc.)  │
├─────────────────────────────────────────────────────────────┤
│ 4. Data Contract Layer (Pydantic v2 Schemas)                │
│    - Request payload validation via Field() constraints     │
│    - Response serialization with ConfigDict(from_attributes)│
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Conventions

Every business capability lives under `app/modules/<domain_name>/`:

```
app/modules/<domain>/
├── __init__.py
├── schemas.py       # Pydantic v2 request and response contracts
├── service.py       # Domain business logic & transaction handling
└── router.py        # FastAPI APIRouter endpoints & dependencies
```

Database entities are grouped in the persistence layer:
```
app/infrastructure/database/models/<domain>/
└── <entity>.py      # Declarative SQLAlchemy models
```

---

## Async SQLAlchemy 2.0 Best Practices

### 1. No `db.query()` — Use Core 2.0 `select()`
```python
# CORRECT
result = await self.db.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# FORBIDDEN (SQLAlchemy 1.x legacy)
user = db.query(User).filter(User.email == email).first()
```

### 2. Preventing `MissingGreenlet` via Eager Loading
Because relationships cannot be lazily loaded in asynchronous execution, relationships must be eagerly loaded at query time:
```python
from sqlalchemy.orm import selectinload

query = (
    select(Organization)
    .options(selectinload(Organization.users))
    .where(Organization.id == org_id)
)
result = await self.db.execute(query)
org = result.scalar_one_or_none()
```

### 3. Explicit Transaction Handling
Every database mutation must commit explicitly and roll back cleanly on errors:
```python
try:
    self.db.add(entity)
    await self.db.commit()
    await self.db.refresh(entity)
except IntegrityError as exc:
    await self.db.rollback()
    raise ConflictError("Entity with unique constraint already exists") from exc
except SQLAlchemyError:
    await self.db.rollback()
    raise DatabaseError("Failed to persist entity")
```
