from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "local"
    api_prefix: str = "/api/v1"
    cors_allow_origins: str = ""

    class Config:
        env_prefix = "SMARTPARKS_"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
