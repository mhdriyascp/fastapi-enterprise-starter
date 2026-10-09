FastAPI Enterprise Starter

A reusable foundation for building secure, modular, and maintainable backend applications with FastAPI.

FastAPI Enterprise Starter provides a common backend foundation that can be reused across multiple applications. It is designed to reduce repetitive development work by establishing consistent patterns for database access, user management, authentication, role-based access control (RBAC), permissions, configuration, and database migrations.

The goal is to build the foundation once and reuse it across CRM, ERP, SaaS, inventory management, and AI-powered applications.

Table of Contents

* Overview
* Features
* Technology Stack
* Architecture
* Project Structure
* Prerequisites
* Getting Started
* Local Development Setup
* Environment Configuration
* Database Management
* Running the Application
* Docker Setup
* RBAC Design
* Testing
* Common Commands
* Troubleshooting
* Security Guidelines
* Roadmap
* Contributing
* License

⸻

Overview

Most business applications require a common set of backend capabilities:

* User and account management
* Authentication and authorization
* Roles and permissions
* Database connectivity
* Database migrations
* Configuration management
* API documentation
* Automated testing

Implementing these capabilities repeatedly across projects increases development time and maintenance effort.

FastAPI Enterprise Starter provides a reusable starting point for these shared requirements while allowing each application to implement its own business logic independently.

Intended Applications

This starter can be extended to build:

* Customer Relationship Management (CRM)
* Enterprise Resource Planning (ERP)
* Inventory and warehouse management
* Project management systems
* SaaS applications
* Internal business applications
* AI-enabled enterprise applications
* Administration portals

Features

Feature	Purpose
Modular architecture	Organize application functionality into independent modules
FastAPI	Build REST APIs with automatic OpenAPI documentation
Asynchronous database access	Use SQLAlchemy’s asynchronous APIs with PostgreSQL
Database migrations	Manage schema changes using Alembic
User management foundation	Provide a starting point for application user management
RBAC foundation	Organize authorization around users, roles, and permissions
Seed data structure	Keep initial roles and permissions organized
Shared entity foundation	Establish common conventions for database models
Centralized configuration	Manage application settings in one place
API versioning	Organize endpoints under /api/v1
Dependency management	Reproducible Python environments using uv
Automated testing	Validate application behavior using pytest
Containerization	Support container-based development and deployment

Implementation status: The presence of a module or seed file does not imply that its functionality is complete. Authentication, authorization, API endpoints, and master data should be documented as implemented only after their behavior has been verified.

Technology Stack

Technology	Purpose
Python 3.14+	Programming language
FastAPI	REST API framework
Pydantic	Request and data validation
Pydantic Settings	Application configuration
SQLAlchemy 2.x	ORM and database access
asyncpg	Asynchronous PostgreSQL driver
PostgreSQL	Relational database
Alembic	Database schema migrations
PyJWT	JWT implementation support
Uvicorn	ASGI application server
Scalar	Alternative API documentation interface
uv	Dependency and environment management
pytest	Automated testing
Docker	Application containerization
Docker Compose	Multi-container development

⸻

Architecture

The application follows a modular structure that separates shared infrastructure from business functionality.

                 Client Applications
                         |
                         v
                  FastAPI Application
                         |
                         v
                   API Versioning
                      /     \
                     /       \
                    v         v
               API Routes   Dependencies
                    |       /         \
                    |      v           v
                    | Authentication  Authorization
                    |                    |
                    v                    v
                 Services <---------- Permissions
                    |
                    v
                 SQLAlchemy
                    |
                    v
                 PostgreSQL

Architectural Responsibilities

API layer

Handles HTTP requests, responses, routing, and API versioning.

Core layer

Contains application-wide configuration and shared functionality.

Infrastructure layer

Manages database connectivity, SQLAlchemy metadata, and shared database abstractions.

Modules

Contain domain-specific functionality, such as users, roles, permissions, and master data.

Seed data

Defines initial reference records that must be created during application initialization.

Alembic

Maintains the history of database schema changes.

As the application grows, each domain module can be expanded into separate models, schemas, services, and routers.

Project Structure

The following structure reflects the current project foundation. Additional files can be introduced as features are implemented.

fastapi-enterprise-starter/
│
├── .env
├── .env.example
├── .gitignore
├── pyproject.toml
├── uv.lock
├── alembic.ini
├── Dockerfile
├── compose.yaml
├── README.md
│
├── alembic/
│   ├── env.py
│   └── versions/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── api/
│   │   └── v1/
│   │       └── router.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   └── timezone.py
│   │
│   ├── infrastructure/
│   │   └── database/
│   │       ├── base.py
│   │       └── models/
│   │           └── base_entity.py
│   │
│   ├── modules/
│   │   └── users/
│   │       └── models.py
│   │
│   └── seeds/
│       └── rbac/
│           ├── permissions.py
│           ├── roles.py
│           ├── role_permissions.py
│           ├── users.py
│           └── user_roles.py
│
└── tests/

Directory Responsibilities

Path	Responsibility
app/main.py	Application entry point
app/api/v1/	Versioned API routing
app/core/	Shared application configuration
app/infrastructure/database/	Database infrastructure and model registry
app/modules/	Domain-specific functionality
app/seeds/rbac/	Initial RBAC data
alembic/	Database migration history
tests/	Automated tests
pyproject.toml	Project metadata and dependency declarations
uv.lock	Resolved dependency versions
alembic.ini	Alembic configuration

⸻

Prerequisites

Choose either a local development environment or a Docker-based environment.

Required tools:

* Git
* Python 3.14 or a compatible version satisfying pyproject.toml
* uv
* PostgreSQL, either locally installed or containerized

Docker Desktop is required only if you choose the Docker approach.

Install uv

On macOS or Linux:

curl -LsSf https://astral.sh/uv/install.sh | sh

Restart the terminal if necessary, then verify:

uv --version

Installation documentation:

https://docs.astral.sh/uv/getting-started/installation/

Install Docker Desktop

On macOS:

brew install --cask docker
open -a Docker

Verify:

docker --version
docker compose version
docker info

Docker must be running before you execute container commands.

⸻

Getting Started

1. Clone the repository

Replace <repository-url> with the actual GitHub repository URL.

git clone <repository-url>
cd fastapi-enterprise-starter

2. Install dependencies

uv sync

This creates or synchronizes the project environment using pyproject.toml and uv.lock.

3. Configure the environment

Create a local environment file:

cp .env.example .env

Update the database connection and other required configuration values.

4. Initialize the database

After configuring PostgreSQL and confirming that the SQLAlchemy models are registered with Alembic:

uv run alembic upgrade head

5. Start the application

uv run fastapi dev app/main.py

Alternatively, if Uvicorn is configured as the server entry point:

uv run uvicorn app.main:app --reload

6. Open API documentation

* Swagger UI: http://127.0.0.1:8000/docs
* ReDoc: http://127.0.0.1:8000/redoc
* OpenAPI JSON: http://127.0.0.1:8000/openapi.json

These endpoints are available when enabled by the application configuration.

⸻

Local Development Setup

This approach runs FastAPI directly on your computer and connects to a PostgreSQL instance.

Step 1. Install PostgreSQL on macOS

For example, using Homebrew:

brew install postgresql@17
brew services start postgresql@17

Check the installation:

psql --version
brew services list

Choose a PostgreSQL version supported by your deployment environment.

Step 2. Create the database

Connect to PostgreSQL using an account with permission to create users and databases:

psql postgres

Create a dedicated application user and database:

CREATE USER crm_user WITH PASSWORD 'replace_with_a_strong_password';
CREATE DATABASE crm_platform OWNER crm_user;

Exit the PostgreSQL shell:

\q

Test the connection:

psql "postgresql://crm_user:replace_with_a_strong_password@localhost:5432/crm_platform"

Step 3. Configure .env

An example asynchronous SQLAlchemy connection string is:

DATABASE_URL=postgresql+asyncpg://crm_user:replace_with_a_strong_password@localhost:5432/crm_platform

The environment variable name must match the settings defined in app/core/config.py.

Use postgresql+asyncpg:// when using SQLAlchemy with the asynchronous asyncpg driver.

Step 4. Install dependencies

uv sync

Step 5. Apply migrations

uv run alembic upgrade head

If no initial migration exists, ensure that the models are registered in the Alembic metadata before generating one:

uv run alembic revision --autogenerate -m "Initial schema"

Review the migration, then apply it:

uv run alembic upgrade head

Do not generate a duplicate initial migration if the repository already has a valid migration history.

Step 6. Run the development server

uv run fastapi dev app/main.py

Stop the server with Ctrl+C.

⸻

Environment Configuration

Keep environment-specific configuration outside the application source code.

Example .env.example:

APP_NAME=FastAPI Enterprise Starter
APP_ENV=development
DEBUG=true
DATABASE_URL=postgresql+asyncpg://crm_user:change_me@localhost:5432/crm_platform
TIMEZONE=Asia/Kolkata

This is an illustrative configuration. Use the actual variable names and types supported by your settings model.

Environment file conventions

File	Purpose	Commit to Git?
.env	Local secrets and configuration	No
.env.example	Configuration template with placeholders	Yes
pyproject.toml	Project metadata and dependency declarations	Yes
uv.lock	Resolved dependency versions	Yes

Ensure .env is listed in .gitignore.

Never commit database passwords, production tokens, private keys, or other credentials.

⸻

Database Management

The project uses SQLAlchemy and Alembic to manage the database.

Database migrations

Create a migration:

uv run alembic revision --autogenerate -m "Describe schema change"

Apply migrations:

uv run alembic upgrade head

Check the current revision:

uv run alembic current

View migration history:

uv run alembic history

Roll back one migration:

uv run alembic downgrade -1

Review rollback operations carefully, especially when they can remove data.

Model registration

For Alembic autogeneration to detect schema changes:

1. Define the SQLAlchemy models.
2. Ensure the models are imported into the metadata registry.
3. Configure target_metadata correctly in alembic/env.py.
4. Generate and review the migration.
5. Apply the migration to the intended database.

Autogenerated migrations must be reviewed before they are committed or deployed.

Seed data

The project organizes RBAC seed files under:

app/seeds/rbac/
├── permissions.py
├── roles.py
├── role_permissions.py
├── users.py
└── user_roles.py

These files should initialize the appropriate data in a predictable and repeatable way.

Seed execution should be explicitly implemented and documented. Do not assume that Alembic automatically executes these Python files.

⸻

Running the Application

Development mode

uv run fastapi dev app/main.py

Uvicorn alternative

uv run uvicorn app.main:app --reload

Run on a specific host and port

uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

Run tests

uv run pytest

Use development mode only for local development. Production deployments should use an appropriate server configuration without development reload.

⸻

Docker Setup

Docker can run PostgreSQL independently or run both the API and PostgreSQL in containers.

Option A: Run PostgreSQL in Docker

Create a compose.yaml file:

services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: crm_platform
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user -d crm_platform"]
      interval: 5s
      timeout: 5s
      retries: 10
volumes:
  postgres_data:

Add the password to your local .env:

POSTGRES_PASSWORD=replace_with_a_strong_local_password
DATABASE_URL=postgresql+asyncpg://crm_user:replace_with_a_strong_local_password@localhost:5432/crm_platform

Keep .env out of version control.

Start PostgreSQL:

docker compose up -d postgres

Check its status:

docker compose ps

View logs:

docker compose logs -f postgres

Once PostgreSQL is healthy, run migrations and start FastAPI locally:

uv run alembic upgrade head
uv run fastapi dev app/main.py

In this setup, FastAPI uses localhost because it runs outside Docker.

Option B: Run FastAPI and PostgreSQL in Docker

Create a Dockerfile:

FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

This example assumes that app.main:app is the correct entry point and that the locked production dependencies include everything needed to start the API.

Extend .dockerignore to exclude local configuration, Git metadata, virtual environments, and caches:

.env
.git/
.venv/
__pycache__/
.pytest_cache/
.ipynb_checkpoints/

Use the following compose.yaml:

services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: crm_platform
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user -d crm_platform"]
      interval: 5s
      timeout: 5s
      retries: 10
  api:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql+asyncpg://crm_user:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}@postgres:5432/crm_platform
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
volumes:
  postgres_data:

The API uses postgres as its database hostname because the containers communicate over the Compose network.

Build and start the services:

docker compose up --build -d

Check their status:

docker compose ps

View API logs:

docker compose logs -f api

Apply database migrations:

docker compose exec api alembic upgrade head

Open the API documentation:

http://127.0.0.1:8000/docs

Docker commands

Start services:

docker compose up -d

Rebuild and start:

docker compose up --build -d

Stop services:

docker compose stop

Restart services:

docker compose start

Follow logs:

docker compose logs -f

Stop and remove containers and the Compose network:

docker compose down

Data safety: docker compose down preserves named volumes. Avoid docker compose down -v unless you intentionally want to remove the database volume and its stored data.

⸻

RBAC Design

Role-Based Access Control provides a foundation for controlling which operations users may perform.

Relationship

User
  |
  v
UserRole
  |
  v
Role
  |
  v
RolePermission
  |
  v
Permission

Example roles

Role	Purpose
Administrator	Administrative operations
Manager	Authorized management operations
Viewer	Authorized read-only operations

These are illustrative roles. Their actual capabilities depend on the permissions configured in the application.

Example permissions

users:read
users:create
users:update
users:delete
roles:read
roles:create
roles:update
roles:delete

Authorization must be enforced by the backend on protected endpoints. Frontend visibility alone is not an authorization mechanism.

The initial implementation should define clear rules for role assignment, permission evaluation, and administrative access.

⸻

Testing

Run all tests:

uv run pytest

Run tests with verbose output:

uv run pytest -v

Run a specific test file:

uv run pytest tests/test_users.py -v

Add tests as functionality is implemented, including:

* Application startup
* Database connectivity
* User validation
* Authentication and token handling
* Role and permission assignments
* Unauthorized and forbidden requests
* Database migrations
* Repeatable seed execution

For a reusable starter, verify that a fresh database can be initialized using only the documented setup steps.

⸻

Common Commands

Task	Command
Install dependencies	uv sync
Add a dependency	uv add <package>
Add a development dependency	uv add --dev <package>
Run development server	uv run fastapi dev app/main.py
Run Uvicorn	uv run uvicorn app.main:app --reload
Run tests	uv run pytest
Generate migration	uv run alembic revision --autogenerate -m "Message"
Apply migrations	uv run alembic upgrade head
View current migration	uv run alembic current
Start Docker services	docker compose up -d
Rebuild Docker services	docker compose up --build -d
View Docker services	docker compose ps
View Docker logs	docker compose logs -f
Stop Docker services	docker compose stop
Remove Docker containers	docker compose down

⸻

Troubleshooting

PostgreSQL connection errors

Check whether PostgreSQL is running:

docker compose ps
docker compose logs postgres

Verify the database host, port, database name, username, and password.

Use localhost when FastAPI runs directly on your computer. Use the Compose service name postgres when FastAPI runs inside the Compose network.

Alembic does not detect models

Check model imports and target_metadata in alembic/env.py. All relevant models must be registered before Alembic can generate migrations reliably.

Dependency synchronization errors

Check the Python version required by pyproject.toml and verify that uv.lock matches the dependency declarations.

Regenerate the lockfile when necessary:

uv lock
uv sync

Review and commit the resulting changes.

Port conflicts

Check whether port 8000 is in use:

lsof -i :8000

Check PostgreSQL’s default port:

lsof -i :5432

Stop the conflicting process or change the relevant port mapping.

Docker database initialization

PostgreSQL initialization variables apply when the database volume is first initialized. Changing POSTGRES_USER, POSTGRES_PASSWORD, or POSTGRES_DB later does not automatically update an existing database.

Use an appropriate SQL operation or a deliberate database reinitialization procedure when credentials or database settings must change.

⸻

Security Guidelines

Before using the starter in production:

* Store secrets outside source control.
* Use strong database credentials.
* Verify password hashing and authentication behavior.
* Enforce backend authorization on protected operations.
* Validate request data.
* Configure CORS for trusted origins.
* Consider rate limiting and brute-force protection.
* Avoid logging tokens, passwords, and sensitive data.
* Review dependency vulnerabilities.
* Configure HTTPS and secure deployment settings.
* Test unauthorized and forbidden access.
* Establish database backup and recovery procedures.

A starter template is not automatically production-ready. Production readiness depends on the implemented security controls, testing, configuration, and deployment practices.

Roadmap

Potential enhancements include:

* Complete authentication APIs
* User CRUD APIs
* Role management APIs
* Permission management APIs
* Reusable authorization dependencies
* Shared master data modules
* Standardized exception handling
* Structured logging
* Comprehensive automated tests
* Docker-based development workflow
* CI pipeline
* Health and readiness endpoints
* GitHub template repository configuration

Update this roadmap as features are implemented and tested.

Contributing

Contributions are welcome.

Before submitting changes:

1. Keep changes modular and focused.
2. Add or update automated tests.
3. Review database migration compatibility.
4. Document new environment variables.
5. Never commit secrets or production data.

License

Add an appropriate license before publishing the repository for reuse. Until a license is included, do not assume that other users have permission to reuse or redistribute the code.

⸻

FastAPI Enterprise Starter
A reusable foundation for building modular backend applications.
