"""The streaming board turn on the wire.

The point of these tests is the sentence in ``stream``'s docstring: the board streams over the
SAME authenticated capability route as a plain turn, so auth, consent, the rate limiter and the
meter are the same code for both shapes. Each test below is one half of that claim.
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


def ask(text: str, **context: Any) -> dict[str, Any]:
    return {"payload": {"context": {"turn": {"lastUserInput": text}, **context}}}


def frames(body: str) -> list[tuple[str, str, dict[str, Any]]]:
    out = []
    for block in body.split("\n\n"):
        if not block.strip() or block.startswith(":"):
            continue
        fields = dict(
            line.split(": ", 1) for line in block.splitlines() if ": " in line
        )
        out.append((fields["id"], fields["event"], json.loads(fields["data"])))
    return out


def test_the_board_streams_say_ink_and_done(client: TestClient, auth) -> None:
    res = client.post(
        "/v1/capability/wobo.turn",
        json=ask("graph y = x^2 with the tangent at x = 1"),
        headers={**auth(), **SSE},
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    assert res.headers["x-accel-buffering"] == "no"
    events = frames(res.text)
    kinds = [e[1] for e in events]
    assert kinds[0] == "say"
    assert "ink" in kinds
    assert kinds[-1] == "done"
    ink = [e[2]["object"] for e in events if e[1] == "ink"]
    assert {o["kind"] for o in ink} >= {"axis", "curve", "line", "number"}
    # The first stroke lands before Wobo's first sentence ends.
    first_say = next(e[2] for e in events if e[1] == "say")
    assert ink[0]["t"]["start"] < first_say["t"] + first_say["dur"]
    done = events[-1][2]
    assert "board.numbers_agree:tangent slope" in done["verified"]


def test_every_number_on_the_wire_names_a_check_that_ran(client: TestClient, auth) -> None:
    res = client.post(
        "/v1/capability/wobo.turn",
        json=ask("balance H2 + O2 -> H2O"),
        headers={**auth(), **SSE},
    )
    events = frames(res.text)
    verified = set(events[-1][2]["verified"])
    numbers = [e[2]["object"] for e in events if e[1] == "ink" and e[2]["object"].get("check")]
    assert numbers
    assert all(o["check"] in verified for o in numbers)


def test_a_turn_with_nothing_to_draw_still_streams_wobos_line(client: TestClient, auth) -> None:
    res = client.post(
        "/v1/capability/wobo.turn",
        json=ask("what did I get wrong here"),
        headers={**auth(), **SSE},
    )
    assert res.status_code == 200
    kinds = [e[1] for e in frames(res.text)]
    assert kinds[0] == "say" and kinds[-1] == "done" and "ink" not in kinds


def test_the_door_is_the_same_door(client: TestClient) -> None:
    res = client.post("/v1/capability/wobo.turn", json=ask("draw benzene"), headers=SSE)
    assert res.status_code == 401


def test_the_meter_is_the_same_meter(client: TestClient, auth) -> None:
    before = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]
    res = client.post(
        "/v1/capability/wobo.turn", json=ask("draw benzene"), headers={**auth(), **SSE}
    )
    assert res.headers["X-Wobo-Budget-Remaining"] == str(before - 1)
    after = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]
    assert after == before - 1


def test_a_spent_day_refuses_the_board_too(
    client: TestClient, auth, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FREE_DAILY_TURNS", "0")
    res = client.post(
        "/v1/capability/wobo.turn", json=ask("draw benzene"), headers={**auth(), **SSE}
    )
    assert res.status_code == 429
    assert res.json()["code"] == "budget_exhausted"


def test_a_resume_costs_nothing_and_replays_the_tail(client: TestClient, auth) -> None:
    first = client.post(
        "/v1/capability/wobo.turn", json=ask("draw benzene"), headers={**auth(), **SSE}
    )
    events = frames(first.text)
    turn_id, seq = events[2][0].rsplit(":", 1)
    spent = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]

    again = client.post(
        "/v1/capability/wobo.turn",
        json=ask("draw benzene"),
        headers={**auth(), **SSE, "Last-Event-ID": f"{turn_id}:{seq}"},
    )
    assert again.status_code == 200
    tail = frames(again.text)
    assert [e[0] for e in tail] == [e[0] for e in events[3:]]
    assert client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"] == spent


def test_a_resume_is_not_a_way_into_another_learners_board(client: TestClient, auth) -> None:
    first = client.post(
        "/v1/capability/wobo.turn", json=ask("draw benzene"), headers={**auth(), **SSE}
    )
    turn_id = frames(first.text)[0][0].rsplit(":", 1)[0]
    other = client.post(
        "/v1/capability/wobo.turn",
        json=ask("draw benzene"),
        headers={**auth("someone-else"), **SSE, "Last-Event-ID": f"{turn_id}:0"},
    )
    # A stranger's turn id is simply not found, so this is a fresh (charged) turn of their own.
    assert other.status_code == 200
    assert frames(other.text)[0][0].rsplit(":", 1)[0] != turn_id


def test_more_than_one_board_is_refused_and_refunded(client: TestClient, auth) -> None:
    from wobo_gateway.board.planner import MAX_OBJECTS

    payload = ask("draw benzene")
    payload["payload"]["board"] = {}
    payload["payload"]["context"]["targets"] = [{"id": "t1", "kind": "text", "label": "x"}]

    def huge(_payload: dict, *, live: bool) -> dict:
        return {
            "say": "Here.",
            "objects": [
                {"id": f"m{i}", "kind": "circle", "anchor": {"target": "t1"}}
                for i in range(MAX_OBJECTS + 1)
            ],
        }

    import wobo_gateway.wobo as wobo_module

    original = wobo_module.board_plan_for
    wobo_module.board_plan_for = huge  # type: ignore[assignment]
    try:
        before = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]
        res = client.post(
            "/v1/capability/wobo.turn", json=payload, headers={**auth(), **SSE}
        )
        assert res.status_code == 413
        assert res.json()["code"] == "too_much_at_once"
        after = client.get("/v1/me", headers=auth()).json()["budget"]["turns_remaining"]
        assert after == before  # refunded: a refused board never costs the learner a turn
    finally:
        wobo_module.board_plan_for = original  # type: ignore[assignment]


def test_a_plain_turn_is_unchanged_without_the_stream_header(client: TestClient, auth) -> None:
    res = client.post(
        "/v1/capability/wobo.turn", json=ask("draw benzene"), headers=auth()
    )
    assert res.status_code == 200
    body = res.json()
    assert body["capability"] == "wobo.turn"
    assert "model" not in body  # the white-label rule still holds
    assert isinstance(body["output"]["say"], str)


def test_the_board_never_names_a_provider(client: TestClient, auth) -> None:
    res = client.post(
        "/v1/capability/wobo.turn",
        json=ask("graph y = x^2"),
        headers={**auth(), **SSE},
    )
    lowered = res.text.lower()
    for name in ("claude", "anthropic", "openai", "gpt", "gemini", "google", "wobo_gateway"):
        assert name not in lowered
