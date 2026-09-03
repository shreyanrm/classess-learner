"""The voice sockets: the token gate, the concurrency caps, and the relay frame filter.

HTTP middleware does not run for a WebSocket, so neither ``/v1/voice/relay`` nor
``/v1/voice/tts/stream`` can read a bearer token. The whole door is therefore the short-lived,
single-use token ``/v1/voice/session`` mints for a verified subject — and the caps that bound
worst-case spend on a paid key. That door was covered only indirectly before this file; here it
is exercised end to end, including the two ways in that must close with a 1008.

Nothing here reaches Gemini: every test either stops at the gate (before ``accept()``) or calls
a pure function, so no key and no network is involved.
"""

from __future__ import annotations

import time
from typing import Any

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from wobo_gateway import voice
from wobo_gateway.app import create_app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """An app whose voice surface is available: a key present means session mints a token."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-a-real-one")
    return TestClient(create_app())


# --- the token itself: mint, consume, expire ---------------------------------------------


def test_a_token_is_single_use_and_carries_its_subject() -> None:
    token = voice._mint_token("learner-a")
    assert voice._consume_token(token) == "learner-a"
    # spent: the second use is worthless, which is what stops a captured URL being replayed
    assert voice._consume_token(token) is None


def test_an_unknown_or_missing_token_is_refused() -> None:
    assert voice._consume_token(None) is None
    assert voice._consume_token("") is None
    assert voice._consume_token("not-a-token-anyone-minted") is None


def test_an_expired_token_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    token = voice._mint_token("learner-b")
    # step the clock past the TTL rather than sleeping through it
    later = time.monotonic() + voice._TOKEN_TTL_S + 1
    monkeypatch.setattr(voice.time, "monotonic", lambda: later)
    assert voice._consume_token(token) is None


def test_one_learners_mints_never_evict_anothers() -> None:
    """Nobody's eviction policy may be everybody's: the per-subject cap trims only the minter."""
    theirs = voice._mint_token("learner-c")
    for _ in range(voice._MAX_TOKENS_PER_SUBJECT + 4):
        voice._mint_token("noisy-learner")
    assert voice._consume_token(theirs) == "learner-c"


# --- the socket gate ----------------------------------------------------------------------


@pytest.mark.parametrize("path", ["/v1/voice/relay", "/v1/voice/tts/stream"])
def test_a_socket_with_no_token_is_closed(client: TestClient, path: str) -> None:
    """Without this the sockets were an open, unmetered mouth on a paid API."""
    with pytest.raises(WebSocketDisconnect) as caught, client.websocket_connect(path) as ws:
        ws.receive_text()
    assert caught.value.code == 1008


@pytest.mark.parametrize("path", ["/v1/voice/relay", "/v1/voice/tts/stream"])
def test_a_socket_with_a_spent_token_is_closed(client: TestClient, path: str) -> None:
    token = voice._mint_token("learner-d")
    assert voice._consume_token(token) == "learner-d"
    with (
        pytest.raises(WebSocketDisconnect) as caught,
        client.websocket_connect(f"{path}?token={token}") as ws,
    ):
        ws.receive_text()
    assert caught.value.code == 1008


@pytest.mark.parametrize(
    ("path", "kind"), [("/v1/voice/relay", "relay"), ("/v1/voice/tts/stream", "tts")]
)
def test_a_socket_is_closed_once_the_cap_is_saturated(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, path: str, kind: str
) -> None:
    """A saturated cap must refuse at the door, not open a socket it cannot pay for."""
    monkeypatch.setattr(
        voice, "_MAX_CONCURRENT_RELAYS" if kind == "relay" else "_MAX_CONCURRENT_TTS", 1
    )

    # hold the only slot, then try to open a second socket with a perfectly valid token
    with voice._socket_slot("holder", kind=kind) as claimed:
        assert claimed
        # the close below must be the CAP refusing, not the token gate: prove the global cap is
        # genuinely saturated for a subject that holds nothing.
        probe = voice._socket_slot("someone-new", kind=kind)
        assert probe.__enter__() is False
        probe.__exit__(None, None, None)

        token = voice._mint_token("learner-e")
        with (
            pytest.raises(WebSocketDisconnect) as caught,
            client.websocket_connect(f"{path}?token={token}") as ws,
        ):
            ws.receive_text()
        assert caught.value.code == 1008


def test_the_slot_is_released_when_the_socket_ends() -> None:
    """A cap that only ever counts up is a cap that closes the product after N calls."""
    with voice._socket_slot("learner-f", kind="relay") as claimed:
        assert claimed
    with voice._socket_slot("learner-f", kind="relay") as again:
        assert again


def test_one_learner_cannot_hold_every_relay_slot() -> None:
    held: list[Any] = []
    try:
        for _ in range(voice._MAX_RELAYS_PER_SUBJECT):
            slot = voice._socket_slot("greedy", kind="relay")
            assert slot.__enter__() is True
            held.append(slot)
        refused = voice._socket_slot("greedy", kind="relay")
        assert refused.__enter__() is False
        refused.__exit__(None, None, None)
        # everybody else still gets in
        with voice._socket_slot("someone-else", kind="relay") as claimed:
            assert claimed
    finally:
        for slot in held:
            slot.__exit__(None, None, None)


# --- the relay frame filter ---------------------------------------------------------------


def test_only_microphone_frames_reach_gemini() -> None:
    assert voice.relay_frame_allowed('{"realtimeInput":{"audio":{"data":"AAAA"}}}')
    assert voice.relay_frame_allowed('{"clientContent":{"turns":[]}}')
    assert voice.relay_frame_allowed('{"toolResponse":{"functionResponses":[]}}')


def test_a_client_setup_frame_is_never_forwarded() -> None:
    """The gateway sends the setup itself — model, Wobo's persona, transcription config. A
    client ``setup`` frame re-opens the session with any model and any system instruction the
    caller likes, on OUR key: a persona escape for a child over audio, and a general-purpose
    model nobody is metering."""
    assert not voice.relay_frame_allowed('{"setup":{"model":"models/anything"}}')
    # smuggled alongside a legitimate frame is still smuggled
    assert not voice.relay_frame_allowed('{"realtimeInput":{},"setup":{"model":"models/x"}}')


def test_junk_and_oversized_frames_are_dropped() -> None:
    assert not voice.relay_frame_allowed("")
    assert not voice.relay_frame_allowed("not json at all")
    assert not voice.relay_frame_allowed("[1,2,3]")  # a list is not a frame
    assert not voice.relay_frame_allowed("{}")  # an empty object says nothing
    assert not voice.relay_frame_allowed('{"unknownKind":{}}')
    huge = '{"realtimeInput":"' + "a" * (voice._MAX_RELAY_FRAME_BYTES + 64) + '"}'
    assert not voice.relay_frame_allowed(huge)
