import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import (
    InvalidHashError,
    VerificationError,
    VerifyMismatchError,
)
from jwt import InvalidTokenError

from app.core.config import settings

password_hasher = PasswordHasher()


# Password security

def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (
        VerifyMismatchError,
        VerificationError,
        InvalidHashError,
    ):
        return False


# JWT security

def create_access_token(user_id: UUID) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


@dataclass(frozen=True)
class RefreshToken:
    token: str
    token_id: UUID
    expires_at: datetime


def create_refresh_token(user_id: UUID) -> RefreshToken:
    now = datetime.now(UTC)
    expires_at = now + timedelta(
        days=settings.refresh_token_expire_days
    )

    token_id = uuid.uuid7()

    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": str(token_id),
        "iat": now,
        "exp": expires_at,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return RefreshToken(
        token=token,
        token_id=token_id,
        expires_at=expires_at,
    )


def decode_access_token(token: str) -> UUID | None:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        if payload.get("type") != "access":
            return None

        subject = payload.get("sub")

        if not subject:
            return None

        return UUID(subject)

    except (InvalidTokenError, ValueError):
        return None


def decode_refresh_token(
    token: str,
) -> tuple[UUID, UUID] | None:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        if payload.get("type") != "refresh":
            return None

        subject = payload.get("sub")
        token_id = payload.get("jti")

        if not subject or not token_id:
            return None

        return UUID(subject), UUID(token_id)

    except (InvalidTokenError, ValueError):
        return None


# Refresh-token security
def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()