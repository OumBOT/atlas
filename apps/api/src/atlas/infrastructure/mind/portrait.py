"""Le Portrait : ATLAS se présente un territoire à lui-même, puis à vous.

Pipeline : rassembler les faits (base + calculs), les soumettre à la
persona, structurer la réponse (résumé + cinq sections), persister.
Le portrait est régénéré sur demande, jamais silencieusement.
"""

import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text

from atlas.domain.analysis import GridMetric
from atlas.infrastructure.db import session_factory
from atlas.infrastructure.db.analyses import PostGISAnalysisGateway
from atlas.infrastructure.mind.llm import LLMClient, extract_json
from atlas.infrastructure.mind.persona import PERSONA

SECTIONS = ("forces", "faiblesses", "tendances", "risques", "opportunites")

_TERRITORY = text(
    """
    SELECT t.id, t.name, t.code_insee, t.stats_cache,
           (SELECT count(*) FROM atlas.osm_buildings b WHERE b.territory_id = t.id) AS buildings
    FROM atlas.territories t
    WHERE t.code_insee = :code
    """
)

_GET = text(
    """
    SELECT p.narrative, p.sections, p.facts, p.model, p.generated_at
    FROM atlas.portraits p
    JOIN atlas.territories t ON t.id = p.territory_id
    WHERE t.code_insee = :code
    """
)

_UPSERT = text(
    """
    INSERT INTO atlas.portraits (territory_id, narrative, sections, facts, model)
    VALUES (:tid, :narrative, CAST(:sections AS jsonb), CAST(:facts AS jsonb), :model)
    ON CONFLICT (territory_id) DO UPDATE SET
        narrative = EXCLUDED.narrative,
        sections = EXCLUDED.sections,
        facts = EXCLUDED.facts,
        model = EXCLUDED.model,
        generated_at = now()
    """
)


@dataclass(frozen=True, slots=True)
class Portrait:
    narrative: str
    sections: dict[str, list[str]]
    facts: dict[str, Any]
    model: str
    generated_at: str


async def gather_facts(code_insee: str) -> tuple[Any, dict[str, Any]] | None:
    """Les faits vérifiables : identité, population, bâti, morphologie."""
    async with session_factory() as session:
        row = (await session.execute(_TERRITORY, {"code": code_insee})).one_or_none()
    if row is None:
        return None

    stats = row.stats_cache or {}
    facts: dict[str, Any] = {
        "nom": row.name,
        "code_insee": row.code_insee,
        "population": stats.get("population"),
        "surface_km2": stats.get("surface_km2"),
        "batiments_osm": int(row.buildings),
        "sources": ["geo.api.gouv.fr (population, surface)", "OpenStreetMap (bâti)"],
    }
    population = stats.get("population")
    surface = stats.get("surface_km2")
    if population and surface:
        facts["densite_hab_km2"] = round(population / surface)

    if row.buildings:
        cells = await PostGISAnalysisGateway().grid_metric(code_insee, GridMetric.VOLUME, 0.0025)
        if cells:
            built = sum(c["built_m2"] for c in cells)
            volume = sum(c["volume_m3"] for c in cells)
            facts["emprise_batie_km2"] = round(built / 1_000_000, 2)
            facts["volume_bati_millions_m3"] = round(volume / 1_000_000, 1)
            if surface:
                facts["part_emprise_batie_pct"] = round(built / (surface * 1_000_000) * 100, 1)

    return row.id, facts


def build_prompt(facts: dict[str, Any]) -> str:
    """Le brief soumis à la persona (JSON strict exigé)."""
    return (
        "Voici les faits vérifiés dont tu disposes sur un territoire :\n"
        f"{json.dumps(facts, ensure_ascii=False, indent=2)}\n\n"
        "Rédige le portrait de ce territoire. Réponds UNIQUEMENT avec un objet "
        "JSON strict, sans texte autour, au format exact :\n"
        '{"resume": "4 à 6 phrases qui présentent le territoire, avec les chiffres clés", '
        '"forces": ["2 à 4 points"], "faiblesses": ["2 à 4 points"], '
        '"tendances": ["1 à 3 points"], "risques": ["1 à 3 points"], '
        '"opportunites": ["1 à 3 points"]}\n'
        "Chaque point de section : une phrase courte et concrète, appuyée sur les "
        "faits fournis. Si les faits ne permettent pas de remplir une section, "
        'mets un unique point du type "Les données disponibles ne permettent pas '
        'encore de conclure sur ce plan."'
    )


def parse_portrait(raw: str) -> tuple[str, dict[str, list[str]]]:
    """Réponse LLM → (résumé, sections). Dégradation digne si JSON invalide."""
    data = extract_json(raw)
    if data is None:
        return raw.strip(), {section: [] for section in SECTIONS}
    narrative = str(data.get("resume", "")).strip() or raw.strip()
    sections: dict[str, list[str]] = {}
    for section in SECTIONS:
        values = data.get(section, [])
        sections[section] = (
            [str(v).strip() for v in values if str(v).strip()] if isinstance(values, list) else []
        )
    return narrative, sections


class PortraitService:
    """Génère, persiste et restitue le portrait d'un territoire."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def get(self, code_insee: str) -> Portrait | None:
        async with session_factory() as session:
            row = (await session.execute(_GET, {"code": code_insee})).one_or_none()
        if row is None:
            return None
        return Portrait(
            narrative=row.narrative,
            sections=row.sections,
            facts=row.facts,
            model=row.model,
            generated_at=row.generated_at.isoformat(),
        )

    async def generate(self, code_insee: str) -> Portrait | None:
        """(Re)génère le portrait. None si territoire inconnu."""
        gathered = await gather_facts(code_insee)
        if gathered is None:
            return None
        territory_id, facts = gathered

        from atlas.config import get_settings

        raw = await self._llm.complete(PERSONA, build_prompt(facts))
        narrative, sections = parse_portrait(raw)

        async with session_factory() as session:
            await session.execute(
                _UPSERT,
                {
                    "tid": territory_id,
                    "narrative": narrative,
                    "sections": json.dumps(sections, ensure_ascii=False),
                    "facts": json.dumps(facts, ensure_ascii=False),
                    "model": get_settings().llm_model,
                },
            )
            await session.commit()

        portrait = await self.get(code_insee)
        assert portrait is not None
        return portrait
