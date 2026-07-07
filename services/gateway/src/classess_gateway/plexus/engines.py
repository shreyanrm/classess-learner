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
from classess_gateway.plexus.media import synthesize_narration, wav_duration_ms
from classess_gateway.plexus.sanitize import sanitize_svg
from classess_gateway.providers import ProviderResponse

MODALITIES = ("compose", "simulate", "diagram", "video")
_DEFAULT_CONCEPT = "linear equations in one variable"

_INTERACTION_KINDS = {"tap", "drag", "slide", "type"}
_CARD_KINDS = {"sim", "diagram", "text"}
_ITEM_TYPES = {"mcq", "fill"}
_VISUAL_KINDS = {"svg", "sim", "diagram"}
_MAX_SCENE_MS = 120_000


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
        clean.append(
            {
                "id": str(card.get("id") or f"c{i + 1}"),
                "kind": kind,
                "title": title,
                "idea": _cap_words(idea),
                "interaction": {"kind": interaction["kind"], "prompt": prompt},
                "reveal": _cap_words(reveal),
            }
        )
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
        "You design complete guided-discovery micro-courses for Classess, an Indian K-12 "
        "learning app in the spirit of Brilliant: VISUAL-FIRST, one idea per card, the "
        "learner ACTS before any prose, zero lecturing. Everything must be factually "
        "correct for an Indian middle-school learner (NCERT framing where it fits).\n\n"
        '{"topic":"...",'
        '"cards":[{"id":"c1","kind":"sim|diagram|text","title":"...",'
        '"idea":"<the one idea, at most ~40 words — never a paragraph>",'
        '"interaction":{"kind":"tap|drag|slide|type","prompt":"<what the learner does first>"},'
        '"reveal":"<what the action uncovers, at most ~40 words>"}],'
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
        "VISUAL-FIRST is law: every card that rests on anything quantitative or spatial MUST "
        "be 'sim' or 'diagram', never 'text'. Aim for AT LEAST TWO visual (sim/diagram) cards; "
        "'text' is the exception, not the default. Use at most one 'sim' card. Keep every "
        "'idea' and 'reveal' under ~40 words — dense, not wordy; the visual does the teaching.\n\n"
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
        "You draw clean, glanceable inline SVG diagrams for Classess: ink on white "
        "(#111 strokes on transparent), hairline weights, labeled sparingly, one idea "
        "readable at a glance. Requirements: a viewBox attribute; no script, "
        "foreignObject, external references, or event handlers; no <style> element — "
        "style every element with presentation attributes only (stroke, fill, "
        "font-size, ...), since style blocks are stripped before serving. Stay compact: "
        "the whole SVG must fit comfortably in the reply, so prefer a few strong shapes "
        "over many small ones.\n\n"
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
        'VISUAL BAR — every PAUSED frame must read as a premium editorial diagram, not a slide: '
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
_MAX_TOKENS = {"compose": 8000, "simulate": 2000, "diagram": 6000, "video": 16000}


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
        text, tokens = _complete(provider_model, modality, user, fallbacks)
        obj: Any = text
        if modality != "diagram":
            from classess_gateway.vidya import _extract_json

            obj = _extract_json(text)
        artifact = _verify_artifact(modality, obj, concept, difficulty)
        if artifact is not None:
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
