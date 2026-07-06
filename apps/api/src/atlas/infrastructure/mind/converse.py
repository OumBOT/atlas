"""Le dialogue avec ATLAS : chaque réponse est ancrée aux faits du territoire.

Le système reçoit la persona, les faits vérifiés et, s'il existe, le
portrait déjà rédigé. La règle cardinale reste : ne rien inventer.
"""

import json
from typing import Any

from atlas.infrastructure.mind.persona import PERSONA

MAX_HISTORY = 8


def build_converse_system(facts: dict[str, Any], portrait_narrative: str | None) -> str:
    """Prompt système du dialogue : persona + faits + règles d'échange."""
    parts = [
        PERSONA,
        "\nFAITS VÉRIFIÉS sur le territoire dont vous parlez :\n"
        + json.dumps(facts, ensure_ascii=False, indent=2),
    ]
    if portrait_narrative:
        parts.append("\nPortrait que tu as déjà rédigé :\n" + portrait_narrative)
    parts.append(
        "\nRègles de ce dialogue :\n"
        "- Réponds en 2 à 5 phrases, sauf si la question appelle une liste courte.\n"
        "- Chaque chiffre vient des faits ci-dessus. Si l'information demandée "
        "n'y figure pas, dis-le simplement et précise ce que tu sais mesurer.\n"
        "- Ne promets jamais une action que tu ne peux pas faire dans cet échange."
    )
    return "\n".join(parts)


def clamp_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    """Garde les derniers échanges (le contexte utile, pas la totalité)."""
    return history[-MAX_HISTORY:]
