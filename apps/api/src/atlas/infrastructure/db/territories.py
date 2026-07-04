"""Repository PostGIS des territoires."""

import json
from typing import Any

from sqlalchemy import text

from atlas.domain.territory import Territory
from atlas.infrastructure.db import session_factory

_LIST = text(
    """
    SELECT id, code_insee, name, stats_cache,
           ST_X(ST_Centroid(boundary)) AS lon,
           ST_Y(ST_Centroid(boundary)) AS lat
    FROM atlas.territories
    ORDER BY name
    """
)

_BOUNDARY = text("SELECT ST_AsGeoJSON(boundary, 6) FROM atlas.territories WHERE code_insee = :code")


class PostGISTerritoryRepository:
    """Implémentation PostGIS du port TerritoryRepository."""

    async def list_all(self) -> list[Territory]:
        async with session_factory() as session:
            rows = (await session.execute(_LIST)).all()
        return [
            Territory(
                id=row.id,
                code_insee=row.code_insee,
                name=row.name,
                stats=row.stats_cache,
                centroid_lon=row.lon,
                centroid_lat=row.lat,
            )
            for row in rows
        ]

    async def get_boundary_geojson(self, code_insee: str) -> dict[str, Any] | None:
        async with session_factory() as session:
            value = (await session.execute(_BOUNDARY, {"code": code_insee})).scalar_one_or_none()
        if value is None:
            return None
        geometry: dict[str, Any] = json.loads(value)
        return geometry
