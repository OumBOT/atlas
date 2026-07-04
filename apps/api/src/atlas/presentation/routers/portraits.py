"""Le Portrait : ATLAS se présente le territoire (CONCEPTION §-1, principe 3)."""

from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from atlas.infrastructure.mind.llm import LLMClient, OpenAICompatibleClient
from atlas.infrastructure.mind.portrait import PortraitService

router = APIRouter(prefix="/territories/{code_insee}/portrait", tags=["portrait"])


def get_llm() -> LLMClient:
    """Fournit le moteur de langage (surchargé dans les tests)."""
    return OpenAICompatibleClient()


LLM = Annotated[LLMClient, Depends(get_llm)]


@router.get("")
async def get_portrait(
    code_insee: str,
    llm: LLM,
    refresh: Annotated[bool, Query(description="Régénérer même si un portrait existe")] = False,
) -> dict[str, Any]:
    """Le portrait du territoire ; généré à la volée s'il n'existe pas."""
    service = PortraitService(llm)

    if not refresh:
        existing = await service.get(code_insee)
        if existing is not None:
            return existing.__dict__

    try:
        portrait = await service.generate(code_insee)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Mon moteur de langage est éteint. Démarrez Ollama "
                "(voir apps/api/README.md) et je reprendrai."
            ),
        ) from exc

    if portrait is None:
        raise HTTPException(status_code=404, detail="Territoire inconnu d'ATLAS.")
    return portrait.__dict__
