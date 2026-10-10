from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LanguageCreate(BaseModel):
    code: str = Field(min_length=1, max_length=10)
    name: str = Field(min_length=1, max_length=100)
    native_name: str | None = Field(default=None, max_length=100)


class LanguageUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=10)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    native_name: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class LanguageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    code: str
    name: str
    native_name: str | None
    is_active: bool