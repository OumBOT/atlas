"""Dialogue : ancrage, historique borné, parsing du flux."""

from atlas.infrastructure.mind.converse import MAX_HISTORY, build_converse_system, clamp_history
from atlas.infrastructure.mind.llm import parse_stream_line


def test_system_embeds_facts_portrait_and_rules() -> None:
    system = build_converse_system(
        {"nom": "Milly-la-Forêt", "population": 4562}, "Un bourg forestier."
    )
    assert "Milly-la-Forêt" in system
    assert "4562" in system
    assert "Un bourg forestier." in system
    assert "n'y figure pas" in system


def test_system_without_portrait() -> None:
    system = build_converse_system({"nom": "X"}, None)
    assert "Portrait que tu as déjà rédigé" not in system


def test_history_is_clamped() -> None:
    history = [{"role": "user", "content": str(i)} for i in range(30)]
    clamped = clamp_history(history)
    assert len(clamped) == MAX_HISTORY
    assert clamped[-1]["content"] == "29"


def test_parse_stream_line() -> None:
    line = 'data: {"choices":[{"delta":{"content":"Bonjour"}}]}'
    assert parse_stream_line(line) == "Bonjour"
    assert parse_stream_line("data: [DONE]") is None
    assert parse_stream_line(": keepalive") is None
    assert parse_stream_line('data: {"choices":[{"delta":{}}]}') is None
