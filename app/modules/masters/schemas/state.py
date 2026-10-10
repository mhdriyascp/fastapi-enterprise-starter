from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StateCreate(BaseModel):
    country_public_id: UUID
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
    country_public_id: UUID | None = None
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


class StateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    country_id: int
    code: str | None
    name: str
    is_active: bool