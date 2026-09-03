"""engine.image — Nano Banana (Gemini) for complex imagery SVG cannot express.

A Plexus content engine. Most diagrams are SVG (glanceable, annotatable by Wobo); this
engine is reserved for the complex biological / structural imagery SVG cannot express —
a plant cell, the human body. It composes an educational-diagram prompt from a concept,
moderates it, generates a labeled diagram on a white background via ``gemini-2.5-flash-image``
(the "Nano Banana" image model) using ``GEMINI_API_KEY``, and caches the base64 PNG with
provenance under ``content/cache/images/``.

The artifact is verified before serving (a valid non-empty image passed the moderation gate);
a refusal or any error is invisible — the engine returns ``{"status": "unavailable"}`` and the
app falls back to its seed illustration. Keyless behaves identically, so dev and CI never touch
the network.

Cache key = (concept x modality x difficulty); provenance = {engine, model, prompt_version}.
The first learner pays for generation; every learner after reuses the cached artifact — tier 1
of the cost economy (CONTEXT.md 6).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any

ENGINE_NAME = "engine.image"
MODEL = "gemini-2.5-flash-image"
PROMPT_VERSION = "v1"
MODALITY = "image"

# Composed onto the concept — the house style for every generated diagram.
_PROMPT_STYLE = "clean educational diagram, white background, labeled"

_GENERATE_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{MODEL}:generateContent"
)
_HTTP_TIMEOUT_S = 30.0

# Repo-root content cache; override for tests / alternate deployments.
_DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[5] / "content" / "cache" / "images"

_UNAVAILABLE = {"status": "unavailable"}


def _cache_dir() -> Path:
    override = os.getenv("CLASSESS_IMAGE_CACHE_DIR")
    return Path(override) if override else _DEFAULT_CACHE_DIR


def _cache_key(concept: str, difficulty: str) -> str:
    body = json.dumps(
        {"concept": concept, "modality": MODALITY, "difficulty": difficulty},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(body.encode()).hexdigest()


def _compose_prompt(concept: str) -> str:
    return f"{concept}, {_PROMPT_STYLE}"


def _moderation_ok(concept: str, prompt: str) -> bool:
    """Moderation gate, run before generating and before serving.

    An image is the one artifact a learner can ask for in their own words and get back whole,
    so the concept goes through the SAME deterministic child-safety classifier every other
    learner-facing surface uses. A flagged verdict of any category refuses: nothing is
    generated, nothing is cached, and the caller serves ``unavailable``.
    """
    if not concept.strip() or not prompt.strip():
        return False
    from classess_gateway.safety import moderate

    # The composed prompt as well as the raw concept: the style suffix is ours, but screening
    # exactly the string that would be sent is the honest check.
    return bool(moderate(concept)["allow"]) and bool(moderate(prompt)["allow"])


def _gemini_image(prompt: str, key: str) -> tuple[str, str] | None:
    """Call Nano Banana; return (base64_png, mime) or None on refusal / error.

    stdlib urllib only — this path never runs in tests (keyless short-circuits first), so no
    extra dependency is warranted. A refusal returns no inline image part -> None -> unavailable.
    """
    import urllib.error
    import urllib.request

    req = urllib.request.Request(
        f"{_GENERATE_URL}?key={key}",
        data=json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT_S) as resp:
            body = json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None

    for cand in body.get("candidates") or []:
        for part in (cand.get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                data = inline["data"]
                if _valid_b64_png(data):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                    return data, str(mime)
    return None


def _valid_b64_png(data: str) -> bool:
    """Verify the artifact is a real, non-trivial image before we cache and serve it."""
    try:
        raw = base64.b64decode(data, validate=True)
    except (ValueError, TypeError):
        return False
    return len(raw) > 256  # a refusal / error rarely yields a byte payload this size


def _served(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "ready",
        "mime": entry["mime"],
        "b64": entry["b64"],
        "provenance": entry["provenance"],
    }


def _read_cache(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def generate_image(concept: str, *, difficulty: str = "core") -> dict[str, Any]:
    """Serve a cached-or-generated educational image for ``concept``.

    Returns ``{"status": "ready", "mime", "b64", "provenance"}`` on success, else
    ``{"status": "unavailable"}`` — the app renders its seed illustration on unavailable.
    """
    concept = (concept or "").strip()
    if not concept:
        return dict(_UNAVAILABLE)

    difficulty = (difficulty or "core").strip() or "core"
    path = _cache_dir() / f"{_cache_key(concept, difficulty)}.json"

    cached = _read_cache(path)
    if cached is not None:
        return _served(cached)

    prompt = _compose_prompt(concept)
    if not _moderation_ok(concept, prompt):
        return dict(_UNAVAILABLE)

    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
    if not key:
        return dict(_UNAVAILABLE)

    result = _gemini_image(prompt, key)
    if result is None:  # refusal or error — invisible, seed fallback
        return dict(_UNAVAILABLE)

    b64, mime = result
    entry = {
        "b64": b64,
        "mime": mime,
        "provenance": {
            "engine": ENGINE_NAME,
            "model": MODEL,
            "prompt_version": PROMPT_VERSION,
            "concept": concept,
            "difficulty": difficulty,
            "prompt": prompt,
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entry))
    return _served(entry)


# There is no ENGINE descriptor and no register() here. There never was a Plexus engine registry
# for them to land in: the one live caller is engines._raster_diagram, which imports
# generate_image directly, and the two "defensive, whatever shape the registry lands as" hooks
# had no caller in four waves. Wiring that anticipates an integration that never arrived is
# indistinguishable from wiring that broke.
