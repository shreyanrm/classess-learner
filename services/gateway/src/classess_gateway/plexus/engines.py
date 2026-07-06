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

import hashlib
from datetime import UTC, datetime
from typing import Any
from xml.sax.saxutils import quoteattr

import sympy as sp
from classess_verifier.cas import parse_equation

from classess_gateway.plexus import image, store
from classess_gateway.plexus.media import synthesize_narration
from classess_gateway.plexus.sanitize import sanitize_svg
from classess_gateway.providers import ProviderResponse

MODALITIES = ("compose", "simulate", "diagram", "video")
_DEFAULT_CONCEPT = "linear equations in one variable"

_INTERACTION_KINDS = {"tap", "drag", "slide", "type"}
_VISUAL_KINDS = {"svg", "sim", "diagram"}
_MAX_SCENE_MS = 120_000


# --- verification (every artifact passes here before caching or serving) ---------------


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
        if not (title and idea and prompt and reveal):
            return None
        clean.append(
            {
                "id": str(card.get("id") or f"c{i + 1}"),
                "title": title,
                "idea": idea,
                "interaction": {"kind": interaction["kind"], "prompt": prompt},
                "reveal": reveal,
            }
        )
    return {"topic": concept, "difficulty": difficulty, "cards": clean}


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
        if not narration or not 0 < duration <= _MAX_SCENE_MS:
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
                "title": f"Meet {concept}",
                "idea": f"One place in the real world where {concept} quietly shows up.",
                "interaction": {"kind": "tap", "prompt": "Tap the part that looks unknown."},
                "reveal": "The unknown is what we are hunting. Everything else is a clue.",
            },
            {
                "id": "c2",
                "title": "Feel the rule",
                "idea": "The idea behaves like a balance: change one side, the other follows.",
                "interaction": {"kind": "drag", "prompt": "Drag the weight until it balances."},
                "reveal": "Whatever you do to one side, you do to the other.",
            },
            {
                "id": "c3",
                "title": "Make a move",
                "idea": "Undo one operation at a time to expose what is hidden.",
                "interaction": {"kind": "slide", "prompt": "Slide to peel one layer off."},
                "reveal": "Each legal move keeps the answer set exactly the same.",
            },
            {
                "id": "c4",
                "title": "Predict, then check",
                "idea": "A claimed answer must survive the original problem.",
                "interaction": {"kind": "type", "prompt": "Type your value and test it."},
                "reveal": "Substitute it back. If both sides agree, the answer stands.",
            },
            {
                "id": "c5",
                "title": "Where it bends",
                "idea": f"Every model of {concept} has an edge where it stops working.",
                "interaction": {"kind": "slide", "prompt": "Push the setting to its extreme."},
                "reveal": "Knowing where the rule breaks is part of knowing the rule.",
            },
        ],
    }


def _seed_sim() -> dict[str, Any]:
    # Verified by construction: V = I*R parses, solves, and covers every symbol.
    return {
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
    }


def _seed_diagram(concept: str) -> str:
    label = quoteattr(concept)
    text = concept if len(concept) <= 38 else concept[:37] + "…"
    return (
        f'<svg viewBox="0 0 320 180" role="img" aria-label={label}>'
        f'<text x="160" y="28" text-anchor="middle" font-size="13" fill="#111">{text}</text>'
        '<circle cx="92" cy="106" r="34" fill="none" stroke="#111" stroke-width="1"/>'
        '<text x="92" y="110" text-anchor="middle" font-size="11" fill="#111">idea</text>'
        '<line x1="126" y1="106" x2="192" y2="106" stroke="#111" stroke-width="0.5"/>'
        '<polygon points="192,102 200,106 192,110" fill="#111"/>'
        '<circle cx="234" cy="106" r="34" fill="none" stroke="#111" stroke-width="1"/>'
        '<text x="234" y="110" text-anchor="middle" font-size="11" fill="#111">effect</text>'
        "</svg>"
    )


def _seed_video(concept: str) -> dict[str, Any]:
    return {
        "scenes": [
            {
                "id": "s1",
                "durationMs": 6000,
                "title": concept,
                "narration": f"Here is {concept}, one idea at a time.",
                "visual": {"kind": "diagram", "payload": _seed_diagram(concept)},
            },
            {
                "id": "s2",
                "durationMs": 9000,
                "narration": "Watch what changes when we move just one thing.",
                "visual": {"kind": "sim", "payload": _seed_sim()},
            },
            {
                "id": "s3",
                "durationMs": 6000,
                "narration": "Now try it yourself. One step, no hurry.",
                "visual": {"kind": "svg", "payload": _seed_diagram(concept)},
            },
        ],
        "narrationAudio": None,
    }


def _seed(modality: str, concept: str, difficulty: str) -> Any:
    if modality == "compose":
        built: Any = _seed_compose(concept, difficulty)
    elif modality == "simulate":
        built = _seed_sim()
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
        "You design guided-discovery lesson cards for Classess, an Indian K-12 learning "
        "app in the spirit of Brilliant: one idea per card, act-to-reveal before any "
        "explanation, zero lecturing.\n\n"
        '{"topic":"...","cards":[{"id":"c1","title":"...","idea":"<the one idea>",'
        '"interaction":{"kind":"tap|drag|slide|type","prompt":"<what the learner does>"},'
        '"reveal":"<what the action uncovers>"}]}\n'
        "Include 4 to 7 cards in discovery order. " + _JSON_RULES
    ),
    "simulate": (
        "You design interactive simulator specs for Classess. The formula must be a "
        "single equation 'OUT = expression of the params', written so a CAS can parse it: "
        "explicit * for multiplication, ^ for powers, one variable per symbol. Breakpoints "
        "name where the ideal model stops working in reality.\n\n"
        '{"params":[{"name":"R","min":0,"max":100,"default":10,"unit":"ohm"}],'
        '"formula":"V = I*R","outputs":["V"],'
        '"breakpoints":[{"param":"R","at":0,"why":"..."}],"layout":"sliders-left"}\n'
        + _JSON_RULES
    ),
    "diagram": (
        "You draw clean, glanceable inline SVG diagrams for Classess: ink on white "
        "(#111 strokes on transparent), hairline weights, labeled sparingly, one idea "
        "readable at a glance. Requirements: a viewBox attribute; no script, "
        "foreignObject, external references, or event handlers.\n\n"
        "Reply with exactly one <svg>...</svg> element and nothing else."
    ),
    "video": (
        "You storyboard short explainer motion pieces for Classess (ten seconds to two "
        "minutes total). Each scene animates meaning, never chrome; narration is calm "
        "and precise.\n\n"
        '{"scenes":[{"id":"s1","durationMs":6000,"title":"...","narration":"...",'
        '"visual":{"kind":"svg|diagram|sim","payload":"<svg with viewBox> or a sim '
        'spec {params,formula,outputs,breakpoints,layout}"}}]}\n'
        "Use 3 to 6 scenes. " + _JSON_RULES
    ),
}

_MAX_TOKENS = {"compose": 1600, "simulate": 900, "diagram": 1400, "video": 3000}


def _complete(
    provider_model: str, modality: str, user: str, fallbacks: tuple[str, ...]
) -> tuple[str, int]:
    import litellm  # lazy: mock mode and tests never import litellm

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
        '<svg viewBox="0 0 640 400" role="img" aria-label=' + quoteattr(concept) + ">"
        f'<image href="{href}" x="0" y="0" width="640" height="400"/>'
        "</svg>"
    )


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
        text, tokens = _complete(provider_model, modality, user, fallbacks)
        obj: Any = text
        if modality != "diagram":
            from classess_gateway.vidya import _extract_json

            obj = _extract_json(text)
        artifact = _verify_artifact(modality, obj, concept, difficulty)
        if artifact is not None:
            if modality == "video":
                narration = " ".join(s["narration"] for s in artifact["scenes"])
                artifact["narrationAudio"] = synthesize_narration(narration)
            return artifact, provider_model, tokens, False
    except Exception:  # ponytail: refusal invisible by contract — any live failure seeds
        pass
    return _seed(modality, concept, difficulty), "seed", tokens, True


# --- the engine entrypoint (called from both providers) --------------------------------


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

    cached = store.load(concept, modality, difficulty)
    if cached is not None and cached.get("verified"):
        return ProviderResponse(output=_public(cached), tokens=0)

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
    store.save(concept, modality, difficulty, record)
    return ProviderResponse(output=_public(record), tokens=tokens)
