from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "local"
    api_prefix: str = "/api/v1"
    cors_allow_origins: str = ""
    database_url: str = "sqlite:////data/app.db"
    data_dir: str = "/data"
    upload_max_bytes: int = 25 * 1024 * 1024
    scan_cache_ttl_minutes: int = 30
    scan_cache_max_items: int = 200
    decode_cache_ttl_minutes: int = 30
    decode_cache_max_items: int = 100
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    admin_email: str | None = None
    admin_password: str | None = None

    class Config:
        env_prefix = "SMARTPARKS_"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
