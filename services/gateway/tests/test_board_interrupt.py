"""The interrupt frame (BOARD.md §4) — the brain's half of stopping Wobo.

The client half has always worked: a tap, a key or a word lifts the pen where it is, stops the
voice mid-sentence, and leaves the ink that had already landed. The brain heard none of it. The
stream ran to its end and a reconnect happily carried on drawing over a learner who had asked
Wobo to stop, and nothing ever acknowledged the stop.

``POST /v1/board/interrupt`` is that frame. The turn stops at the next event, the last frame is
the acknowledgement — the object Wobo was on — and there is no ``done``, because the turn did not
finish.
"""

from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient
from wobo_gateway.app import Gateway, create_app
from wobo_gateway.board import stream
from wobo_gateway.cache import InMemoryCache
from wobo_gateway.providers import MockProvider
from wobo_gateway.telemetry import MetricsSink

SSE = {"Accept": "text/event-stream"}


@pytest.fixture(autouse=True)
def _clean(tmp_path: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PLEXUS_CACHE_DIR", str(tmp_path))
    stream.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Gateway(MockProvider(), InMemoryCache(), MetricsSink())))


def ask(text: str = "graph y = x^2 with the tangent at x = 1") -> dict[str, Any]:
    return {"payload": {"context": {"turn": {"lastUserInput": text}}}}


def frames(body: str) -> list[tuple[str, str, dict[str, Any]]]:
    out = []
    for block in body.split("\n\n"):
        if not block.strip() or block.startswith(":"):
            continue
        fields = dict(line.split(": ", 1) for line in block.splitlines() if ": " in line)
        out.append((fields["id"], fields["event"], json.loads(fields["data"])))
    return out


def a_turn(client: TestClient, auth) -> tuple[str, list[tuple[str, str, dict[str, Any]]]]:
    res = client.post("/v1/capability/wobo.turn", json=ask(), headers={**auth(), **SSE})
    assert res.status_code == 200
    events = frames(res.text)
    return events[0][0].rsplit(":", 1)[0], events


# --- the generator stops where the learner stopped it ---------------------------------------


def test_the_stream_stops_at_the_next_frame_and_acknowledges(auth) -> None:
    """The interrupt arrives while the turn is on the wire, so it is checked BETWEEN frames.
    Nothing planned after it is ever written, and the last thing the learner is sent is the
    acknowledgement of their own stop."""
    from wobo_gateway.board.planner import Plan

    plan = Plan(say="Look here. Now watch this. And then this.", presentation="plane")
    plan.objects = [
        {"id": f"m{i}", "kind": "circle", "anchor": {"board": [10, 10]}} for i in range(5)
    ]
    turn = stream.new_turn("sub:interrupting-learner", stream.build_events(plan))

    body = stream.iter_sse(turn)
    seen = [next(body), next(body), next(body)]  # ": open", then two real frames
    stream.interrupt(turn.id, "sub:interrupting-learner", at="m2")

    tail = list(body)
    assert len(tail) == 1, "nothing planned may be written after the learner said stop"
    assert "event: interrupted" in tail[0]
    assert json.loads(tail[0].split("data: ", 1)[1].strip())["at"] == "m2"
    assert "event: done" not in "".join(seen + tail)


# --- the route, over the SSE test client -----------------------------------------------------


def test_the_route_acknowledges_the_object_the_pen_was_on(client: TestClient, auth) -> None:
    turn_id, events = a_turn(client, auth)
    ink = next(e[2]["object"]["id"] for e in events if e[1] == "ink")

    res = client.post(
        "/v1/board/interrupt", json={"turn": turn_id, "at": ink}, headers=auth()
    )
    assert res.status_code == 200
    assert res.json() == {"turn": turn_id, "interrupted": True, "at": ink}


def test_an_interrupted_turn_never_draws_again_on_a_reconnect(client: TestClient, auth) -> None:
    """The resume is the failure this closes: a learner stopped Wobo, the connection blipped, and
    the reconnect picked the plan back up as if nothing had been said."""
    turn_id, events = a_turn(client, auth)
    first = events[0][0]
    client.post("/v1/board/interrupt", json={"turn": turn_id, "at": "m1"}, headers=auth())

    again = client.post(
        "/v1/capability/wobo.turn",
        json=ask(),
        headers={**auth(), **SSE, "Last-Event-ID": first},
    )
    assert again.status_code == 200
    replayed = frames(again.text)
    assert [e[1] for e in replayed] == ["interrupted"]
    assert replayed[0][2]["at"] == "m1"
    assert replayed[0][0].startswith(f"{turn_id}:")


def test_stopping_wobo_is_never_charged(client: TestClient, auth) -> None:
    turn_id, _ = a_turn(client, auth)
    before = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]
    client.post("/v1/board/interrupt", json={"turn": turn_id}, headers=auth())
    client.post("/v1/board/interrupt", json={"turn": turn_id}, headers=auth())
    after = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]
    assert after == before


def test_a_second_interrupt_is_the_same_answer(client: TestClient, auth) -> None:
    """A tap and a spoken "stop" that arrive together must not race into two answers."""
    turn_id, _ = a_turn(client, auth)
    first = client.post(
        "/v1/board/interrupt", json={"turn": turn_id, "at": "m1"}, headers=auth()
    ).json()
    second = client.post(
        "/v1/board/interrupt", json={"turn": turn_id, "at": "m9"}, headers=auth()
    ).json()
    assert first == second  # the pen came up once, where it came up


def test_the_interrupt_is_not_a_way_into_another_learners_turn(
    client: TestClient, auth
) -> None:
    turn_id, _ = a_turn(client, auth)
    res = client.post(
        "/v1/board/interrupt", json={"turn": turn_id, "at": "m1"}, headers=auth("someone-else")
    )
    assert res.status_code == 404
    assert stream.recall(turn_id, "sub:learner-under-test").interrupted is False


def test_the_interrupt_needs_a_verified_learner(client: TestClient, auth) -> None:
    turn_id, _ = a_turn(client, auth)
    assert client.post("/v1/board/interrupt", json={"turn": turn_id}).status_code == 401


def test_an_unknown_turn_is_answered_in_wobos_voice(client: TestClient, auth) -> None:
    res = client.post("/v1/board/interrupt", json={"turn": "never-existed"}, headers=auth())
    assert res.status_code == 404
    body = res.json()
    assert body["code"] == "turn_not_found"
    lowered = json.dumps(body).lower()
    for name in ("claude", "gemini", "openai", "wobo_gateway", "traceback"):
        assert name not in lowered
