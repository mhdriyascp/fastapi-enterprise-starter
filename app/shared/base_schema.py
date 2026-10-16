"""Enterprise BaseSchema providing standardized Pydantic v2 configuration.

Features:
- ConfigDict(from_attributes=True) for seamless ORM model integration.
- Standardized ISO 8601 UTC date formatting (YYYY-MM-DDTHH:MM:SSZ) across all API models.
- Strips variable sub-second microsecond precision (.406703Z -> Z) for enterprise consistency.
"""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_serializer, field_validator


def format_iso_utc(dt: datetime | None) -> str | None:
    """Formats a datetime object to standard ISO 8601 UTC string (YYYY-MM-DDTHH:MM:SSZ).

    Args:
        dt: The datetime instance to format.

    Returns:
        Formatted UTC string or None if dt is None.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    else:
        dt = dt.astimezone(UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _normalize_value(value: Any) -> Any:
    """Recursively normalizes datetime instances in complex structures."""
    if isinstance(value, datetime):
        return format_iso_utc(value)
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {k: _normalize_value(v) for k, v in value.items()}
    return value


class BaseSchema(BaseModel):
    """Enterprise base Pydantic schema for all request/response models.

    Ensures that any model inheriting from BaseSchema:
    1. Supports ORM mode via `from_attributes=True`.
    2. Inbound: Automatically coerces and normalizes incoming `datetime` objects
       (naive or timezone-aware with offsets) into pure UTC (`tzinfo=UTC`).
    3. Outbound: Serializes all `datetime` attributes into standard ISO 8601 UTC string:
       `YYYY-MM-DDTHH:MM:SSZ` (e.g. `2026-10-16T05:54:55Z`).
    """

    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="after")
    @classmethod
    def _normalize_inbound_datetimes(cls, value: Any) -> Any:
        """Ensures all inbound datetimes are normalized to timezone-aware UTC."""
        if isinstance(value, datetime):
            if value.tzinfo is None:
                # Ambiguous naive datetime: strictly coerce to UTC
                return value.replace(tzinfo=UTC)
            # Timezone-aware datetime with offset (e.g. -04:00, +05:30): shift to UTC
            return value.astimezone(UTC)
        return value

    @field_serializer("*", mode="plain", when_used="json-unless-none")
    def _serialize_datetimes(self, value: Any, _info: Any) -> Any:
        return _normalize_value(value)
