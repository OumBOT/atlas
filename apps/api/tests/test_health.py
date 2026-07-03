"""La sonde /health répond 200 et décrit ses composants, même sans services."""

import httpx

from atlas.presentation.app import create_app


async def test_health_reports_components_without_services() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert set(body["components"]) == {"database", "redis"}
