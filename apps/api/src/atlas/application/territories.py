"""Cas d'usage — consultation des territoires."""

from typing import Any

from atlas.domain.territory import Territory, TerritoryRepository


class ListTerritories:
    """Liste les territoires qu'ATLAS connaît."""

    def __init__(self, repository: TerritoryRepository) -> None:
        self._repository = repository

    async def execute(self) -> list[Territory]:
        return await self._repository.list_all()


class GetTerritoryBoundary:
    """Retourne le contour d'un territoire (Feature GeoJSON) ou None."""

    def __init__(self, repository: TerritoryRepository) -> None:
        self._repository = repository

    async def execute(self, code_insee: str) -> dict[str, Any] | None:
        geometry = await self._repository.get_boundary_geojson(code_insee)
        if geometry is None:
            return None
        return {"type": "Feature", "properties": {"code_insee": code_insee}, "geometry": geometry}
