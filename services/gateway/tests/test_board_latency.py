"""The two onsets, measured (BOARD.md §10).

The first stroke was measured end to end in the browser. The first SYLLABLE was measured nowhere
at all — no speech-onset metric existed anywhere in the repo, so half of the law was a hope and
a regression in it would have shipped silently. Every board turn now carries both numbers: the
brain's elapsed time plus the beat each was scheduled on, logged per turn and put in a sink.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import pytest
from fastapi.testclient import TestClient
from wobo_gateway.app import Gateway, create_app
from wobo_gateway.board import stream
from wobo_gateway.board.planner import Plan
from wobo_gateway.cache import InMemoryCache
from wobo_gateway.providers import MockProvider
from wobo_gateway.telemetry import MetricsSink

SSE = {"Accept": "text/event-stream"}


@pytest.fixture(autouse=True)
def _clean(tmp_path: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PLEXUS_CACHE_DIR", str(tmp_path))
    stream.reset()
    stream.LATENCY.events.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Gateway(MockProvider(), InMemoryCache(), MetricsSink())))


def ask(text: str) -> dict[str, Any]:
    return {"payload": {"context": {"turn": {"lastUserInput": text}}}}


# --- the clock ------------------------------------------------------------------------------


def test_the_turns_clock_measures_the_brains_own_wait(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(stream.time, "monotonic", lambda: 100.0)
    stream.mark_turn_start()
    monkeypatch.setattr(stream.time, "monotonic", lambda: 100.42)
    assert stream.brain_ms() == pytest.approx(420.0, abs=0.5)


def test_a_turn_nobody_clocked_measures_nothing_rather_than_nought() -> None:
    """None is "not measured here". Reporting an unmeasured onset as 0 ms would make the budget
    look kept by the turns that never checked it."""
    events = stream.build_events(Plan(say="Here.", presentation="screen"))
    measured = stream.onsets(events, None)
    assert measured.first_syllable_ms is None and measured.first_stroke_ms is None


def test_both_onsets_are_the_wait_plus_the_beat_they_were_put_on() -> None:
    plan = Plan(say="Look here. Now watch.", presentation="plane")
    plan.objects = [{"id": "m1", "kind": "circle", "anchor": {"board": [10, 10]}}]
    events = stream.build_events(plan)
    first_ink = next(e for e in events if e.type == "ink")

    measured = stream.onsets(events, 600.0)
    assert measured.first_syllable_ms == pytest.approx(600.0)
    assert measured.first_stroke_ms == pytest.approx(600.0 + first_ink.t)


def test_a_turn_with_nothing_to_draw_has_no_stroke_to_report() -> None:
    events = stream.build_events(Plan(say="Tell me more.", presentation="screen"))
    measured = stream.onsets(events, 250.0)
    assert measured.first_syllable_ms == pytest.approx(250.0)
    assert measured.first_stroke_ms is None


# --- what the sink sees ----------------------------------------------------------------------


def test_every_board_turn_lands_both_numbers_in_the_sink(client: TestClient, auth) -> None:
    res = client.post(
        "/v1/capability/wobo.turn",
        json=ask("graph y = x^2 with the tangent at x = 1"),
        headers={**auth(), **SSE},
    )
    assert res.status_code == 200
    assert stream.LATENCY.events, "a turn that measures nothing is a budget nobody keeps"
    event = stream.LATENCY.events[-1]
    assert event.capability == "wobo.turn"
    assert event.first_syllable_ms is not None and event.first_syllable_ms >= 0
    assert event.first_stroke_ms is not None
    # the stroke is placed against the speech, so the two numbers share the same wait
    assert event.first_stroke_ms >= event.first_syllable_ms
    # the headline latency is the one the law is about: when Wobo starts speaking
    assert event.latency_ms == event.first_syllable_ms


def test_the_mock_turn_keeps_both_budgets(client: TestClient, auth) -> None:
    """Keyless, on this machine, the brain's half of both budgets is met with room to spare —
    so a regression that spends a second inside the gateway fails here instead of on a phone."""
    client.post(
        "/v1/capability/wobo.turn",
        json=ask("draw benzene"),
        headers={**auth(), **SSE},
    )
    event = stream.LATENCY.events[-1]
    assert event.first_syllable_ms < stream.FIRST_SYLLABLE_BUDGET_MS
    assert event.first_stroke_ms < stream.FIRST_STROKE_BUDGET_MS


def test_a_missed_budget_is_logged_by_name(caplog: pytest.LogCaptureFixture) -> None:
    plan = Plan(say="Late.", presentation="screen")
    turn = stream.new_turn("sub:slow-learner", stream.build_events(plan))
    with caplog.at_level(logging.WARNING, logger="wobo.gateway.board"):
        stream.record_onsets(turn, stream.Onsets(first_syllable_ms=2400.0, first_stroke_ms=None))
    warned = [r for r in caplog.records if "onset budget" in r.message]
    assert warned, "a missed onset budget must be findable in the log, not only in a sink"
    assert warned[0].fields["first_syllable_ms"] == 2400.0
    assert warned[0].fields["first_syllable_budget_ms"] == stream.FIRST_SYLLABLE_BUDGET_MS


def test_the_measurement_never_names_a_provider() -> None:
    plan = Plan(say="Here.", presentation="screen")
    stream.new_turn("sub:learner", stream.build_events(plan))
    from dataclasses import asdict

    line = json.dumps(asdict(stream.LATENCY.events[-1])).lower()
    for name in ("claude", "anthropic", "openai", "gpt", "gemini", "google"):
        assert name not in line


def test_a_clock_left_running_by_an_earlier_turn_is_not_this_turns_wait(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A mark that outlived its turn — a reused worker context, a plan that never reached the
    stream — must read as unmeasured, not as a three-hour first syllable."""
    monkeypatch.setattr(stream.time, "monotonic", lambda: 10.0)
    stream.mark_turn_start()
    monkeypatch.setattr(stream.time, "monotonic", lambda: 10.0 + stream.STALE_CLOCK_MS)
    assert stream.brain_ms() is None


def test_one_mark_is_one_measurement(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(stream.time, "monotonic", lambda: 50.0)
    stream.mark_turn_start()
    monkeypatch.setattr(stream.time, "monotonic", lambda: 50.25)
    assert stream.brain_ms() == pytest.approx(250.0, abs=0.5)
    assert stream.brain_ms() is None  # the clock is spent, so no turn is measured twice
