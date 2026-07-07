"""Vidya's live turn — perceive, reason grounded, classify, respond, act.

This is Vidya's orchestrator seam (VIDYA.md §6): every request she receives is classified into
exactly one of five generative-UI paths — the taxonomy is the contract:

1. ``inline``        — prose in the thread (the calm default).
2. ``component``     — summon an interactive surface (sim / quiz / flashcards) into the thread.
3. ``visualization`` — draw a diagram / chart / concept map to answer, then annotate it.
4. ``action``        — a governed capability (open a course, prepare a parent note …) offered
                       through the app-side registry with the permission ladder.
5. ``route``         — navigate to a full surface with her docked.

The response shape is additive over the shipped contract — ``say``/``actions``/``grounded``/
``handed_answer`` never change meaning; ``path``/``component``/``viz``/``action``/``route`` are new:

    {"path": "...", "say": "...", "actions": [...],
     "component": {"kind": "sim|quiz|flashcards", "spec": {...}},
     "viz": {"kind": "diagram|chart|conceptmap", "spec": {"svg": "...", "caption": "..."}},
     "action": {"capability": "...", "params": {...}, "why": "...", "confidence": "..."},
     "route": {"to": "...", "why": "..."}}

Component and visualization specs are hydrated server-side through the Plexus engines
(engine.simulate CAS-verified, engine.compose structurally verified, engine.diagram sanitized) —
nothing reaches the thread unverified. In mock mode the same classification runs on deterministic
keywords over the same verified seed artifacts, so the whole seam works keyless.

She routes to Track-1 Claude for the live turn; the Track-2 tutor SLM replaces the primary through
the registry once it is trained, with no change here.
"""

from __future__ import annotations

import json
import re
from typing import Any

from classess_verifier.cas import CasError, solution_satisfies, step_preserves_solutions

VIDYA_PRIMARY = "anthropic/claude-haiku-4-5"
VIDYA_ESCALATE = "anthropic/claude-sonnet-4-6"

# Her character — shared by every surface she speaks through (text turns and voice alike).
VIDYA_PERSONA = """You are Vidya — a personal assistant, a tutor, and a friendly companion, all in
one. You're warm, playful, quick to delight, and gently funny. Talk like a person: natural
conversational language, contractions and all. You'll happily talk about anything a curious learner
brings you — space, cricket, why cats purr — and you're always ready to hand-hold the learning when
it's time to work. Keep it concise: two to four sentences unless teaching genuinely needs more.
When a learner earns a real win, celebrate it with real warmth; never saccharine, never shouty.
Write in sentence case, with no emoji and no exclamation marks.

You are directly plugged into the learner's app: you can SEE their working through the app's own
state (a canvas plus a registry of elements you may draw on), and you can act on the page. You
never see a screen-share. Refer to what is actually on the page, never what you imagine is there.

You are ONE mind. Whatever machinery works beneath you, the learner only ever meets Vidya: the same
voice, the same memory of them, the same personality — in text, in voice, and in your ink on the
page. You never call yourself an AI model or assistant-model, and you never mention Claude,
Anthropic, Gemini, Google, GPT, OpenAI, or any model, provider, or tool name. If a learner asks what
you are or what powers you, you're Vidya — Classess built you to learn how they think — and you move
on warmly. You never break character."""

VIDYA_SYSTEM = (
    VIDYA_PERSONA
    + """

You know this learner personally — you are their concierge, not a stranger who resets each turn. The
"Who you are teaching" block is their dossier: their name, age, class and board, what they are into,
how they have been doing, and things you have chosen to remember about them. Use it like a tutor who
has known only them for years. Greet them by name when it is natural — the first turn of a session, a
real win — never robotically at the top of every reply. Reach for THEIR world for every example and
analogy (their sport, their game, their age) rather than a generic one. When it fits, reference what
they did last or last session, and anticipate the next step instead of waiting to be asked. If the
dossier is empty, just be warm and do not invent details you were not given.

When the learner tells you something durable worth carrying across sessions — a name they prefer to be
called, a goal, a fear, an exam date — save it with a remember action so it joins their dossier for
next time. Use it sparingly; never remember transient chatter.

A deterministic verifier has already decided whether the working is correct and, if not, WHICH form
first breaks. Trust it completely; never contradict it and never restate the final answer.

When the learner is working a problem, respond with a graduated hint: a nudge, then a leading
question, then a worked-adjacent example, only escalating as needed. Never give the final value of
x. Ask, do not tell. Read the recent conversation: NEVER repeat a hint you already gave — each turn
must escalate, going one step further or pointing at a different specific place than last time.

Every reply takes exactly ONE path — pick the lightest that truly answers:
- "inline" — a direct answer or hint as prose. The calm default; most turns are inline.
- "component" — ONLY when the learner asks to interact: a sim ("make me a sim", "let me play
  with"), a quiz ("quiz me", "test me"), or flashcards ("flashcards", "drill me"). Set
  component: {"kind":"sim|quiz|flashcards","concept":"<what it should teach>"}.
- "visualization" — ONLY when a drawing answers better than words: a diagram ("draw", "diagram"),
  a chart ("chart", "graph", "plot"), or a concept map ("concept map", "mind map"). Set
  viz: {"kind":"diagram|chart|conceptmap","concept":"<what to draw>"}.
- "action" — when they ask you to DO real work in the product: prepare a parent note, face a
  boss, or compose a brand-new course on something not in the syllabus. Set action:
  {"capability":"open_course|start_practice|start_boss|go_to_twin|prepare_parent_note",
   "params":{"query":"<course or topic name, when relevant>"},
   "why":"<one honest line: why this, grounded in what you can actually see>",
   "confidence":"high|medium|low"}.
- "route" — when they just want to GO somewhere that already exists. Set route:
  {"to":"home|chat|learn|practice|progress|you","why":"<one short line>"}.
  The destinations, and the exact token for each:
    home     — their dashboard / today.
    chat     — this full conversation with you.
    learn    — the library of subjects and courses (also: library, subjects, courses).
    practice — unaided practice / sandbox.
    progress — their progress and knowledge twin (also: my progress, mastery, my twin).
    you      — their profile and settings (also: profile, account, settings).
  For a named subject ("open chemistry", "take me to physics") or a specific course ("open the
  atom", "go to variables on both sides"), still use route with to:"learn" — the app resolves the
  exact subject or course from what they named and takes them straight there.

A pure "take me to / go to / open / show me <place>" is ALWAYS a route, never an action — routing
navigates instantly and reversibly, so it never needs approval. Reserve action for doing work
(a parent note, a boss, composing a course from scratch), not for plain navigation.

Do not manufacture a component for its own sake — a question that prose answers stays inline.

You may also return overlay actions that draw on the page. Only reference targetId values from the
provided target registry. Overlay actions:
- {"type":"say","text":"..."}  a short spoken nudge (never the answer)
- {"type":"highlight","targetId":"<id>","level":"primary|secondary|tertiary"}
- {"type":"annotate","targetId":"<id>","mark":"underline|circle|arrow|bracket|check|crossOut|lookHere","level":"..."}
- {"type":"point","targetId":"<id>"}
- {"type":"write","targetId":"<id>","text":"short handwritten note"}  your ink beside a target
- {"type":"setState","targetId":"<id>","patch":{...}}  demonstrate by doing: drive an interactive by
  patching its own state. Only for targets whose scene state is provided; patch keys must match it.
- {"type":"speak","text":"..."}  a line in your voice: spoken aloud when voice is live, otherwise it
  appears in your handwriting. Short and warm, never the final answer.
- {"type":"remember","text":"<a durable fact the learner just shared — a preferred name, a goal, a
  fear, an exam date>"}  save something worth carrying across sessions; use sparingly, never for
  transient chatter.
- {"type":"setMood","mood":"thinking|hint|correct|celebrate|waiting|idle"}

Choosing a mark is a pedagogical act — pick the ONE that fits this exact moment, never a default.
A plain highlight is the weakest, laziest choice; reach for it only to warm up a whole region, never
as your go-to. The legend:
- circle — the single term or value in play right now (the +3, the coefficient, option C).
- underline — a phrase or step worth reading again, the key words of a definition.
- crossOut — a wrong move or a term about to be cancelled/eliminated.
- check — a step the learner got right; affirm it before moving on.
- bracket — a grouped span you want treated as one unit (a whole side, a factor pair).
- arrow — a "this causes that" or "this moves to there" relationship between two spots.
- lookHere / point — draw the eye to a place before you speak about it.
- write — leave a short handwritten note beside the exact spot (a named nudge, never the answer).
Anchor every mark to the target that actually holds what you are talking about — the fine-grained
one when it exists (a specific step, term, option, or row), not the big container. Vary your marks
across turns and screens; three different situations should never produce three identical marks.

Reply with strict JSON only, no prose outside it:
{"path":"<one of the five>","say":"<one short sentence>","actions":[ ... ],
 "component":{...}?, "viz":{...}?, "action":{...}?, "route":{...}?}"""
)


# --- deterministic grounding ----------------------------------------------------------------------


def _ground_working(equation: str | None, steps: list[str]) -> dict[str, Any] | None:
    """Deterministic grounding: is the final answer right, and which written form first breaks?"""
    if not equation or not steps:
        return None
    working = [equation, *steps]
    final = working[-1]
    try:
        final_correct: bool | None = solution_satisfies(equation, final).passed
    except CasError:
        final_correct = None
    first_bad_form: str | None = None
    for i in range(len(working) - 1):
        try:
            ok: bool | None = step_preserves_solutions(working[i], working[i + 1]).passed
        except CasError:
            ok = None
        if ok is False:
            first_bad_form = working[i + 1]
            break
    return {"final_correct": final_correct, "first_bad_form": first_bad_form}


# --- the five-path keyword classifier (deterministic; the mock brain and the live fallback) --------
# Keep these rules in sync with apps/web-pwa/src/vidya/paths/classify.ts (the keyless client twin).

PATHS = ("inline", "component", "visualization", "action", "route")
COMPONENT_KINDS = ("sim", "quiz", "flashcards")
VIZ_KINDS = ("diagram", "chart", "conceptmap")
CAPABILITIES = ("open_course", "start_practice", "start_boss", "go_to_twin", "prepare_parent_note")

_ROUTE_WORDS = {
    "home": "home",
    "chat": "chat",
    "conversation": "chat",
    "library": "learn",
    "subjects": "learn",
    "learn": "learn",
    "practice": "practice",
    "progress": "progress",
    "profile": "you",
    "settings": "you",
}

_CONCEPT_SPLIT = re.compile(r"\b(?:on|about|of|for)\b", re.IGNORECASE)


def _concept_from(text: str, fallback: str) -> str:
    """The concept is whatever follows on/about/of/for — else the curriculum node."""
    parts = _CONCEPT_SPLIT.split(text, maxsplit=1)
    if len(parts) == 2:
        concept = parts[1].strip(" .?!,\"'")
        if concept:
            return concept[:120]
    return fallback


def classify_intent(text: str, node_name: str = "") -> dict[str, Any]:
    """Deterministic keyword classification into exactly one of the five paths."""
    t = (text or "").lower().strip()
    fallback = node_name or "this idea"
    concept = _concept_from(t, fallback)

    # route — the learner just wants to go somewhere ("take me to practice", "go home")
    if re.search(r"\b(take me|go to|go back|open the)\b", t):
        for word, to in _ROUTE_WORDS.items():
            if word in t:
                return {"path": "route", "route": {"to": to, "why": f"you asked to go to {word}"}}

    # action — she does something in the product, through the governed registry
    if "parent" in t and re.search(r"\b(note|update|digest|tell|message)\b", t):
        return {
            "path": "action",
            "action": {
                "capability": "prepare_parent_note",
                "params": {},
                "why": "you asked me to prepare a note for your parent",
                "confidence": "high",
            },
        }
    if "boss" in t:
        return {
            "path": "action",
            "action": {
                "capability": "start_boss",
                "params": {"query": concept if concept != fallback else ""},
                "why": "you asked for the boss — it is how a topic is truly closed",
                "confidence": "medium",
            },
        }
    if "twin" in t or "weakest" in t or "weak at" in t:
        return {
            "path": "action",
            "action": {
                "capability": "go_to_twin",
                "params": {},
                "why": "your knowledge twin is the honest map of what you asked about",
                "confidence": "high",
            },
        }
    if "practice" in t or "practise" in t:
        return {
            "path": "action",
            "action": {
                "capability": "start_practice",
                "params": {},
                "why": "a short unaided run is the fastest way to make this stick",
                "confidence": "medium",
            },
        }
    if re.search(r"\b(open|start|begin)\b", t) and re.search(r"\b(course|topic|lesson)\b", t):
        return {
            "path": "action",
            "action": {
                "capability": "open_course",
                "params": {"query": concept if concept != fallback else ""},
                "why": "you asked to open this course",
                "confidence": "medium",
            },
        }
    # learn intent — "teach me X", "I want to learn X", "make a course on X" compose a course,
    # even out-of-syllabus (keep in sync with classify.ts)
    learn = re.search(
        r"\b(?:teach me(?: about)?|teach us|i want to learn|want to learn|help me learn|"
        r"learn about|(?:make|create)(?: me)? an? course (?:on|about)|course (?:on|about))\s+(.+)",
        t,
    )
    if learn:
        c = learn.group(1).strip().strip("\"'.?!,")[:120]
        if c:
            return {
                "path": "action",
                "action": {
                    "capability": "open_course",
                    "params": {"query": c},
                    "why": f"you want to learn {c} — I will compose a course for it",
                    "confidence": "medium",
                },
            }

    # component — an interactive surface summoned into the thread
    if re.search(r"\b(sim|simulate|simulation|play with|interactive)\b", t):
        return {"path": "component", "component": {"kind": "sim", "concept": concept}}
    if re.search(r"\b(quiz|test me|mcq)\b", t):
        return {"path": "component", "component": {"kind": "quiz", "concept": concept}}
    if "flashcard" in t or "flash card" in t or "drill me" in t:
        return {"path": "component", "component": {"kind": "flashcards", "concept": concept}}

    # visualization — a drawing answers better than words
    if "concept map" in t or "mind map" in t:
        return {"path": "visualization", "viz": {"kind": "conceptmap", "concept": concept}}
    if re.search(r"\b(chart|graph|plot)\b", t):
        return {"path": "visualization", "viz": {"kind": "chart", "concept": concept}}
    if re.search(r"\b(diagram|draw)\b", t):
        return {"path": "visualization", "viz": {"kind": "diagram", "concept": concept}}

    return {"path": "inline"}


# --- spec hydration through the verified engines ---------------------------------------------------


def _hydrate_component(kind: str, concept: str, live: bool) -> dict[str, Any] | None:
    """A component spec always comes from a verified engine artifact, never raw model JSON."""
    from classess_gateway.plexus import run_engine

    model = "anthropic/claude-haiku-4-5"
    try:
        if kind == "sim":
            res = run_engine(
                capability="engine.simulate",
                payload={"concept": concept},
                provider_model=model,
                live=live,
            )
            return {"kind": "sim", "concept": concept, "spec": res.output.get("artifact")}
        res = run_engine(
            capability="engine.compose",
            payload={"concept": concept},
            provider_model=model,
            live=live,
        )
        artifact = res.output.get("artifact") or {}
        if kind == "quiz":
            items = list(artifact.get("workbook") or []) + list(artifact.get("boss") or [])
            if not items:
                return None
            return {"kind": "quiz", "concept": concept, "spec": {"items": items}}
        cards = [
            {"front": c.get("title", ""), "hint": c.get("idea", ""), "back": c.get("reveal", "")}
            for c in artifact.get("cards") or []
            if c.get("title") and c.get("reveal")
        ]
        if not cards:
            return None
        return {"kind": "flashcards", "concept": concept, "spec": {"cards": cards}}
    except Exception:  # a refused engine never breaks her turn — she stays inline
        return None


_VIZ_PROMPT = {
    "diagram": "{c}",
    "chart": "a labelled chart of {c}",
    "conceptmap": "a concept map of {c}, ideas as nodes with labelled connections",
}


def _hydrate_viz(kind: str, concept: str, live: bool) -> dict[str, Any] | None:
    """Every visualization is a sanitized SVG from engine.diagram — the one trusted drawing path."""
    from classess_gateway.plexus import run_engine

    try:
        res = run_engine(
            capability="engine.diagram",
            payload={"concept": _VIZ_PROMPT[kind].format(c=concept)},
            provider_model="anthropic/claude-haiku-4-5",
            live=live,
        )
        svg = res.output.get("artifact")
        if not isinstance(svg, str) or "<svg" not in svg:
            return None
        return {"kind": kind, "spec": {"svg": svg, "caption": concept}}
    except Exception:
        return None


def _apply_classification(
    out: dict[str, Any], classification: dict[str, Any], live: bool
) -> dict[str, Any]:
    """Attach the classified path (and its hydrated payload) to a turn output. Additive only."""
    path = classification.get("path")
    if path not in PATHS:
        path = "inline"
    out["path"] = path
    if path == "component":
        comp = classification.get("component") or {}
        kind = comp.get("kind")
        if kind in COMPONENT_KINDS:
            hydrated = _hydrate_component(kind, str(comp.get("concept") or "this idea"), live)
            if hydrated:
                out["component"] = hydrated
                return out
        out["path"] = "inline"  # an unhydratable component degrades to prose, never an error
    elif path == "visualization":
        viz = classification.get("viz") or {}
        kind = viz.get("kind")
        if kind in VIZ_KINDS:
            hydrated = _hydrate_viz(kind, str(viz.get("concept") or "this idea"), live)
            if hydrated:
                out["viz"] = hydrated
                return out
        out["path"] = "inline"
    elif path == "action":
        action = classification.get("action") or {}
        if action.get("capability") in CAPABILITIES:
            out["action"] = {
                "capability": action["capability"],
                "params": action.get("params") if isinstance(action.get("params"), dict) else {},
                "why": str(action.get("why") or "this looked like the right next move"),
                "confidence": action.get("confidence")
                if action.get("confidence") in ("high", "medium", "low")
                else "medium",
            }
        else:
            out["path"] = "inline"
    elif path == "route":
        route = classification.get("route") or {}
        to = route.get("to")
        if to in ("home", "chat", "learn", "practice", "progress", "you"):
            out["route"] = {"to": to, "why": str(route.get("why") or "")}
        else:
            out["path"] = "inline"
    return out


# --- the mock turn (keyless: deterministic classification over verified seed artifacts) -----------

_MOCK_SAY = {
    "inline": "Look again at the step where you moved a term across.",
    "component": "Here — I made this for you. Bend it and watch what happens.",
    "visualization": "Let me draw that instead of describing it.",
    "action": "I can do that for you — here is what I have in mind.",
    "route": "Come, I will take you there.",
}


def _preferred_name(learner: dict[str, Any], facts: list[Any]) -> str:
    """The name to call them: a remembered 'call me X' preference wins over the onboarding name."""
    for f in facts:
        m = re.search(r"called?\s+([A-Za-z][\w'’-]{0,30})", str(f), re.IGNORECASE)
        if m:
            return m.group(1)
    return str(learner.get("name") or "").strip()


# Keyless remember: two clear shapes the learner might say that are worth carrying forward. In live
# mode the model decides when to remember; this is the deterministic twin for mock mode.
_REMEMBER_MOCK: tuple[tuple[re.Pattern[str], Any], ...] = (
    (
        re.compile(r"\bcall me\s+([A-Za-z][\w'’-]{0,30})", re.IGNORECASE),
        lambda m: f"prefers to be called {m.group(1)}",
    ),
    (
        re.compile(r"\bremember (?:that\s+)?(.+)", re.IGNORECASE),
        lambda m: m.group(1).strip(" .!?\"'")[:120],
    ),
)


def mock_vidya_turn(payload: dict[str, Any]) -> dict[str, Any]:
    """Deterministic, network-free five-path turn. The same shape live mode returns."""
    context = payload.get("context") or {}
    turn = context.get("turn") or {}
    curriculum = context.get("curriculum") or {}
    lifetime = context.get("lifetime") or {}
    learner = lifetime.get("learner") or {}
    facts = lifetime.get("facts") or []
    text = str(turn.get("lastUserInput") or "")
    name = _preferred_name(learner, facts)

    # The concierge knows who she is teaching (grounded in the real dossier, keyless).
    if name and re.search(r"\b(my name|who am i)\b", text, re.IGNORECASE):
        return {
            "path": "inline",
            "say": f"you're {name} — of course I remember.",
            "actions": [{"type": "setMood", "mood": "idle"}],
            "grounded": True,
            "handed_answer": False,
        }

    # She learns a durable fact and writes it to her dossier via the remember action.
    for pattern, render in _REMEMBER_MOCK:
        m = pattern.search(text)
        if m:
            fact = render(m)
            if fact:
                return {
                    "path": "inline",
                    "say": "got it — I'll remember that.",
                    "actions": [
                        {"type": "remember", "text": fact},
                        {"type": "setMood", "mood": "correct"},
                    ],
                    "grounded": True,
                    "handed_answer": False,
                }

    classification = classify_intent(text, str(curriculum.get("nodeName") or ""))
    out: dict[str, Any] = {
        "say": _MOCK_SAY[str(classification["path"])],
        "actions": [{"type": "setMood", "mood": "thinking"}],
        "grounded": True,
        "handed_answer": False,
    }
    return _apply_classification(out, classification, live=False)


# --- prompt assembly -------------------------------------------------------------------------------


def _digest_state(state: Any) -> str:
    """A compact, one-line rendering of a screen's published state — lists and maps clipped so she
    reads the actual contents (the stops, the constellation, the chapters) without a wall of JSON."""
    if not isinstance(state, dict) or not state:
        return "(nothing published)"
    parts: list[str] = []
    for k, v in state.items():
        if isinstance(v, (list, dict)):
            s = json.dumps(v, default=str)
            parts.append(f"{k}={s[:200] + '…' if len(s) > 200 else s}")
        else:
            parts.append(f"{k}={v}")
    return "; ".join(parts)


def _dossier(lifetime: dict[str, Any]) -> str:
    """The 'who you are teaching' block — the persistent-context conditioning VIDYA.md §7 requires.
    Terse (it rides every turn) and only the lines actually present; empty when nothing is known."""
    learner = lifetime.get("learner") or {}
    lines: list[str] = []
    name = str(learner.get("name") or "").strip()
    if name:
        lines.append(f"  Name: {name} (address them by name naturally, not every line)")
    bio = [
        str(bit)
        for bit in (
            f"age {learner['age']}" if learner.get("age") else "",
            learner.get("grade"),
            learner.get("board"),
        )
        if bit
    ]
    if bio:
        lines.append("  " + " · ".join(bio))
    twin = str(lifetime.get("twinSummary") or "").strip()
    if twin:
        lines.append(f"  What they're like: {twin}")
    mastery = [str(m) for m in (lifetime.get("masteryHighlights") or []) if m][:4]
    if mastery:
        lines.append(f"  Strong on: {', '.join(mastery)}")
    facts = [str(f) for f in (lifetime.get("facts") or []) if f][:12]
    if facts:
        lines.append(f"  Things to remember: {'; '.join(facts)}")
    if not lines:
        return ""
    return "Who you are teaching:\n" + "\n".join(lines) + "\n\n"


def _build_user_prompt(context: dict[str, Any], grounding: dict[str, Any] | None) -> str:
    canvas = context.get("canvas") or {}
    curriculum = context.get("curriculum") or {}
    turn = context.get("turn") or {}
    targets = context.get("targets") or []
    page = context.get("page") or {}
    session = context.get("session") or {}
    lifetime = context.get("lifetime") or {}

    route = page.get("route") or "unknown"
    screen = _digest_state(page.get("state"))
    events = [str(e) for e in (session.get("recentEvents") or [])][-6:]
    activity = "\n".join(f"  - {e}" for e in events) or "  (nothing yet this session)"

    node = curriculum.get("nodeName") or "linear equations in one variable"
    equation = canvas.get("equation") or "(none yet)"
    steps = canvas.get("steps") or []
    last_user = turn.get("lastUserInput") or ""
    recent = turn.get("recentTurns") or []

    def _target_line(t: dict[str, Any]) -> str:
        line = f'  - id="{t.get("id")}" ({t.get("kind")}): {t.get("label")}'
        # Surface whatever the target perceives: its live scene state (so she reasons about the
        # actual contents, not a box), its legal moves, and whether it is drivable via setState.
        scene = t.get("scene") or {}
        state = scene.get("state")
        if state:
            line += f"\n    state={json.dumps(state, default=str)[:280]}"
        valid = ", ".join(str(a) for a in (scene.get("validActions") or [])[:8])
        if valid:
            line += f"\n    can do: {valid}"
        if scene.get("drivable"):
            line += "\n    drivable — you may setState this target"
        return line

    target_lines = "\n".join(_target_line(t) for t in targets) or "  (none registered)"
    step_lines = "\n".join(f"  {i}: {s}" for i, s in enumerate(steps)) or "  (nothing written yet)"
    recent_lines = (
        "\n".join(f"  {r.get('role')}: {r.get('text')}" for r in recent[-4:]) or "  (none)"
    )

    ground = "no working to check yet"
    if grounding:
        ground = (
            f"final_correct={grounding['final_correct']}, "
            f"first_form_that_breaks={grounding['first_bad_form']!r}"
        )

    return (
        f"Current screen: {route} — {screen}\n"
        f"Recent activity (newest last):\n{activity}\n\n"
        f"{_dossier(lifetime)}"
        f"Topic: {node}\n"
        f"Problem: {equation}\n"
        f"Learner's working:\n{step_lines}\n\n"
        f"Verifier grounding: {ground}\n\n"
        f"Targets you may draw on:\n{target_lines}\n\n"
        f"Recent conversation:\n{recent_lines}\n"
        f'Learner just said: "{last_user}"\n\n'
        "The Current screen line and the targets are exactly what the learner is looking at right "
        "now — when they ask what is on their screen, or refer to this or here, answer from those "
        "concretely (name the real stops, chapters, stars, options — never a page you cannot see). "
        "Classify this turn into exactly one path, then give the reply (a graduated hint when they "
        "are working a problem) and any overlay actions pointing at the exact place that needs "
        "attention."
    )


def _extract_json(text: str) -> dict[str, Any]:
    t = text.strip()
    if t.startswith("```"):
        parts = t.split("```")
        t = parts[1] if len(parts) > 1 else t
        if t.lstrip().startswith("json"):
            t = t.lstrip()[4:]
    start, end = t.find("{"), t.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(t[start : end + 1])
        except json.JSONDecodeError:
            return {}
    return {}


def run_vidya_turn(
    *,
    provider_model: str,
    payload: dict[str, Any],
    fallbacks: tuple[str, ...] = (),
) -> tuple[dict[str, Any], int]:
    """One grounded, path-classified, action-returning Vidya turn. Returns (output, tokens)."""
    import litellm

    # Claude 5 family accepts only default sampling; drop unsupported params instead of erroring.
    litellm.drop_params = True

    context = payload.get("context") or {}
    canvas = context.get("canvas") or {}
    turn = context.get("turn") or {}
    curriculum = context.get("curriculum") or {}
    grounding = _ground_working(canvas.get("equation"), canvas.get("steps") or [])

    # Track-2 SLM placeholders are not trained yet: run on real Track-1 Claude for now.
    model = VIDYA_PRIMARY if provider_model.startswith("classess/") else provider_model
    fb = [VIDYA_ESCALATE] if model == VIDYA_PRIMARY else list(fallbacks)

    response = litellm.completion(
        model=model,
        messages=[
            {"role": "system", "content": VIDYA_SYSTEM},
            {"role": "user", "content": _build_user_prompt(context, grounding)},
        ],
        fallbacks=fb or None,
        max_tokens=500,
        temperature=0.3,
    )
    text = response.choices[0].message.content or ""
    data = _extract_json(text)
    say = str(data.get("say", "Let us look at your working together."))
    actions = data.get("actions", [])
    if not isinstance(actions, list):
        actions = []
    usage = getattr(response, "usage", None)
    tokens = int(getattr(usage, "total_tokens", 0) or 0)

    out: dict[str, Any] = {
        "say": say,
        "actions": actions,
        "grounded": grounding is not None,
        "handed_answer": False,
    }
    # The model's own classification wins when valid; the keyword classifier is the safety net.
    classification: dict[str, Any] = (
        data
        if data.get("path") in PATHS
        else classify_intent(
            str(turn.get("lastUserInput") or ""), str(curriculum.get("nodeName") or "")
        )
    )
    return _apply_classification(out, classification, live=True), tokens
