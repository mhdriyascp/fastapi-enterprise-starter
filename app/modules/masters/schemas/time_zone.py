from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.base_schema import BaseSchema


class TimeZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=150)
    utc_offset: str | None = Field(default=None, max_length=10)


class TimeZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    label: str | None = Field(default=None, min_length=1, max_length=150)
    utc_offset: str | None = Field(default=None, max_length=10)
    is_active: bool | None = None


class TimeZoneResponse(BaseSchema):
    id: int | None = None
    public_id: UUID
    name: str
    label: str
    utc_offset: str | None
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
