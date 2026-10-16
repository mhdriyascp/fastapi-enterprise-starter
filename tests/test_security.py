from uuid import uuid4

import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_password_hash_and_verify() -> None:
    password = "TestPassword123!"

    password_hash = hash_password(password)

    assert password_hash != password
    assert verify_password(password, password_hash)
    assert not verify_password("WrongPassword123!", password_hash)


def test_access_token_round_trip() -> None:
    user_id = uuid4()

    token = create_access_token(user_id)

    assert decode_access_token(token) == user_id


def test_invalid_access_token_is_rejected() -> None:
    assert decode_access_token("invalid.token.value") is None


def test_refresh_token_round_trip() -> None:
    user_id = uuid4()

    refresh_token = create_refresh_token(user_id)

    decoded = decode_refresh_token(refresh_token.token)

    assert decoded == (user_id, refresh_token.token_id)


def test_invalid_refresh_token_is_rejected() -> None:
    assert decode_refresh_token("invalid.token.value") is None


def test_refresh_token_hash_is_deterministic() -> None:
    token = "example-refresh-token"

    first_hash = hash_refresh_token(token)
    second_hash = hash_refresh_token(token)

    assert first_hash == second_hash
    assert first_hash != token


@pytest.mark.asyncio
async def test_http_security_headers_emitted() -> None:
    """Verifies that enterprise HTTP security headers are emitted on API responses."""
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/api/v1/health")
        assert response.status_code == 200
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert "Strict-Transport-Security" in response.headers
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert (
            response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        )
        assert "X-Request-ID" in response.headers
