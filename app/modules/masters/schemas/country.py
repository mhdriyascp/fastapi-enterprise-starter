from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CountryCreate(BaseModel):
    code: str = Field(min_length=2, max_length=2)
    iso3_code: str | None = Field(default=None, min_length=3, max_length=3)
    name: str = Field(min_length=1, max_length=100)
    phone_code: str | None = Field(default=None, max_length=10)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        value = value.strip().upper()
        if not value.isalpha() or len(value) != 2:
            raise ValueError("Country code must contain exactly two letters.")
        return value

    @field_validator("iso3_code")
    @classmethod
    def normalize_iso3_code(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip().upper()
        if not value.isalpha() or len(value) != 3:
            raise ValueError("ISO3 code must contain exactly three letters.")
        return value

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Country name cannot be empty.")
        return value


class CountryUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=2)
    iso3_code: str | None = Field(default=None, min_length=3, max_length=3)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone_code: str | None = Field(default=None, max_length=10)
    is_active: bool | None = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip().upper()
        if not value.isalpha() or len(value) != 2:
            raise ValueError("Country code must contain exactly two letters.")
        return value

    @field_validator("iso3_code")
    @classmethod
    def normalize_iso3_code(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip().upper()
        if not value.isalpha() or len(value) != 3:
            raise ValueError("ISO3 code must contain exactly three letters.")
        return value

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()
        if not value:
            raise ValueError("Country name cannot be empty.")
        return value


class CountryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    code: str
    iso3_code: str | None
    name: str
    phone_code: str | None
    is_active: bool