"""Territoires : cas d'usage et API, sur repository factice."""

from typing import Any
from uuid import uuid4

import httpx

from atlas.application.territories import GetTerritoryBoundary
from atlas.domain.territory import Territory
from atlas.presentation.app import create_app
from atlas.presentation.routers.territories import get_repository

SAINT_DENIS = Territory(
    id=uuid4(),
    code_insee="93066",
    name="Saint-Denis",
    stats={"population": 149077, "surface_km2": 15.77},
    centroid_lon=2.3574,
    centroid_lat=48.9362,
    buildings=18175,
)


class FakeRepository:
    async def list_all(self) -> list[Territory]:
        return [SAINT_DENIS]

    async def get_boundary_geojson(self, code_insee: str) -> dict[str, Any] | None:
        if code_insee != "93066":
            return None
        return {
            "type": "MultiPolygon",
            "coordinates": [[[[2.3, 48.9], [2.4, 48.9], [2.4, 49.0], [2.3, 48.9]]]],
        }


def make_client() -> httpx.AsyncClient:
    app = create_app()
    app.dependency_overrides[get_repository] = FakeRepository
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def test_list_territories_exposes_stats_and_centroid() -> None:
    async with make_client() as client:
        body = (await client.get("/territories")).json()
    assert body == [
        {
            "code_insee": "93066",
            "name": "Saint-Denis",
            "population": 149077,
            "surface_km2": 15.77,
            "buildings": 18175,
            "centroid": [2.3574, 48.9362],
        }
    ]


async def test_boundary_wraps_geometry_in_feature() -> None:
    feature = await GetTerritoryBoundary(FakeRepository()).execute("93066")
    assert feature is not None
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "MultiPolygon"


async def test_unknown_territory_is_404() -> None:
    async with make_client() as client:
        response = await client.get("/territories/00000/boundary")
    assert response.status_code == 404
