"""Analyses sur grille : normalisation et API."""

from typing import Any

import httpx

from atlas.application.analyses import RunGridAnalysis
from atlas.domain.analysis import GridMetric
from atlas.presentation.app import create_app
from atlas.presentation.routers.analyses import get_gateway

CELLS = [
    {
        "geometry": {"type": "Polygon", "coordinates": []},
        "cell_m2": 1000.0,
        "built_m2": 250.0,
        "volume_m3": 3000.0,
    },
    {
        "geometry": {"type": "Polygon", "coordinates": []},
        "cell_m2": 1000.0,
        "built_m2": 500.0,
        "volume_m3": 12000.0,
    },
    {
        "geometry": {"type": "Polygon", "coordinates": []},
        "cell_m2": 1000.0,
        "built_m2": 0.0,
        "volume_m3": 0.0,
    },
]


class FakeGateway:
    async def grid_metric(
        self, code_insee: str, metric: GridMetric, cell_deg: float
    ) -> list[dict[str, Any]] | None:
        return CELLS if code_insee == "93066" else None


async def test_footprint_normalizes_on_territory_peak() -> None:
    result = await RunGridAnalysis(FakeGateway()).execute("93066", GridMetric.FOOTPRINT)
    assert result is not None
    values = [f["properties"]["value"] for f in result["features"]]
    assert values == [0.5, 1.0, 0.0]
    assert result["features"][0]["properties"]["ratio"] == 0.25
    assert result["metadata"]["cells"] == 3


async def test_volume_uses_volume_metric() -> None:
    result = await RunGridAnalysis(FakeGateway()).execute("93066", GridMetric.VOLUME)
    assert result is not None
    values = [f["properties"]["value"] for f in result["features"]]
    assert values == [0.25, 1.0, 0.0]


async def test_api_validates_metric_and_territory() -> None:
    app = create_app()
    app.dependency_overrides[get_gateway] = FakeGateway
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://t"
    ) as client:
        ok = await client.get("/territories/93066/analyses/footprint")
        unknown = await client.get("/territories/00000/analyses/footprint")
        bad_metric = await client.get("/territories/93066/analyses/nonsense")
    assert ok.status_code == 200
    assert ok.json()["metadata"]["metric"] == "footprint"
    assert unknown.status_code == 404
    assert bad_metric.status_code == 422
