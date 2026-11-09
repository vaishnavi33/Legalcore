from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
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
    max_files_per_request: int = 10
    # Optional virus scanning through a ClamAV daemon (clamd). Without it, files are marked "not scanned".
    clamd_host: str = ""
    clamd_port: int = 3310

    # Demo mode: shows a warning banner and, only when no SMS/email provider is set up, shows one-time codes on screen.
    demo_mode: bool = False

    # Notifications. Leave blank when not configured; the system then records "not configured" instead of pretending.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    sms_provider: str = ""  # not yet integrated; reserved for an Indian SMS gateway (DLT-registered templates)
    whatsapp_provider: str = ""  # not yet integrated; reserved for WhatsApp Business API
    otp_minutes: int = 10
    otp_max_attempts: int = 5
    track_session_minutes: int = 30

    # First super admin, created by `python -m app.seed` if no admin exists yet.
    admin_email: str = "admin@legalcore.in"
    admin_password: str = ""
    admin_name: str = "Legal Core Admin"

    # Simple in-process rate limits (per client IP). Use a shared store such as Redis when running several API instances.
    rate_limit_login_per_min: int = 10
    rate_limit_track_per_min: int = 20
    rate_limit_create_per_min: int = 10
    rate_limit_otp_per_hour: int = 6

    @field_validator("database_url")
    @classmethod
    def _driver(cls, v: str) -> str:
        # Hosts such as Render give postgres:// or postgresql:// URLs; SQLAlchemy needs the psycopg driver named.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and (s.secret_key.startswith("change-me") or len(s.secret_key) < 32):
        raise RuntimeError("SECRET_KEY must be set to a long random value in production")
    if s.is_production and s.demo_mode:
        raise RuntimeError("DEMO_MODE cannot be switched on in production")
    return s
