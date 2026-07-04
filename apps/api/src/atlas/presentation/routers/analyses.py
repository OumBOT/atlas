"""Analyses territoriales — l'API du raisonnement chiffré d'ATLAS."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from atlas.application.analyses import RunGridAnalysis
from atlas.domain.analysis import AnalysisGateway, GridMetric
from atlas.infrastructure.db.analyses import PostGISAnalysisGateway

router = APIRouter(prefix="/territories/{code_insee}/analyses", tags=["analyses"])


def get_gateway() -> AnalysisGateway:
    """Fournit l'implémentation du port (surchargée dans les tests)."""
    return PostGISAnalysisGateway()


Gateway = Annotated[AnalysisGateway, Depends(get_gateway)]


@router.get("/{metric}")
async def run_grid_analysis(
    code_insee: str,
    metric: GridMetric,
    gateway: Gateway,
    cell: Annotated[
        float, Query(gt=0.0005, lt=0.02, description="Taille de cellule (degrés)")
    ] = 0.0025,
) -> dict[str, Any]:
    """Grille d'analyse (FeatureCollection normalisée) pour la métrique demandée."""
    result = await RunGridAnalysis(gateway).execute(code_insee, metric, cell)
    if result is None:
        raise HTTPException(status_code=404, detail="Territoire inconnu d'ATLAS.")
    return result
