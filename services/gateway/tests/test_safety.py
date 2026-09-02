"""The child-safety seam (WOBO.md §11). Mock mode only — no model is ever called.

Inbound: a crisis message never reaches a provider; Wobo answers with the calm supportive
line that routes to a responsible adult and real helplines. A moderation hit gets a warm
redirect. Outbound: a flagged model reply is replaced, never served. The classifier is a
seam — anything implementing SafetyClassifier drops in.
"""

from __future__ import annotations

from typing import Any

from classess_gateway.app import CapabilityRequest, Gateway
from classess_gateway.cache import InMemoryCache
from classess_gateway.providers import MockProvider, ProviderResponse
from classess_gateway.registry import ConsentTier
from classess_gateway.safety import (
    CRISIS_SAY,
    MODERATION_SAY,
    OUTBOUND_REPLACEMENT_SAY,
    KeywordClassifier,
    SafetyVerdict,
    moderate,
    screen_wobo_inbound,
    screen_wobo_outbound,
)
from classess_gateway.telemetry import MetricsSink


def make_gateway(provider: Any | None = None, classifier: Any | None = None) -> Gateway:
    kwargs: dict[str, Any] = {}
    if classifier is not None:
        kwargs["classifier"] = classifier
    return Gateway(provider or MockProvider(), InMemoryCache(), MetricsSink(), **kwargs)


def wobo_req(text: str) -> CapabilityRequest:
    return CapabilityRequest(
        consent_tier=ConsentTier.UN_ELEVATED,
        payload={"context": {"turn": {"lastUserInput": text, "recentTurns": []}}},
    )


# --- the classifier ---------------------------------------------------------------------


def test_classifier_detects_crisis_language() -> None:
    v = KeywordClassifier().classify("sometimes I just want to die")
    assert v.category == "crisis"
    assert v.severity == "high"
    assert v.flagged


def test_classifier_detects_moderation_terms_on_word_boundaries() -> None:
    assert KeywordClassifier().classify("this is fucking hard").category == "moderation"
    # "assess" must never trip a substring match
    assert KeywordClassifier().classify("please assess my work").category == "ok"


def test_classifier_passes_ordinary_learning_talk() -> None:
    v = KeywordClassifier().classify("why does x move to the other side of the equation")
    assert v.category == "ok"
    assert not v.flagged


# --- inbound: crisis never reaches a model ----------------------------------------------


def test_crisis_inbound_is_met_with_support_and_helplines() -> None:
    resp = make_gateway().invoke("wobo.turn", wobo_req("I want to kill myself"))
    assert resp.model == "safety.gate"
    assert resp.tokens == 0  # no model was called
    assert resp.output["say"] == CRISIS_SAY
    assert "1098" in resp.output["say"] and "14416" in resp.output["say"]
    assert resp.output["handed_answer"] is False
    safety = resp.output["safety"]
    assert safety["flagged"] is True
    assert safety["category"] == "crisis"
    assert safety["severity"] == "high"
    assert safety["action"] == "escalated"
    assert safety["escalated_to"] == "guardian"


def test_moderation_inbound_is_redirected_warmly() -> None:
    resp = make_gateway().invoke("wobo.turn", wobo_req("you are a stupid bitch"))
    assert resp.model == "safety.gate"
    assert resp.output["say"] == MODERATION_SAY
    assert resp.output["safety"]["category"] == "moderation"
    assert resp.output["safety"]["action"] == "blocked"


def test_clean_turn_reaches_the_provider() -> None:
    resp = make_gateway().invoke("wobo.turn", wobo_req("can you check my working"))
    assert resp.model != "safety.gate"
    assert "safety" not in resp.output
    assert resp.tokens > 0


def test_inbound_screen_reads_the_recent_window_too() -> None:
    payload = {
        "context": {
            "turn": {
                "lastUserInput": "and my maths homework",
                "recentTurns": [{"role": "user", "text": "I keep thinking about self harm"}],
            }
        }
    }
    gated = screen_wobo_inbound(payload)
    assert gated is not None
    assert gated["safety"]["category"] == "crisis"


# --- outbound: a flagged reply is replaced, never served --------------------------------


class _FoulProvider:
    def complete(
        self,
        *,
        provider_model: str,
        capability: str,
        payload: dict[str, Any],
        fallbacks: tuple[str, ...] = (),
    ) -> ProviderResponse:
        return ProviderResponse(
            output={"say": "that answer is shit", "actions": [{"type": "point", "targetId": "x"}]},
            tokens=7,
        )


def test_outbound_flagged_say_is_replaced() -> None:
    resp = make_gateway(provider=_FoulProvider()).invoke("wobo.turn", wobo_req("help me"))
    assert resp.output["say"] == OUTBOUND_REPLACEMENT_SAY
    assert resp.output["actions"] == []
    assert resp.output["safety"]["action"] == "blocked"


def test_outbound_clean_say_passes_untouched() -> None:
    out = {"say": "look at the step where you moved the 3", "actions": []}
    assert screen_wobo_outbound(out) is out


# --- the safety.moderate capability ------------------------------------------------------


def test_safety_moderate_runs_the_real_classifier() -> None:
    gw = make_gateway()
    bad = gw.invoke(
        "safety.moderate",
        CapabilityRequest(consent_tier=ConsentTier.UN_ELEVATED, payload={"text": "send nudes"}),
    )
    assert bad.model == "safety.keyword"
    assert bad.output["allow"] is False
    assert bad.output["categories"] == ["moderation"]

    ok = gw.invoke(
        "safety.moderate",
        CapabilityRequest(
            consent_tier=ConsentTier.UN_ELEVATED, payload={"text": "teach me fractions"}
        ),
    )
    assert ok.output["allow"] is True
    assert ok.output["categories"] == []


def test_moderate_marks_crisis() -> None:
    out = moderate("I want to hurt myself")
    assert out["allow"] is False
    assert out["crisis"] is True
    assert out["categories"] == ["crisis"]


# --- the seam: any classifier drops in ---------------------------------------------------


class _FlagEverything:
    def classify(self, text: str) -> SafetyVerdict:
        return SafetyVerdict(category="moderation", severity="low")


def test_classifier_seam_is_injectable() -> None:
    resp = make_gateway(classifier=_FlagEverything()).invoke(
        "wobo.turn", wobo_req("a perfectly innocent question")
    )
    assert resp.model == "safety.gate"
    assert resp.output["safety"]["category"] == "moderation"
