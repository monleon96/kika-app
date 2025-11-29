from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    public_base_url: str = "https://kika-backend.onrender.com"
    cors_allow_origins: list[str] = ["http://localhost:8501"]

    # Email configuration - Brevo API (replaces SMTP)
    brevo_api_key: Optional[str] = None
    mail_from: str = "no-reply@kika-app.com"
    mail_from_name: str = "KIKA"
    
    # Legacy SMTP (deprecated, kept for backward compatibility)
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None

    database_url: str

    jwt_secret: str
    jwt_expire_min: int = 60
    reset_token_expire_min: int = 30

    admin_api_key: str

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]
