from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TimeZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=150)
    utc_offset: str | None = Field(default=None, max_length=10)


class TimeZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    label: str | None = Field(default=None, min_length=1, max_length=150)
    utc_offset: str | None = Field(default=None, max_length=10)
    is_active: bool | None = None


class TimeZoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    name: str
    label: str
    utc_offset: str | None
    is_active: bool