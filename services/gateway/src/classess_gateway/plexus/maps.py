"""Map scene validator — the §5-social geography gate (SUBJECTS.md).

A map scene (``mapScene`` card field) drives the ``MapScene.tsx`` engine over a BUNDLED, simplified
set of Indian states. Three interaction modes — ``label`` (tap the named region), ``locate`` (place a
city / river), ``choropleth`` (regions shaded by an authored value + a legend the learner reads). This
is the server-side proof that an authored scene is STRUCTURALLY and COMPUTATIONALLY sound, refused
otherwise; the true point-in-polygon correctness (d3.geoContains) is the client's arbiter — here we
gate on the things pure arithmetic can prove before a scene is ever cached:

  1. CATALOG — every referenced region id must exist in the bundled geometry (``_REGION_IDS``) and the
     ``label`` target / ``locate.inRegionId`` / ``choropleth`` value ids must be among the SHOWN regions.
     A label task pointing at a state that isn't on the map is refused (the rigged structural case).
  2. GEOMETRY — a ``locate`` pin must sit inside India's bbox, and when it names ``inRegionId`` the
     coordinate must actually fall in THAT region's bounding box — a "place Mumbai in Gujarat" pin whose
     coordinate is really in Maharashtra is refused (the rigged computational case; mirrors the client's
     Maharashtra-vs-Gujarat flagship, coarsened to a bbox — the client's geoContains is the fine arbiter).
  3. CHOROPLETH — ≥2 distinct numeric values over shown regions; the correct answer is DERIVED
     (argmax / argmin), never authored, so it can never disagree with the shading.

The region catalog (ids + bounding boxes) is a hand-kept mirror of ``apps/web-pwa/src/engines/geo/
india-lite.json`` — the bundle is tiny and changes rarely; if a state is added there, add its bbox here.

Refusal is INVISIBLE: a malformed scene is dropped from the card (the card still teaches via its base
kind), never a hard failure. Pure stdlib, deterministic — ``python maps.py`` runs the self-check below.
"""

from __future__ import annotations

from typing import Any

# --- region catalog: id -> bounding box (lonMin, lonMax, latMin, latMax) ------------------
# Mirror of india-lite.json (8 hand-authored states). Bboxes computed from the polygon vertices.
_REGION_BBOX: dict[str, tuple[float, float, float, float]] = {
    "rajasthan": (69.6, 77.0, 24.6, 29.4),
    "gujarat": (68.6, 74.0, 21.5, 24.2),
    "maharashtra": (72.7, 80.3, 15.7, 21.2),
    "madhya-pradesh": (74.2, 81.8, 21.6, 24.3),
    "uttar-pradesh": (77.3, 83.9, 24.8, 29.3),
    "karnataka": (74.2, 77.0, 12.9, 15.3),
    "kerala": (74.9, 77.0, 8.3, 12.5),
    "tamil-nadu": (77.3, 80.2, 8.2, 13.3),
}
_REGION_IDS = frozenset(_REGION_BBOX)

# India bounding box — a locate pin outside this is a data error, not a geography answer.
_INDIA_BBOX = (68.0, 98.0, 6.0, 37.0)


def _d(v: Any) -> dict[str, Any] | None:
    return v if isinstance(v, dict) else None


def _list(v: Any) -> list[Any]:
    return v if isinstance(v, list) else []


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _nes(v: Any) -> bool:
    return isinstance(v, str) and bool(v.strip())


def _in_bbox(lon: float, lat: float, box: tuple[float, float, float, float]) -> bool:
    lo_lon, hi_lon, lo_lat, hi_lat = box
    return lo_lon <= lon <= hi_lon and lo_lat <= lat <= hi_lat


def _shown_regions(raw: dict[str, Any]) -> list[str] | None:
    """The distinct, catalog-known region ids the scene draws (1..8)."""
    out: list[str] = []
    for r in _list(raw.get("regions")):
        if isinstance(r, str) and r in _REGION_IDS and r not in out:
            out.append(r)
    return out if 1 <= len(out) <= len(_REGION_IDS) else None


def verify_map_scene(raw: Any) -> dict[str, Any] | None:
    """Accept a map scene verbatim, or None if it is not structurally/computationally sound."""
    r = _d(raw)
    if not r or r.get("kind") != "map":
        return None
    regions = _shown_regions(r)
    if regions is None:
        return None
    shown = set(regions)

    it = _d(r.get("interaction"))
    if not it or not _nes(it.get("prompt")):
        return None
    mode = it.get("mode")

    if mode == "label":
        # the target must be a region actually on the map
        return raw if isinstance(it.get("targetId"), str) and it["targetId"] in shown else None

    if mode == "locate":
        lon, lat = it.get("lon"), it.get("lat")
        if not (_nes(it.get("label")) and _num(lon) and _num(lat)):
            return None
        if not _in_bbox(float(lon), float(lat), _INDIA_BBOX):
            return None
        if "toleranceKm" in it and not (_num(it.get("toleranceKm")) and float(it["toleranceKm"]) > 0):
            return None
        in_region = it.get("inRegionId")
        if in_region is not None:
            # the pin must ACTUALLY fall in the region it claims (coarse bbox; client geoContains refines)
            if in_region not in shown:
                return None
            if not _in_bbox(float(lon), float(lat), _REGION_BBOX[in_region]):
                return None
        return raw

    if mode == "choropleth":
        if it.get("extreme") not in ("max", "min"):
            return None
        seen: set[str] = set()
        values: list[dict[str, Any]] = []
        for v in _list(it.get("values")):
            d = _d(v)
            if not d or not isinstance(d.get("id"), str) or d["id"] not in shown:
                continue
            if d["id"] in seen or not _num(d.get("value")):
                continue
            seen.add(d["id"])
            values.append(d)
        # ≥2 entries so a max/min is meaningful; the answer is DERIVED client-side, never authored —
        # which means the derivation has to have exactly one winner. Two regions tied at the extreme
        # make the task unanswerable (the client picks one, the learner may tap the other and be told
        # they are wrong), so the tie is refused here, before the scene can ever be cached.
        if len(values) < 2:
            return None
        nums = [float(v["value"]) for v in values]
        extreme = max(nums) if it["extreme"] == "max" else min(nums)
        if sum(1 for x in nums if x == extreme) != 1:
            return None  # tied extreme: no unique argmax/argmin, so no answerable task
        return raw

    return None


if __name__ == "__main__":  # runnable self-check — no framework, no network
    # a well-formed label task passes
    good_label = {
        "kind": "map",
        "id": "m1",
        "title": "find the state",
        "regions": ["maharashtra", "gujarat", "karnataka", "tamil-nadu"],
        "interaction": {"mode": "label", "prompt": "tap Maharashtra", "targetId": "maharashtra"},
    }
    assert verify_map_scene(good_label) is good_label, "exact label scene should pass"

    # RIGGED STRUCTURAL CASE: the target isn't a region shown on the map — REJECTED
    rigged_label = {**good_label, "interaction": {"mode": "label", "prompt": "tap Kerala", "targetId": "kerala"}}
    assert verify_map_scene(rigged_label) is None, "label target not on the map slipped through!"
    # an unknown region id anywhere is refused
    assert verify_map_scene({**good_label, "regions": ["atlantis"]}) is None, "unknown region slipped through"

    # a well-formed locate task with the pin genuinely inside Maharashtra passes
    good_locate = {
        "kind": "map",
        "id": "m2",
        "title": "place the city",
        "regions": ["maharashtra", "gujarat"],
        "interaction": {
            "mode": "locate",
            "prompt": "place Mumbai",
            "label": "Mumbai",
            "lon": 72.87,
            "lat": 19.07,
            "inRegionId": "maharashtra",
        },
    }
    assert verify_map_scene(good_locate) is good_locate, "exact locate scene should pass"

    # RIGGED COMPUTATIONAL CASE (the flagship, coarsened): the SAME Mumbai coordinate claimed to be in
    # Gujarat — the pin does not fall in Gujarat's bbox, so it is REJECTED.
    rigged_locate = {**good_locate, "interaction": {**good_locate["interaction"], "inRegionId": "gujarat"}}
    assert verify_map_scene(rigged_locate) is None, "Mumbai-in-Gujarat pin slipped through!"

    # a pin outside India is refused
    assert (
        verify_map_scene({**good_locate, "interaction": {**good_locate["interaction"], "lon": 0.0, "lat": 0.0, "inRegionId": None}})
        is None
    ), "null-island pin slipped through"

    # choropleth: ≥2 distinct numeric values over shown regions passes
    good_choro = {
        "kind": "map",
        "id": "m3",
        "title": "read the shading",
        "regions": ["uttar-pradesh", "maharashtra", "gujarat"],
        "interaction": {
            "mode": "choropleth",
            "prompt": "tap the most populous state",
            "extreme": "max",
            "unit": "crore",
            "values": [
                {"id": "uttar-pradesh", "value": 20},
                {"id": "maharashtra", "value": 11},
                {"id": "gujarat", "value": 6},
            ],
        },
    }
    assert verify_map_scene(good_choro) is good_choro, "exact choropleth scene should pass"
    # fewer than two usable values → refused
    assert (
        verify_map_scene({**good_choro, "interaction": {**good_choro["interaction"], "values": [{"id": "gujarat", "value": 6}]}})
        is None
    ), "single-value choropleth slipped through"
    # a value over a region NOT on the map is ignored, dropping below the 2-value floor → refused
    assert (
        verify_map_scene(
            {
                **good_choro,
                "interaction": {
                    **good_choro["interaction"],
                    "values": [{"id": "gujarat", "value": 6}, {"id": "kerala", "value": 3}],
                },
            }
        )
        is None
    ), "off-map choropleth value slipped through"

    # RIGGED TIE CASE: two states share the maximum — there is no unique answer, so it is REFUSED
    tied_max = {
        **good_choro,
        "interaction": {
            **good_choro["interaction"],
            "values": [
                {"id": "uttar-pradesh", "value": 20},
                {"id": "maharashtra", "value": 20},
                {"id": "gujarat", "value": 6},
            ],
        },
    }
    assert verify_map_scene(tied_max) is None, "tied maximum slipped through"
    # the same shape under extreme=min: the tie is at the BOTTOM this time
    tied_min = {
        **good_choro,
        "interaction": {
            **good_choro["interaction"],
            "extreme": "min",
            "prompt": "tap the least populous state",
            "values": [
                {"id": "uttar-pradesh", "value": 20},
                {"id": "maharashtra", "value": 6},
                {"id": "gujarat", "value": 6},
            ],
        },
    }
    assert verify_map_scene(tied_min) is None, "tied minimum slipped through"
    # a tie that is NOT at the extreme is fine — the argmax is still unique
    tie_off_extreme = {
        **good_choro,
        "interaction": {
            **good_choro["interaction"],
            "values": [
                {"id": "uttar-pradesh", "value": 20},
                {"id": "maharashtra", "value": 6},
                {"id": "gujarat", "value": 6},
            ],
        },
    }
    assert verify_map_scene(tie_off_extreme) is tie_off_extreme, "unique max wrongly refused"

    print("maps.py self-check passed: catalog, label target, locate bbox (MH vs GJ flagship), choropleth")
