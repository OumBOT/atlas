"""Le territoire — l'entité vivante au cœur d'ATLAS (CONCEPTION §-1)."""

from dataclasses import dataclass
from typing import Any, Protocol
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Territory:
    """Identité d'un territoire, sans sa géométrie lourde."""

    id: UUID
    code_insee: str
    name: str
    stats: dict[str, Any]
    centroid_lon: float
    centroid_lat: float
    buildings: int = 0


class TerritoryRepository(Protocol):
    """Port d'accès aux territoires (implémenté par l'infrastructure)."""

    async def list_all(self) -> list[Territory]:
        """Tous les territoires connus, ordonnés par nom."""
        ...

    async def get_boundary_geojson(self, code_insee: str) -> dict[str, Any] | None:
        """Contour GeoJSON (geometry) d'un territoire, ou None si inconnu."""
        ...
