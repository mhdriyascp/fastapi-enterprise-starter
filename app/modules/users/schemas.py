from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    public_id: UUID
    first_name: str | None
    last_name: str | None
    display_name: str | None
    email: EmailStr
    phone: str | None = None
    status: str
    email_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime | None
    roles: list[str] = Field(default_factory=list)
    is_super_admin: bool = False
    permissions: list[str] = Field(default_factory=list)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(
        min_length=1,
        max_length=128,
    )
    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    display_name: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    status: str | None = Field(default=None, max_length=20)
    role_codes: list[str] | None = None
