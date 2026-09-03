"""Wobo's voice — Gemini Live through the gateway, the key never reaching the client.

``GET /v1/voice/session`` tells the client which voice mode it may use. With a
``GEMINI_API_KEY`` in the environment the answer is ``relay`` plus a short-lived,
single-use token: the browser connects to ``/v1/voice/relay?token=...`` and the gateway
proxies frames bidirectionally to Gemini Live, sending the setup (model + Wobo's persona
as the system instruction) itself so neither the key nor the persona ever leave the
server. Without a key: ``unavailable``.

The token gate exists so the sockets are never an open proxy to a paid API. HTTP middleware
does not run for a WebSocket, so the socket cannot check a bearer token itself: instead
``/v1/voice/session`` — which IS authenticated, like every other ``/v1`` route — mints a
short-lived, single-use token BOUND TO THE VERIFIED SUBJECT, and both sockets
(``/v1/voice/relay`` and ``/v1/voice/tts/stream``) require and consume one. Each socket has
its own concurrency cap, so a flood of read-aloud sockets can never starve the live mic.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import secrets
import threading
import time
from collections.abc import Iterator
from typing import Any

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from classess_gateway.wobo import WOBO_PERSONA

# The typed-turn streaming voice reads her EXACT line aloud (verified verbatim against Gemini Live),
# so playback starts at the first ~200ms chunk instead of waiting on the whole clip — ~4s faster to
# first sound than the buffered /v1/voice/tts. This instruction keeps it reading, never replying.
_READ_VERBATIM = (
    "You are Wobo's text-to-speech voice. Read the user's message aloud EXACTLY as written — word "
    "for word, verbatim, in a warm, natural voice. Do NOT answer it, add to it, or rephrase it. "
    "Speak only the given text."
)

# ponytail: google-genai is not a gateway dep, so no ephemeral tokens; the relay keeps the
# key server-side instead. Switch session to token mode if the SDK ever lands in deps.
# The -latest alias survives Google's preview retirements — the pinned 2025 preview id died
# and took the mic with it (relay closed instantly on upstream rejection).
VOICE_MODEL = "gemini-2.5-flash-native-audio-latest"
_GEMINI_LIVE_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)

# Generous window: the client mints this only after the mic permission is granted, but a slow
# getUserMedia prompt (user deliberating) must never outlive the token before the relay connects.
_TOKEN_TTL_S = 300.0

# Concurrency is capped twice: once per learner, so one socket-holder cannot deny live voice to
# everybody, and once globally, so worst-case spend on the key stays bounded. The global caps used
# to be 4 apiece — four sockets held open by one person shut the platform's mic.
_MAX_RELAYS_PER_SUBJECT = int(os.getenv("VOICE_MAX_RELAYS_PER_LEARNER", "2"))
_MAX_TTS_PER_SUBJECT = int(os.getenv("VOICE_MAX_TTS_PER_LEARNER", "2"))
_MAX_CONCURRENT_RELAYS = int(os.getenv("VOICE_MAX_RELAYS", "24"))
# The read-aloud socket gets its OWN budget: it is short-lived and far more frequent than the
# live mic, and sharing one counter let typed turns lock a learner out of push-to-talk.
_MAX_CONCURRENT_TTS = int(os.getenv("VOICE_MAX_TTS", "24"))

_MAX_TOKENS = 4096
# Outstanding mints per learner. A mint is cheap for us and cheap for them, but an unbounded pile
# of them was the lever that emptied the whole store (see _mint_token).
_MAX_TOKENS_PER_SUBJECT = 8

_lock = threading.Lock()
# token -> (expiry monotonic, subject); single-use. Insertion-ordered, so "oldest" is free.
_tokens: dict[str, tuple[float, str]] = {}
_active_relays = 0
_active_tts = 0
# subject -> live socket count, so one learner's share is bounded independently of everyone's.
_relays_by_subject: dict[str, int] = {}
_tts_by_subject: dict[str, int] = {}


def _mint_token(subject: str) -> str:
    """One short-lived, single-use token bound to ``subject``.

    Eviction is per learner and then oldest-first. It used to be ``_tokens.clear()`` on a full
    store: minting 4096 tokens threw away every OTHER learner's outstanding token, and their mic
    failed at connect. Nobody's eviction policy may be everybody's.
    """
    now = time.monotonic()
    with _lock:
        for stale in [t for t, (exp, _) in _tokens.items() if exp < now]:
            del _tokens[stale]
        mine = [t for t, (_, sub) in _tokens.items() if sub == subject]
        for stale in mine[: max(0, len(mine) - _MAX_TOKENS_PER_SUBJECT + 1)]:
            del _tokens[stale]  # this learner's own oldest, never anyone else's
        while len(_tokens) >= _MAX_TOKENS:
            # Global ceiling. The biggest holder pays: evict their oldest, so a learner sitting
            # on one token keeps it. Never a wipe — a full store used to cost everybody theirs.
            counts: dict[str, int] = {}
            for _, sub in _tokens.values():
                counts[sub] = counts.get(sub, 0) + 1
            biggest = max(counts, key=lambda sub: counts[sub])
            del _tokens[next(t for t, (_, sub) in _tokens.items() if sub == biggest)]
        token = secrets.token_urlsafe(24)
        _tokens[token] = (now + _TOKEN_TTL_S, subject)
    return token


def _consume_token(token: str | None) -> str | None:
    """Spend a token and return the subject it was minted for, or None if it is no good."""
    if not token:
        return None
    with _lock:
        found = _tokens.pop(token, None)
    if found is None:
        return None
    expiry, subject = found
    return subject if expiry >= time.monotonic() else None


@contextlib.contextmanager
def _socket_slot(subject: str, *, kind: str) -> Iterator[bool]:
    """Claim one live socket for ``subject``, or refuse. Claimed under the lock and released on
    the way out, so two sockets racing the cap cannot both read the old count and both get in."""
    global _active_relays, _active_tts
    per_subject = _relays_by_subject if kind == "relay" else _tts_by_subject
    subject_cap = _MAX_RELAYS_PER_SUBJECT if kind == "relay" else _MAX_TTS_PER_SUBJECT
    global_cap = _MAX_CONCURRENT_RELAYS if kind == "relay" else _MAX_CONCURRENT_TTS
    with _lock:
        active = _active_relays if kind == "relay" else _active_tts
        claimed = active < global_cap and per_subject.get(subject, 0) < subject_cap
        if claimed:
            per_subject[subject] = per_subject.get(subject, 0) + 1
            if kind == "relay":
                _active_relays += 1
            else:
                _active_tts += 1
    if not claimed:
        # Refused OUTSIDE the lock: the caller closes a socket here, and an await must never
        # happen while a threading lock the mint path needs is held.
        yield False
        return
    try:
        yield True
    finally:
        with _lock:
            remaining = per_subject.get(subject, 1) - 1
            if remaining > 0:
                per_subject[subject] = remaining
            else:
                per_subject.pop(subject, None)
            if kind == "relay":
                _active_relays -= 1
            else:
                _active_tts -= 1


def voice_session(subject: str) -> dict[str, str]:
    """The voice handshake: which mode this learner may use right now, and their one token.

    No model id. It named the provider's model to every caller — the white-label rule says model
    ids never leave the brain (WOBO-PLAN 1), and the client has never read the field: the setup
    message holds the model server-side, where it belongs.
    """
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY"):
        return {"mode": "relay", "token": _mint_token(subject)}
    return {"mode": "unavailable"}


def reset_tokens() -> None:
    """Test seam — drop every outstanding token and every socket count."""
    global _active_relays, _active_tts
    with _lock:
        _tokens.clear()
        _relays_by_subject.clear()
        _tts_by_subject.clear()
        _active_relays = 0
        _active_tts = 0


# The only frame kinds a browser may put on the wire to Gemini Live. The gateway sends the
# setup itself — model, persona, transcription config — and a client-sent `setup` would replace
# ours: a different model, a different system instruction, our key. Anything not in this set is
# dropped rather than forwarded.
_RELAY_FRAME_KEYS = frozenset({"realtimeInput", "clientContent", "toolResponse"})

# One upstream frame is a mic chunk, not a file. Past this it is either a mistake or an attempt
# to spend the key by the megabyte.
_MAX_RELAY_FRAME_BYTES = int(os.getenv("VOICE_MAX_FRAME_BYTES", str(256 * 1024)))


def relay_frame_allowed(raw: str) -> bool:
    """May this client frame be forwarded to Gemini Live?

    The relay used to pipe ``client.receive_text()`` straight upstream. That handed the browser
    the whole BidiGenerateContent surface on OUR key: a second ``{"setup": …}`` frame re-opens
    the session with any model and any system instruction the caller likes, which is both a
    persona escape (Wobo's guardrails replaced mid-call, for a child, over audio) and an
    unmetered general-purpose model. Only the three frame kinds a microphone actually needs
    travel, and a frame carrying anything else — ``setup`` above all — is dropped.
    """
    if len(raw.encode("utf-8", "ignore")) > _MAX_RELAY_FRAME_BYTES:
        return False
    try:
        frame = json.loads(raw)
    except (ValueError, TypeError):
        return False
    if not isinstance(frame, dict) or not frame:
        return False
    return frame.keys() <= _RELAY_FRAME_KEYS


def _setup_message() -> dict[str, Any]:
    return {
        "setup": {
            "model": f"models/{VOICE_MODEL}",
            "generationConfig": {"responseModalities": ["AUDIO"]},
            "systemInstruction": {"parts": [{"text": WOBO_PERSONA}]},
            # Transcribe both sides so a spoken turn can land in the one chat archive
            # (same thread law) — the browser reads these off serverContent, never the audio.
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
        }
    }


def _tts_setup_message() -> dict[str, Any]:
    """Setup for the read-aloud streaming voice — verbatim persona, audio out only."""
    return {
        "setup": {
            "model": f"models/{VOICE_MODEL}",
            "generationConfig": {"responseModalities": ["AUDIO"]},
            "systemInstruction": {"parts": [{"text": _READ_VERBATIM}]},
        }
    }


class TtsBody(BaseModel):
    """One spoken line — capped so the TTS bill is bounded per call."""

    text: str = Field(min_length=1, max_length=600)


def _charge_voice(request: Request, capability: str) -> None:
    """Meter one voice call against the learner's day.

    Voice is a PAID API, and until now the meter was charged in exactly one place — the capability
    route — so a learner with a fully spent day still minted relay tokens and still reached the
    TTS API. Both routes go through the same meter as every other turn (``budget.CAPABILITY_CLASS``
    keeps the classification in one dict), keyed on the same meter key the door derived.
    """
    from classess_gateway import budget, consent

    principal = request.state.principal
    profile = consent.get_profile(principal.subject, anonymous=principal.anonymous)
    budget.charge(
        request.state.meter_key, capability, profile.plan, anonymous=principal.anonymous
    )


def register_voice(app: FastAPI) -> None:
    @app.get("/v1/voice/session")
    def session(request: Request) -> dict[str, str]:
        # Authenticated by the gateway middleware; the token it mints carries that identity
        # onto the sockets, which have no middleware of their own. Metered here, because the
        # token IS the spend: whatever it opens, it opens on our key.
        _charge_voice(request, "voice.session")
        return voice_session(request.state.principal.subject)

    @app.post("/v1/voice/tts")
    def tts(body: TtsBody, request: Request) -> dict[str, str]:
        """Her spoken line for a typed turn — same voice as the live relay, key server-side."""
        if not (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")):
            raise HTTPException(status_code=503, detail="voice unavailable")
        _charge_voice(request, "voice.tts")
        from classess_gateway.plexus.media import synthesize_narration

        audio = synthesize_narration(body.text)
        if audio is None:
            raise HTTPException(status_code=502, detail="tts failed")
        return audio

    @app.websocket("/v1/voice/relay")
    async def relay(client: WebSocket) -> None:
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
        # Gate BEFORE accept: a session-minted, unexpired, single-use token bound to a verified
        # subject is required, and the caps bound worst-case spend on the key.
        subject = _consume_token(client.query_params.get("token"))
        if not key or subject is None:
            await client.close(code=1008, reason="voice unavailable")
            return

        import aiohttp  # lazy: already installed via litellm; mock-mode tests never need it

        # The subject the token was minted for is what the slot counts — the socket used to
        # consume it and throw it away, which is why the caps were everybody's and nobody's.
        with _socket_slot(subject, kind="relay") as claimed:
            if not claimed:
                await client.close(code=1008, reason="voice unavailable")
                return
            await client.accept()
            async with (
                aiohttp.ClientSession() as http,
                http.ws_connect(f"{_GEMINI_LIVE_URL}?key={key}") as gemini,
            ):
                await gemini.send_str(json.dumps(_setup_message()))

                async def pump_up() -> None:
                    while True:  # ends via WebSocketDisconnect when the client hangs up
                        raw = await client.receive_text()
                        # Validate before forwarding: the socket is a microphone, not an open
                        # console on our key. A refused frame is dropped silently — a real
                        # client never sends one, and telling a prober which frame we rejected
                        # is free reconnaissance.
                        if relay_frame_allowed(raw):
                            await gemini.send_str(raw)

                async def pump_down() -> None:
                    async for msg in gemini:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            await client.send_text(msg.data)
                        elif msg.type == aiohttp.WSMsgType.BINARY:
                            # Gemini Live frames JSON as binary; the browser wants text.
                            await client.send_text(msg.data.decode())
                        else:
                            break

                up = asyncio.create_task(pump_up())
                down = asyncio.create_task(pump_down())
                try:
                    await asyncio.wait({up, down}, return_when=asyncio.FIRST_COMPLETED)
                finally:
                    up.cancel()
                    down.cancel()
        # suppress RuntimeError: already closed by the disconnect that ended the pumps
        with contextlib.suppress(RuntimeError):
            await client.close()

    @app.websocket("/v1/voice/tts/stream")
    async def tts_stream(client: WebSocket) -> None:
        """Stream a typed line's audio: the client sends one text, the gateway opens Gemini Live
        with the read-verbatim persona and pipes audio chunks straight back, so playback starts at
        the first chunk (~4s sooner than the buffered clip). Key stays server-side; one line per
        socket, token-gated and capped like the relay. Any upstream failure just closes — the
        client falls back to the buffered /v1/voice/tts, so voice can never regress."""
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
        # Same gate as the relay: a session-minted, unexpired, single-use token bound to a
        # verified subject. Without it this socket was an open, unmetered mouth on a paid API.
        subject = _consume_token(client.query_params.get("token"))
        if not key or subject is None:
            await client.close(code=1008, reason="voice unavailable")
            return

        import aiohttp  # lazy: already installed via litellm; mock-mode tests never touch it

        with _socket_slot(subject, kind="tts") as claimed:
            if not claimed:
                await client.close(code=1008, reason="voice unavailable")
                return
            await client.accept()
            try:
                text = (await client.receive_text())[:600]
            except (WebSocketDisconnect, RuntimeError):
                return
            if text.strip():
                await _stream_one_line(client, aiohttp, key, text)
        with contextlib.suppress(RuntimeError):
            await client.close()


async def _stream_one_line(client: WebSocket, aiohttp: Any, key: str, text: str) -> None:
    """Open Gemini Live for one read-aloud turn and pipe its frames to the browser."""
    try:
        async with (
            aiohttp.ClientSession() as http,
            http.ws_connect(f"{_GEMINI_LIVE_URL}?key={key}") as gemini,
        ):
            await gemini.send_str(json.dumps(_tts_setup_message()))
            await gemini.send_str(
                json.dumps(
                    {
                        "clientContent": {
                            "turns": [{"role": "user", "parts": [{"text": text}]}],
                            "turnComplete": True,
                        }
                    }
                )
            )
            async for msg in gemini:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    frame = msg.data
                elif msg.type == aiohttp.WSMsgType.BINARY:
                    # Gemini frames JSON as binary; the browser wants text.
                    frame = msg.data.decode()
                else:
                    break
                await client.send_text(frame)
                if '"turnComplete"' in frame or '"turn_complete"' in frame:
                    break
    except (aiohttp.ClientError, WebSocketDisconnect, RuntimeError, OSError):
        pass  # upstream/socket failure — client falls back to buffered TTS on a chunkless close
