"""The Python mirror validates the same contract as the TS source of truth."""

from __future__ import annotations

import pytest
from wobo_contracts import (
    EVENT_TYPES,
    ContractViolation,
    is_event_type,
    validate_event,
)

ACTOR = {
    "subject_id": "00000000-0000-7000-8000-000000000001",
    "surface": "pwa",
    "session_id": "00000000-0000-7000-8000-0000000000a1",
}
CONTEXT = {
    "app": "learner",
    "env": "dev",
    "ontology_node_id": "00000000-0000-7000-8000-0000000000b1",
    "consent_tier": "un_elevated",
}


def _event(event_type: str, payload: dict) -> dict:
    return {
        "event_id": "00000000-0000-7000-8000-0000000000c1",
        "event_type": event_type,
        "occurred_at": "2026-06-30T12:00:00.000Z",
        "actor": ACTOR,
        "context": CONTEXT,
        "trace": {"request_id": "00000000-0000-7000-8000-0000000000d1"},
        "payload": payload,
    }


def test_taxonomy_is_mirrored() -> None:
    assert len(EVENT_TYPES) >= 35
    assert "learn.attempt.submitted.v1" in EVENT_TYPES
    assert "wobo.perceived.work.v1" in EVENT_TYPES
    assert is_event_type("mastery.band.changed.v1")
    assert not is_event_type("not.real.v1")


def test_valid_event_passes() -> None:
    evt = _event(
        "learn.attempt.submitted.v1",
        {
            "node_id": CONTEXT["ontology_node_id"],
            "response": {"kind": "expression", "latex": "2x+3=7"},
            "correct": True,
            "aided": False,
            "independence_signal": 1,
            "latency_ms": 4200,
            "attempt_index": 0,
        },
    )
    assert validate_event(evt)["event_type"] == "learn.attempt.submitted.v1"


def test_unknown_event_type_rejected() -> None:
    with pytest.raises(ContractViolation):
        validate_event({"event_type": "nope.v1", "payload": {}})


def test_wobo_never_hands_the_answer() -> None:
    evt = _event(
        "wobo.turn.assistant.v1",
        {
            "turn_id": "00000000-0000-7000-8000-0000000000e1",
            "assistance_level": "hint",
            "hint_level": 2,
            "grounded": True,
            "track": "track_2",
            "handed_answer": True,  # contract violation
        },
    )
    with pytest.raises(ContractViolation):
        validate_event(evt)
