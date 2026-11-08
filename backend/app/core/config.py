from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All settings come from environment variables (or a .env file)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"  # development | staging | production
    database_url: str = "postgresql+psycopg://legalcore:legalcore@localhost:5432/legalcore"
    secret_key: str = Field(default="change-me-in-production-please-use-64-random-chars")
    access_token_minutes: int = 60 * 12
    cookie_name: str = "lc_session"
    cookie_secure: bool = False  # set true behind HTTPS
    cors_origins: list[str] = ["http://localhost:3000"]

    upload_dir: Path = Path("./uploads")
    max_upload_mb: int = 10
    max_files_per_request: int = 5

    # First super admin, created by `python -m app.seed` if no admin exists yet.
    admin_email: str = "admin@legalcore.in"
    admin_password: str = ""
    admin_name: str = "Legal Core Admin"

    # Simple in-process rate limits (per client IP). Use a shared store such as Redis when running several API instances.
    rate_limit_login_per_min: int = 10
    rate_limit_track_per_min: int = 20
    rate_limit_create_per_min: int = 10

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and (s.secret_key.startswith("change-me") or len(s.secret_key) < 32):
        raise RuntimeError("SECRET_KEY must be set to a long random value in production")
    return s
