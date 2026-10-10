from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IndustryCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)


class IndustryUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=30)
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class IndustryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    code: str
    name: str
    description: str | None
    is_active: bool