"""build_stats : conversion et provenance des chiffres clés."""

from atlas.infrastructure.db.seed_territories import build_stats


def test_build_stats_converts_hectares_and_keeps_provenance() -> None:
    stats = build_stats(
        {"population": 113942, "surface": 1236.0, "codesPostaux": ["93200", "93210"]}
    )
    assert stats["surface_km2"] == 12.36
    assert stats["population"] == 113942
    assert stats["codes_postaux"] == ["93200", "93210"]
    assert stats["source"] == "geo.api.gouv.fr"
    assert "fetched_at" in stats


def test_build_stats_tolerates_missing_fields() -> None:
    stats = build_stats({})
    assert stats["population"] is None
    assert stats["surface_km2"] is None
    assert stats["codes_postaux"] == []
