"""The four Plexus engines — engine.compose, engine.simulate, engine.diagram, engine.video.

One flow for all four: file cache (concept x modality x difficulty) -> generate (the
anthropic path in live mode, deterministic seeds in mock mode) -> verify -> cache with
provenance -> serve. Verification is per modality:

- compose  — structural: 3+ guided-discovery cards, each one idea + act-to-reveal.
- simulate — the formula must parse and solve through the verifier CAS (SymPy); a
  non-mathematical formula is refused.
- diagram  — sanitized inline SVG (viewBox required, no scripts / foreignObject).
- video    — motion scenes with sanitized visuals; narration audio via Gemini TTS
  when a key is present, else ``narrationAudio: null``.

A live refusal or failed verification serves the seed instead — invisible to the
learner, honest in provenance (``model: "seed"``).
"""

from __future__ import annotations

import copy
import hashlib
import logging
import math
import re
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any
from xml.sax.saxutils import quoteattr

import sympy as sp
from classess_verifier.cas import parse_equation

from classess_gateway.plexus import image, store
from classess_gateway.plexus.media import synthesize_narration, wav_duration_ms
from classess_gateway.plexus.sanitize import sanitize_svg
from classess_gateway.providers import ProviderResponse

logger = logging.getLogger("classess.gateway.plexus")

MODALITIES = ("compose", "simulate", "diagram", "video")
_DEFAULT_CONCEPT = "linear equations in one variable"

_INTERACTION_KINDS = {"tap", "drag", "slide", "type"}
_CARD_KINDS = {"sim", "diagram", "text"}
_ITEM_TYPES = {"mcq", "fill"}
_VISUAL_KINDS = {"svg", "sim", "diagram"}
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

# guided-discovery (Discovery.tsx) — the keystone teaching format a card may embed. These mirror
# the client's parseDiscoverySpec EXACTLY so a spec that would be dropped at the door is refused
# here instead (an invalid discovery drops from the card; the card still teaches via its kind).
_SHAPES = {"circle", "rect", "line", "ring", "text"}
_TONES = {"ink", "muted", "hue"}


# --- verification (every artifact passes here before caching or serving) ---------------

_CARD_WORD_CAP = 60  # per-card prose cap (owner: visual-first, text hard-capped ~60 words)


def _cap_words(text: str, cap: int = _CARD_WORD_CAP) -> str:
    """Enforce the per-card word cap by trimming, never by rejecting — a slightly long card
    is trimmed to the cap (with an ellipsis) rather than seeding the whole course away."""
    words = text.split()
    if len(words) <= cap:
        return text
    return " ".join(words[:cap]).rstrip(",.;:") + "…"


def _verify_items(raw: Any, need: int = 3) -> list[dict[str, Any]] | None:
    """Workbook / boss items with structurally verified answers.

    An MCQ serves only when its answer appears exactly once, character-for-character, in
    its options — the client grades against the verified answer, so ambiguity is refused.
    """
    if not isinstance(raw, list):
        return None
    clean: list[dict[str, Any]] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict) or item.get("type") not in _ITEM_TYPES:
            continue
        prompt = str(item.get("prompt") or "").strip()
        answer = str(item.get("answer") or "").strip()
        if not prompt or not answer:
            continue
        if item["type"] == "mcq":
            opts = item.get("options")
            if not isinstance(opts, list):
                continue
            options = [str(o).strip() for o in opts if str(o).strip()]
            if not (2 <= len(options) <= 5) or len(set(options)) != len(options):
                continue
            if sum(1 for o in options if o == answer) != 1:
                continue
            clean.append(
                {
                    "id": str(item.get("id") or f"i{i + 1}"),
                    "type": "mcq",
                    "prompt": prompt,
                    "options": options,
                    "answer": answer,
                }
            )
        else:  # fill — the answer must be short and unambiguous enough to type
            if len(answer) > 60:
                continue
            clean.append(
                {
                    "id": str(item.get("id") or f"i{i + 1}"),
                    "type": "fill",
                    "prompt": prompt,
                    "answer": answer,
                }
            )
        if len(clean) == need:
            return clean
    return None


def _fnum(v: Any) -> bool:
    """A finite JSON number (client parity: `typeof v === 'number' && Number.isFinite(v)`).
    JSON booleans decode to bool in Python, which is an int subclass — exclude them explicitly."""
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(float(v))


def _nes(v: Any) -> bool:
    """A non-empty string (client parity for its `str` guard)."""
    return isinstance(v, str) and v.strip() != ""


def _verify_mark(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or not _nes(raw.get("id")) or raw.get("shape") not in _SHAPES:
        return None
    if not (_fnum(raw.get("x")) and _fnum(raw.get("y"))):
        return None
    mark: dict[str, Any] = {
        "id": raw["id"],
        "shape": raw["shape"],
        "x": float(raw["x"]),
        "y": float(raw["y"]),
        "tone": raw["tone"] if raw.get("tone") in _TONES else "ink",
    }
    for k in ("x2", "y2", "r", "w", "h"):
        if _fnum(raw.get(k)):
            mark[k] = float(raw[k])
    if _nes(raw.get("text")):
        mark["text"] = raw["text"]
    return mark


def _verify_interaction(raw: Any, mark_ids: set[str]) -> dict[str, Any] | None:
    """Exactly one of tap / drag / slide, every referenced mark id present (Discovery.tsx)."""
    if not isinstance(raw, dict) or not _nes(raw.get("prompt")):
        return None
    kind, prompt = raw.get("kind"), raw["prompt"]
    if kind == "tap":
        targets = [t for t in (raw.get("targets") or []) if isinstance(t, str) and t in mark_ids]
        if not targets:
            return None
        need = (
            max(1, min(len(targets), round(float(raw["need"]))))
            if _fnum(raw.get("need"))
            else len(targets)
        )
        return {"kind": "tap", "prompt": prompt, "targets": targets, "need": need}
    if kind == "drag":
        handle, to = raw.get("handle"), raw.get("to")
        if not (_nes(handle) and handle in mark_ids and isinstance(to, dict)):
            return None
        if not (_fnum(to.get("x")) and _fnum(to.get("y"))):
            return None
        radius = float(raw["radius"]) if _fnum(raw.get("radius")) else 8.0
        return {
            "kind": "drag",
            "prompt": prompt,
            "handle": handle,
            "to": {"x": float(to["x"]), "y": float(to["y"])},
            "radius": radius,
        }
    if kind == "slide":
        lo, hi = raw.get("min"), raw.get("max")
        if not (_fnum(lo) and _fnum(hi) and float(lo) < float(hi)):
            return None
        lo, hi = float(lo), float(hi)
        frm = min(hi, max(lo, float(raw["from"]))) if _fnum(raw.get("from")) else lo
        at = min(hi, max(lo, float(raw["at"]))) if _fnum(raw.get("at")) else hi
        out: dict[str, Any] = {
            "kind": "slide",
            "prompt": prompt,
            "min": lo,
            "max": hi,
            "from": frm,
            "at": at,
        }
        if _nes(raw.get("unit")):
            out["unit"] = raw["unit"]
        if _nes(raw.get("valueLabel")):
            out["valueLabel"] = raw["valueLabel"]
        bind = raw.get("bind")
        if isinstance(bind, dict) and _nes(bind.get("mark")) and bind["mark"] in mark_ids:
            prop, rng = bind.get("prop"), bind.get("at")
            if (
                prop in ("x", "y", "r")
                and isinstance(rng, list)
                and len(rng) >= 2
                and _fnum(rng[0])
                and _fnum(rng[1])
            ):
                out["bind"] = {
                    "mark": bind["mark"],
                    "prop": prop,
                    "at": [float(rng[0]), float(rng[1])],
                }
        return out
    return None


def _verify_discovery_stage(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or not _nes(raw.get("reveal")) or not _nes(raw.get("caption")):
        return None
    visual = raw.get("visual")
    marks_raw = visual.get("marks") if isinstance(visual, dict) else None
    marks = [m for m in map(_verify_mark, marks_raw) if m] if isinstance(marks_raw, list) else []
    if not marks:
        return None
    interaction = _verify_interaction(raw.get("interaction"), {m["id"] for m in marks})
    if interaction is None:
        return None
    return {
        "visual": {"marks": marks},
        "interaction": interaction,
        "reveal": raw["reveal"],
        "caption": raw["caption"],
    }


def _verify_discovery(raw: Any) -> dict[str, Any] | None:
    """A card's embedded guided-discovery spec — 1..6 stages, one idea each (Discovery.tsx)."""
    if not isinstance(raw, dict):
        return None
    stages_raw = raw.get("stages")
    stages = (
        [s for s in map(_verify_discovery_stage, stages_raw) if s]
        if isinstance(stages_raw, list)
        else []
    )
    if not 1 <= len(stages) <= 6:
        return None
    return {
        "id": raw["id"] if _nes(raw.get("id")) else "discovery",
        "title": raw["title"] if _nes(raw.get("title")) else "discover it",
        "stages": stages,
    }


def _verify_image_spec(raw: Any) -> dict[str, Any] | None:
    """An imageSpec marks a card whose visual is organic/complex — SVG cannot express a plant cell
    or the human body. The client hydrates the card through the Nano Banana raster seam (invokes
    engine.diagram with raster=true) instead of asking for line-art SVG. Shape: {subject, caption?}."""
    if not isinstance(raw, dict):
        return None
    subject = raw.get("subject") or raw.get("concept")
    if not _nes(subject):
        return None
    out = {"subject": subject.strip()}
    if _nes(raw.get("caption")):
        out["caption"] = raw["caption"].strip()
    return out


# --- card-level rich activities (physics-of-understanding engines) ----------------------
# The client (Composing.tsx parseActivity) reads ONE of these OPTIONAL fields off a card and
# hydrates the matching engine; each engine's parser is the authoritative gate and re-validates
# every field. Here we mirror each parser's ACCEPT/REJECT predicate and PRESERVE the spec verbatim
# when it passes — a malformed spec is dropped (the card still teaches via its base kind), never
# the whole card. We gate on structure only; deeper coercion (clamping, slicing, expression
# evaluation) is the client's job, so there is one source of truth for the display shape.


def _ident(v: Any) -> bool:
    return isinstance(v, str) and bool(_IDENT_RE.match(v))


def _as_dict(v: Any) -> dict[str, Any] | None:
    return v if isinstance(v, dict) else None


def _as_list(v: Any) -> list[Any]:
    return v if isinstance(v, list) else []


def _strs(v: Any) -> list[str]:
    return [s for s in v if _nes(s)] if isinstance(v, list) else []


def _num_or_expr(v: Any) -> bool:
    return _fnum(v) or _nes(v)


_WHATIF_SHAPES = {"line", "circle", "rect", "text", "arc"}
_COMPARE_SHAPES = {"circle", "ring", "ellipse", "rect", "line", "text"}


def _ok_perturbation(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    p, o, b = _as_dict(r.get("param")), _as_dict(r.get("output")), _as_dict(r.get("breakpoint"))
    if not (p and o and b and _nes(r.get("law"))):
        return None
    if not (
        _ident(p.get("id")) and _nes(p.get("label")) and _fnum(p.get("min")) and _fnum(p.get("max"))
    ):
        return None
    if float(p["min"]) >= float(p["max"]):
        return None
    if not (_nes(o.get("label")) and _nes(o.get("expr"))):
        return None
    if not (_fnum(b.get("at")) and b.get("approach") in ("below", "above")):
        return None
    if not (_nes(b.get("assumption")) and _nes(b.get("revelation"))):
        return None
    return raw


def _ok_whatif(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    values = [
        v
        for v in _as_list(r.get("values"))
        if isinstance(v, dict)
        and _ident(v.get("id"))
        and _nes(v.get("label"))
        and _fnum(v.get("value"))
        and _fnum(v.get("min"))
        and _fnum(v.get("max"))
        and float(v["min"]) < float(v["max"])
    ]
    if not 1 <= len(values) <= 6:
        return None
    solve = [
        s
        for s in _as_list(r.get("solve"))
        if isinstance(s, dict)
        and _ident(s.get("id"))
        and _nes(s.get("label"))
        and _nes(s.get("expr"))
    ]
    if not solve:
        return None
    scene = _as_dict(r.get("scene"))
    marks = [
        m
        for m in (_as_list(scene.get("marks")) if scene else [])
        if isinstance(m, dict)
        and _nes(m.get("id"))
        and m.get("shape") in _WHATIF_SHAPES
        and _num_or_expr(m.get("x"))
        and _num_or_expr(m.get("y"))
    ]
    return raw if marks else None


def _panel_ids(raw: Any) -> set[str] | None:
    p = _as_dict(raw)
    if not p:
        return None
    ids = {
        m["id"]
        for m in _as_list(p.get("marks"))
        if isinstance(m, dict)
        and _nes(m.get("id"))
        and m.get("shape") in _COMPARE_SHAPES
        and _fnum(m.get("x"))
        and _fnum(m.get("y"))
    }
    return ids or None


def _ok_compare(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    lids, rids = _panel_ids(r.get("left")), _panel_ids(r.get("right"))
    if not (lids and rids):
        return None
    links = [
        link
        for link in _as_list(r.get("links"))
        if isinstance(link, dict)
        and _nes(link.get("id"))
        and link.get("left") in lids
        and link.get("right") in rids
        and _nes(link.get("note"))
    ]
    return raw if links else None


def _ok_conceptmap(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    nodes = [
        n
        for n in _as_list(r.get("nodes"))
        if isinstance(n, dict) and _nes(n.get("id")) and _nes(n.get("label"))
    ]
    if not 2 <= len(nodes) <= 12:
        return None
    ids = {n["id"] for n in nodes}
    edges = [
        e
        for e in _as_list(r.get("edges"))
        if isinstance(e, dict)
        and e.get("from") in ids
        and e.get("to") in ids
        and e.get("from") != e.get("to")
    ]
    return raw if edges else None


def _ok_workbook_item(it: Any) -> bool:
    r = _as_dict(it)
    if not r or not _nes(r.get("prompt")):
        return False
    kind = r.get("kind")
    if kind == "match":
        pairs = [
            p
            for p in _as_list(r.get("pairs"))
            if isinstance(p, dict) and _nes(p.get("left")) and _nes(p.get("right"))
        ]
        return 2 <= len(pairs) <= 5
    if kind == "fill":
        blanks = _strs(r.get("blanks"))
        return _nes(r.get("text")) and len(blanks) > 0 and str(r["text"]).count("{}") == len(blanks)
    if kind == "label":
        pts = [
            p
            for p in _as_list(r.get("points"))
            if isinstance(p, dict)
            and _fnum(p.get("x"))
            and _fnum(p.get("y"))
            and _nes(p.get("label"))
        ]
        return 2 <= len(pts) <= 6
    if kind == "order":
        return 2 <= len(_strs(r.get("steps"))) <= 6
    return False


def _ok_workbook(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    items = [it for it in _as_list(r.get("items")) if _ok_workbook_item(it)]
    return raw if 1 <= len(items) <= 5 else None


def _ok_flashcards(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    cards = [
        c
        for c in _as_list(r.get("cards"))
        if isinstance(c, dict) and _nes(c.get("front")) and _nes(c.get("back"))
    ]
    return raw if 1 <= len(cards) <= 20 else None


def _ok_derivation(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r or not _nes(r.get("formula")):
        return None
    steps = [s for s in _as_list(r.get("steps")) if isinstance(s, dict) and _nes(s.get("expr"))]
    return raw if steps else None


def _ok_wordproblem(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    if not (_nes(r.get("problem")) and _nes(r.get("find")) and _nes(r.get("answer"))):
        return None
    if not (_strs(r.get("given")) and _strs(r.get("plan"))):
        return None
    solve = [s for s in _as_list(r.get("solve")) if isinstance(s, dict) and _nes(s.get("expr"))]
    return raw if solve else None


def _ok_podcast(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    chapters = [
        c
        for c in _as_list(r.get("chapters"))
        if isinstance(c, dict) and _nes(c.get("title")) and _nes(c.get("script"))
    ]
    return raw if 1 <= len(chapters) <= 12 else None


def _ok_arcade(raw: Any) -> dict[str, Any] | None:
    r = _as_dict(raw)
    if not r:
        return None
    rounds = [
        rd
        for rd in _as_list(r.get("rounds"))
        if isinstance(rd, dict)
        and _nes(rd.get("prompt"))
        and _nes(rd.get("answer"))
        and _strs(rd.get("distractors"))
    ]
    return raw if 1 <= len(rounds) <= 12 else None


# field name (as the client reads it off a card) -> its accept/preserve gate
_CARD_ACTIVITIES = {
    "perturbation": _ok_perturbation,
    "whatIf": _ok_whatif,
    "compare": _ok_compare,
    "conceptMap": _ok_conceptmap,
    "workbook": _ok_workbook,
    "flashcards": _ok_flashcards,
    "derivation": _ok_derivation,
    "wordProblem": _ok_wordproblem,
    "podcast": _ok_podcast,
    "arcade": _ok_arcade,
}


def _verify_compose(spec: Any, concept: str, difficulty: str) -> dict[str, Any] | None:
    if not isinstance(spec, dict):
        return None
    cards = spec.get("cards")
    if not isinstance(cards, list) or len(cards) < 3:
        return None
    clean: list[dict[str, Any]] = []
    for i, card in enumerate(cards):
        if not isinstance(card, dict):
            return None
        interaction = card.get("interaction")
        if not isinstance(interaction, dict) or interaction.get("kind") not in _INTERACTION_KINDS:
            return None
        title = str(card.get("title") or "").strip()
        idea = str(card.get("idea") or "").strip()
        prompt = str(interaction.get("prompt") or "").strip()
        reveal = str(card.get("reveal") or "").strip()
        kind = str(card.get("kind") or "text").strip()
        if kind not in _CARD_KINDS:
            kind = "text"
        if not (title and idea and prompt and reveal):
            return None
        clean_card: dict[str, Any] = {
            "id": str(card.get("id") or f"c{i + 1}"),
            "kind": kind,
            "title": title,
            "idea": _cap_words(idea),
            "interaction": {"kind": interaction["kind"], "prompt": prompt},
            "reveal": _cap_words(reveal),
        }
        # Optional richer formats ride ALONGSIDE the card and are additive: a malformed one is
        # dropped (invisible), the card still teaches via its base kind. Never fail the course.
        discovery = _verify_discovery(card.get("discovery"))
        if discovery is not None:
            clean_card["discovery"] = discovery
        image_spec = _verify_image_spec(card.get("imageSpec"))
        if image_spec is not None:
            clean_card["imageSpec"] = image_spec
        # The full type universe: at most one rich activity rides alongside the card. Each valid one
        # is preserved verbatim; a malformed one is dropped (the card still teaches via its kind).
        for field, gate in _CARD_ACTIVITIES.items():
            value = gate(card.get(field))
            if value is not None:
                clean_card[field] = value
        clean.append(clean_card)
    # the mini-workbook and the boss both ship WITH the outline, answers verified here
    workbook = _verify_items(spec.get("workbook"))
    boss = _verify_items(spec.get("boss"))
    if workbook is None or boss is None:
        return None
    return {
        "topic": concept,
        "difficulty": difficulty,
        "cards": clean,
        "workbook": workbook,
        "boss": boss,
    }


def _verify_sim(spec: Any) -> dict[str, Any] | None:
    """CAS-verified where mathematical; anything the CAS cannot prove is refused."""
    if not isinstance(spec, dict):
        return None
    try:
        params = spec["params"]
        outputs = spec["outputs"]
        formula = str(spec["formula"])
        breakpoints = spec.get("breakpoints") or []
        layout = str(spec.get("layout") or "sliders-left")
        if not (isinstance(params, list) and params and isinstance(outputs, list) and outputs):
            return None
        defaults: dict[str, float] = {}
        clean_params: list[dict[str, Any]] = []
        for p in params:
            name = str(p["name"])
            lo, hi, default = float(p["min"]), float(p["max"]), float(p["default"])
            if not (lo <= default <= hi):
                return None
            defaults[name] = default
            clean_params.append(
                {"name": name, "min": lo, "max": hi, "default": default, "unit": str(p["unit"])}
            )
        outs = [str(o) for o in outputs]
        eq = parse_equation(formula)  # CasError -> not mathematical -> refuse
        free = {str(s) for s in eq.free_symbols}
        if not free <= set(defaults) | set(outs):
            return None
        targets = [o for o in outs if o in free]
        if not targets:
            return None
        # The formula must actually determine an output at the default parameter values.
        subs = {sp.Symbol(n): v for n, v in defaults.items() if n not in outs}
        if not sp.solve(eq.subs(subs), sp.Symbol(targets[0])):
            return None
        clean_bps: list[dict[str, Any]] = []
        for bp in breakpoints:
            why = str(bp["why"]).strip()
            if str(bp["param"]) not in defaults or not why:
                return None
            clean_bps.append({"param": str(bp["param"]), "at": float(bp["at"]), "why": why})
        return {
            "params": clean_params,
            "formula": formula,
            "outputs": outs,
            "breakpoints": clean_bps,
            "layout": layout,
        }
    except (KeyError, TypeError, ValueError, NotImplementedError):
        # CasError is a ValueError: unparseable/multi-variable formulas land here too.
        return None


def _verify_video(spec: Any) -> dict[str, Any] | None:
    if not isinstance(spec, dict):
        return None
    scenes = spec.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        return None
    clean: list[dict[str, Any]] = []
    for i, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            return None
        visual = scene.get("visual")
        if not isinstance(visual, dict) or visual.get("kind") not in _VISUAL_KINDS:
            return None
        kind = visual["kind"]
        payload: Any
        if kind == "sim":
            payload = _verify_sim(visual.get("payload"))
        else:
            payload = sanitize_svg(str(visual.get("payload") or ""))
        if payload is None:
            return None
        try:
            duration = int(scene["durationMs"])
        except (KeyError, TypeError, ValueError):
            return None
        narration = str(scene.get("narration") or "").strip()
        # No upper duration cap: a beat is as long as understanding needs (the measured narration
        # audio is the authoritative length anyway; durationMs is only the muted-mode fallback).
        if not narration or duration <= 0:
            return None
        out: dict[str, Any] = {
            "id": str(scene.get("id") or f"s{i + 1}"),
            "durationMs": duration,
            "narration": narration,
            "visual": {"kind": kind, "payload": payload},
        }
        title = str(scene.get("title") or "").strip()
        if title:
            out["title"] = title
        clean.append(out)
    return {"scenes": clean, "narrationAudio": None}


def _verify_artifact(modality: str, obj: Any, concept: str, difficulty: str) -> Any | None:
    if modality == "compose":
        return _verify_compose(obj, concept, difficulty)
    if modality == "simulate":
        return _verify_sim(obj)
    if modality == "diagram":
        return sanitize_svg(obj) if isinstance(obj, str) else None
    return _verify_video(obj)


# --- seeds (deterministic; the mock output and the live fallback, always verified) ------


def _seed_compose(concept: str, difficulty: str) -> dict[str, Any]:
    return {
        "topic": concept,
        "difficulty": difficulty,
        "cards": [
            {
                "id": "c1",
                "kind": "text",
                "title": f"Meet {concept}",
                "idea": f"One place in the real world where {concept} quietly shows up.",
                "interaction": {"kind": "tap", "prompt": "Tap the part that looks unknown."},
                "reveal": "The unknown is what we are hunting. Everything else is a clue.",
            },
            {
                "id": "c2",
                "kind": "sim",
                "title": "Feel the rule",
                "idea": "The idea behaves like a balance: change one side, the other follows.",
                "interaction": {"kind": "drag", "prompt": "Drag the weight until it balances."},
                "reveal": "Whatever you do to one side, you do to the other.",
                # guided-discovery is the default teaching format — the floor demonstrates it too, so
                # the shell is exercised in mock mode and never only reachable through a live model.
                "discovery": {
                    "id": "d-balance",
                    "title": "tip it, then even it",
                    "stages": [
                        {
                            "visual": {
                                "marks": [
                                    {
                                        "id": "beam",
                                        "shape": "line",
                                        "x": 28,
                                        "y": 30,
                                        "x2": 72,
                                        "y2": 30,
                                    },
                                    {
                                        "id": "pivot",
                                        "shape": "circle",
                                        "x": 50,
                                        "y": 34,
                                        "r": 2,
                                        "tone": "muted",
                                    },
                                    {
                                        "id": "load",
                                        "shape": "circle",
                                        "x": 70,
                                        "y": 40,
                                        "r": 4,
                                        "tone": "hue",
                                    },
                                ]
                            },
                            "interaction": {
                                "kind": "slide",
                                "prompt": "Slide to pile weight onto one side.",
                                "min": 0,
                                "max": 10,
                                "from": 0,
                                "at": 6,
                                "unit": "kg",
                                "valueLabel": "{v} kg",
                                "bind": {"mark": "load", "prop": "r", "at": [3, 9]},
                            },
                            "reveal": "One side grows heavier and the balance tips — the rule is broken until you match it.",
                            "caption": "Feel it: whatever you add to one side, you must add to the other.",
                        }
                    ],
                },
            },
            {
                "id": "c3",
                "kind": "text",
                "title": "Make a move",
                "idea": "Undo one operation at a time to expose what is hidden.",
                "interaction": {"kind": "slide", "prompt": "Slide to peel one layer off."},
                "reveal": "Each legal move keeps the answer set exactly the same.",
            },
            {
                "id": "c4",
                "kind": "diagram",
                "title": "Predict, then check",
                "idea": "A claimed answer must survive the original problem.",
                "interaction": {"kind": "type", "prompt": "Type your value and test it."},
                "reveal": "Substitute it back. If both sides agree, the answer stands.",
            },
            {
                "id": "c5",
                "kind": "text",
                "title": "Where it bends",
                "idea": f"Every model of {concept} has an edge where it stops working.",
                "interaction": {"kind": "slide", "prompt": "Push the setting to its extreme."},
                "reveal": "Knowing where the rule breaks is part of knowing the rule.",
            },
        ],
        # the honest floor: structural questions about the method itself — never fabricated
        # facts about a topic the seed does not actually know.
        "workbook": [
            {
                "id": "w1",
                "type": "mcq",
                "prompt": "What tells you a claimed answer is trustworthy?",
                "options": [
                    "it survives being tested against the original problem",
                    "it looks like the worked example",
                    "it was the first answer you found",
                ],
                "answer": "it survives being tested against the original problem",
            },
            {
                "id": "w2",
                "type": "mcq",
                "prompt": "Pushing a rule to its extreme shows you…",
                "options": [
                    "where the ideal model stops matching reality",
                    "that the rule was never true",
                    "that extremes should be avoided",
                ],
                "answer": "where the ideal model stops matching reality",
            },
            {
                "id": "w3",
                "type": "fill",
                "prompt": "Before trusting a result, test it against the ________ problem.",
                "answer": "original",
            },
        ],
        "boss": [
            {
                "id": "b1",
                "type": "mcq",
                "prompt": "Which move is always legal while working a problem?",
                "options": [
                    "one that keeps the answer set exactly the same",
                    "one that makes the numbers smaller",
                    "one that removes the hardest part",
                ],
                "answer": "one that keeps the answer set exactly the same",
            },
            {
                "id": "b2",
                "type": "mcq",
                "prompt": "You substitute your answer back and the two sides disagree. What does that mean?",
                "options": [
                    "the answer does not survive the original problem",
                    "the original problem must be wrong",
                    "substitution only works on easy problems",
                ],
                "answer": "the answer does not survive the original problem",
            },
            {
                "id": "b3",
                "type": "fill",
                "prompt": "Each legal move keeps the answer set exactly the ________.",
                "answer": "same",
            },
        ],
    }


# Topic-aware sim fallbacks. Each is CAS-verifiable by construction (single-letter symbols, since
# the verifier applies implicit multiplication — a multi-letter name would split into a product).
# The seed picks the law whose subject vocabulary the concept mentions; an unrecognised concept
# gets a subject-NEUTRAL proportional relationship — NEVER a wrong-subject law (e.g. Ohm's V=I*R
# dressed onto a biology card). ``owner: derive from the subject, or a neutral relationship — never
# a wrong-subject sim`` (fix, 2026-07-07).
_SIM_LAWS: tuple[tuple[tuple[str, ...], dict[str, Any]], ...] = (
    (
        ("ohm", "resist", "voltage", "current", "circuit", "electric"),
        {
            "params": [
                {"name": "I", "min": 0.0, "max": 5.0, "default": 2.0, "unit": "A"},
                {"name": "R", "min": 0.0, "max": 100.0, "default": 10.0, "unit": "ohm"},
            ],
            "formula": "V = I*R",
            "outputs": ["V"],
            "breakpoints": [
                {
                    "param": "R",
                    "at": 0.0,
                    "why": (
                        "at zero resistance the model predicts unbounded current; real wires "
                        "and cells carry internal resistance, which is where the ideal law stops"
                    ),
                }
            ],
            "layout": "sliders-left",
        },
    ),
    (
        ("speed", "velocit", "distance", "displacement", "motion", "travel"),
        {
            "params": [
                {"name": "v", "min": 0.0, "max": 50.0, "default": 10.0, "unit": "m/s"},
                {"name": "t", "min": 0.0, "max": 60.0, "default": 5.0, "unit": "s"},
            ],
            "formula": "d = v*t",
            "outputs": ["d"],
            "breakpoints": [
                {
                    "param": "v",
                    "at": 0.0,
                    "why": "at zero speed no distance accrues however long you wait — the model has nothing to give",
                }
            ],
            "layout": "sliders-left",
        },
    ),
    (
        ("force", "newton", "acceler", "mass", "momentum"),
        {
            "params": [
                {"name": "m", "min": 0.0, "max": 20.0, "default": 2.0, "unit": "kg"},
                {"name": "a", "min": 0.0, "max": 20.0, "default": 5.0, "unit": "m/s^2"},
            ],
            "formula": "F = m*a",
            "outputs": ["F"],
            "breakpoints": [
                {
                    "param": "m",
                    "at": 0.0,
                    "why": "a massless body would accelerate with no force at all — real matter always has mass, where the idealisation breaks",
                }
            ],
            "layout": "sliders-left",
        },
    ),
)

# The honest neutral floor: a bare proportional relationship, meaningful for any quantitative idea
# and wrong for none. Single-letter symbols keep the CAS parser happy.
_SIM_NEUTRAL: dict[str, Any] = {
    "params": [
        {"name": "x", "min": 0.0, "max": 20.0, "default": 5.0, "unit": ""},
        {"name": "k", "min": 0.0, "max": 10.0, "default": 2.0, "unit": ""},
    ],
    "formula": "y = k*x",
    "outputs": ["y"],
    "breakpoints": [
        {
            "param": "x",
            "at": 0.0,
            "why": "with nothing to scale, the result is zero whatever the rate — the relationship has a floor",
        }
    ],
    "layout": "sliders-left",
}


def _seed_sim(concept: str) -> dict[str, Any]:
    c = concept.lower()
    for keys, law in _SIM_LAWS:
        if any(k in c for k in keys):
            return copy.deepcopy(law)
    return copy.deepcopy(_SIM_NEUTRAL)


def _seed_diagram(concept: str) -> str:
    label = quoteattr(concept)
    text = concept if len(concept) <= 38 else concept[:37] + "…"
    return (
        # xmlns is load-bearing: browsers parse artifacts as image/svg+xml, where a
        # namespace-less <svg> is not an SVG element and the client refuses it.
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label={label}>'
        f'<text x="160" y="28" text-anchor="middle" font-size="13" fill="#111">{text}</text>'
        '<circle cx="92" cy="106" r="34" fill="none" stroke="#111" stroke-width="1"/>'
        '<text x="92" y="110" text-anchor="middle" font-size="11" fill="#111">idea</text>'
        '<line x1="126" y1="106" x2="192" y2="106" stroke="#111" stroke-width="0.5"/>'
        '<polygon points="192,102 200,106 192,110" fill="#111"/>'
        '<circle cx="234" cy="106" r="34" fill="none" stroke="#111" stroke-width="1"/>'
        '<text x="234" y="110" text-anchor="middle" font-size="11" fill="#111">effect</text>'
        "</svg>"
    )


def _seed_video_svg(concept: str, phase: str) -> str:
    """A self-animating (SMIL) inline SVG — the floor video genuinely MOVES, never slideware.
    Sanitizer-clean: viewBox + xmlns, <animate>/<animateTransform>/<animateMotion> only."""
    label = quoteattr(concept)
    text = concept if len(concept) <= 34 else concept[:33] + "…"
    head = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label={label}>'
        f'<text x="160" y="26" text-anchor="middle" font-size="13" fill="#111">{text}</text>'
    )
    if phase == "grow":
        # a bar rising to its value — a quantity becoming real
        body = (
            '<rect x="60" y="60" width="200" height="110" fill="none" stroke="#E9E9EE" stroke-width="1"/>'
            '<rect x="96" width="36" fill="#1F35E0">'
            '<animate attributeName="height" values="0;96" dur="1.6s" fill="freeze"/>'
            '<animate attributeName="y" values="170;74" dur="1.6s" fill="freeze"/></rect>'
            '<rect x="188" width="36" fill="#111">'
            '<animate attributeName="height" values="0;58" dur="1.6s" begin="0.4s" fill="freeze"/>'
            '<animate attributeName="y" values="170;112" dur="1.6s" begin="0.4s" fill="freeze"/></rect>'
        )
    elif phase == "sweep":
        # an arrow sweeping across — cause reaching effect
        body = (
            '<line x1="60" y1="130" x2="260" y2="130" stroke="#E9E9EE" stroke-width="1"/>'
            '<circle r="7" fill="#FF5A1F"><animateMotion path="M60,130 L250,130" '
            'dur="2s" repeatCount="indefinite"/></circle>'
            '<text x="60" y="160" font-size="10" fill="#111">cause</text>'
            '<text x="228" y="160" font-size="10" fill="#111">effect</text>'
        )
    else:  # settle — a shape assembling and settling
        body = (
            '<circle cx="160" cy="120" r="46" fill="none" stroke="#111" stroke-width="1">'
            '<animate attributeName="r" values="6;46" dur="1.4s" fill="freeze"/></circle>'
            '<circle cx="160" cy="120" r="4" fill="#1F35E0">'
            '<animate attributeName="opacity" values="0;1" dur="0.8s" begin="1s" fill="freeze"/></circle>'
        )
    return head + body + "</svg>"


def _seed_video(concept: str) -> dict[str, Any]:
    return {
        "complexity": "simple",
        "scenes": [
            {
                "id": "s1",
                "durationMs": 6000,
                "title": concept,
                "narration": f"Here is {concept}, one idea at a time.",
                "visual": {"kind": "svg", "payload": _seed_video_svg(concept, "grow")},
            },
            {
                "id": "s2",
                "durationMs": 7000,
                "narration": "Watch how one thing reaches the next.",
                "visual": {"kind": "svg", "payload": _seed_video_svg(concept, "sweep")},
            },
            {
                "id": "s3",
                "durationMs": 6000,
                "narration": "It settles into one clear shape. Now it is yours.",
                "visual": {"kind": "svg", "payload": _seed_video_svg(concept, "settle")},
            },
        ],
        "narrationAudio": None,
    }


def _seed(modality: str, concept: str, difficulty: str) -> Any:
    if modality == "compose":
        built: Any = _seed_compose(concept, difficulty)
    elif modality == "simulate":
        built = _seed_sim(concept)
    elif modality == "diagram":
        built = _seed_diagram(concept)
    else:
        built = _seed_video(concept)
    verified = _verify_artifact(modality, built, concept, difficulty)
    if verified is None:  # a seed that fails its own verifier is a programming error
        raise RuntimeError(f"plexus seed for {modality!r} failed verification")
    return verified


# --- live generation (the anthropic path) ----------------------------------------------

_JSON_RULES = (
    "Reply with strict JSON only, no prose outside it. Calm copy in sentence case: "
    "no emoji, no exclamation marks, no hype."
)

_SYSTEMS = {
    "compose": (
        "You design complete guided-discovery micro-courses for Classess, an Indian K-12 "
        "learning app in the spirit of Brilliant: VISUAL-FIRST, one idea per card, the "
        "learner ACTS before any prose, zero lecturing. Everything must be factually "
        "correct for an Indian middle-school learner (NCERT framing where it fits).\n\n"
        '{"topic":"...",'
        '"cards":[{"id":"c1","kind":"sim|diagram|text","title":"...",'
        '"idea":"<the one idea, at most ~40 words — never a paragraph>",'
        '"interaction":{"kind":"tap|drag|slide|type","prompt":"<what the learner does first>"},'
        '"reveal":"<what the action uncovers, at most ~40 words>",'
        '"discovery":<OPTIONAL guided-discovery spec, see below — the default teaching format>,'
        '"imageSpec":<OPTIONAL {"subject":"...","caption":"..."} for organic/complex visuals>,'
        "<OPTIONAL: at most ONE rich activity field — perturbation | whatIf | compare | conceptMap | "
        "workbook | flashcards | derivation | wordProblem | podcast | arcade, schemas below>}],"
        '"workbook":[{"id":"w1","type":"mcq","prompt":"...",'
        '"options":["...","...","..."],"answer":"<copied character-for-character from options>"},'
        '{"id":"w2","type":"fill","prompt":"<a sentence with a ________ gap>",'
        '"answer":"<one unambiguous word or short phrase>"}],'
        '"boss":[<3 items, same shapes, noticeably harder>]}\n\n'
        "PEDAGOGICAL SEQUENCE — the 4 to 6 cards MUST run in this order:\n"
        "  1. HOOK — a concrete real-world moment; a 'tap' interaction to notice something.\n"
        "  2-3. EXPLORE — the learner FEELS the rule move ('sim' when a quantitative law "
        "with 1-3 parameters drives it; 'diagram' when a labeled picture carries it).\n"
        "  4. FORMALIZE — name the rule that the exploration just revealed.\n"
        "  5. PRACTICE-READY / EDGE — apply it, or push it to where the model breaks.\n\n"
        # Fable's type-selection doctrine — which teaching format each beat reaches for.
        "FORMAT SELECTION — reach for the format that TEACHES the beat; attach it as a field on the "
        "card. Never decorate: a format you attach must genuinely carry that idea, be factually "
        "correct, and be complete (a spec that cannot run is silently dropped). Priority:\n"
        "  • GUIDED-DISCOVERY is the DEFAULT. For any teaching beat that can be discovered by acting "
        "on a picture, attach a 'discovery' spec (schema below): one idea per stage, act-to-reveal.\n"
        "  • PERTURBATION ('perturbation' field) for a LAW-like model with a telling edge — bend the "
        "one parameter until the ideal breaks (Ohm's law R→0, an ideal gas, a sampling statistic).\n"
        "  • WHATIF ('whatIf') or WORDPROBLEM ('wordProblem') for a NUMERICAL word problem — whatIf "
        "when the figure and worked solution are worth making live and editable; wordProblem when the "
        "METHOD of reading the problem (given→find→plan→solve) is the lesson.\n"
        "  • COMPARE ('compare') for two paired concepts (animal vs plant cell, series vs parallel).\n"
        "  • CONCEPTMAP ('conceptMap') for an overview beat: how the pieces connect, as a web.\n"
        "  • WORKBOOK ('workbook') is a hands-on mini-workbook — include ONE roughly every ~3 "
        "teaching beats to consolidate.\n"
        "  • FLASHCARDS ('flashcards') for crisp recall pairs worth spacing out over time.\n"
        "  • DERIVATION ('derivation') — attach the quiet ⓘ to ANY card whose reveal lands a FORMULA "
        "(most learners never open it; the curious go deeper).\n"
        "  • PODCAST ('podcast') — a chaptered audio revision companion for the whole topic; attach "
        "to a late card. Each chapter 'script' is ≤ ~600 characters (one narration call).\n"
        "  • ARCADE ('arcade') ONLY where playing the mechanic IS the concept — otherwise never.\n"
        "  • SIM ('kind':'sim') stays the card kind for a simple perturbable law; DIAGRAM "
        "('kind':'diagram', + 'imageSpec' {'subject': a precise noun phrase} when the subject is "
        "ORGANIC — a plant cell, the human eye — so the app renders a real image). TEXT is the "
        "exception: connective tissue only, never where a visual could carry it.\n"
        "Attach AT MOST ONE rich activity field per card; a card may instead carry a discovery spec. "
        "The top-level 'workbook' and 'boss' arrays (mcq/fill recall) always ship with the course. "
        "The motion video and per-chapter concept-maps are produced by their own engines around this "
        "course.\n\n"
        # Compact schemas for the rich activity fields. Coordinates on a 0..100 by 0..62 canvas.
        "RICH ACTIVITY SCHEMAS — attach the object as the named field on a card:\n"
        '  perturbation: {"id","title","law":"I = V / R","param":{"id":"R","label":"resistance",'
        '"min":0,"max":50,"from":25,"unit":"Ω"},"output":{"label":"current","expr":"12 / R",'
        '"unit":"A"},"breakpoint":{"at":0,"approach":"below","assumption":"<the hidden ideal>",'
        '"revelation":"<why reality refuses to diverge>"}} (output.expr is arithmetic over param id)\n'
        '  whatIf: {"id","title","problem":"<text with {id} tokens>","values":[{"id":"h",'
        '"label":"height","value":10,"min":1,"max":30,"unit":"m"}],"scene":{"marks":[{"id":"m1",'
        '"shape":"line|circle|rect|text|arc","x":<number OR arithmetic string over value ids>,"y":.,'
        '"x2":?,"y2":?,"r":?,"text":"{h}","tone":"ink|muted|hue"}]},"solve":[{"id":"s1",'
        '"label":"<what this line does>","expr":"<arithmetic over value ids + earlier step ids>"}],'
        '"answerLabel":"..."} (1..6 values, ≥1 solve step, ≥1 mark)\n'
        '  compare: {"id","title","left":{"label","marks":[{"id","shape":"circle|ring|ellipse|rect|'
        'line|text","x":.,"y":.,"r":?,"text":?,"tone":?}]},"right":{"label","marks":[...]},'
        '"links":[{"id","left":"<left mark id>","right":"<right mark id>","note":"...",'
        '"kind":"same|diff"}]} (≥1 mark per panel, ≥1 link)\n'
        '  conceptMap: {"id","title","nodes":[{"id","label"}],"edges":[{"from":"<node id>",'
        '"to":"<node id>","label":"<how they relate>"}],"root":"<optional centre node id>"} '
        "(2..12 nodes, ≥1 edge)\n"
        '  workbook: {"id","title","items":[ '
        '{"id","kind":"match","prompt","pairs":[{"left","right"}]} (2..5 pairs) | '
        '{"id","kind":"fill","prompt","text":"water is {} parts H to {} O","blanks":["2","1"],'
        '"distractors":["3"]} (one blank per {}) | '
        '{"id","kind":"label","prompt","points":[{"id","x":<0..100>,"y":<0..62>,"label"}],'
        '"distractors":[...]} (2..6 points) | '
        '{"id","kind":"order","prompt","steps":["first","then","last"]} (2..6, CORRECT order) ]} '
        "(1..5 items)\n"
        '  flashcards: {"id","title","cards":[{"id","front":"<prompt>","back":"<answer>"}]} '
        "(1..20 cards)\n"
        '  derivation: {"id","formula":"(a+b)^2","label":"the identity","steps":[{"expr":'
        '"a^2 + 2ab + b^2","note":"<one clause why it follows>","sub":<OPTIONAL one-level nested '
        "derivation>}]} (≥1 step)\n"
        '  wordProblem: {"id","title","problem":"<full statement>","given":["...","..."],'
        '"find":"...","plan":["...","..."],"solve":[{"expr":"<a line of working>","note":"<why>"}],'
        '"answer":"..."} (≥1 given, ≥1 plan, ≥1 solve line)\n'
        '  podcast: {"id","title","chapters":[{"id","title","script":"<spoken, calm, ≤600 chars>"}]} '
        "(1..12 chapters)\n"
        '  arcade: {"id","title","game":"catch","rounds":[{"id","prompt","answer",'
        '"distractors":["...","..."]}]} (1..12 rounds, ≥1 distractor each)\n\n'
        "GUIDED-DISCOVERY SPEC — a card's optional 'discovery' object, rendered on the discovery shell "
        "(a large reactive SVG the learner acts on). 1 to 6 stages, ONE idea each:\n"
        '{"id":"...","title":"...","stages":[{'
        '"visual":{"marks":[{"id":"m1","shape":"circle|rect|line|ring|text",'
        '"x":<0..100>,"y":<0..62>,"x2":?,"y2":?,"r":?,"w":?,"h":?,"text":?,'
        '"tone":"ink|muted|hue"}]},'
        '"interaction":<ONE of '
        '{"kind":"tap","prompt":"...","targets":["m1"],"need":?} | '
        '{"kind":"drag","prompt":"...","handle":"m1","to":{"x":.,"y":.},"radius":?} | '
        '{"kind":"slide","prompt":"...","min":.,"max":.,"from":.,"at":.,"unit":?,'
        '"valueLabel":"{v} …","bind":{"mark":"m1","prop":"x|y|r","at":[from,to]}}>,'
        '"reveal":"<the idea, revealed only after the act>","caption":"<her one spoken line>"}]}\n'
        "Every id referenced by an interaction (targets / handle / bind.mark) MUST exist in that "
        "stage's marks. Coordinates live on a 0..100 by 0..62 canvas. tone 'hue' is earned pigment — "
        "use it once, on the mark the reveal lands on. Aim to attach a discovery spec to most "
        "teaching cards; keep every 'idea' and 'reveal' under ~40 words — the visual does the "
        "teaching.\n\n"
        "Exactly 3 workbook items and exactly 3 boss items, each testing an idea actually "
        "taught on the cards. Every mcq has 3 or 4 distinct options and its answer string "
        "appears exactly once among them; distractors are plausible misconceptions. Every "
        "fill answer is a single word or short phrase a learner could reasonably type. "
        + _JSON_RULES
    ),
    "simulate": (
        "You design interactive simulator specs for Classess. The formula must be a "
        "single equation 'OUT = expression of the params', written so a CAS can parse it: "
        "explicit * for multiplication, ^ for powers, one variable per symbol. Breakpoints "
        "name where the ideal model stops working in reality.\n\n"
        '{"params":[{"name":"R","min":0,"max":100,"default":10,"unit":"ohm"}],'
        '"formula":"V = I*R","outputs":["V"],'
        '"breakpoints":[{"param":"R","at":0,"why":"..."}],"layout":"sliders-left"}\n' + _JSON_RULES
    ),
    "diagram": (
        "You draw clean, glanceable inline SVG diagrams for Classess: editorial ink line-work on a "
        "white ground, one idea readable at a glance. Requirements: a viewBox attribute; no script, "
        "foreignObject, external references, or event handlers; no <style> element — style every "
        "element with presentation attributes only (stroke, fill, font-size, ...), since style "
        "blocks are stripped before serving. Stay compact: prefer a few strong shapes over many "
        "small ones.\n\n"
        # one-hue ink law (VIDEO-QUALITY.md §1, §4) — the same restraint the motion engine obeys.
        "COLOUR LAW — one hue, everything else ink:\n"
        "  • Line-work is ink only: strokes #0D0D10 (primary) and #6E6E76 (secondary lines, labels) "
        "at ONE hairline weight (stroke-width 1.5). White ground, no coloured background.\n"
        "  • Exactly ONE subject hue may carry the single most meaningful element and its label — "
        "nothing else is coloured. Pick by subject: chemistry #CC1E7A, biology/life #66B300, "
        "physics/maths/mastery #1F35E0. NEVER molten #FF5A1F (that is Vidya's warmth alone).\n"
        "  • A reactive tint is that hue at 0.12–0.25 opacity, never a saturated fill. NO gradients, "
        "shadows, glows, bevels, or glass — depth is line weight, nothing more. No rainbow palettes, "
        "no more than one hue in the whole figure.\n\n"
        "Reply with exactly one <svg>...</svg> element and nothing else."
    ),
    "video": (
        "You storyboard short explainer motion pieces for Classess (ten seconds to two "
        "minutes total). This is a WATCHED piece, so the visual must GENUINELY ANIMATE the "
        "idea — moving parts, a quantity growing, a shape assembling, an annotated moment "
        "arriving — NEVER a static slideshow. Prefer inline SVG that animates itself with "
        "SMIL: <animate>, <animateTransform>, <animateMotion> on real elements (a bar that "
        "grows, an arrow that sweeps, a label that fades in at the right beat). Narration is "
        "calm and precise, one or two sentences per scene, matched to what moves on screen.\n\n"
        "When a topic naturally teaches in bits, use MORE, SHORTER scenes — one clean idea "
        "per scene, each as long as it needs (a few seconds to ~30s). Do not pad.\n\n"
        # visual-quality bar (VIDEO-QUALITY.md) — the owner's reference-film standard, verbatim
        "VISUAL BAR — every PAUSED frame must read as a premium editorial diagram, not a slide: "
        "ink line-work on white, ONE hue, deep margins, at most 7 marks, one focal subject. If a "
        'frame reads as "title + bullets", redraw it.\n'
        "Two type voices only, set as presentation attributes (no <style>): an editorial serif for "
        'the ONE headline (font-family="Fraunces, Georgia, serif", sentence case, at most 2 lines, '
        "at most one italic emphasis word, fill #0D0D10); UPPERCASE tracked mono for every "
        "label/eyebrow/readout (font-family=\"'JetBrains Mono', ui-monospace, monospace\", "
        "letter-spacing 0.12em, fill #6E6E76).\n"
        "Colour law: white ground; strokes #0D0D10 and #6E6E76 at ONE hairline weight "
        "(stroke-width 1.5). Exactly ONE subject hue carries the meaningful moving quantity and its "
        "label — chemistry #CC1E7A, biology #66B300, physics/maths/mastery #1F35E0; NEVER molten "
        "#FF5A1F. No gradients, shadows, glows, bevels, glass; a reactive tint is that hue at "
        "0.12–0.25 opacity, never a saturated fill.\n"
        'Layout on viewBox="0 0 640 360": headline upper third (~30px), one focal subject on a '
        "vertical third, at most one live readout in a fixed top-right corner (big tabular figure "
        "~38px + small unit ~12px), at most 2 annotations each on a thin leader line to the margin "
        "(~10px mono). Never two ideas in one scene.\n"
        "Each scene is ONE beat of this arc, in order, using only the beats the idea needs: POSE (a "
        "question alone) → SET (subject draws itself in) → ACT (the quantity moves / readout steps) "
        "→ FLASH (the charged aha: the hue blooms then settles, once per film) → DATA (a plot draws "
        "left-to-right, endpoint marked with crosshair + labeled dot) → NAME (concept resolves in "
        "the serif, low-contrast fade).\n"
        'Motion is physics: SMIL with calcMode="spline" keySplines="0.2 0 0 1" on anything the eye '
        "follows; draw line-work on with stroke-dashoffset→0; sweep curves and rise fills; nothing "
        "pops in at opacity 1; nothing linear.\n"
        "A live number STEPS through its key values (start · mid · end) via timed <set> opacity on "
        "stacked <text> — never a smooth glyph counter; a graph DRAWS, never snaps in whole.\n"
        "Every element enters and leaves inside its narration sentence (≤300ms slack); the frame "
        "holds only what the current sentence is about.\n"
        "BANNED (reads cheap): more than one hue; gradients/shadows/glows/glass; system or novelty "
        "fonts; emoji/clip-art/mascots; centered-everything, bullet slides, title-over-content; "
        "bouncy/spin/wipe/carousel transitions; everything moving at once; inconsistent stroke "
        "weights; floating unlabeled leaders; UI chrome inside the scene.\n"
        "Aim for the reference bar: a calm, spacious, instrument-precise film where one hue and one "
        "idea carry each frame — never a decorated slideshow.\n\n"
        "durationMs is a FALLBACK hint only: the real beat length is measured from each scene's "
        "narration audio, so the player advances on the narration, not this number. Still give a "
        "sensible value (roughly how long the sentence takes to read) for the muted case.\n\n"
        '{"complexity":"simple|complex",'
        '"scenes":[{"id":"s1","durationMs":6000,"title":"...","narration":"...",'
        '"visual":{"kind":"svg|diagram|sim","payload":"<self-animating svg with viewBox> or '
        'a sim spec {params,formula,outputs,breakpoints,layout}"}}]}\n\n'
        'Set "complexity":"complex" ONLY when animating this idea genuinely needs frontier '
        "reasoning (intricate synchronized motion, a multi-part derivation assembling, subtle "
        'physical dynamics); otherwise "simple". Use 3 to 6 scenes. ' + _JSON_RULES
    ),
}

# diagram needs headroom: a truncated SVG has no closing tag and refuses to sanitize
# These are thinking-heavy frontier models: reasoning tokens count against max_tokens, so a
# tight budget gets exhausted mid-thought and returns EMPTY content — which parses to {} and
# silently seeds. Give real headroom so the answer actually lands. Video (multi-scene self-
# animating SVG) is the most verbose and needs the most; compose grew richer too.
_MAX_TOKENS = {"compose": 16000, "simulate": 2000, "diagram": 6000, "video": 16000}


def _complete(
    provider_model: str, modality: str, user: str, fallbacks: tuple[str, ...]
) -> tuple[str, int]:
    import litellm  # lazy: mock mode and tests never import litellm

    # Claude 5 family accepts only default sampling; drop unsupported params instead of
    # erroring (without this, whether an engine call works depends on whether another
    # capability happened to set the global first — a heisenbug, not a policy).
    litellm.drop_params = True

    response = litellm.completion(
        model=provider_model,
        messages=[
            {"role": "system", "content": _SYSTEMS[modality]},
            {"role": "user", "content": user},
        ],
        fallbacks=list(fallbacks) or None,
        max_tokens=_MAX_TOKENS[modality],
        temperature=0.4,
    )
    text = response.choices[0].message.content or ""
    usage = getattr(response, "usage", None)
    return text, int(getattr(usage, "total_tokens", 0) or 0)


def _raster_diagram(concept: str, difficulty: str) -> str | None:
    """Imagery SVG cannot express — Nano Banana via engine.image, wrapped as inline SVG."""
    result = image.generate_image(concept, difficulty=difficulty)
    if result.get("status") != "ready":
        return None
    href = f"data:{result['mime']};base64,{result['b64']}"
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-label='
        + quoteattr(concept)
        + ">"
        f'<image href="{href}" x="0" y="0" width="640" height="400"/>'
        "</svg>"
    )


def _scene_plan_complex(obj: Any) -> bool:
    """A video scene plan can self-declare that animating it needs the frontier reasoner
    (owner's video routing law): an explicit complexity flag escalates sonnet -> Opus."""
    if not isinstance(obj, dict):
        return False
    flag = obj.get("complexity")
    if isinstance(flag, str) and flag.strip().lower() in {"complex", "high", "hard"}:
        return True
    return obj.get("escalate") is True


def _generate_video_live(
    concept: str,
    difficulty: str,
    provider_model: str,
    fallbacks: tuple[str, ...],
    user: str,
) -> tuple[Any, str, int, bool]:
    """engine.video routing law (owner, 2026-07-07): storyboard on the sonnet tier by DEFAULT,
    escalate to the frontier reasoner (Opus — the first fallback) ONLY when necessary: the scene
    plan flags itself complex, or the sonnet draft fails structural verification. Returns the
    Opus draft only when it actually verifies, so an escalation never degrades the result."""
    from classess_gateway.vidya import _extract_json

    text, tokens = _complete(provider_model, "video", user, fallbacks)
    obj = _extract_json(text)
    artifact = _verify_artifact("video", obj, concept, difficulty)
    model_used = provider_model

    escalation_model = fallbacks[0] if fallbacks else ""
    if (
        escalation_model
        and escalation_model != provider_model
        and (artifact is None or _scene_plan_complex(obj))
    ):
        text2, tokens2 = _complete(escalation_model, "video", user, fallbacks[1:])
        tokens += tokens2
        artifact2 = _verify_artifact("video", _extract_json(text2), concept, difficulty)
        if artifact2 is not None:
            artifact, model_used = artifact2, escalation_model

    if artifact is None:
        raise ValueError("video verification failed on both tiers")
    # Per-scene synthesis (MOTION.md §5): each beat gets its OWN audio, and the measured WAV
    # length becomes that beat's authoritative duration — never one joined blob, never the
    # LLM-guessed durationMs (which stays only as the muted-mode fallback). Keyless -> no audio.
    for scene in artifact["scenes"]:
        audio = synthesize_narration(scene["narration"])
        if audio is None:
            continue
        measured = wav_duration_ms(audio["b64"])
        scene["audio"] = {**audio, "durationMs": measured} if measured else audio
    return artifact, model_used, tokens, False


def _sim_reason(obj: Any) -> str:
    """Why a sim draft failed verification — fed back to the model on the retry so it can fix it,
    instead of the failure being swallowed. The CAS parse error is the most useful signal."""
    if not isinstance(obj, dict):
        return "the reply was not a JSON object"
    formula = obj.get("formula")
    if not _nes(formula):
        return "no 'formula' field was present"
    try:
        parse_equation(str(formula))
    except Exception as exc:  # CasError and friends carry the exact parse failure
        return f"the formula {formula!r} is not CAS-parseable ({exc})"
    return (
        "the formula did not solve for the output at the default parameter values, or a param/output "
        "was malformed (every symbol must be a param or an output; min <= default <= max)"
    )


def _generate_sim_live(
    concept: str,
    difficulty: str,
    provider_model: str,
    fallbacks: tuple[str, ...],
    user: str,
) -> tuple[Any, str, int]:
    """engine.simulate: draft -> CAS-verify -> ONE retry feeding the verifier's reason back. A sim
    that still refuses raises (the caller seeds a TOPIC-AWARE floor, never a wrong-subject law)."""
    from classess_gateway.vidya import _extract_json

    text, tokens = _complete(provider_model, "simulate", user, fallbacks)
    obj = _extract_json(text)
    artifact = _verify_sim(obj)
    if artifact is not None:
        return artifact, provider_model, tokens

    reason = _sim_reason(obj)
    logger.warning(
        "engine.simulate draft refused — retrying once with the verifier reason",
        extra={"fields": {"concept": concept, "reason": reason}},
    )
    retry_user = (
        f"{user}\n\nYour previous simulator draft did NOT pass the CAS verifier: {reason}\n"
        "Return a corrected spec: a single equation OUT = expression, explicit * for multiplication "
        "and ^ for powers, ONE variable per symbol, every symbol a declared param or output, and the "
        "formula must actually solve for the output at the default parameter values."
    )
    text2, tokens2 = _complete(provider_model, "simulate", retry_user, fallbacks)
    tokens += tokens2
    artifact2 = _verify_sim(_extract_json(text2))
    if artifact2 is not None:
        return artifact2, provider_model, tokens
    logger.warning(
        "engine.simulate refused after retry — seeding a topic-aware floor",
        extra={"fields": {"concept": concept, "reason": _sim_reason(_extract_json(text2))}},
    )
    raise ValueError("sim verification failed after one retry")


def _generate_live(
    modality: str,
    concept: str,
    difficulty: str,
    provider_model: str,
    fallbacks: tuple[str, ...],
    payload: dict[str, Any],
) -> tuple[Any, str, int, bool]:
    """(artifact, model_used, tokens, seeded). Refusal invisible — failures seed."""
    tokens = 0
    try:
        if modality == "diagram" and payload.get("raster"):
            raster = _raster_diagram(concept, difficulty)
            if raster is not None:
                clean = sanitize_svg(raster)
                if clean is not None:
                    return clean, image.MODEL, 0, False
            # no key or the image path refused: fall through to the SVG path
        user = f"Concept: {concept}\nDifficulty: {difficulty}\nAudience: Indian K-12 learner."
        if modality == "video":
            return _generate_video_live(concept, difficulty, provider_model, fallbacks, user)
        if modality == "simulate":
            artifact, model_used, tokens = _generate_sim_live(
                concept, difficulty, provider_model, fallbacks, user
            )
            return artifact, model_used, tokens, False
        text, tokens = _complete(provider_model, modality, user, fallbacks)
        obj: Any = text
        if modality != "diagram":
            from classess_gateway.vidya import _extract_json

            obj = _extract_json(text)
        artifact = _verify_artifact(modality, obj, concept, difficulty)
        if artifact is not None:
            return artifact, provider_model, tokens, False
        logger.warning(
            "engine.%s draft failed verification — seeding",
            modality,
            extra={"fields": {"concept": concept}},
        )
    except Exception:  # refusal invisible by contract — but never silent: log, then seed
        logger.warning(
            "engine.%s live generation raised — seeding",
            modality,
            extra={"fields": {"concept": concept}},
            exc_info=True,
        )
    return _seed(modality, concept, difficulty), "seed", tokens, True


# --- one generation at a time, per user (strict queue) ---------------------------------
# The cache-hit path returns before this gate, so instant board-shared reuse is NEVER gated —
# only a real (cache-miss) generation is. A second concurrent generation for the same user is
# refused with GenerationBusy, which the app maps to 429 + Retry-After.
# ponytail: in-process set guarded by a lock — correct for one gateway instance. Move to a
# Redis SETNX lock when >1 instance runs (same seam the rate limiter will move on).
_GEN_RETRY_AFTER_S = 3
_gen_lock = threading.Lock()
_gen_in_flight: set[str] = set()


class GenerationBusy(Exception):
    """This user already has a generation in flight — one at a time."""

    def __init__(self, user: str, retry_after: int = _GEN_RETRY_AFTER_S) -> None:
        self.user = user
        self.retry_after = retry_after
        super().__init__(f"generation already in flight for {user!r}")


@contextmanager
def _generation_slot(user: str) -> Iterator[None]:
    if not user:  # anonymous/unkeyed calls aren't per-user gated; the per-IP rate limit still caps
        yield
        return
    with _gen_lock:
        if user in _gen_in_flight:
            raise GenerationBusy(user)
        _gen_in_flight.add(user)
    try:
        yield
    finally:
        with _gen_lock:
            _gen_in_flight.discard(user)


# --- the engine entrypoint (called from both providers) --------------------------------


def _scope(payload: dict[str, Any]) -> dict[str, str]:
    """The board-shared curriculum coordinate — never personalization (that stays runtime-only)."""
    return {k: str(payload.get(k) or "").strip() for k in store.SCOPE_KEYS}


def _mock_tokens(concept: str, modality: str, difficulty: str) -> int:
    digest = hashlib.sha256(f"{modality}\x00{concept}\x00{difficulty}".encode()).hexdigest()
    return int(digest, 16) % 500 + 1


def _public(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "concept": record["concept"],
        "modality": record["modality"],
        "difficulty": record["difficulty"],
        "artifact": record["artifact"],
        "provenance": record["provenance"],
        "verified": record["verified"],
        "seeded": record.get("seeded", False),
    }


def run_engine(
    *,
    capability: str,
    payload: dict[str, Any],
    provider_model: str,
    live: bool,
    fallbacks: tuple[str, ...] = (),
) -> ProviderResponse:
    """One engine invocation: warm cache -> generate -> verify -> cache -> serve."""
    modality = capability.removeprefix("engine.")
    if modality not in MODALITIES:
        raise KeyError(f"unknown plexus engine: {capability!r}")
    concept = str(payload.get("concept") or payload.get("topic") or "").strip()
    concept = concept or _DEFAULT_CONCEPT
    difficulty = str(payload.get("difficulty") or "core").strip() or "core"
    scope = _scope(payload)

    cached = store.load(concept, modality, difficulty, scope)
    if cached is not None and cached.get("verified"):
        artifact = cached.get("artifact")
        # compose grew workbook + boss; a pre-upgrade cache record regenerates instead of serving
        stale = modality == "compose" and not (
            isinstance(artifact, dict) and "workbook" in artifact and "boss" in artifact
        )
        # pre-upgrade diagrams without an xmlns never render in the browser — regenerate
        if modality == "diagram" and not (isinstance(artifact, str) and "xmlns" in artifact):
            stale = True
        # a cached seed is an honest floor, not a ceiling: live mode retries the real thing
        if live and cached.get("seeded"):
            stale = True
        if not stale:
            return ProviderResponse(output=_public(cached), tokens=0)

    # Cache miss: a real generation. Hold the per-user slot for its whole duration (one at a time).
    with _generation_slot(str(payload.get("user") or "").strip()):
        if live:
            artifact, model_used, tokens, seeded = _generate_live(
                modality, concept, difficulty, provider_model, fallbacks, payload
            )
        else:
            artifact = _seed(modality, concept, difficulty)
            model_used, tokens, seeded = "mock", _mock_tokens(concept, modality, difficulty), False

        record = {
            "concept": concept,
            "modality": modality,
            "difficulty": difficulty,
            "verified": True,
            "seeded": seeded,
            "provenance": {
                "engine": capability,
                "model": model_used,
                "prompt_version": store.PROMPT_VERSION,
            },
            "artifact": artifact,
            "createdAt": datetime.now(UTC).isoformat(timespec="seconds"),
        }
        store.save(concept, modality, difficulty, record, scope)
        return ProviderResponse(output=_public(record), tokens=tokens)
