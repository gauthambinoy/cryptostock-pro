"""
Application configuration using Pydantic Settings
"""
import logging
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://localhost/quantumledger_db"
    
    # Security
    secret_key: str = ""  # MUST be set via SECRET_KEY env var
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API Keys
    coingecko_api_key: str = ""
    alpha_vantage_key: str = ""
    anthropic_api_key: str = ""

    # Email Service (SendGrid)
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@quantumledger.ai"

    # SMS Service (Twilio)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # Payment Processing (Stripe)
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_monthly_price_id: str = ""
    stripe_pro_annual_price_id: str = ""
    stripe_enterprise_monthly_price_id: str = ""
    stripe_enterprise_annual_price_id: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Server
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


def setup_logging(debug: bool = False):
    """Configure application logging"""
    log_level = logging.DEBUG if debug else logging.INFO
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(),
        ]
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance. Raises ValueError in production if secret_key is missing."""
    settings = Settings()
    if not settings.secret_key:
        if not settings.debug:
            raise ValueError(
                "SECRET_KEY environment variable must be set in production. "
                "Set SECRET_KEY to a secure random string."
            )
        import secrets
        settings.secret_key = secrets.token_urlsafe(64)
        logging.getLogger(__name__).warning(
            "SECRET_KEY not set! Auto-generated a random key. "
            "This is only acceptable in debug mode. Set SECRET_KEY env var for production."
        )
    return settings
