"""Cas d'usage — analyses sur grille territoriale."""

from typing import Any

from atlas.domain.analysis import AnalysisGateway, GridMetric


class RunGridAnalysis:
    """Calcule une métrique sur la grille et normalise le rendu.

    Chaque cellule reçoit ``value`` dans [0..1] (échelle max du territoire),
    prêt pour le rendu, en plus des grandeurs brutes qui restent citables.
    """

    def __init__(self, gateway: AnalysisGateway) -> None:
        self._gateway = gateway

    async def execute(
        self, code_insee: str, metric: GridMetric, cell_deg: float = 0.0025
    ) -> dict[str, Any] | None:
        cells = await self._gateway.grid_metric(code_insee, metric, cell_deg)
        if cells is None:
            return None

        def raw(cell: dict[str, Any]) -> float:
            if metric is GridMetric.FOOTPRINT:
                cell_m2 = cell["cell_m2"] or 1.0
                return float(cell["built_m2"]) / cell_m2
            return float(cell["volume_m3"])

        values = [raw(cell) for cell in cells]
        peak = max(values, default=0.0) or 1.0

        features = [
            {
                "type": "Feature",
                "geometry": cell["geometry"],
                "properties": {
                    "value": raw(cell) / peak,
                    "built_m2": round(cell["built_m2"]),
                    "volume_m3": round(cell["volume_m3"]),
                    "ratio": round(cell["built_m2"] / (cell["cell_m2"] or 1.0), 4),
                },
            }
            for cell in cells
        ]
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "metric": metric.value,
                "cell_deg": cell_deg,
                "cells": len(features),
                "peak_raw": peak,
            },
        }
