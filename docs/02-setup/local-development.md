# 02. Setup — Local Development Guide

## Prerequisites

Ensure the following tools are installed on your machine:
- **Python 3.14+** (Python 3.12+ also supported)
- [uv](https://docs.astral.sh/uv/) (v0.5+)
- **PostgreSQL 16 or 17** (installed natively or via Docker)

---

## Step 1: Install `uv`

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify installation
uv --version
```

---

## Step 2: Clone & Synchronize Dependencies

```bash
cd crm-platform

# Synchronize virtual environment from uv.lock
uv sync
```
This automatically provisions a local `.venv/` containing all required production and development dependencies (`pytest`, `ruff`, etc.).

---

## Step 3: Configure Local Environment

Copy the configuration template:
```bash
cp .env.example .env
```

Ensure your `.env` contains valid database credentials and a generated JWT secret:
```dotenv
APP_NAME=CRM Platform
APP_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=true

# Database Connection (Async Driver)
DATABASE_URL=postgresql+asyncpg://crm_user:your_password@localhost:5432/crm_platform

# Cryptographic Secrets (Generate via: openssl rand -hex 32)
JWT_SECRET_KEY=9a2b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

APP_TIMEZONE=UTC
```

---

## Step 4: Provision PostgreSQL

### Native Installation (macOS Homebrew)
```bash
brew install postgresql@17
brew services start postgresql@17

# Create user and database
psql postgres -c "CREATE USER crm_user WITH PASSWORD 'your_password';"
psql postgres -c "CREATE DATABASE crm_platform OWNER crm_user;"
```

---

## Step 5: Database Migrations & Seeds

```bash
# 1. Apply Alembic schema migrations
uv run alembic upgrade head

# 2. Seed system roles, permissions, and ISO reference data
uv run python -m app.seeds
```

---

## Step 6: Start the Development Server

```bash
uv run fastapi dev app/main.py
```

The application is now live:
- **API Base**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API v1 Documentation**: [http://127.0.0.1:8000/scalar/v1](http://127.0.0.1:8000/scalar/v1)
- **API v2 Documentation**: [http://127.0.0.1:8000/scalar/v2](http://127.0.0.1:8000/scalar/v2)

---

## Step 7: Start the Next.js Frontend Dashboard

In a new terminal window, navigate to the `frontend/` directory and launch the Next.js development server:

```bash
cd frontend
npm install
npm run dev
```

The enterprise dashboard is accessible at:
- **Dashboard UI**: [http://localhost:3000](http://localhost:3000)
- **Login Portal**: [http://localhost:3000/login](http://localhost:3000/login)

### Frontend Verification Commands

```bash
# Verify ESLint code health
npm run lint

# Compile and verify production build
npm run build
```

For complete Next.js CLI reference, see [CLI Commands Reference](../02-setup/cli-commands.md#14-frontend--nextjs-cli-commands).

