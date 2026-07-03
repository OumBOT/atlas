"""Infrastructure — accès PostgreSQL/PostGIS (SQLAlchemy async).

Fournit l'engine et la fabrique de sessions. Les repositories concrets
(à venir avec les entités du domaine) s'appuieront sur ``session_factory``.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from atlas.config import get_settings


class Base(DeclarativeBase):
    """Base declarative commune à tous les modèles ORM d'ATLAS."""


def create_engine() -> AsyncEngine:
    """Crée l'engine async vers PostGIS (pool par défaut).

    L'écho SQL est volontairement désactivé (trop verbeux au quotidien) ;
    le réactiver ponctuellement en passant ``echo=True`` ici.
    """
    settings = get_settings()
    return create_async_engine(settings.database_url, pool_pre_ping=True)


# Engine et fabrique de sessions au niveau module : un seul pool par process.
engine: AsyncEngine = create_engine()
session_factory = async_sessionmaker(engine, expire_on_commit=False)


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    """Ouvre une session transactionnelle (commit/rollback automatiques)."""
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
