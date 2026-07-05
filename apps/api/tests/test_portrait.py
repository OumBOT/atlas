"""Portrait : construction du brief et robustesse du parsing."""

from atlas.infrastructure.mind.llm import extract_json
from atlas.infrastructure.mind.portrait import SECTIONS, build_prompt, parse_portrait


def test_prompt_embeds_facts_and_demands_strict_json() -> None:
    prompt = build_prompt({"nom": "Saint-Denis", "population": 149077})
    assert "Saint-Denis" in prompt
    assert "149077" in prompt
    assert "JSON strict" in prompt


def test_extract_json_tolerates_fences_and_prose() -> None:
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('Voici :\n{"a": 1}\nVoilà.') == {"a": 1}
    assert extract_json("pas de json ici") is None


def test_parse_portrait_full() -> None:
    raw = (
        '{"resume": "Un territoire dense.", "forces": ["Population jeune"], '
        '"faiblesses": [], "tendances": ["Croissance"], "risques": ["Pression foncière"], '
        '"opportunites": ["Grand Paris"]}'
    )
    narrative, sections = parse_portrait(raw)
    assert narrative == "Un territoire dense."
    assert sections["forces"] == ["Population jeune"]
    assert set(sections) == set(SECTIONS)


def test_parse_portrait_degrades_to_raw_text() -> None:
    narrative, sections = parse_portrait("Le territoire est dense et contrasté.")
    assert narrative == "Le territoire est dense et contrasté."
    assert all(values == [] for values in sections.values())


def test_portrait_dataclass_is_serializable() -> None:
    """Portrait a slots=True : la sérialisation passe par dataclasses.asdict."""
    import dataclasses

    from atlas.infrastructure.mind.portrait import Portrait

    portrait = Portrait(
        narrative="Un territoire.",
        sections={"forces": []},
        facts={"nom": "Test"},
        model="qwen2.5:7b-instruct",
        generated_at="2026-07-04T00:00:00",
    )
    data = dataclasses.asdict(portrait)
    assert data["narrative"] == "Un territoire."
    assert data["model"] == "qwen2.5:7b-instruct"
