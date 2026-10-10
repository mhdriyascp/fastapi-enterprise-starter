from datetime import UTC, datetime

from app.core.config import settings
from app.core.timezone import (
    get_current_app_time,
    get_current_utc,
)


def test_app_timezone_is_configured() -> None:
    assert settings.app_timezone == "Asia/Kolkata"


def test_get_current_utc_returns_utc_datetime() -> None:
    current_time = get_current_utc()

    assert isinstance(current_time, datetime)
    assert current_time.tzinfo is not None
    assert current_time.utcoffset() == datetime.now(UTC).utcoffset()


def test_get_current_app_time_uses_configured_timezone() -> None:
    current_time = get_current_app_time()

    assert isinstance(current_time, datetime)
    assert current_time.tzinfo is not None
    assert current_time.utcoffset().total_seconds() == 19800