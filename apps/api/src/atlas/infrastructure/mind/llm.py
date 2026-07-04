"""Client LLM : interface OpenAI-compatible (ADR-002).

Le fournisseur est une configuration, jamais du code : Ollama en local
(défaut), n'importe quelle API compatible en démo/production.
"""

import json
import re
from typing import Any, Protocol

import httpx

from atlas.config import get_settings


class LLMClient(Protocol):
    """Port minimal : un échange, une réponse texte."""

    async def complete(self, system: str, user: str) -> str: ...


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
