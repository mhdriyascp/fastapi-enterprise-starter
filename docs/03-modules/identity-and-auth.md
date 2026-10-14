# 03. Modules — Identity & Authentication

## Overview

The Identity & Authentication module manages the complete cryptographic lifecycle of users, token issuance, session storage, and security policies.

- **Module Path**: [`app/modules/identity/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/identity/)
- **Router Path**: [`app/api/v1/auth/router.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/api/v1/auth/router.py)
- **Database Model**: [`app/infrastructure/database/models/identity/auth_session.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/identity/auth_session.py)

---

## API Endpoints

| Method | Endpoint | Description | Protected? |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Self-service user registration with email verification. | No |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password; returns access JWT and refresh token. | No |
| `POST` | `/api/v1/auth/refresh` | Exchange valid refresh token for a new access token and rotated refresh token. | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile, roles, and status. | Yes (`Bearer`) |
| `POST` | `/api/v1/auth/logout` | Revoke the current active session in PostgreSQL. | Yes (`Bearer`) |
| `POST` | `/api/v1/auth/logout-all` | Invalidate all active sessions across all devices for the user. | Yes (`Bearer`) |
| `POST` | `/api/v1/auth/change-password` | Verify existing password and set new password, revoking old sessions. | Yes (`Bearer`) |

---

## Session Model (`auth_sessions`)

Unlike purely stateless JWT architectures that cannot revoke stolen tokens, this platform records active refresh sessions in the database:

- `id`: UUID primary key
- `user_id`: Foreign key referencing `users.id`
- `refresh_token_hash`: SHA-256 hash of the issued refresh token (raw tokens are never stored)
- `ip_address`: Client IP at login
- `user_agent`: Browser/device identifier
- `is_revoked`: Boolean flag for instant revocation
- `expires_at`: Expiration timestamp

---

## Security Features

1. **Token Rotation**: Every time `/auth/refresh` is called, the old refresh token is marked revoked and a brand new refresh token is issued.
2. **Account Locking**: Protects against brute-force attacks via `IdentityService.record_failed_login()` and `AccountLockedError`.
3. **Password Security**: Supports salted password verification via Bcrypt or Argon2.
