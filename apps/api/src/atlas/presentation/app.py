"""Fabrique de l'application FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from atlas.config import get_settings
from atlas.presentation.routers import analyses, health, portraits, territories


def create_app() -> FastAPI:
    """Construit l'application, ses middlewares et ses routeurs."""
    settings = get_settings()

    app = FastAPI(
        title="ATLAS",
        summary="The Territory Intelligence System",
        version="0.1.0",
        docs_url="/docs" if settings.debug else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(territories.router)
    app.include_router(analyses.router)
    app.include_router(portraits.router)
    return app


app = create_app()
