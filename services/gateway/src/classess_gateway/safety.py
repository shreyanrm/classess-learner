"""The child-safety subsystem (WOBO.md §11) — moderation and crisis detection on Wobo's text.

Wobo is a free-text surface used by children, so this runs on her from line one:

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


def inbound_text(payload: dict[str, Any]) -> str:
    """The learner's words inside a wobo.turn payload — last input plus the recent window."""
    context = payload.get("context") or {}
    turn = context.get("turn") or {}
    parts = [str(turn.get("lastUserInput") or "")]
    for r in turn.get("recentTurns") or []:
        if isinstance(r, dict) and r.get("role") == "user":
            parts.append(str(r.get("text") or ""))
    return "\n".join(p for p in parts if p)


def screen_wobo_inbound(
    payload: dict[str, Any], classifier: SafetyClassifier = DEFAULT_CLASSIFIER
) -> dict[str, Any] | None:
    """Screen the learner's message. Returns a full replacement output when the turn must not
    reach a model (crisis or moderation), else None."""
    verdict = classifier.classify(inbound_text(payload))
    if not verdict.flagged:
        return None
    return _gated_output(verdict)


def screen_wobo_outbound(
    output: dict[str, Any], classifier: SafetyClassifier = DEFAULT_CLASSIFIER
) -> dict[str, Any]:
    """Screen what the model wants to say. A flagged reply is replaced, never served."""
    verdict = classifier.classify(str(output.get("say") or ""))
    if not verdict.flagged:
        return output
    return {
        **output,
        "say": CRISIS_SAY if verdict.category == CATEGORY_CRISIS else OUTBOUND_REPLACEMENT_SAY,
        "actions": [],
        "safety": _safety_block(verdict, "blocked"),
    }


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
