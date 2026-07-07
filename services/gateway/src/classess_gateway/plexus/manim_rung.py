"""Manim escalation rung — the seam for math too intricate for self-animating SVG (owner law).

Fable's art-direction criteria: some ideas need a real animation engine (Manim) — an equation that
MORPHS term by term, a 3D scene that rotates in space, a geometric PROOF that choreographs itself.
SMIL-on-SVG cannot carry those. This module is the ESCALATION SEAM:

  • :func:`needs_manim` — a deterministic complexity FLAG over a scene plan. REAL and tested.
  • :func:`enqueue_manim` — appends a job to ``content/cache/_manim-queue.jsonl``. REAL: the queue
    and its contract exist today.

The RENDERER itself is a documented STUB: the Manim render container (a Python env with a manim
install, headless Cairo/LaTeX) is FUTURE infra. Nothing here imports or runs manim — the gateway
stays dependency-light. When the container lands it will drain this queue exactly as the Remotion
worker drains the MP4 queue. See services/render-worker/README.md ("Manim rung").
"""

from __future__ import annotations

import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from classess_gateway.plexus import store

# Fable's art-direction complexity keywords — equation morphs, 3D, proof choreography. Word-bounded
# so short tokens (3d, proof) do not fire on substrings. A heuristic, not a proof — a scene plan may
# also self-declare via a flag (below), which always wins.
# ponytail: keyword heuristic + explicit flag. Good enough for the escalation FLAG; the real art
# direction is Fable's call at orchestration time and can set the flag directly.
_MANIM_RE = re.compile(
    r"\b(3d|three[-\s]dimensional|rotat\w+ in (?:3d|space)|"
    r"proof|q\.?e\.?d|prove that|geometric proof|proof choreograph\w*|"
    r"equation morph\w*|morph(?:s|es|ing)?[-\s]?(?:into|the equation)|term[-\s]by[-\s]term|"
    r"matrix transform\w*|transform the matrix|vector field|parametric surface|"
    r"derivation choreograph\w*)\b",
    re.IGNORECASE,
)


def _harvest_text(scene_plan: dict[str, Any]) -> str:
    """Everything a human wrote in the plan: per-scene narration + titles, plus the plan title."""
    parts: list[str] = [str(scene_plan.get("title") or "")]
    scenes = scene_plan.get("scenes")
    if isinstance(scenes, list):
        for s in scenes:
            if isinstance(s, dict):
                parts.append(str(s.get("narration") or ""))
                parts.append(str(s.get("title") or ""))
    return " ".join(parts)


def needs_manim(scene_plan: Any) -> bool:
    """True when animating this scene plan warrants Manim rather than self-animating SVG. An
    explicit self-declaration (``manim``/``needsManim`` true, or ``complexity == "manim"``) always
    wins; otherwise the art-direction keyword heuristic decides."""
    if not isinstance(scene_plan, dict):
        return False
    if scene_plan.get("manim") is True or scene_plan.get("needsManim") is True:
        return True
    if str(scene_plan.get("complexity") or "").strip().lower() == "manim":
        return True
    return bool(_MANIM_RE.search(_harvest_text(scene_plan)))


def _manim_queue_path() -> Path:
    """MANIM_QUEUE_PATH wins; else beside the cache (honours PLEXUS_CACHE_DIR, isolating tests)."""
    override = os.getenv("MANIM_QUEUE_PATH")
    return Path(override) if override else store.cache_dir() / "_manim-queue.jsonl"


def enqueue_manim(job: dict[str, Any]) -> Path:
    """Append one Manim render request to the manim queue (STUB renderer — the container is future
    infra). Returns the queue path. Best-effort append; the caller decides whether to guard it."""
    queue = _manim_queue_path()
    rec = {**job, "enqueuedAt": datetime.now(UTC).isoformat()}
    queue.parent.mkdir(parents=True, exist_ok=True)
    with queue.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, separators=(",", ":")) + "\n")
    return queue


if __name__ == "__main__":  # runnable self-check — no framework, no network
    assert needs_manim({"scenes": [{"narration": "we morph the equation term by term"}]})
    assert needs_manim({"scenes": [{"narration": "rotate the solid in 3D to see every face"}]})
    assert needs_manim({"title": "a geometric proof of Pythagoras", "scenes": []})
    assert needs_manim({"complexity": "manim", "scenes": []})
    assert needs_manim({"needsManim": True, "scenes": []})
    assert not needs_manim({"scenes": [{"narration": "a bar grows to show the value"}]})
    assert not needs_manim({"scenes": [{"narration": "tap the triangle to reveal its area"}]})
    assert not needs_manim("not a plan")
    print("manim_rung self-check ok")
