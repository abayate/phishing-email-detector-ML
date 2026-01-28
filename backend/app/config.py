from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, Field
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "PhishGuard"
    app_env: str = "dev"
    api_key: str = "dev-key-change-me"
    cors_origins: str = "http://localhost:5173"

    database_path: str = "./phishguard.db"

    model_dir: str = "./phishing_model"
    risk_threshold: float = 0.78

    auto_quarantine: bool = False
    poll_interval_seconds: int = 120

    # notifications
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    alert_to_email: str = ""

    # Gmail
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_redirect_uri: str = "http://localhost:8000/integrations/gmail/callback"

    # Microsoft
    ms_tenant_id: str = "common"
    ms_client_id: str = ""
    ms_client_secret: str = ""
    ms_redirect_uri: str = "http://localhost:8000/integrations/outlook/callback"

    tokens_fernet_key: str = ""

    def cors_list(self) -> List[str]:
        return [s.strip() for s in self.cors_origins.split(",") if s.strip()]


settings = Settings()
