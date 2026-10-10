from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CurrencyCreate(BaseModel):
    code: str = Field(min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")
    name: str = Field(min_length=1, max_length=100)
    symbol: str | None = Field(default=None, max_length=10)
    decimal_places: int = Field(default=2, ge=0, le=6)


class CurrencyUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=3, max_length=3)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    symbol: str | None = Field(default=None, max_length=10)
    decimal_places: int | None = Field(default=None, ge=0, le=6)
    is_active: bool | None = None


class CurrencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    code: str
    name: str
    symbol: str | None
    decimal_places: int
    is_active: bool