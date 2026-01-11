from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


def _build_cors_origins(settings):
    if settings.cors_allow_origins:
        return [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]

    if settings.app_env == "local":
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    return []


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Smart Parks LP0 Platform")

    cors_origins = _build_cors_origins(settings)
    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get(f"{settings.api_prefix}/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
