from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.infrastructure.database.session import get_db_session
from app.modules.users.models import User

# HTTP Bearer authentication scheme.
#
# FastAPI extracts the token from:
#
# Authorization: Bearer <access_token>
#
# The access token is used to identify the authenticated user.
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials,
        Depends(bearer_scheme),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> User:
    token = credentials.credentials

    # Decode and validate the JWT access token.
    #
    # This verifies the token signature, expiration,
    # and token type.
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # Load the current user from the database.
    #
    # We deliberately query the database instead of trusting
    # user information stored inside the JWT. This allows
    # changes such as account suspension or deletion to take
    # effect immediately.
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # The user is authenticated, but their account is not
    # currently allowed to use the API.
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    return user