from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.base_schema import BaseSchema


class SystemSettingResponse(BaseSchema):
    """Data contract for individual enterprise system setting records."""

    id: int
    public_id: UUID
    category: str
    key: str
    value: Any
    value_type: str
    label: str
    description: str | None = None
    is_public: bool
    is_system: bool
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime | None = None


class SystemSettingUpdate(BaseModel):
    """Payload contract for modifying a single system setting value."""

    value: Any = Field(description="The updated setting value matching its value_type")
    label: str | None = Field(default=None, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    sort_order: int | None = Field(
        default=None, description="Display ordering priority", ge=0
    )


class BulkSettingsUpdate(BaseModel):
    """Payload contract for updating multiple system settings in a single atomic transaction."""

    settings: dict[str, Any] = Field(
        description="Key-value mapping of setting key to new value, e.g. {'company_name': 'Acme Corp'}"
    )
    sort_orders: dict[str, int] | None = Field(
        default=None,
        description="Optional key-to-sort_order priority mapping, e.g. {'company_name': 10}",
    )


class PublicSettingsResponse(BaseSchema):
    """Dictionary of non-sensitive public configurations exposed for client-side bootstrapping."""

    settings: dict[str, Any] = Field(
        description="Public configuration key-value dictionary"
    )


class SelectOptionSchema(BaseSchema):
    """Dynamic option contract for Select2 and search-filtered dropdown comboboxes."""

    value: str
    label: str
    sublabel: str | None = None
    badge: str | None = None
    status: str | None = None


class SettingsOptionsResponse(BaseSchema):
    """Consolidated metadata dictionary supplying dynamic select options for settings configuration."""

    modules: list[SelectOptionSchema] = Field(
        description="Available platform and upcoming CRM domain modules"
    )
    roles: list[SelectOptionSchema] = Field(
        description="Active security roles fetched dynamically from RBAC registry"
    )
    currencies: list[SelectOptionSchema] = Field(
        description="Operating currencies fetched dynamically from Master catalog"
    )
    timezones: list[SelectOptionSchema] = Field(
        description="Standard timezones fetched dynamically from Master catalog"
    )
    languages: list[SelectOptionSchema] = Field(
        description="Supported locales and languages fetched dynamically from Master catalog"
    )
