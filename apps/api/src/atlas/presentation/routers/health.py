"""Santé de l'API et de ses dépendances.

``GET /health`` répond toujours 200 avec l'état de chaque composant :
un composant en panne dégrade le statut global sans faire tomber la sonde
(le front et la CI décident quoi en faire).
"""

import asyncio
from typing import Literal

import redis.asyncio as aioredis
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from atlas.config import get_settings
from atlas.infrastructure.db import engine

router = APIRouter(tags=["système"])

ComponentState = Literal["ok", "unreachable"]
CHECK_TIMEOUT_S = 2.0


class HealthReport(BaseModel):
    """État de l'API et de ses dépendances directes."""

    status: Literal["ok", "degraded"]
    components: dict[str, ComponentState]


async def _check_database() -> ComponentState:
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_S), engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "ok"
    except Exception:  # toute panne = injoignable, sans exposer de détail
        return "unreachable"


async def _check_redis() -> ComponentState:
    client = aioredis.from_url(get_settings().redis_url)
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_S):
            await client.ping()
        return "ok"
    except Exception:  # idem
        return "unreachable"
    finally:
        await client.aclose()


@router.get("/health")
async def health() -> HealthReport:
    """Sonde de santé : API vivante + état de PostGIS et Redis."""
    database, redis_state = await asyncio.gather(_check_database(), _check_redis())
    components: dict[str, ComponentState] = {"database": database, "redis": redis_state}
    status: Literal["ok", "degraded"] = (
        "ok" if all(state == "ok" for state in components.values()) else "degraded"
    )
    return HealthReport(status=status, components=components)
