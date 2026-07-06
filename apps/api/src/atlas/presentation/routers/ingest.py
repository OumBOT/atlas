"""ATLAS apprend : ingestion des données d'un territoire depuis l'interface."""

from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import text

from atlas.infrastructure.connectors.osm import ingest as ingest_buildings
from atlas.infrastructure.db import session_factory

router = APIRouter(prefix="/territories/{code_insee}/ingest", tags=["apprentissage"])

_COUNT = text(
    """
    SELECT count(*) FROM atlas.osm_buildings b
    JOIN atlas.territories t ON t.id = b.territory_id
    WHERE t.code_insee = :code
    """
)

_EXISTS = text("SELECT 1 FROM atlas.territories WHERE code_insee = :code")


async def _buildings_count(code_insee: str) -> int | None:
    async with session_factory() as session:
        if (await session.execute(_EXISTS, {"code": code_insee})).scalar_one_or_none() is None:
            return None
        return int((await session.execute(_COUNT, {"code": code_insee})).scalar_one())


async def _learn(code_insee: str) -> None:
    try:
        count = await ingest_buildings(code_insee)
        print(f"  ✓ apprentissage {code_insee} : {count} bâtiments")
    except Exception as exc:
        print(f"  ✗ apprentissage {code_insee} : {exc}")


@router.post("/buildings", status_code=202)
async def learn_buildings(code_insee: str, tasks: BackgroundTasks) -> dict[str, Any]:
    """Lance l'apprentissage du bâti OSM en tâche de fond (202)."""
    count = await _buildings_count(code_insee)
    if count is None:
        raise HTTPException(status_code=404, detail="Territoire inconnu d'ATLAS.")
    if count > 0:
        return {"status": "already_known", "buildings": count}
    tasks.add_task(_learn, code_insee)
    return {"status": "learning", "buildings": 0}


@router.get("/buildings/status")
async def buildings_status(code_insee: str) -> dict[str, Any]:
    """Où en est la connaissance du bâti (le front sonde pendant l'apprentissage)."""
    count = await _buildings_count(code_insee)
    if count is None:
        raise HTTPException(status_code=404, detail="Territoire inconnu d'ATLAS.")
    return {"buildings": count}
