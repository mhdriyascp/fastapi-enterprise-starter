from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.base_schema import BaseSchema


class CityCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country_id: int
    state_id: int | None = None
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("City name cannot be empty.")
        return value


class CityUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country_id: int | None = None
    state_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()
        if not value:
            raise ValueError("City name cannot be empty.")
        return value


class CityResponse(BaseSchema):
    id: int
    public_id: UUID
    country_id: int
    state_id: int | None
    name: str
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
