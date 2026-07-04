"""Territoires — la porte d'entrée du monde d'ATLAS.

Contrat d'identité : cette couche expose des territoires, jamais des
détails d'orchestration interne.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from atlas.application.territories import GetTerritoryBoundary, ListTerritories
from atlas.domain.territory import TerritoryRepository
from atlas.infrastructure.db.territories import PostGISTerritoryRepository

router = APIRouter(prefix="/territories", tags=["territoires"])


def get_repository() -> TerritoryRepository:
    """Fournit l'implémentation du port (surchargée dans les tests)."""
    return PostGISTerritoryRepository()


Repository = Annotated[TerritoryRepository, Depends(get_repository)]


class TerritoryOut(BaseModel):
    """Un territoire tel que le front le consomme."""

    code_insee: str
    name: str
    population: int | None = None
    surface_km2: float | None = None
    centroid: tuple[float, float] = Field(description="[longitude, latitude]")


@router.get("")
async def list_territories(repository: Repository) -> list[TerritoryOut]:
    """Les territoires qu'ATLAS connaît, ordonnés par nom."""
    territories = await ListTerritories(repository).execute()
    return [
        TerritoryOut(
            code_insee=t.code_insee,
            name=t.name,
            population=t.stats.get("population"),
            surface_km2=t.stats.get("surface_km2"),
            centroid=(t.centroid_lon, t.centroid_lat),
        )
        for t in territories
    ]


@router.get("/{code_insee}/boundary")
async def get_boundary(code_insee: str, repository: Repository) -> dict[str, Any]:
    """Contour communal en Feature GeoJSON (WGS84, 6 décimales)."""
    feature = await GetTerritoryBoundary(repository).execute(code_insee)
    if feature is None:
        raise HTTPException(status_code=404, detail="Territoire inconnu d'ATLAS.")
    return feature
