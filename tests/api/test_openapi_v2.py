from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_global_scalar_endpoint() -> None:
    """Verifies that the global Scalar documentation endpoint renders."""
    response = client.get("/scalar")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")


def test_v2_scalar_endpoint() -> None:
    """Verifies that the dedicated v2 Scalar documentation endpoint renders."""
    response = client.get("/scalar/v2")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")
    assert "/api/v2/openapi.json" in response.text


def test_v2_openapi_json_filtering() -> None:
    """Verifies that the v2 OpenAPI schema only includes v2, Auth, and RBAC routes."""
    response = client.get("/api/v2/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    assert "paths" in schema
    paths = schema["paths"]

    # 1. Must include v2 endpoints
    assert "/api/v2/health" in paths

    # 2. Must include shared Auth and RBAC endpoints
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/roles" in paths

    # 3. Must NOT include non-v2, non-auth/rbac endpoints (e.g. organizations or v1 health)
    assert "/api/v1/health" not in paths
    assert "/api/v1/organizations" not in paths
