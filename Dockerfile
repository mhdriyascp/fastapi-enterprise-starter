# =============================================================================
# Stage 1: Builder
# Install dependencies using uv into an isolated virtual environment.
# =============================================================================
FROM python:3.14-slim AS builder

# Install uv — fast Python package manager.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency manifests first for layer caching.
COPY pyproject.toml uv.lock ./

# Install only production dependencies (no dev group) into /app/.venv.
RUN uv sync --frozen --no-dev

# =============================================================================
# Stage 2: Runtime
# Lean final image — no build tools, no uv binary, no dev dependencies.
# =============================================================================
FROM python:3.14-slim AS runtime

# Create a non-root user for security.
RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

WORKDIR /app

# Copy the pre-built virtual environment from the builder stage.
COPY --from=builder /app/.venv /app/.venv

# Copy application source code.
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Put the venv on PATH so `python` and `uvicorn` resolve correctly.
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Drop to non-root user.
USER appuser

# Expose the application port.
EXPOSE 8000

# Run database migrations then start the server.
# Override CMD in docker-compose for local dev (e.g., with --reload).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
