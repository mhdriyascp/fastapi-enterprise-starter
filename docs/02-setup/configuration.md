# 02. Setup — Configuration & Environment Variables

## Configuration Architecture

Application configuration is centralized under [`app/core/config.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/core/config.py) using Pydantic Settings (`BaseSettings`).

- Values are read from `.env` in local development and injected environment variables in production.
- Invalid types, missing required variables, or malformed database connection strings will trigger an immediate startup failure with clear diagnostics.

---

## Environment Variables Specification

| Variable | Type | Default | Description |
|---|---|---|---|
| `APP_NAME` | `str` | `"CRM Platform"` | Name displayed in Scalar API documentation and logs. |
| `APP_VERSION` | `str` | `"1.0.0"` | Current version string of the platform. |
| `ENVIRONMENT` | `str` | `"development"` | Environment identifier (`development`, `staging`, `production`). |
| `DEBUG` | `bool` | `false` | Enables verbose stack traces and debug output. |
| `DATABASE_URL` | `str` | *(Required)* | Asynchronous PostgreSQL connection string (`postgresql+asyncpg://...`). |
| `JWT_SECRET_KEY` | `str` | *(Required)* | 256-bit cryptographically secure secret used to sign access tokens. |
| `JWT_ALGORITHM` | `str` | `"HS256"` | Cryptographic algorithm used for signing tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `15` | Lifetime of short-lived JWT access tokens. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `int` | `30` | Lifetime of long-lived cryptographic refresh tokens. |
| `APP_TIMEZONE` | `str` | `"UTC"` | Default timezone applied across date-time normalization. |
| `CORS_ORIGINS` | `list[str]` | `["http://localhost:3000", "http://127.0.0.1:3000"]` | Allowed origins for Cross-Origin Resource Sharing (comma-separated string in `.env`). |


---

## Accessing Configuration in Code

Never access `os.environ` directly in application modules. Always import the strongly typed `settings` singleton:

```python
from app.core.config import settings

# Example usage
token_expiry = settings.access_token_expire_minutes
```

---

## Secrets Safety Policy

- **`.env`**: Local credentials only. **NEVER** commit `.env` to Git.
- **`.env.example`**: Committed template containing safe placeholders only.
- In production Kubernetes or AWS/GCP environments, inject secrets via AWS Secrets Manager, HashiCorp Vault, or environment secrets.
