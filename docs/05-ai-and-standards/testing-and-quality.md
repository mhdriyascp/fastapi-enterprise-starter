# 05. Standards — Testing & Quality Verification

## Testing Architecture

Automated testing is configured using **Pytest** and **pytest-asyncio** in [`tests/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/tests/).

---

## Test Directory Structure

```
tests/
├── api/
│   └── test_openapi_v2.py      # OpenAPI schema & Scalar documentation tests
├── test_security.py            # Password hashing & JWT token round-trip tests
└── test_timezone.py            # Datetime & timezone utility tests
```

---

## Running Tests

```bash
# Run all tests
uv run pytest

# Run with verbose reporting
uv run pytest -v

# Run a specific test module
uv run pytest tests/api/test_openapi_v2.py
```

---

## Writing Route Tests with `TestClient`

FastAPI provides synchronous `TestClient` (via Starlette and httpx) for rapid, isolated route testing:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

---

## Code Quality Gates ("Definition of Done")

Before committing changes or concluding an AI code generation task, execute both commands:

```bash
# 1. Linting & Import Verification
uv run ruff check app tests

# 2. Code Formatting Verification
uv run ruff format --check app tests

# 3. Test Suite Pass
uv run pytest
```
If any check fails, the task is **not done** and must be resolved before proceeding.
