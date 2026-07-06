"""Dialoguer avec ATLAS : le territoire répond, en direct."""

from collections.abc import AsyncIterator
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from atlas.infrastructure.mind.converse import build_converse_system, clamp_history
from atlas.infrastructure.mind.llm import LLMClient, OpenAICompatibleClient
from atlas.infrastructure.mind.portrait import PortraitService, gather_facts

router = APIRouter(prefix="/territories/{code_insee}/converse", tags=["dialogue"])


def get_llm() -> LLMClient:
    """Fournit le moteur de langage (surchargé dans les tests)."""
    return OpenAICompatibleClient()


LLM = Annotated[LLMClient, Depends(get_llm)]


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ConverseIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[Turn] = Field(default_factory=list, max_length=40)


@router.post("")
async def converse(code_insee: str, body: ConverseIn, llm: LLM) -> StreamingResponse:
    """Réponse d'ATLAS en flux texte brut (chunked)."""
    gathered = await gather_facts(code_insee)
    if gathered is None:
        raise HTTPException(status_code=404, detail="Territoire inconnu d'ATLAS.")
    _, facts = gathered

    portrait = await PortraitService(llm).get(code_insee)
    system = build_converse_system(facts, portrait.narrative if portrait else None)
    history = clamp_history([turn.model_dump() for turn in body.history])
    messages = [*history, {"role": "user", "content": body.message}]

    async def speak() -> AsyncIterator[bytes]:
        try:
            async for fragment in llm.stream(system, messages):
                yield fragment.encode()
        except httpx.HTTPError:
            yield "Mon moteur de langage est éteint. Démarrez Ollama et je reprendrai.".encode()

    return StreamingResponse(speak(), media_type="text/plain; charset=utf-8")
