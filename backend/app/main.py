from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.bootstrap import bootstrap_admin
from app.db.base import Base
from app.db.session import SessionLocal
from app.api.routes import auth, files, scan


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

    @app.on_event("startup")
    def _on_startup() -> None:
        db = SessionLocal()
        try:
            Base.metadata.create_all(bind=db.get_bind())
            bootstrap_admin(db)
        finally:
            db.close()

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

    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(files.router, prefix=settings.api_prefix)
    app.include_router(scan.router, prefix=settings.api_prefix)

    return app


app = create_app()
