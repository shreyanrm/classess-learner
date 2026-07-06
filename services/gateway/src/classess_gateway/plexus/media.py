"""Gemini TTS narration — the live sidecar for ``engine.video``.

Returns ``None`` whenever ``GEMINI_API_KEY`` is absent or the call fails: the caller
serves ``narrationAudio: null`` and the learner never sees an error. stdlib urllib
only — this path never runs keyless, so tests and CI never touch the network.
"""

from __future__ import annotations

import json
import os

TTS_MODEL = "gemini-2.5-flash-preview-tts"
_TTS_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{TTS_MODEL}:generateContent"
)
_HTTP_TIMEOUT_S = 60.0
_VOICE = "Kore"


def synthesize_narration(text: str) -> dict[str, str] | None:
    """Narration audio for a motion piece. ``{"mime", "b64"}`` or ``None``."""
    import urllib.error
    import urllib.request

    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
    if not key or not text.strip():
        return None

    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": _VOICE}}
            },
        },
    }
    req = urllib.request.Request(
        _TTS_URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT_S) as resp:
            payload = json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None  # refusal invisible — narrationAudio stays null

    for cand in payload.get("candidates") or []:
        for part in (cand.get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                mime = inline.get("mimeType") or inline.get("mime_type") or "audio/pcm;rate=24000"
                return {"mime": str(mime), "b64": str(inline["data"])}
    return None
