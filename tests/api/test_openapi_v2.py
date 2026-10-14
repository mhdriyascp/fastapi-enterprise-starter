from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_global_scalar_redirect() -> None:
    """Verifies that visiting /scalar redirects to /scalar/v1 documentation."""
    response = client.get("/scalar", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/scalar/v1"

    # Following redirects renders v1 scalar documentation.
    redirected = client.get("/scalar", follow_redirects=True)
    assert redirected.status_code == 200
    assert "html" in redirected.headers.get("content-type", "")
    assert "/api/v1/openapi.json" in redirected.text


def test_v1_scalar_endpoint() -> None:
    """Verifies that the dedicated v1 Scalar documentation endpoint renders."""
    response = client.get("/scalar/v1")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")
    assert "/api/v1/openapi.json" in response.text


def test_v2_scalar_endpoint() -> None:
    """Verifies that the dedicated v2 Scalar documentation endpoint renders."""
    response = client.get("/scalar/v2")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")
    assert "/api/v2/openapi.json" in response.text


def test_v1_openapi_json_isolation() -> None:
    """Verifies that /api/v1/openapi.json excludes all v2 endpoints."""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    assert "paths" in schema
    paths = schema["paths"]

    # 1. Must include v1 endpoints
    assert "/api/v1/health" in paths
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/users" in paths
    assert "/api/v1/menus" in paths
    assert "/api/v1/organizations" in paths

    # 2. Must strictly NOT include any v2 endpoints
    assert "/api/v2/health" not in paths


def test_v2_openapi_json_filtering() -> None:
    """Verifies that v2 OpenAPI schema includes v2 + shared General APIs (Auth, RBAC, Users, Menus)."""
    response = client.get("/api/v2/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    assert "paths" in schema
    paths = schema["paths"]

    # 1. Must include v2 endpoints
    assert "/api/v2/health" in paths

    # 2. Must include shared General APIs (Auth, RBAC, Users, Menus)
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/roles" in paths
    assert "/api/v1/users" in paths
    assert "/api/v1/menus" in paths

    # 3. Must NOT include non-v2, non-shared domain endpoints
    assert "/api/v1/health" not in paths
    assert "/api/v1/organizations" not in paths
    assert "/api/v1/countries" not in paths


def test_cors_preflight_allows_frontend() -> None:
    """Verifies that CORS preflight requests from the Next.js frontend are permitted."""
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    )
    assert "POST" in response.headers.get("access-control-allow-methods", "")
