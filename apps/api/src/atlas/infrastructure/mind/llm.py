"""Client LLM : interface OpenAI-compatible (ADR-002).

Le fournisseur est une configuration, jamais du code : Ollama en local
(défaut), n'importe quelle API compatible en démo/production.
"""

import json
import re
from collections.abc import AsyncIterator
from typing import Any, Protocol

import httpx

from atlas.config import get_settings

Message = dict[str, str]


class LLMClient(Protocol):
    """Port minimal : un échange complet, ou un flux de fragments."""

    async def complete(self, system: str, user: str) -> str: ...

    def stream(self, system: str, messages: list[Message]) -> AsyncIterator[str]: ...


def parse_stream_line(line: str) -> str | None:
    """Extrait le fragment de texte d'une ligne SSE OpenAI-compatible."""
    if not line.startswith("data: "):
        return None
    payload = line[6:].strip()
    if payload == "[DONE]":
        return None
    try:
        data = json.loads(payload)
        fragment = data["choices"][0]["delta"].get("content", "")
    except (json.JSONDecodeError, KeyError, IndexError):
        return None
    return str(fragment) if fragment else None


class OpenAICompatibleClient:
    """Implémentation httpx vers /v1/chat/completions."""

    async def complete(self, system: str, user: str) -> str:
        settings = get_settings()
        headers = {"Content-Type": "application/json"}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"
        payload: dict[str, Any] = {
            "model": settings.llm_model,
            "temperature": 0.4,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(
                f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
        content: str = data["choices"][0]["message"]["content"]
        return content

    async def stream(self, system: str, messages: list[Message]) -> AsyncIterator[str]:
        """Flux de fragments de texte (SSE), pour la parole en direct."""
        settings = get_settings()
        headers = {"Content-Type": "application/json"}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"
        payload: dict[str, Any] = {
            "model": settings.llm_model,
            "temperature": 0.4,
            "stream": True,
            "messages": [{"role": "system", "content": system}, *messages],
        }
        async with (
            httpx.AsyncClient(timeout=180) as client,
            client.stream(
                "POST",
                f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                json=payload,
                headers=headers,
            ) as response,
        ):
            response.raise_for_status()
            async for line in response.aiter_lines():
                fragment = parse_stream_line(line)
                if fragment:
                    yield fragment


def extract_json(raw: str) -> dict[str, Any] | None:
    """Extrait l'objet JSON d'une réponse LLM (tolère les clôtures ```)."""
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        brace = re.search(r"\{.*\}", text, re.DOTALL)
        if brace:
            text = brace.group(0)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None
