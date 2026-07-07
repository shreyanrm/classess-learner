"""Vidya's voice — Gemini Live through the gateway, the key never reaching the client.

``GET /v1/voice/session`` tells the client which voice mode it may use. With a
``GEMINI_API_KEY`` in the environment the answer is ``relay`` plus a short-lived,
single-use token: the browser connects to ``/v1/voice/relay?token=...`` and the gateway
proxies frames bidirectionally to Gemini Live, sending the setup (model + Vidya's persona
as the system instruction) itself so neither the key nor the persona ever leave the
server. Without a key: ``unavailable``.

The token gate exists so the relay is never an open proxy to a paid API: only a client
that first obtained a session may connect, tokens expire in seconds, each admits one
connection, and concurrent relays are capped. When real learner auth lands (Phase 4),
``/v1/voice/session`` is the single seam to authenticate — the relay inherits it.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import secrets
import time
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from classess_gateway.vidya import VIDYA_PERSONA

# The typed-turn streaming voice reads her EXACT line aloud (verified verbatim against Gemini Live),
# so playback starts at the first ~200ms chunk instead of waiting on the whole clip — ~4s faster to
# first sound than the buffered /v1/voice/tts. This instruction keeps it reading, never replying.
_READ_VERBATIM = (
    "You are Vidya's text-to-speech voice. Read the user's message aloud EXACTLY as written — word "
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
_MAX_CONCURRENT_RELAYS = 4
_tokens: dict[str, float] = {}  # token -> expiry (monotonic); single-use, pruned on mint
_active_relays = 0


def _mint_token() -> str:
    now = time.monotonic()
    for stale in [t for t, exp in _tokens.items() if exp < now]:
        del _tokens[stale]
    token = secrets.token_urlsafe(24)
    _tokens[token] = now + _TOKEN_TTL_S
    return token


def _consume_token(token: str | None) -> bool:
    if not token:
        return False
    expiry = _tokens.pop(token, None)
    return expiry is not None and expiry >= time.monotonic()


def voice_session() -> dict[str, str]:
    """The voice handshake: which mode the client may use right now."""
    if (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")):
        return {"mode": "relay", "model": VOICE_MODEL, "token": _mint_token()}
    return {"mode": "unavailable"}


def _setup_message() -> dict[str, Any]:
    return {
        "setup": {
            "model": f"models/{VOICE_MODEL}",
            "generationConfig": {"responseModalities": ["AUDIO"]},
            "systemInstruction": {"parts": [{"text": VIDYA_PERSONA}]},
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


def register_voice(app: FastAPI) -> None:
    @app.get("/v1/voice/session")
    def session() -> dict[str, str]:
        return voice_session()

    @app.post("/v1/voice/tts")
    def tts(body: TtsBody) -> dict[str, str]:
        """Her spoken line for a typed turn — same voice as the live relay, key server-side."""
        if not (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")):
            raise HTTPException(status_code=503, detail="voice unavailable")
        from classess_gateway.plexus.media import synthesize_narration

        audio = synthesize_narration(body.text)
        if audio is None:
            raise HTTPException(status_code=502, detail="tts failed")
        return audio

    @app.websocket("/v1/voice/relay")
    async def relay(client: WebSocket) -> None:
        global _active_relays
        key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY"))
        # Gate BEFORE accept: a session-minted, unexpired, single-use token is required,
        # and the concurrent-relay cap bounds worst-case spend on the upstream key.
        if (
            not key
            or not _consume_token(client.query_params.get("token"))
            or _active_relays >= _MAX_CONCURRENT_RELAYS
        ):
            await client.close(code=1008, reason="voice unavailable")
            return
        await client.accept()

        import aiohttp  # lazy: already installed via litellm; mock-mode tests never need it

        _active_relays += 1
        try:
            async with (
                aiohttp.ClientSession() as http,
                http.ws_connect(f"{_GEMINI_LIVE_URL}?key={key}") as gemini,
            ):
                await gemini.send_str(json.dumps(_setup_message()))

                async def pump_up() -> None:
                    while True:  # ends via WebSocketDisconnect when the client hangs up
                        await gemini.send_str(await client.receive_text())

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
        finally:
            _active_relays -= 1
        # suppress RuntimeError: already closed by the disconnect that ended the pumps
        with contextlib.suppress(RuntimeError):
            await client.close()

    @app.websocket("/v1/voice/tts/stream")
    async def tts_stream(client: WebSocket) -> None:
        """Stream a typed line's audio: the client sends one text, the gateway opens Gemini Live
        with the read-verbatim persona and pipes audio chunks straight back, so playback starts at
        the first chunk (~4s sooner than the buffered clip). Key stays server-side; one line per
        socket, capped like the relay. Any upstream failure just closes — the client falls back to
        the buffered /v1/voice/tts, so voice can never regress."""
        global _active_relays
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
        if not key or _active_relays >= _MAX_CONCURRENT_RELAYS:
            await client.close(code=1008, reason="voice unavailable")
            return
        await client.accept()
        try:
            text = (await client.receive_text())[:600]
        except (WebSocketDisconnect, RuntimeError):
            return
        if not text.strip():
            with contextlib.suppress(RuntimeError):
                await client.close()
            return

        import aiohttp  # lazy: already installed via litellm; mock-mode tests never touch it

        _active_relays += 1
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
        finally:
            _active_relays -= 1
        with contextlib.suppress(RuntimeError):
            await client.close()
