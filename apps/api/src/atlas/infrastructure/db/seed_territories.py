"""Seed des territoires de démonstration.

Charge trois communes aux profils volontairement contrastés — un cœur
urbain dense, une commune rurale, une commune littorale — depuis
l'API officielle geo.api.gouv.fr (contours + chiffres clés).

Usage (services docker démarrés, migrations appliquées) :

    python -m atlas.infrastructure.db.seed_territories

Idempotent : relancer met à jour les territoires existants.
"""

import asyncio
import datetime
import json
import sys
from typing import Any

import httpx
from sqlalchemy import text

from atlas.infrastructure.db import session_factory

GEO_API = "https://geo.api.gouv.fr/communes/{code}"
FIELDS = "nom,code,population,surface,codesPostaux,contour"

#: (code INSEE, nom attendu — vérifié pour échouer bruyamment si le code dérive)
DEMO_COMMUNES: tuple[tuple[str, str], ...] = (
    ("93066", "Saint-Denis"),  # urbaine dense — le territoire du mémoire
    ("91405", "Milly-la-Forêt"),  # rurale
    ("35288", "Saint-Malo"),  # littorale
)

UPSERT = text(
    """
    INSERT INTO atlas.territories (code_insee, name, boundary, stats_cache)
    VALUES (
        :code_insee,
        :name,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:contour), 4326)),
        CAST(:stats AS jsonb)
    )
    ON CONFLICT (code_insee) DO UPDATE SET
        name = EXCLUDED.name,
        boundary = EXCLUDED.boundary,
        stats_cache = EXCLUDED.stats_cache,
        updated_at = now()
    """
)


def build_stats(payload: dict[str, Any]) -> dict[str, Any]:
    """Extrait les chiffres clés à mettre en cache, avec leur provenance.

    ``surface`` est fournie en hectares par l'API ; on la convertit en km²
    (deux décimales suffisent à l'échelle communale).
    """
    surface_ha = payload.get("surface")
    return {
        "population": payload.get("population"),
        "surface_km2": round(surface_ha / 100, 2) if surface_ha is not None else None,
        "codes_postaux": payload.get("codesPostaux", []),
        "source": "geo.api.gouv.fr",
        "fetched_at": datetime.datetime.now(datetime.UTC).isoformat(timespec="seconds"),
    }


async def fetch_commune(client: httpx.AsyncClient, code: str, expected_name: str) -> dict[str, Any]:
    """Récupère contour et chiffres clés d'une commune, avec garde-fou sur le nom."""
    response = await client.get(
        GEO_API.format(code=code),
        params={"fields": FIELDS, "format": "json", "geometry": "contour"},
    )
    response.raise_for_status()
    payload: dict[str, Any] = response.json()

    if payload.get("nom") != expected_name:
        msg = f"Code {code} : attendu « {expected_name} », reçu « {payload.get('nom')} »"
        raise ValueError(msg)
    if "contour" not in payload:
        msg = f"Code {code} : contour absent de la réponse"
        raise ValueError(msg)
    return payload


async def seed() -> None:
    """Récupère puis upserte les trois communes de démonstration."""
    async with httpx.AsyncClient(timeout=30) as client:
        communes = await asyncio.gather(
            *(fetch_commune(client, code, name) for code, name in DEMO_COMMUNES)
        )

    async with session_factory() as session:
        for payload in communes:
            await session.execute(
                UPSERT,
                {
                    "code_insee": payload["code"],
                    "name": payload["nom"],
                    "contour": json.dumps(payload["contour"]),
                    "stats": json.dumps(build_stats(payload)),
                },
            )
        await session.commit()

    for payload in communes:
        stats = build_stats(payload)
        print(
            f"  ✓ {payload['nom']} ({payload['code']}) — "
            f"{stats['population']:,} hab · {stats['surface_km2']} km²".replace(",", " ")
        )


if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except httpx.HTTPError as exc:
        print(f"geo.api.gouv.fr injoignable : {exc}", file=sys.stderr)
        sys.exit(1)
