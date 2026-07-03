"""Environnement Alembic — migrations async vers PostGIS.

L'URL provient des réglages ATLAS (variables d'environnement / .env),
jamais d'alembic.ini : une seule source de vérité.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from atlas.config import get_settings
from atlas.infrastructure.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", get_settings().database_url)

# Les modèles ORM s'enregistrent sur Base au fil des tâches ; leur import
# ici les rend visibles de l'autodetect. (Aucun modèle pour l'instant.)
target_metadata = Base.metadata

# Tables gérées hors Alembic (PostGIS, tuiles) à ignorer par l'autodetect.
EXCLUDED_TABLES = {"spatial_ref_sys"}


def include_object(obj, name, type_, reflected, compare_to):  # type: ignore[no-untyped-def]
    """Exclut les tables système PostGIS de la comparaison."""
    return not (type_ == "table" and name in EXCLUDED_TABLES)


def run_migrations_offline() -> None:
    """Génère le SQL sans connexion (mode --sql)."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def _run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Applique les migrations via l'engine async."""
    engine = async_engine_from_config(config.get_section(config.config_ini_section, {}))
    async with engine.connect() as connection:
        await connection.run_sync(_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
