CRM Platform — Application Commands Reference

This document contains commonly used commands for developing, running, testing, and maintaining the CRM Platform.

Run commands from the project root unless otherwise specified.

⸻

1. Project Navigation

Navigate to the project root

cd ~/Documents/"My-Workspace"/"Python Learning "/"crm-platform"

If your actual directory name differs, use the correct path.

Display the project structure

tree -I '.git|.venv|__pycache__|.pytest_cache|.mypy_cache'

Display only the application structure:

tree app

Display the documentation directory:

tree docs

Display files up to three levels deep:

tree -L 3 -I '.git|.venv|__pycache__|.pytest_cache|.mypy_cache'

List files

ls -la

List Python files:

find app -type f -name '*.py'

⸻

2. Docker Commands

Start the PostgreSQL and pgAdmin containers

docker start crm-postgres crm-pgadmin

Check running containers

docker ps

Check all containers, including stopped containers

docker ps -a

Stop the containers

docker stop crm-postgres crm-pgadmin

Restart the containers

docker restart crm-postgres crm-pgadmin

View PostgreSQL logs

docker logs crm-postgres

Follow PostgreSQL logs continuously:

docker logs -f crm-postgres

View pgAdmin logs

docker logs crm-pgadmin

Open a PostgreSQL shell

docker exec -it crm-postgres psql -U postgres

Replace postgres with the configured PostgreSQL username if necessary.

List databases

Inside psql:

\l

Connect to a database

\c your_database_name

List tables

\dt

Exit PostgreSQL

\q

Note: Container names, usernames, database names, and exposed ports depend on your Docker configuration.

⸻

3. Python and uv Commands

Install or synchronize project dependencies

uv sync

Display the Python version

uv run python --version

Display the uv version

uv --version

Run a Python command

uv run python -c "print('Python is working')"

Verify that the FastAPI application imports

uv run python -c "from app.main import app; print('Application imported successfully')"

Start the development server

uv run uvicorn app.main:app --reload

The default local address is:

http://127.0.0.1:8000

Use the configured Scalar documentation route:

http://127.0.0.1:8000/scalar

The application also registers a health endpoint at:

GET /api/v1/health

⸻

4. Ruff — Code Quality and Formatting

Ruff checks Python code for linting errors and style issues.

Check the entire application

uv run ruff check app

Automatically fix supported issues

uv run ruff check app --fix

Review the output after running automatic fixes.

Check RBAC seed files

uv run ruff check app/seeds/rbac

Fix RBAC seed files

uv run ruff check app/seeds/rbac --fix

Check one file

uv run ruff check app/seeds/rbac/permissions.py

Fix one file

uv run ruff check app/seeds/rbac/permissions.py --fix

Check formatting

uv run ruff format --check app

Format the application

uv run ruff format app

Important: Review changes made by automatic fixes. Do not use unsafe fixes without understanding their effect.

⸻

5. Database Migrations — Alembic

Alembic manages changes to the PostgreSQL schema.

Check the current migration revision

uv run alembic current

Display migration history

uv run alembic history

Display the current migration heads

uv run alembic heads

Generate a migration

uv run alembic revision --autogenerate -m "describe schema change"

Review the generated migration before applying it.

Apply all pending migrations

uv run alembic upgrade head

Roll back one migration

uv run alembic downgrade -1

Display SQL for an upgrade without applying it

uv run alembic upgrade head --sql

Important: Test migrations before production deployment. Downgrades can lose data depending on the migration.

⸻

6. Database Seeding

The application provides a seed runner for registering and executing predefined data.

Run all registered seeds

uv run python -m app.seeds

The registered seed functions may include:

* Permissions.
* Roles.
* Role-permission assignments.
* Administrative users.
* Administrative user-role assignments.
* Master/reference data.

The actual seed operations are determined by the seed registry.

Inspect the seed registry

cat app/seeds/registry.py

Inspect the seed runner

cat app/seeds/runner.py

Inspect the generic seed helper

cat app/seeds/helpers.py

Important: Verify the database connection before running seeds. Seed operations can modify database records.

⸻

7. Authentication API

Example login request

The following JSON is an example request body, not a terminal command:

{
  "email": "john@example.com",
  "password": "MySecurePassword123!"
}

Replace these values with the credentials for an account that exists in your development database.

Login with curl

Replace /api/v1/auth/login with the actual login path registered by your application if it differs.

curl -X POST "http://127.0.0.1:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "MySecurePassword123!"
  }'

Check the authentication router and its registered endpoint to confirm the exact request schema and URL.

Call a protected endpoint

Replace <ACCESS_TOKEN> with a valid access token obtained from the login response.

curl "http://127.0.0.1:8000/api/v1/roles" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

The actual response depends on the user’s assigned permissions.

Security: Do not commit real passwords, access tokens, or other credentials to source control.

⸻

8. Master-Data API Examples

The examples below assume the corresponding routes are registered.

List countries

curl "http://127.0.0.1:8000/api/v1/masters/countries" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

List states

curl "http://127.0.0.1:8000/api/v1/masters/states" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

List cities

curl "http://127.0.0.1:8000/api/v1/masters/cities" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

These examples use GET requests. Create, update, and delete operations must follow the schemas and HTTP methods implemented by each router.

⸻

9. Testing

Run the test suite

uv run pytest

Run tests with verbose output

uv run pytest -v

Stop after the first failure

uv run pytest -x

Run a particular test file

uv run pytest tests/test_example.py

Replace the example path with an existing test file.

Run tests and display print output

uv run pytest -s

⸻

10. Inspect API Routes

Print registered routes

uv run python -c "from app.main import app; [print(sorted(route.methods or []), route.path) for route in app.routes if hasattr(route, 'path')]"

Check a specific route in OpenAPI

uv run python -c "from app.main import app; print(app.openapi()['paths'].get('/api/v1/health'))"

Check the mobile health endpoint

uv run python -c "from app.main import app; print(app.openapi()['paths'].get('/api/v1/mobile/health'))"

Check the admin health endpoint

uv run python -c "from app.main import app; print(app.openapi()['paths'].get('/api/v1/admin/health'))"

If a route returns None, verify that its router is included and that the route path matches the actual implementation.

⸻

11. Git Commands

Check working-tree status

git status

View changed-file summary

git diff --stat

View unstaged changes

git diff

Stage changes

git add -A

Review staged changes before committing.

View staged-file summary

git diff --cached --stat

View staged changes

git diff --cached

Commit changes

git commit -m "feat: describe the change"

View the latest commit

git log -1 --oneline

View recent commits

git log --oneline -10

Check for untracked files

git ls-files --others --exclude-standard

Never stage .env files, credentials, or unrelated files unintentionally.

⸻

12. Pre-Commit Checklist

Before committing application changes, run:

uv run ruff check app
uv run ruff format --check app
uv run python -c "from app.main import app; print('Application imported successfully')"
uv run pytest

Then inspect the Git changes:

git status
git diff --stat
git diff

If the checks pass and the changes are reviewed:

git add -A
git diff --cached --stat
git diff --cached
git commit -m "feat: describe the change"

Run the test command only if the project’s test suite is configured; otherwise, add tests as part of development.

⸻

13. Production Deployment Checklist

Production deployment should use a controlled deployment process rather than simply starting the development server.

Before deploying:

1. Configure production environment variables and secrets.
2. Use a production PostgreSQL database.
3. Verify network access and database permissions.
4. Run reviewed Alembic migrations.
5. Execute only the seed operations required for that environment.
6. Configure the production ASGI server and process management.
7. Disable development reload mode.
8. Configure HTTPS through the deployment infrastructure.
9. Configure logging, monitoring, backups, and recovery.
10. Verify authentication and authorization.
11. Run smoke tests against deployed endpoints.
12. Confirm that no development credentials or secrets are exposed.

Apply database migrations

uv run alembic upgrade head

Run production application

Use the production server and process-management configuration selected for the deployment environment. Do not use --reload in production.

Note: Production server settings, worker counts, container orchestration, reverse proxy configuration, and deployment commands depend on the infrastructure selected for this project.

⸻

14. Frontend & Next.js CLI Commands

All frontend commands should be executed from the `frontend/` directory:

```bash
cd frontend
```

### Development Server
```bash
# Start Next.js development server (default: http://localhost:3000)
npm run dev

# Start with custom port
npm run dev -- -p 3001

# Start bound to all network interfaces (for Docker / VM testing)
npm run dev -- -H 0.0.0.0

# Start with Turbopack (Next.js 15+ high-performance bundler)
npm run dev -- --turbo
```

### Production Build & Server
```bash
# Create optimized production build (compiles code, type-checks TS, prerenders pages)
npm run build

# Start production server (serves the optimized .next build)
npm run start

# Start production server on custom port
npm run start -- -p 8080
```

### Code Quality, Linting & Type Checking
```bash
# Run Next.js ESLint checks
npm run lint

# Automatically fix lint issues where possible
npx eslint . --fix

# Run TypeScript type check without emitting build files
npx tsc --noEmit
```

### Dependency Management & Maintenance
```bash
# Install frontend packages from package-lock.json
npm install

# Clean deterministic install for CI/CD environments
npm ci

# Check for outdated packages
npm outdated

# Audit dependencies for security vulnerabilities
npm audit

# Clear Next.js build cache (resolves stale Turbopack / compilation states)
rm -rf .next

# Hard reset of frontend dependencies
rm -rf node_modules package-lock.json && npm install
```

### Pre-Completion Quality Gate (Definition of Done)
```bash
# Execute from project root to verify frontend integrity:
cd frontend && npm run lint && npm run build
```

⸻

15. Quick Command Reference

Task	Command
Start Docker containers	`docker start crm-postgres crm-pgadmin`
Show containers	`docker ps -a`
Install backend dependencies	`uv sync`
Apply database migrations	`uv run alembic upgrade head`
Run seeds	`uv run python -m app.seeds`
Start backend dev server	`uv run fastapi dev app/main.py`
Check Ruff linting	`uv run ruff check .`
Fix Ruff issues	`uv run ruff check . --fix`
Check Ruff formatting	`uv run ruff format --check .`
Run pytest suite	`uv run pytest`
Install frontend dependencies	`cd frontend && npm install`
Start frontend dev server	`cd frontend && npm run dev`
Lint frontend code	`cd frontend && npm run lint`
Build frontend production bundle	`cd frontend && npm run build`
Start frontend production server	`cd frontend && npm run start`
Full DoD Quality Gate	`uv run ruff check . && uv run ruff format --check . && uv run pytest && cd frontend && npm run lint && npm run build`
Check Git status	`git status`
Commit changes	`git commit -m "feat: describe the change"`

⸻

16. Maintenance

Keep this document updated when:

* New application modules are introduced.
* API routes change.
* Frontend components, pages, or build scripts change.
* Authentication or authorization behavior changes.
* Database migration procedures change.
* Seed functions or registry entries change.
* Development or production commands change.

Commands that depend on environment-specific settings should be verified against the actual project configuration before use.