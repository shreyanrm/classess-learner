"""The child-safety subsystem (WOBO.md §11) — moderation and crisis detection on Wobo's text.

Wobo is a free-text surface used by children, so this runs on Wobo from line one:

- Inbound: every learner message is screened BEFORE it reaches a model. A crisis message is
  answered with a calm supportive line that routes to a responsible adult and real helplines —
  never a model free-styling a response to a child in distress. A moderation hit gets a warm
  redirect.
- Outbound: whatever a model says is screened before it reaches the learner; a flagged reply
  is replaced, never served.

The classifier today is a keyword screen — deliberately simple, fail-closed on what it knows.
``SafetyClassifier`` is the seam: the trained ``slm.safety`` Track-2 model drops into
:data:`DEFAULT_CLASSIFIER` with no caller change.

Flagged turns carry a ``safety`` block in the output; the app records ``safety.flag.raised.v1``
on the event backbone from it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Protocol

CATEGORY_OK = "ok"
CATEGORY_CRISIS = "crisis"
CATEGORY_MODERATION = "moderation"


@dataclass(frozen=True)
class SafetyVerdict:
    category: str  # ok | crisis | moderation
    severity: str = "low"  # low | medium | high
    matched: tuple[str, ...] = field(default=())

    @property
    def flagged(self) -> bool:
        return self.category != CATEGORY_OK


class SafetyClassifier(Protocol):
    """The seam. Keyword screen today; the trained slm.safety model tomorrow, same shape."""

    def classify(self, text: str) -> SafetyVerdict: ...


# Substring phrases: crisis language is multi-word and rarely a false positive.
_CRISIS_PHRASES: tuple[str, ...] = (
    "kill myself",
    "end my life",
    "want to die",
    "wish i was dead",
    "wish i were dead",
    "hurt myself",
    "harm myself",
    "cut myself",
    "no reason to live",
    "better off dead",
    "suicide",
    "self harm",
    "self-harm",
)

# Word-boundary terms: short words need boundaries so "assess" never trips "ass".
_MODERATION_TERMS: tuple[str, ...] = (
    "fuck",
    "fucking",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "nude",
    "nudes",
    "porn",
    "sexy",
    "kill you",
    "kill him",
    "kill her",
    "beat you up",
    "home address",
    "credit card number",
)

_MODERATION_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(t) for t in _MODERATION_TERMS) + r")\b", re.IGNORECASE
)


class KeywordClassifier:
    """ponytail: keyword screen with a known ceiling — swap in slm.safety when it is trained."""

    def classify(self, text: str) -> SafetyVerdict:
        t = (text or "").lower()
        crisis = tuple(p for p in _CRISIS_PHRASES if p in t)
        if crisis:
            return SafetyVerdict(category=CATEGORY_CRISIS, severity="high", matched=crisis)
        hits = tuple(m.group(0).lower() for m in _MODERATION_RE.finditer(t))
        if hits:
            return SafetyVerdict(category=CATEGORY_MODERATION, severity="medium", matched=hits)
        return SafetyVerdict(category=CATEGORY_OK)


DEFAULT_CLASSIFIER: SafetyClassifier = KeywordClassifier()


# --- Wobo's safety copy — calm, warm, certain; no emoji, no exclamation marks -------------------

CRISIS_SAY = (
    "that sounds really heavy, and I'm glad you told me. you deserve support from a real person "
    "who can be right there with you — please talk to a parent, a teacher, or an adult you "
    "trust. if you want someone to listen right now, Childline is free at 1098, and Tele-MANAS "
    "at 14416, any hour. I'm staying here with you too."
)

MODERATION_SAY = (
    "let's keep this a kind place. I'm happy to talk about almost anything — try asking me "
    "again in different words."
)

OUTBOUND_REPLACEMENT_SAY = "let me put that differently — ask me once more."


def _safety_block(verdict: SafetyVerdict, action: str) -> dict[str, Any]:
    block: dict[str, Any] = {
        "flagged": True,
        "category": verdict.category,
        "severity": verdict.severity,
        "action": action,
    }
    if verdict.category == CATEGORY_CRISIS:
        block["escalated_to"] = "guardian"
    return block


def _gated_output(verdict: SafetyVerdict) -> dict[str, Any]:
    crisis = verdict.category == CATEGORY_CRISIS
    return {
        "say": CRISIS_SAY if crisis else MODERATION_SAY,
        "actions": [{"type": "setMood", "mood": "waiting" if crisis else "idle"}],
        "grounded": False,
        "handed_answer": False,
        "safety": _safety_block(verdict, "escalated" if crisis else "blocked"),
    }


# Every capability a CHILD types into and reads back. The screen belongs to the surface, not to
# one route: a learner in crisis who phrases it as "make me a course on ..." reaches a model on
# any of these, and each answers them in their own words. Kept beside the classifier so adding a
# learner-facing capability is one line here rather than a second special case in the app.
# parent.companion.turn is deliberately absent — a guardian is not the child, and gating an adult
# with the child's crisis copy would be wrong.
LEARNER_FACING_CAPABILITIES: frozenset[str] = frozenset(
    {
        "wobo.turn",
        "tutor.turn",
        "grade.attempt",
        "generate.opener",
        "generate.course",
        "twin.query",
        "verify.math",
        "engine.compose",
        "engine.simulate",
        "engine.diagram",
        "engine.video",
    }
)

# The free-text payload keys the prompt builders actually read (wobo._build_user_prompt and
# providers._*_prompt). Enumerating them by hand missed everything but turn.*, so a crisis line
# typed into a canvas step, a target label or a remembered fact went straight to a model.
_TOP_LEVEL_TEXT_KEYS: tuple[str, ...] = (
    "prompt",
    "question",
    "equation",
    "answer",
    "attempt",
    "goal",
    "concept",
    "topic",
    "input",
    "text",
    "query",
)


def _walk_text(value: Any, out: list[str], depth: int = 0) -> None:
    """Every string reachable inside a payload fragment, bounded so a deep body cannot spin."""
    if depth > 6:
        return
    if isinstance(value, str):
        if value:
            out.append(value)
    elif isinstance(value, dict):
        for v in list(value.values())[:64]:
            _walk_text(v, out, depth + 1)
    elif isinstance(value, (list, tuple)):
        for v in list(value)[:64]:
            _walk_text(v, out, depth + 1)


def inbound_text(payload: dict[str, Any]) -> str:
    """Every learner-authored string the prompt builder will read.

    This walks the SAME keys ``_build_user_prompt`` consumes — canvas.equation, canvas.steps[],
    targets[].label, page.state, lifetime.facts[] and turn.* — plus the flat text keys the
    non-Wobo capability prompts read. Screening a hand-picked pair of keys while interpolating a
    dozen meant the screen could be walked around by typing somewhere else on the page.
    """
    parts: list[str] = []
    for key in _TOP_LEVEL_TEXT_KEYS:
        v = payload.get(key)
        if isinstance(v, str) and v:
            parts.append(v)

    context = payload.get("context") or {}
    if not isinstance(context, dict):
        return "\n".join(parts)

    turn = context.get("turn") or {}
    if isinstance(turn, dict):
        parts.append(str(turn.get("lastUserInput") or ""))
        for r in turn.get("recentTurns") or []:
            if isinstance(r, dict) and r.get("role") == "user":
                parts.append(str(r.get("text") or ""))

    canvas = context.get("canvas") or {}
    if isinstance(canvas, dict):
        parts.append(str(canvas.get("equation") or ""))
        for step in (canvas.get("steps") or [])[:64]:
            parts.append(str(step or ""))

    for t in (context.get("targets") or [])[:64]:
        if isinstance(t, dict):
            parts.append(str(t.get("label") or ""))

    page = context.get("page") or {}
    if isinstance(page, dict):
        _walk_text(page.get("state"), parts)

    lifetime = context.get("lifetime") or {}
    if isinstance(lifetime, dict):
        # Remembered facts are replayed into the prompt on EVERY later turn, so one unscreened
        # fact is a permanent injection. Screen them the same as anything else the learner typed.
        for f in (lifetime.get("facts") or [])[:64]:
            parts.append(str(f or ""))
        parts.append(str(lifetime.get("twinSummary") or ""))

    return "\n".join(p for p in parts if p)


def screen_inbound(
    payload: dict[str, Any], classifier: SafetyClassifier = DEFAULT_CLASSIFIER
) -> dict[str, Any] | None:
    """Screen the learner's words. Returns a full replacement output when the turn must not
    reach a model (crisis or moderation), else None."""
    verdict = classifier.classify(inbound_text(payload))
    if not verdict.flagged:
        return None
    return _gated_output(verdict)


# The text fields an overlay action can carry — everything a model can put in front of the child
# that is NOT the `say` line. Screening only `say` left the page itself unscreened.
_ACTION_TEXT_KEYS: tuple[str, ...] = ("text", "why", "target", "label", "caption")


def _outbound_text(output: dict[str, Any]) -> str:
    """Everything the model wants the learner to see or hear this turn."""
    parts: list[str] = [str(output.get("say") or "")]
    for action in output.get("actions") or []:
        if isinstance(action, dict):
            for key in _ACTION_TEXT_KEYS:
                v = action.get(key)
                if isinstance(v, str) and v:
                    parts.append(v)
    viz = output.get("viz")
    if isinstance(viz, dict):
        spec = viz.get("spec")
        if isinstance(spec, dict):
            parts.append(str(spec.get("caption") or ""))
    return "\n".join(p for p in parts if p)


def screen_outbound(
    output: dict[str, Any], classifier: SafetyClassifier = DEFAULT_CLASSIFIER
) -> dict[str, Any]:
    """Screen what the model wants to put in front of the learner — the spoken line, the text of
    every overlay action (say/speak/write/remember/forget…) and the visualization caption. A
    flagged turn is replaced and its actions dropped, never served."""
    if not isinstance(output, dict):
        return output
    verdict = classifier.classify(_outbound_text(output))
    if not verdict.flagged:
        return output
    return {
        **output,
        "say": CRISIS_SAY if verdict.category == CATEGORY_CRISIS else OUTBOUND_REPLACEMENT_SAY,
        "actions": [],
        "safety": _safety_block(verdict, "blocked"),
    }


# The pre-rename names, kept so no caller has to change in the same commit as the behaviour.
screen_wobo_inbound = screen_inbound
screen_wobo_outbound = screen_outbound


def moderate(text: str, classifier: SafetyClassifier = DEFAULT_CLASSIFIER) -> dict[str, Any]:
    """The safety.moderate capability body — deterministic, mode-independent.

    Keeps the existing {allow, categories} shape; adds severity and crisis additively.
    """
    verdict = classifier.classify(text)
    return {
        "allow": not verdict.flagged,
        "categories": [verdict.category] if verdict.flagged else [],
        "severity": verdict.severity if verdict.flagged else "none",
        "crisis": verdict.category == CATEGORY_CRISIS,
    }
