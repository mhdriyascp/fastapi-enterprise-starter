from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings


def get_app_timezone() -> ZoneInfo:
    """Return the configured application timezone."""
    return ZoneInfo(settings.app_timezone)


def get_current_utc() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(UTC)


def get_current_app_time() -> datetime:
    """Return the current time in the application timezone."""
    return get_current_utc().astimezone(get_app_timezone())


def convert_to_app_timezone(value: datetime) -> datetime:
    """Convert a timezone-aware datetime to the application timezone."""
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Datetime must be timezone-aware.")

    return value.astimezone(get_app_timezone())