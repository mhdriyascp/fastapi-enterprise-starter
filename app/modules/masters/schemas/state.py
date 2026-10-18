from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.base_schema import BaseSchema


class StateCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country_id: int
    code: str | None = Field(default=None, max_length=20)
    name: str = Field(min_length=1, max_length=100)

    @field_validator("code", "name")
    @classmethod
    def normalize_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value


class StateUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country_id: int | None = None
    code: str | None = Field(default=None, max_length=20)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None

    @field_validator("code", "name")
    @classmethod
    def normalize_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value


class StateResponse(BaseSchema):
    id: int
    public_id: UUID
    country_id: int
    code: str | None
    name: str
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
