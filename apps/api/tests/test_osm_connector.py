"""Connecteur OSM : parsing Overpass et estimation des hauteurs."""

from atlas.infrastructure.connectors.osm import estimate_height, parse_buildings

OVERPASS_FIXTURE = {
    "elements": [
        {
            "type": "way",
            "id": 1001,
            "tags": {"building": "yes", "height": "12.5 m"},
            "geometry": [
                {"lat": 48.93, "lon": 2.35},
                {"lat": 48.93, "lon": 2.36},
                {"lat": 48.94, "lon": 2.36},
                {"lat": 48.93, "lon": 2.35},
            ],
        },
        {
            "type": "way",
            "id": 1002,
            "tags": {"building": "residential", "building:levels": "4"},
            "geometry": [
                {"lat": 48.90, "lon": 2.30},
                {"lat": 48.90, "lon": 2.31},
                {"lat": 48.91, "lon": 2.31},
                {"lat": 48.90, "lon": 2.30},
            ],
        },
        {"type": "node", "id": 9, "lat": 48.9, "lon": 2.3},
        {"type": "way", "id": 1003, "tags": {}, "geometry": [{"lat": 1, "lon": 1}]},
    ]
}


def test_parse_keeps_only_valid_ways_and_closes_rings() -> None:
    buildings = parse_buildings(OVERPASS_FIXTURE)
    assert [b.osm_id for b in buildings] == [1001, 1002]
    ring = buildings[0].geometry["coordinates"][0]
    assert ring[0] == ring[-1]
    assert buildings[0].geometry["type"] == "Polygon"


def test_height_priority_height_then_levels_then_default() -> None:
    assert estimate_height({"height": "12.5 m"}) == 12.5
    assert estimate_height({"height": "n/a", "building:levels": "4"}) == 12.0
    assert estimate_height({"building:levels": "2,5"}) == 7.5
    assert estimate_height({}) == 5.0


def test_parsed_heights_from_fixture() -> None:
    first, second = parse_buildings(OVERPASS_FIXTURE)
    assert first.height_m == 12.5
    assert second.height_m == 12.0
