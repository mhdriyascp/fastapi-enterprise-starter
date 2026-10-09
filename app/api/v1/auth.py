from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.infrastructure.database.session import get_db_session
from app.modules.identity.exceptions import AccountLockedError
from app.modules.identity.service import IdentityService
from app.modules.users.models import User
from app.modules.users.schemas import (
    ChangePasswordRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.modules.users.service import UserService

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    service = UserService(db)

    try:
        user = await service.create_user(data)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except IntegrityError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "User could not be created because the email "
                "is already registered."
            ),
        ) from exc

    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    service = IdentityService(db)

    try:
        access_token, refresh_token = await service.login(data)

    except AccountLockedError:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Your account is temporarily locked. Please try again later.",
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    service = IdentityService(db)

    try:
        access_token, refresh_token = await service.refresh(
            data.refresh_token
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> UserResponse:
    return current_user


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
async def logout(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = IdentityService(db)

    try:
        await service.logout(data.refresh_token)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    return {
        "message": "Logged out successfully.",
    }


@router.post(
    "/logout-all",
    status_code=status.HTTP_200_OK,
)
async def logout_all(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = IdentityService(db)

    await service.logout_all(current_user.id)

    return {
        "message": "Logged out from all sessions successfully.",
    }
    
    
@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
)
async def change_password(
    data: ChangePasswordRequest,
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    user_service = UserService(db)

    try:
        await user_service.change_password(
            current_user,
            data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    identity_service = IdentityService(db)

    await identity_service.logout_all(
        current_user.id,
    )

    return {
        "message": "Password changed successfully.",
    }