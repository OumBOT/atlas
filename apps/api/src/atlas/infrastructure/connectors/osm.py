"""Connecteur OpenStreetMap (Overpass) — le bâti d'un territoire.

La requête cible la zone administrative par son code INSEE (``ref:INSEE``),
donc aucune géométrie n'est transmise : Overpass fait le découpage.
La hauteur est estimée dans l'ordre : tag ``height`` (mètres), puis
``building:levels`` x 3 m, sinon 5 m par défaut (rez-de-chaussée + 1).

Usage (services démarrés, migrations appliquées, territoire seedé) :

    python -m atlas.infrastructure.connectors.osm 93066

Idempotent : relancer met à jour le bâti existant du territoire.
"""

import asyncio
import json
import sys
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy import text

from atlas.infrastructure.db import session_factory

# Miroirs en cascade : le serveur principal rejette parfois les clients
# programmatiques (406 anti-bot depuis 2026) ; kumi.systems est la parade usuelle.
OVERPASS_MIRRORS = (
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)

# Étiquette Overpass : un client identifié (les UA anonymes sont bloqués).
_HEADERS = {
    "User-Agent": "ATLAS/0.1 (projet portfolio geomatique; github.com/OumBOT/atlas)",
    "Accept": "application/json",
}
LEVEL_HEIGHT_M = 3.0
DEFAULT_HEIGHT_M = 5.0

_QUERY = """
[out:json][timeout:180];
area["ref:INSEE"="{code}"]["boundary"="administrative"]->.zone;
way["building"](area.zone);
out tags geom;
"""

_TERRITORY_ID = text("SELECT id FROM atlas.territories WHERE code_insee = :code")

_DELETE = text("DELETE FROM atlas.osm_buildings WHERE territory_id = :tid")

_INSERT = text(
    """
    INSERT INTO atlas.osm_buildings (osm_id, territory_id, geom, height_m, tags)
    VALUES (
        :osm_id, :tid,
        ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326),
        :height, CAST(:tags AS jsonb)
    )
    ON CONFLICT (osm_id) DO UPDATE SET
        territory_id = EXCLUDED.territory_id,
        geom = EXCLUDED.geom,
        height_m = EXCLUDED.height_m,
        tags = EXCLUDED.tags,
        ingested_at = now()
    """
)


@dataclass(frozen=True, slots=True)
class Building:
    osm_id: int
    geometry: dict[str, Any]
    height_m: float
    tags: dict[str, str]


def estimate_height(tags: dict[str, str]) -> float:
    """Hauteur en mètres : ``height`` > ``building:levels`` > défaut."""
    raw_height = tags.get("height")
    if raw_height:
        try:
            return float(raw_height.replace("m", "").strip().replace(",", "."))
        except ValueError:
            pass
    raw_levels = tags.get("building:levels")
    if raw_levels:
        try:
            return float(raw_levels.replace(",", ".")) * LEVEL_HEIGHT_M
        except ValueError:
            pass
    return DEFAULT_HEIGHT_M


def parse_buildings(payload: dict[str, Any]) -> list[Building]:
    """Convertit la réponse Overpass (ways + geometry) en bâtiments polygonaux."""
    buildings: list[Building] = []
    for element in payload.get("elements", []):
        if element.get("type") != "way":
            continue
        geometry = element.get("geometry")
        if not geometry or len(geometry) < 4:
            continue  # un polygone fermé demande au moins 4 points
        ring = [[point["lon"], point["lat"]] for point in geometry]
        first, last = ring[0], ring[-1]
        if first != last:
            ring.append(first)
        tags: dict[str, str] = element.get("tags", {})
        buildings.append(
            Building(
                osm_id=element["id"],
                geometry={"type": "Polygon", "coordinates": [ring]},
                height_m=estimate_height(tags),
                tags=tags,
            )
        )
    return buildings


async def fetch_buildings(code_insee: str) -> list[Building]:
    """Interroge Overpass pour le bâti de la commune (miroirs en cascade)."""
    query = _QUERY.format(code=code_insee)
    last_error: httpx.HTTPError | None = None
    async with httpx.AsyncClient(timeout=240, headers=_HEADERS) as client:
        for mirror in OVERPASS_MIRRORS:
            try:
                response = await client.post(mirror, data={"data": query})
                response.raise_for_status()
                return parse_buildings(response.json())
            except httpx.HTTPError as exc:
                print(f"  · {mirror} indisponible ({exc}) — miroir suivant", file=sys.stderr)
                last_error = exc
    raise last_error if last_error else RuntimeError("Aucun miroir Overpass configuré")


async def ingest(code_insee: str) -> int:
    """Récupère puis remplace le bâti du territoire. Retourne le nombre inséré."""
    buildings = await fetch_buildings(code_insee)

    async with session_factory() as session:
        territory_id = (
            await session.execute(_TERRITORY_ID, {"code": code_insee})
        ).scalar_one_or_none()
        if territory_id is None:
            msg = f"Territoire {code_insee} inconnu — lancer le seed d'abord."
            raise ValueError(msg)

        await session.execute(_DELETE, {"tid": territory_id})
        for building in buildings:
            await session.execute(
                _INSERT,
                {
                    "osm_id": building.osm_id,
                    "tid": territory_id,
                    "geom": json.dumps(building.geometry),
                    "height": building.height_m,
                    "tags": json.dumps(building.tags),
                },
            )
        await session.commit()
    return len(buildings)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : python -m atlas.infrastructure.connectors.osm <code_insee>", file=sys.stderr)
        sys.exit(2)
    code = sys.argv[1]
    try:
        count = asyncio.run(ingest(code))
        print(f"  ✓ {count} bâtiments ingérés pour {code}")
    except httpx.HTTPError as exc:
        print(f"Overpass injoignable : {exc}", file=sys.stderr)
        sys.exit(1)
