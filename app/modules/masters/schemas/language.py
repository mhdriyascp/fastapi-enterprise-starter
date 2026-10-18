from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.base_schema import BaseSchema


class LanguageCreate(BaseModel):
    code: str = Field(min_length=1, max_length=10)
    name: str = Field(min_length=1, max_length=100)
    native_name: str | None = Field(default=None, max_length=100)


class LanguageUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=10)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    native_name: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class LanguageResponse(BaseSchema):
    id: int | None = None
    public_id: UUID
    code: str
    name: str
    native_name: str | None
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
