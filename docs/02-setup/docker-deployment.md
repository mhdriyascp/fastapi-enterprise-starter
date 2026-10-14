# 02. Setup — Docker & Container Deployment

## Container Strategy

The platform ships with a **hardened, multi-stage Dockerfile** designed to optimize image size and security:
- **Builder Stage**: Installs `uv`, compiles C extensions (e.g. `asyncpg`), and installs virtual environment.
- **Runtime Stage**: Copies only the pre-compiled virtual environment and application code onto a lean base image.
- **Security**: Runs under an unprivileged user (`appuser`), minimizing attack vectors.

---

## Deployment Modes

### Mode 1: Hybrid Dev (PostgreSQL in Docker, App Locally)
Recommended for daily development to benefit from instant hot-reloading with native debuggers:

```bash
# 1. Start database container
docker compose up -d postgres

# 2. Check health
docker compose ps

# 3. Apply migrations & run app locally
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

---

### Mode 2: Full Docker Stack (Production Simulation)
Runs both the PostgreSQL database and the FastAPI application inside containerized Docker networks:

```bash
# Build and start all services
docker compose up --build -d

# Verify container statuses
docker compose ps

# Inspect application logs
docker compose logs -f api
```

---

## Production Dockerfile Best Practices

```dockerfile
# 1. Uses locked uv dependencies without re-resolving:
RUN uv sync --frozen --no-dev --no-install-project

# 2. Runs as non-root user:
USER appuser

# 3. Production ASGI launch:
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Useful Docker Commands

| Action | Command |
|---|---|
| Rebuild containers | `docker compose up --build -d` |
| View container logs | `docker compose logs -f api` |
| Execute shell in container | `docker compose exec api sh` |
| Stop containers | `docker compose stop` |
| Clean teardown (preserves data) | `docker compose down` |
| Destructive volume wipe | `docker compose down -v` |
