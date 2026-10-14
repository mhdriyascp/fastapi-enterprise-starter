from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CRM Platform API"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    max_login_attempts: int = 5
    login_lockout_minutes: int = 15

    # Default application timezone
    app_timezone: str = "UTC"

    # Cross-Origin Resource Sharing (CORS) origins
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Initial administrator accounts used by database seeds.
    seed_super_admin_email: str | None = None
    seed_super_admin_username: str | None = None
    seed_super_admin_password: str | None = None

    seed_admin_email: str | None = None
    seed_admin_username: str | None = None
    seed_admin_password: str | None = None

    @field_validator("app_timezone")
    @classmethod
    def validate_app_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError(f"Invalid APP_TIMEZONE: {value}") from exc

        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
