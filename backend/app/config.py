from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ankita_expoverse"
    redis_url: str = "redis://localhost:6379"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    livekit_url: str = ""
    frontend_url: str = "http://localhost:3000"
    allowed_origins: str = ""
    allowed_origin_regex: str = ""
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""
    bootstrap_admin_name: str = "Ankita Admin"
    google_client_id: str = ""
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    enforce_live_slot_gating: bool = False
    live_session_stale_minutes: int = 240
    otp_expiry_seconds: int = 300
    otp_resend_cooldown_seconds: int = 45
    otp_max_attempts: int = 5
    otp_debug_response: bool = False
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_phone: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
