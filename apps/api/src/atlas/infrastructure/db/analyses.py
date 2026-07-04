"""Calculs d'analyses sur grille — implémentation PostGIS.

La grille est carrée en degrés (ST_SquareGrid), rognée au contour
communal ; les surfaces sont mesurées en géographie (m² vrais).
"""

import json
from typing import Any

from sqlalchemy import text

from atlas.domain.analysis import GridMetric
from atlas.infrastructure.db import session_factory

_EXISTS = text("SELECT 1 FROM atlas.territories WHERE code_insee = :code")

_GRID = text(
    """
    WITH territory AS (
        SELECT boundary FROM atlas.territories WHERE code_insee = :code
    ),
    grid AS (
        SELECT (ST_SquareGrid(:cell, boundary)).geom AS cell
        FROM territory
    ),
    cells AS (
        SELECT ST_Intersection(g.cell, t.boundary) AS cell
        FROM grid g, territory t
        WHERE ST_Intersects(g.cell, t.boundary)
    )
    SELECT
        ST_AsGeoJSON(c.cell, 6) AS geom,
        ST_Area(c.cell::geography) AS cell_m2,
        COALESCE(SUM(ST_Area(ST_Intersection(b.geom, c.cell)::geography)), 0) AS built_m2,
        COALESCE(
            SUM(ST_Area(ST_Intersection(b.geom, c.cell)::geography) * b.height_m), 0
        ) AS volume_m3
    FROM cells c
    LEFT JOIN atlas.osm_buildings b
        ON b.geom && c.cell AND ST_Intersects(b.geom, c.cell)
    GROUP BY c.cell
    """
)


class PostGISAnalysisGateway:
    """Implémentation PostGIS du port AnalysisGateway."""

    async def grid_metric(
        self, code_insee: str, metric: GridMetric, cell_deg: float
    ) -> list[dict[str, Any]] | None:
        async with session_factory() as session:
            exists = (await session.execute(_EXISTS, {"code": code_insee})).scalar_one_or_none()
            if exists is None:
                return None
            rows = (await session.execute(_GRID, {"code": code_insee, "cell": cell_deg})).all()
        return [
            {
                "geometry": json.loads(row.geom),
                "cell_m2": float(row.cell_m2),
                "built_m2": float(row.built_m2),
                "volume_m3": float(row.volume_m3),
            }
            for row in rows
        ]
