"""Social-science scene validator — the §5-social gate (SUBJECTS.md).

A social scene (``socialScene`` card field) is one of three kinds — ``timeline`` (dated events on
an axis, with an optional place-the-event drag), ``eventOrder`` (shuffled events the learner sorts
into chronological order), ``supplyDemand`` (a supply line and a demand line whose equilibrium is
EXACT line intersection). The renderer is ``SocialScene.tsx``; this is the server-side proof that a
generated scene is well-formed and — for economics — actually has a real intersection in the visible
quadrant. It mirrors ``parseSocialScene`` in that file EXACTLY (client/server parity), inverted:

  1. TIMELINE / EVENTORDER — ≥2 events, each with a numeric year and non-empty id + label. For
     ``eventOrder`` the years must be a total strict order (no duplicate year → no unique sort), so
     a duplicate-year set is REFUSED. An optional ``place`` (drag target) drops silently if malformed.
  2. SUPPLYDEMAND — two lines (supply slope>0, demand slope<0) with a REAL intersection computed the
     same way ``equilibrium()`` does, landing strictly inside the visible positive quadrant. Parallel
     lines (no intersection) or an equilibrium off-chart is REFUSED. Every reachable shift endpoint
     must keep the equilibrium in-quadrant too.

Refusal is INVISIBLE: a malformed scene is dropped from the card, never a hard failure. Wire it into
the compose verifier by adding one line to ``engines._CARD_ACTIVITIES``:
``"socialScene": social.verify_social_scene``.

Pure stdlib, deterministic — no numpy, no eval. ``python -m ...social`` runs the self-check below.
"""

from __future__ import annotations

from typing import Any

_KINDS = {"timeline", "eventOrder", "supplyDemand"}


def _d(v: Any) -> dict[str, Any] | None:
    return v if isinstance(v, dict) else None


def _num(v: Any) -> bool:
    # mirrors num(): finite number, and (as in JS) a bool is not a number here
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _nes(v: Any) -> bool:
    # mirrors str(): a non-empty (after trim) string
    return isinstance(v, str) and bool(v.strip())


def equilibrium(s: dict[str, float], d: dict[str, float]) -> dict[str, float] | None:
    """Intersection of p = s.intercept + s.slope·q and p = d.intercept + d.slope·q, or None if
    parallel. Same math as SocialScene.tsx's equilibrium()."""
    denom = s["slope"] - d["slope"]
    if abs(denom) < 1e-9:
        return None
    q = (d["intercept"] - s["intercept"]) / denom
    p = s["intercept"] + s["slope"] * q
    return {"q": q, "p": p}


def _parse_event(raw: Any) -> dict[str, Any] | None:
    r = _d(raw)
    if not r:
        return None
    if not (_nes(r.get("id")) and _nes(r.get("label")) and _num(r.get("year"))):
        return None
    return r


def verify_social_scene(raw: Any) -> dict[str, Any] | None:
    """Accept a social scene verbatim, or None if it is not well-formed / not solvable.

    Inverted mirror of parseSocialScene: same accept shape, returning the raw object on pass."""
    r = _d(raw)
    if not r:
        return None
    src = _d(r.get("artifact")) or r
    if src.get("verified") is False:
        return None
    kind = src.get("kind")
    if kind not in _KINDS:
        return None

    if kind in ("timeline", "eventOrder"):
        events_raw = src.get("events")
        events = [e for e in map(_parse_event, events_raw) if e][:8] if isinstance(
            events_raw, list
        ) else []
        if len(events) < 2:
            return None
        if kind == "eventOrder":
            # a unique chronological order requires distinct years
            years = [e["year"] for e in events]
            if len(set(years)) != len(years):
                return None
        # timeline's optional place drops silently if malformed — the timeline still teaches as a
        # read, so its validity does not gate acceptance. Nothing more to check.
        return raw

    # supplyDemand — the intersection must be real and inside the visible positive quadrant
    supply = _parse_line(src.get("supply"))
    demand = _parse_line(src.get("demand"))
    if not supply or not demand:
        return None
    if not (supply["slope"] > 0) or not (demand["slope"] < 0):
        return None
    eq = equilibrium(supply, demand)
    if not eq or eq["q"] <= 0 or eq["p"] <= 0:
        return None
    q_max = src["qMax"] if _num(src.get("qMax")) and src["qMax"] > 0 else eq["q"] * 2
    p_max = src["pMax"] if _num(src.get("pMax")) and src["pMax"] > 0 else eq["p"] * 2
    if eq["q"] >= q_max or eq["p"] >= p_max:
        return None

    shift = src.get("shift")
    if isinstance(shift, dict):
        target = shift.get("target")
        lo, hi = shift.get("min"), shift.get("max")
        if target not in ("supply", "demand") or not _num(lo) or not _num(hi) or lo >= hi:
            return None
        # every reachable shift endpoint must keep the equilibrium in the visible quadrant
        for off in (lo, hi):
            s2 = {**supply, "intercept": supply["intercept"] + off} if target == "supply" else supply
            d2 = {**demand, "intercept": demand["intercept"] + off} if target == "demand" else demand
            e2 = equilibrium(s2, d2)
            if not e2 or e2["q"] <= 0 or e2["p"] <= 0 or e2["q"] >= q_max or e2["p"] >= p_max:
                return None

    return raw


def _parse_line(raw: Any) -> dict[str, float] | None:
    r = _d(raw)
    if not r:
        return None
    if not (_nes(r.get("label")) and _num(r.get("intercept")) and _num(r.get("slope"))):
        return None
    return {"label": r["label"], "intercept": float(r["intercept"]), "slope": float(r["slope"])}


if __name__ == "__main__":  # runnable self-check — no framework, no network
    # supply p = q and demand p = 10 − q meet at (5, 5)
    sd = {
        "kind": "supplyDemand",
        "title": "the market finds its price",
        "supply": {"label": "supply", "intercept": 0, "slope": 1},
        "demand": {"label": "demand", "intercept": 10, "slope": -1},
        "qMax": 12,
        "pMax": 14,
    }
    assert verify_social_scene(sd) is sd, "exact supply/demand scene should pass"
    eq = equilibrium(sd["supply"], sd["demand"])
    assert eq == {"q": 5.0, "p": 5.0}, f"equilibrium should be (5,5), got {eq}"

    # a demand shift to p = 14 − q moves the equilibrium to (7, 7); the shift stays in-quadrant
    eq2 = equilibrium(sd["supply"], {"label": "demand", "intercept": 14, "slope": -1})
    assert eq2 == {"q": 7.0, "p": 7.0}, f"shifted equilibrium should be (7,7), got {eq2}"
    shifted = {**sd, "shift": {"target": "demand", "min": -2, "max": 4}}
    assert verify_social_scene(shifted) is shifted, "shiftable market (endpoints in-quadrant) passes"

    # RIGGED: parallel lines (equal slope) never intersect — REFUSED
    parallel = {**sd, "demand": {"label": "demand", "intercept": 10, "slope": 1}}
    assert verify_social_scene(parallel) is None, "parallel lines (no intersection) slipped through!"

    # demand slope must be negative; a non-negative demand slope is refused even if it intersects
    assert verify_social_scene({**sd, "demand": {"label": "d", "intercept": 10, "slope": 0.0}}) is None

    # an equilibrium outside the visible quadrant is refused (qMax too small)
    assert verify_social_scene({**sd, "qMax": 4}) is None, "off-chart equilibrium slipped through"

    # a shift endpoint that drives the equilibrium off-chart is refused
    assert verify_social_scene({**sd, "shift": {"target": "demand", "min": 0, "max": 20}}) is None

    # timeline — ≥2 dated events pass (duplicate years are fine for a read timeline)
    tl = {
        "kind": "timeline",
        "title": "the road to independence",
        "events": [
            {"id": "inc", "year": 1885, "label": "Congress founded"},
            {"id": "ind", "year": 1947, "label": "independence"},
        ],
        "place": {"id": "dandi", "year": 1930, "label": "the salt march", "tolerance": 3},
    }
    assert verify_social_scene(tl) is tl, "timeline scene should pass"
    assert verify_social_scene({**tl, "events": tl["events"][:1]}) is None, "1-event timeline passed"

    # eventOrder — distinct years pass
    eo = {
        "kind": "eventOrder",
        "title": "which came first?",
        "events": [
            {"id": "revolt", "year": 1857, "label": "the revolt"},
            {"id": "inc", "year": 1885, "label": "Congress founded"},
            {"id": "ind", "year": 1947, "label": "independence"},
        ],
    }
    assert verify_social_scene(eo) is eo, "eventOrder with a total order should pass"

    # RIGGED: eventOrder with a duplicate year has no unique chronological sort — REFUSED
    dup = {
        "kind": "eventOrder",
        "title": "ambiguous",
        "events": [
            {"id": "a", "year": 1905, "label": "event A"},
            {"id": "b", "year": 1905, "label": "event B"},
            {"id": "c", "year": 1947, "label": "event C"},
        ],
    }
    assert verify_social_scene(dup) is None, "eventOrder with a duplicate order index slipped through!"

    # verified===false and unknown kind are refused
    assert verify_social_scene({**sd, "verified": False}) is None
    assert verify_social_scene({"kind": "map", "events": []}) is None
    assert verify_social_scene(None) is None

    print("social.py self-check passed: equilibrium (5,5)+(7,7), parallel + duplicate-year rejected")
