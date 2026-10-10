from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CityCreate(BaseModel):
    country_public_id: UUID
    state_public_id: UUID | None = None
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("City name cannot be empty.")
        return value


class CityUpdate(BaseModel):
    country_public_id: UUID | None = None
    state_public_id: UUID | None = None
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


class CityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    country_id: int
    state_id: int | None
    name: str
    is_active: bool