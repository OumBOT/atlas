"""Analyses territoriales — contrats du domaine."""

from enum import StrEnum
from typing import Any, Protocol


class GridMetric(StrEnum):
    """Métriques calculables sur la grille territoriale."""

    FOOTPRINT = "footprint"  # emprise au sol du bâti (ratio 0..1 de la cellule)
    VOLUME = "volume"  # volume bâti (m³), proxy de densité urbaine 3D


class AnalysisGateway(Protocol):
    """Port de calcul des analyses (implémenté par l'infrastructure PostGIS)."""

    async def grid_metric(
        self, code_insee: str, metric: GridMetric, cell_deg: float
    ) -> list[dict[str, Any]] | None:
        """Cellules {geometry, built_m2, volume_m3, cell_m2} ou None si territoire inconnu."""
        ...
