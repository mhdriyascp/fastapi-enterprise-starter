from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.base_schema import BaseSchema


class IndustryCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)


class IndustryUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=30)
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class IndustryResponse(BaseSchema):
    id: int | None = None
    public_id: UUID
    code: str
    name: str
    description: str | None
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
