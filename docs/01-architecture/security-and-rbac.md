# 01. Architecture — Security & RBAC Architecture

## Authentication Lifecycle

Authentication follows industry-standard, stateless JWT tokens combined with stateful database session tracking for revocation capabilities.

```
┌────────┐               ┌─────────┐               ┌──────────┐
│ Client │               │ FastAPI │               │ Database │
└───┬────┘               └───┬─────┘               └────┬─────┘
    │  POST /auth/login      │                          │
    │───────────────────────>│                          │
    │                        │  Verify Credentials      │
    │                        │  Create AuthSession ────>│
    │  {access_jwt, refresh} │                          │
    │<───────────────────────│                          │
    │                        │                          │
    │  GET /resource         │                          │
    │  [Authorization: Bearer access_jwt]               │
    │───────────────────────>│                          │
    │                        │  Decode & verify claims  │
    │                        │  Inject get_current_user │
    │  200 OK Response       │                          │
    │<───────────────────────│                          │
```

---

## Token Specifications

- **Access Token**:
  - Format: Standard JWT (JSON Web Token) signed with HMAC-SHA256 (`HS256`).
  - Claims: `sub` (User UUID), `exp` (15 minutes expiration default), `iat`, `type="access"`.
  - Storage: In-memory on client.
- **Refresh Token**:
  - Format: Cryptographically secure random UUID string.
  - Storage: Hashed before persistence in the `auth_sessions` table (`app/infrastructure/database/models/identity/auth_session.py`).
  - Lifecycle: Rotated on every refresh call; automatically invalidated on password change or logout.

---

## Role-Based Access Control (RBAC) Data Model

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│     User     │          │   UserRole   │          │     Role     │
├──────────────┤1        *├──────────────┤*        1├──────────────┤
│ id (UUID)    │──────────│ user_id      │──────────│ id (UUID)    │
│ email        │          │ role_id      │          │ code         │
│ is_active    │          └──────────────┘          │ name         │
│ is_superuser │                                    │ is_system    │
└──────────────┘                                    └──────┬───────┘
                                                           │ 1
                                                           │
                                                           │ *
                                                    ┌──────┴───────┐
                                                    │RolePermission│
                                                    ├──────────────┤
                                                    │ role_id      │
                                                    │ permission_id│
                                                    └──────┬───────┘
                                                           │ *
                                                           │
                                                           │ 1
                                                    ┌──────┴───────┐
                                                    │  Permission  │
                                                    ├──────────────┤
                                                    │ id (UUID)    │
                                                    │ code         │
                                                    │ module       │
                                                    └──────────────┘
```

---

## Enforcing Permissions in Route Handlers

FastAPI route handlers use the `require_permission(...)` dependency:

```python
from app.api.dependencies.permissions import require_permission
from app.modules.users.models import User


@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization",
)
async def create_organization(
    data: OrganizationCreate,
    current_user: Annotated[User, Depends(require_permission("organization.create"))],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrganizationResponse: ...
```

### Authorization Resolution Flow:
1. `get_current_user` decodes the JWT and fetches the user from PostgreSQL.
2. If `current_user.is_superuser` is `True`, all permission checks pass unconditionally.
3. Otherwise, the dependency queries all active permissions attached to the user's assigned roles.
4. If the required permission string is missing, an `HTTP 403 Forbidden` exception is raised immediately.
