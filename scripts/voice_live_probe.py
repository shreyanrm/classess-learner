"""Gemini Live streaming-TTS feasibility probe. Answers the make-or-break question BEFORE we build
the streaming voice path: when we send Gemini Live an EXACT text and ask it to read it aloud, does it
(a) read it VERBATIM — streaming is viable — or (b) paraphrase/reply — streaming is NOT safe for
Wobo's scripted lines. Also measures time-to-first-audio-chunk (the whole point of streaming).

Run from the gateway env (has aiohttp), reads the key from .env.local — never prints the key:
    cd services/gateway && uv run python ../../scripts/voice_live_probe.py
"""

from __future__ import annotations

import asyncio
import json
import pathlib
import time

VOICE_MODEL = "gemini-2.5-flash-native-audio-latest"
LIVE_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
# The exact line we want spoken — distinctive so paraphrase is obvious in the transcription.
TEXT = "Nice, you cracked it. A negative slope means the line falls as x grows, so price drops."
READ_VERBATIM = (
    "You are a text-to-speech voice engine. Read the user's message aloud EXACTLY as written — "
    "word for word, verbatim. Do NOT answer it, do NOT add or remove anything, do NOT rephrase. "
    "Just speak the given text."
)


def load_key() -> str | None:
    env = pathlib.Path(__file__).resolve().parents[1] / ".env.local"
    if not env.exists():
        return None
    for line in env.read_text().splitlines():
        line = line.strip()
        if line.startswith(("GOOGLE_AI_API_KEY=", "GEMINI_API_KEY=")):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


async def main() -> None:
    key = load_key()
    if not key:
        print("NO KEY in .env.local (GOOGLE_AI_API_KEY / GEMINI_API_KEY)")
        return
    import aiohttp

    setup = {
        "setup": {
            "model": f"models/{VOICE_MODEL}",
            "generationConfig": {"responseModalities": ["AUDIO"]},
            "systemInstruction": {"parts": [{"text": READ_VERBATIM}]},
            "outputAudioTranscription": {},
        }
    }
    turn = {
        "clientContent": {
            "turns": [{"role": "user", "parts": [{"text": TEXT}]}],
            "turnComplete": True,
        }
    }

    audio_chunks = 0
    audio_bytes = 0
    transcript = ""
    t0 = time.monotonic()
    first_audio_ms: float | None = None

    async with (
        aiohttp.ClientSession() as http,
        http.ws_connect(f"{LIVE_URL}?key={key}", heartbeat=20) as ws,
    ):
        await ws.send_str(json.dumps(setup))
        await ws.send_str(json.dumps(turn))
        async for msg in ws:
            if msg.type not in (aiohttp.WSMsgType.TEXT, aiohttp.WSMsgType.BINARY):
                break
            raw = msg.data if isinstance(msg.data, str) else msg.data.decode()
            try:
                data = json.loads(raw)
            except ValueError:
                continue
            sc = data.get("serverContent") or {}
            for part in ((sc.get("modelTurn") or {}).get("parts") or []):
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    if first_audio_ms is None:
                        first_audio_ms = (time.monotonic() - t0) * 1000
                    audio_chunks += 1
                    audio_bytes += len(inline["data"])
            ot = sc.get("outputTranscription") or sc.get("output_transcription")
            if ot and ot.get("text"):
                transcript += ot["text"]
            if sc.get("turnComplete") or sc.get("turn_complete"):
                break

    print("=== Gemini Live streaming-TTS probe ===")
    print(f"input text  : {TEXT}")
    print(f"she SAID    : {transcript.strip() or '(no transcription returned)'}")
    print(f"time-to-first-audio-chunk: {first_audio_ms:.0f} ms" if first_audio_ms else "NO AUDIO")
    print(f"audio chunks: {audio_chunks}  (~{audio_bytes} b64 chars total)")
    verbatim = transcript.strip().lower().rstrip(".") == TEXT.lower().rstrip(".")
    print(f"VERDICT     : {'VERBATIM ✓ streaming viable' if verbatim else 'PARAPHRASED/DIFFERENT — compare above; streaming NOT safe for scripted lines'}")


if __name__ == "__main__":
    asyncio.run(main())
