from app.core.config import settings
from app.core.timezone import (
    get_current_app_time,
    get_current_utc,
)


def main() -> None:
    print("Configured timezone:", settings.app_timezone)
    print("Current UTC:", get_current_utc().isoformat())
    print("Application time:", get_current_app_time().isoformat())


if __name__ == "__main__":
    main()