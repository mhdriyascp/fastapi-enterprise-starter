from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, HttpUrl

from app.shared.base_schema import BaseSchema


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    code: str | None = Field(
        default=None, min_length=2, max_length=30, pattern=r"^[A-Za-z0-9_-]+$"
    )
    legal_name: str | None = Field(default=None, max_length=200)
    registration_number: str | None = Field(default=None, max_length=100)
    tax_registration_number: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    website: HttpUrl | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    legal_name: str | None = Field(default=None, max_length=200)
    registration_number: str | None = Field(default=None, max_length=100)
    tax_registration_number: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    website: HttpUrl | None = None


class OrganizationStatusUpdate(BaseModel):
    is_active: bool


class OrganizationResponse(BaseSchema):
    id: int
    public_id: UUID
    code: str
    name: str
    legal_name: str | None
    registration_number: str | None
    tax_registration_number: str | None
    email: str | None
    phone: str | None
    website: str | None
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None
