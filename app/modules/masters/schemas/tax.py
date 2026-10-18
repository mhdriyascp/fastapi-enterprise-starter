from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.base_schema import BaseSchema


class TaxBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=30)
    rate: Decimal = Field(ge=0, max_digits=10, decimal_places=4)
    tax_type: str = Field(default="percentage")
    country_id: int = Field(gt=0)
    is_active: bool = True


class TaxCreate(TaxBase):
    pass


class TaxUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=30)
    rate: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=4,
    )
    tax_type: str | None = None
    country_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


class TaxResponse(BaseSchema, TaxBase):
    id: int
    public_id: UUID
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
