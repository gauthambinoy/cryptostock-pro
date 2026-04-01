"""
Application configuration using Pydantic Settings
"""
import logging
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://localhost/cryptostock_db"
    
    # Security
    secret_key: str = ""  # MUST be set via SECRET_KEY env var
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API Keys
    coingecko_api_key: str = ""
    alpha_vantage_key: str = ""
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


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
    """Get cached settings instance. Auto-generates secret key if not set."""
    settings = Settings()
    if not settings.secret_key:
        import secrets
        settings.secret_key = secrets.token_urlsafe(64)
        logging.getLogger(__name__).warning(
            "SECRET_KEY not set! Generated a random key. Set SECRET_KEY env var for production."
        )
    return settings
