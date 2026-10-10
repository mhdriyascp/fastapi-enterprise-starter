from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UnitOfMeasureCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=100)
    symbol: str | None = Field(default=None, max_length=20)
    category: str | None = Field(default=None, max_length=50)


class UnitOfMeasureUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=30)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    symbol: str | None = Field(default=None, max_length=20)
    category: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class UnitOfMeasureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    code: str
    name: str
    symbol: str | None
    category: str | None
    is_active: bool