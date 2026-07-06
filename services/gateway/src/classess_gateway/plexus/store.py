"""File cache under ``content/cache/`` — tier 1 of the content economy.

Artifacts are keyed (concept x modality x difficulty) so the first learner pays for
generation and every later learner (any board, any name) reuses the verified core.
Each record carries provenance ``{engine, model, prompt_version}``.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

PROMPT_VERSION = "plexus-v1"


def cache_dir() -> Path:
    override = os.getenv("PLEXUS_CACHE_DIR")
    if override:
        return Path(override)
    # ponytail: repo-relative default works for dev/tests; deployments set PLEXUS_CACHE_DIR.
    return Path(__file__).resolve().parents[5] / "content" / "cache"


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "concept"


def artifact_path(concept: str, modality: str, difficulty: str) -> Path:
    digest = hashlib.sha256(f"{concept}\x00{modality}\x00{difficulty}".encode()).hexdigest()[:12]
    return cache_dir() / modality / f"{_slug(concept)}--{difficulty}--{digest}.json"


def load(concept: str, modality: str, difficulty: str) -> dict[str, Any] | None:
    path = artifact_path(concept, modality, difficulty)
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def save(concept: str, modality: str, difficulty: str, record: dict[str, Any]) -> None:
    path = artifact_path(concept, modality, difficulty)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, ensure_ascii=False, indent=1))
