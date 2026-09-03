"""The turn protocol — ordering, the ink-before-the-word law, interrupt and resume."""

from __future__ import annotations

import json

import pytest
from classess_gateway.board import stream
from classess_gateway.board.planner import Plan, plan_board


@pytest.fixture(autouse=True)
def _empty_turn_store() -> None:
    stream.reset()


def board(say: str, objects: list[dict] | None = None) -> Plan:
    return Plan(say=say, presentation="plane", objects=objects or [])


def marks(n: int) -> list[dict]:
    return [
        {
            "id": f"v{i}",
            "kind": "circle",
            "anchor": {"board": [100 + i, 100]},
            "t": {"start": i * 300, "dur": 240},
        }
        for i in range(n)
    ]


def test_her_line_is_split_the_way_she_speaks_it() -> None:
    assert stream.sentences("Look at this. The curve turns here.") == [
        "Look at this.",
        "The curve turns here.",
    ]
    assert stream.sentences("   ") == []


def test_the_clock_runs_forward_at_a_speaking_pace() -> None:
    clock = stream.sentence_clock(stream.sentences("Look. Now watch the tangent land on it."))
    assert clock[0][0] == 0
    assert clock[1][0] > clock[0][0] + clock[0][1]
    assert clock[1][1] > clock[0][1]  # the longer sentence takes longer


def test_the_first_stroke_lands_before_the_first_sentence_ends() -> None:
    events = stream.build_events(board("Look at this. The curve turns here.", marks(3)))
    first_say = next(e for e in events if e.type == "say")
    first_ink = next(e for e in events if e.type == "ink")
    assert first_ink.t < first_say.t + first_say.data["dur"]


def test_the_law_holds_even_when_the_plan_starts_late() -> None:
    late = marks(2)
    for obj in late:
        obj["t"]["start"] += 9000
    events = stream.build_events(board("Look.", late))
    first_say = next(e for e in events if e.type == "say")
    first_ink = next(e for e in events if e.type == "ink")
    assert first_ink.t < first_say.t + first_say.data["dur"]


def test_an_object_may_claim_the_beat_it_lands_on() -> None:
    objects = marks(3)
    objects[0]["meta"] = {"beat": {"with": 0}}
    objects[1]["meta"] = {"beat": {"after": 0}}
    objects[2]["meta"] = {"beat": {"with": 1}}
    plan = board("Look at this. Watch the tangent.", objects)
    clock = stream.sentence_clock(stream.sentences(plan.say))
    events = [e for e in stream.build_events(plan) if e.type == "ink"]
    assert [e.t for e in events] == [
        clock[0][0],
        clock[0][0] + clock[0][1],
        clock[1][0],
    ]


def test_only_the_earliest_stroke_is_pulled_forward_to_keep_the_law() -> None:
    """Every beat sits after the first full stop, so exactly one mark moves and the rest keep
    the word they were written for."""
    objects = marks(2)
    objects[0]["meta"] = {"beat": {"with": 1}}
    objects[1]["meta"] = {"beat": {"after": 1}}
    plan = board("Look at this. Watch the tangent.", objects)
    clock = stream.sentence_clock(stream.sentences(plan.say))
    events = [e for e in stream.build_events(plan) if e.type == "ink"]
    assert events[0].t == stream.INK_LEAD_MS
    assert events[1].t == clock[1][0] + clock[1][1]


def test_events_are_ordered_and_done_is_last() -> None:
    plan = board("Look at this. Watch it.", marks(4))
    plan.ask = {"prompt": "What changed?", "targets": ["v1"]}
    events = stream.build_events(plan, actions=[{"type": "setMood", "mood": "thinking"}])
    assert [e.seq for e in events] == list(range(len(events)))
    assert [e.t for e in events] == sorted(e.t for e in events)
    assert events[-1].type == "done"
    kinds = [e.type for e in events]
    assert kinds.count("say") == 2
    assert kinds.count("ink") == 4
    assert "ask" in kinds and "action" in kinds
    assert kinds.index("ask") < kinds.index("done")


def test_done_reports_what_was_verified_and_what_was_refused() -> None:
    plan = plan_board(
        {
            "intents": [{"pipeline": "math", "op": "graph", "expr": "x**2", "tangent_at": 1}],
            "objects": [{"id": "m1", "kind": "circle", "anchor": {"target": "gone"}}],
        },
        context={"targets": []},
    )
    done = stream.build_events(plan)[-1]
    assert done.type == "done"
    assert "board.numbers_agree:tangent slope" in done.data["verified"]
    assert done.data["refused"]
    assert done.data["presentation"] == "plane"


# --- the wire ---------------------------------------------------------------------------------
def test_a_frame_carries_an_id_an_event_and_json() -> None:
    events = stream.build_events(board("Look at this.", marks(1)))
    turn = stream.new_turn("meter-1", events)
    text = stream.frame(turn.id, events[0])
    assert text.startswith(f"id: {turn.id}:0\nevent: say\ndata: ")
    assert text.endswith("\n\n")
    body = json.loads(text.split("data: ", 1)[1].strip())
    assert body["type"] == "say" and body["t"] == 0


def test_the_body_opens_immediately_so_a_proxy_flushes() -> None:
    turn = stream.new_turn("meter-1", stream.build_events(board("Look.", marks(1))))
    assert next(iter(stream.iter_sse(turn))).startswith(":")


def test_a_resume_replays_only_what_was_not_acknowledged() -> None:
    turn = stream.new_turn("meter-1", stream.build_events(board("Look. Watch.", marks(3))))
    total = len(list(stream.iter_sse(turn))) - 1  # minus the open comment
    tail = [f for f in stream.iter_sse(turn, after=1) if not f.startswith(":")]
    assert len(tail) == total - 2
    assert tail[0].startswith(f"id: {turn.id}:2\n")


def test_a_resume_belongs_to_the_learner_who_paid_for_it() -> None:
    turn = stream.new_turn("meter-1", stream.build_events(board("Look.", marks(1))))
    assert stream.recall(turn.id, "meter-1") is turn
    assert stream.recall(turn.id, "someone-else") is None
    assert stream.recall("not-a-turn", "meter-1") is None


def test_the_last_event_id_header_is_parsed_and_never_trusted_blindly() -> None:
    assert stream.parse_last_event_id("abc:7") == ("abc", 7)
    assert stream.parse_last_event_id("abc") is None
    assert stream.parse_last_event_id("abc:x") is None
    assert stream.parse_last_event_id("x" * 200 + ":1") is None
    assert stream.parse_last_event_id(None) is None


def test_an_expired_turn_is_not_replayable(monkeypatch: pytest.MonkeyPatch) -> None:
    turn = stream.new_turn("meter-1", stream.build_events(board("Look.", marks(1))))
    monkeypatch.setattr(stream, "TURN_TTL_S", -1.0)
    assert stream.recall(turn.id, "meter-1") is None
