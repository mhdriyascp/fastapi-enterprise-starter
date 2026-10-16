from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.shared.base_schema import BaseSchema


class AddressCreate(BaseModel):
    """Validate data when creating an address."""

    model_config = ConfigDict(extra="ignore")

    organization_id: int | None = None
    branch_id: int | None = None

    address_type_id: int
    country_id: int
    state_id: int | None = None
    city_id: int | None = None

    address_line1: str = Field(min_length=1, max_length=200)
    address_line2: str | None = Field(default=None, max_length=200)
    landmark: str | None = Field(default=None, max_length=150)
    postal_code: str | None = Field(default=None, max_length=20)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    notes: str | None = None
    is_default: bool = False
    is_active: bool = True


class AddressUpdate(BaseModel):
    """Validate partial updates to an address."""

    model_config = ConfigDict(extra="ignore")

    organization_id: int | None = None
    branch_id: int | None = None

    address_type_id: int | None = None
    country_id: int | None = None
    state_id: int | None = None
    city_id: int | None = None

    address_line1: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    address_line2: str | None = Field(default=None, max_length=200)
    landmark: str | None = Field(default=None, max_length=150)
    postal_code: str | None = Field(default=None, max_length=20)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    notes: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class AddressResponse(BaseSchema):
    """Represent an address returned by the API."""

    id: int
    public_id: UUID

    organization_id: int | None
    branch_id: int | None

    address_type_id: int
    country_id: int
    state_id: int | None
    city_id: int | None

    address_line1: str
    address_line2: str | None
    landmark: str | None
    postal_code: str | None

    latitude: float | None
    longitude: float | None

    notes: str | None
    is_default: bool
    is_active: bool
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None

    created_at: datetime
    updated_at: datetime | None
