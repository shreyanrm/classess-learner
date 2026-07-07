"""Physics scene validator — the §5-physics gate (SUBJECTS.md).

A physics scene (``physicsScene`` card field) is one of three kinds — ``projectile`` (closed-form
kinematics with live angle / velocity sliders), ``freeBody`` (labeled force arrows + a live
resultant), ``wave`` (sine superposition). The renderer is ``PhysicsScene.tsx``; this is the
server-side proof that a generated scene is *physically exact*, refused otherwise:

  1. DIMENSIONAL ANALYSIS — every output's formula must be dimensionally consistent with its
     declared unit (``dimensions.units_consistent``). A range declared in metres whose formula
     yields ``m/s`` is REJECTED. This is the gate a plausible-but-wrong model fails.
  2. CONSTANTS TABLE — a declared ``gravity`` must match standard g; ``g``/``c`` referenced in a
     formula inherit their enforced value + dimension. A wrong constant ships a wrong mental model.
  3. SHAPE — the kind's primary data (params+outputs / ≥2 same-dimension forces / ≥1 wave
     component) must be present so the scene actually renders.

Refusal is INVISIBLE: a malformed scene is dropped from the card (the card still teaches via its
base kind), never a hard failure. Wire it into the compose verifier by adding one line to
``engines._CARD_ACTIVITIES``:  ``"physicsScene": physics.verify_physics_scene``.

Pure stdlib on top of :mod:`dimensions` — no sympy, no eval, fully deterministic.
"""

from __future__ import annotations

import re
from typing import Any

from classess_gateway.plexus import dimensions

_KINDS = {"projectile", "freeBody", "wave"}
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _d(v: Any) -> dict[str, Any] | None:
    return v if isinstance(v, dict) else None


def _list(v: Any) -> list[Any]:
    return v if isinstance(v, list) else []


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _nes(v: Any) -> bool:
    return isinstance(v, str) and bool(v.strip())


def _ident(v: Any) -> bool:
    return isinstance(v, str) and bool(_IDENT_RE.match(v))


def _unit_ok(u: Any) -> bool:
    return isinstance(u, str) and dimensions.parse_unit(u) is not None


def _ok_param(p: Any) -> dict[str, Any] | None:
    r = _d(p)
    if not r or not (_ident(r.get("id")) and _nes(r.get("label")) and _unit_ok(r.get("unit"))):
        return None
    lo, hi, init = r.get("min"), r.get("max"), r.get("initial")
    if not (_num(lo) and _num(hi) and _num(init) and float(lo) < float(hi)):
        return None
    if not (float(lo) <= float(init) <= float(hi)):
        return None
    return r


def verify_physics_scene(raw: Any) -> dict[str, Any] | None:
    """Accept a physics scene verbatim, or None if it is not physically exact.

    The dimensional gate is the crux: every output formula's dimension must equal its declared
    unit. A dimensionally inconsistent scene (the rigged case) is refused."""
    r = _d(raw)
    if not r or r.get("kind") not in _KINDS:
        return None
    kind = r["kind"]

    params = [p for p in (_ok_param(p) for p in _list(r.get("params"))) if p is not None]
    if len(params) > 6:
        return None
    param_units: dict[str, str] = {p["id"]: p["unit"] for p in params}

    # (1) DIMENSIONAL ANALYSIS — every output must be consistent with its declared unit
    outputs = _list(r.get("outputs"))
    for o in outputs:
        od = _d(o)
        if not od or not (_ident(od.get("id")) and _nes(od.get("label")) and _nes(od.get("expr"))):
            return None
        if not _unit_ok(od.get("unit")):
            return None
        if not dimensions.units_consistent(od["expr"], od["unit"], param_units):
            return None  # dimensionally inconsistent — a wrong mental model, refused

    # (2) CONSTANTS TABLE — a declared gravity must match standard g within tolerance
    if "gravity" in r:
        g = r.get("gravity")
        if not (_num(g) and dimensions.constant_ok("g", float(g))):
            return None

    # (3) SHAPE — the kind's primary data must be present so it renders
    if kind == "projectile":
        if not (params and outputs):
            return None
    elif kind == "freeBody":
        forces = [
            f
            for f in (_d(f) for f in _list(r.get("forces")))
            if f
            and _ident(f.get("id"))
            and _nes(f.get("label"))
            and _num(f.get("mag"))
            and _num(f.get("angle"))
            and (f.get("unit") is None or _unit_ok(f.get("unit")))
        ]
        if len(forces) < 2:
            return None
        # a resultant is only meaningful if every force carries the same dimension
        if len({dimensions.parse_unit(f.get("unit") or "N") for f in forces}) != 1:
            return None
    elif kind == "wave":
        comps = [
            c
            for c in (_d(c) for c in _list(r.get("components")))
            if c and _num(c.get("amp")) and _num(c.get("freq")) and _num(c.get("phase"))
        ]
        if not comps:
            return None

    return raw


if __name__ == "__main__":  # runnable self-check — no framework, no network
    # a physically-exact projectile scene passes
    good = {
        "kind": "projectile",
        "title": "projectile motion",
        "gravity": 9.8,
        "params": [
            {"id": "v", "label": "speed", "min": 5, "max": 40, "initial": 20, "unit": "m/s"},
            {"id": "theta", "label": "angle", "min": 10, "max": 80, "initial": 45, "unit": "deg"},
        ],
        "outputs": [
            {"id": "R", "label": "range", "expr": "v^2*sin(2*theta*pi/180)/g", "unit": "m"},
            {"id": "T", "label": "time of flight", "expr": "2*v*sin(theta*pi/180)/g", "unit": "s"},
        ],
    }
    assert verify_physics_scene(good) is good, "exact projectile scene should pass"

    # THE RIGGED CASE: range declared metres, formula (missing /g) yields m/s — REJECTED
    rigged = {**good, "outputs": [
        {"id": "R", "label": "range", "expr": "v^2*sin(2*theta*pi/180)", "unit": "m"},
    ]}
    assert (
        verify_physics_scene(rigged) is None
    ), "rigged (dimensionally-wrong) scene slipped through!"

    # a wrong gravity constant is refused
    assert verify_physics_scene({**good, "gravity": 3.0}) is None, "wrong g slipped through"

    # free-body: two same-dimension forces + a live resultant expr in newtons
    fb = {
        "kind": "freeBody",
        "title": "forces on a box",
        "forces": [
            {"id": "w", "label": "weight", "mag": 20, "angle": 270, "unit": "N"},
            {"id": "n", "label": "normal", "mag": 20, "angle": 90, "unit": "N"},
        ],
        "outputs": [
            {"id": "net", "label": "resultant", "expr": "sqrt(Fx^2 + Fy^2)", "unit": "N"},
        ],
        "params": [
            {"id": "Fx", "label": "net x", "min": -50, "max": 50, "initial": 0, "unit": "N"},
            {"id": "Fy", "label": "net y", "min": -50, "max": 50, "initial": 0, "unit": "N"},
        ],
    }
    assert verify_physics_scene(fb) is fb, "free-body scene should pass"

    # wave: sine superposition components
    wave = {
        "kind": "wave",
        "title": "adding two waves",
        "components": [
            {"id": "a", "amp": 1.0, "freq": 1.0, "phase": 0.0},
            {"id": "b", "amp": 0.5, "freq": 2.0, "phase": 1.57},
        ],
    }
    assert verify_physics_scene(wave) is wave, "wave scene should pass"
    assert verify_physics_scene({"kind": "wave", "components": []}) is None, "empty wave passed"

    print("physics self-check ok")
