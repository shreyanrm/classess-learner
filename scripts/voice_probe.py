"""Standalone TTS diagnostic — replicates media.synthesize_narration EXACTLY but surfaces the
real error Google returns (the production code swallows it as None -> 502). Prints the HTTP status
and Google's error body; NEVER prints the key value. Run: python3 scripts/voice_probe.py
Reads the key from the environment, else from .env.local (GOOGLE_AI_API_KEY, then GEMINI_API_KEY).
"""

from __future__ import annotations

import json
import os
import pathlib
import urllib.error
import urllib.request

TTS_MODEL = "gemini-2.5-flash-preview-tts"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{TTS_MODEL}:generateContent"
VOICE = "Kore"


def load_key() -> tuple[str, str] | None:
    for name in ("GOOGLE_AI_API_KEY", "GEMINI_API_KEY"):
        v = os.getenv(name)
        if v:
            return name, v.strip()
    env = pathlib.Path(__file__).resolve().parents[1] / ".env.local"
    if env.exists():
        found = {}
        for line in env.read_text().splitlines():
            line = line.strip()
            if line.startswith(("GOOGLE_AI_API_KEY=", "GEMINI_API_KEY=")):
                k, _, val = line.partition("=")
                found[k] = val.strip().strip('"').strip("'")
        for name in ("GOOGLE_AI_API_KEY", "GEMINI_API_KEY"):
            if found.get(name):
                return name, found[name]
    return None


def main() -> None:
    got = load_key()
    if not got:
        print("NO KEY found in env or .env.local (GOOGLE_AI_API_KEY / GEMINI_API_KEY)")
        return
    name, key = got
    print(f"using key from: {name} (len={len(key)}, prefix={key[:3]}…)  # value NOT printed")
    body = {
        "contents": [{"parts": [{"text": "Hello from Vidya"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode())
        has_audio = any(
            (p.get("inlineData") or p.get("inline_data") or {}).get("data")
            for cand in payload.get("candidates") or []
            for p in (cand.get("content") or {}).get("parts") or []
        )
        print(f"HTTP 200 — audio present: {has_audio}")
        if not has_audio:
            print("RESPONSE (no audio):", json.dumps(payload)[:800])
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        print(f"HTTP {e.code} {e.reason} — GOOGLE SAYS: {detail[:800]}")
    except Exception as e:  # noqa: BLE001 — diagnostic wants the raw failure
        print(f"NON-HTTP FAILURE: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
