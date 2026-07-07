"""File cache under ``content/cache/`` — tier 1 of the content economy.

Artifacts are keyed (concept x modality x difficulty), optionally widened by the
board-shared curriculum scope (board+grade+subject+chapter+contentVersion; topic is the
concept) so the first learner on a board+grade+chapter pays for generation and every later
learner on that same coordinate reuses the verified core. Personalization is NEVER in the
key or the record — Vidya personalizes the shared artifact at runtime. Each record carries
provenance ``{engine, model, prompt_version}``.

Server-side only for now. ``learner.content_cache`` (Supabase) is the eventual shared-sync
home; this file cache is the source of truth until that sync lands.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# v3: full type universe — cards may carry any rich activity (perturbation, whatIf, compare,
# conceptMap, mini-workbook, flashcards, derivation, wordProblem, podcast, arcade) alongside the
# guided-discovery spec and imageSpec; a bump regenerates pre-doctrine caches into richer courses.
# v4: CONTENT-VISUALS.md — content-visual law (filled tactile objects + mark 'fill'), bump so
# pre-doctrine hairline caches regenerate into weighted, Brilliant-bar visuals.
PROMPT_VERSION = "plexus-v4"

# Validation lifecycle. A live artifact serves immediately as PROVISIONAL (its first learner never
# waits on the judge); a post-serve validation gate promotes it to CANONICAL (best-of after a
# possible Opus escalation of a GPT-5.5 primary). Cache load prefers canonical, never blocks on
# provisional. SUPERSEDED / REJECTED never sit at the live pointer — they exist only in the
# immutable version ledger (see save_version): a provisional that a better regeneration replaced is
# SUPERSEDED; a regeneration attempt that lost best-of is REJECTED.
PROVISIONAL = "provisional"
CANONICAL = "canonical"
SUPERSEDED = "superseded"
REJECTED = "rejected"


def status(record: dict[str, Any]) -> str:
    """A record with no status is a legacy, pre-validation artifact — treat it as canonical
    (already verified and stable), never provisional (which would re-trigger validation)."""
    return record.get("status") or CANONICAL


def cache_dir() -> Path:
    override = os.getenv("PLEXUS_CACHE_DIR")
    if override:
        return Path(override)
    # ponytail: repo-relative default works for dev/tests; deployments set PLEXUS_CACHE_DIR.
    return Path(__file__).resolve().parents[5] / "content" / "cache"


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "concept"


# The board-shared key dimensions beyond the core (concept x modality x difficulty). Topic is
# the concept; these widen the key so the same topic under a different board/grade/chapter is a
# distinct verified artifact. Ordered — the digest depends on it.
SCOPE_KEYS = ("board", "grade", "subject", "chapter", "contentVersion")


def artifact_path(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> Path:
    body = f"{concept}\x00{modality}\x00{difficulty}"
    # Empty scope reproduces the original digest exactly, so pre-scope caches still hit.
    fields = {k: str((scope or {}).get(k) or "").strip() for k in SCOPE_KEYS}
    if any(fields.values()):
        body += "\x00" + "\x00".join(fields[k] for k in SCOPE_KEYS)
    digest = hashlib.sha256(body.encode()).hexdigest()[:12]
    return cache_dir() / modality / f"{_slug(concept)}--{difficulty}--{digest}.json"


def load(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> dict[str, Any] | None:
    path = artifact_path(concept, modality, difficulty, scope)
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def save(
    concept: str,
    modality: str,
    difficulty: str,
    record: dict[str, Any],
    scope: dict[str, str] | None = None,
) -> None:
    path = artifact_path(concept, modality, difficulty, scope)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, ensure_ascii=False, indent=1))


# --- immutable version ledger (owner law, 2026-07-07) ----------------------------------
# EVERY generated version of a coordinate is kept FOREVER — never deleted, never overwritten.
# The GPT-5.5 attempt, the Opus regeneration, the provisional-then-promoted, the loser of a
# best-of: each lands here as its own write-once file. save() above still writes the single live
# pointer (the cache-hit path reads it); this ledger is the audit trail + the substrate for future
# manual human edits. Cheap on disk, priceless as a record.


def versions_dir(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> Path:
    """The append-only directory of every version ever produced for one coordinate."""
    base = artifact_path(concept, modality, difficulty, scope)
    return base.parent / "versions" / base.stem


def save_version(
    concept: str,
    modality: str,
    difficulty: str,
    record: dict[str, Any],
    scope: dict[str, str] | None = None,
) -> Path:
    """Append one immutable version record. Write-once: a filename that already exists is never
    clobbered (the sub-second stamp is nudged until it is free), so no version is ever lost."""
    vdir = versions_dir(concept, modality, difficulty, scope)
    vdir.mkdir(parents=True, exist_ok=True)
    prov = record.get("provenance") if isinstance(record.get("provenance"), dict) else {}
    model = _slug(str((prov or {}).get("model") or "unknown"))
    status = str(record.get("status") or CANONICAL)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%f")
    path = vdir / f"{stamp}-{status}-{model}.json"
    while path.exists():  # never overwrite a prior version — disambiguate a same-microsecond clash
        stamp += "x"
        path = vdir / f"{stamp}-{status}-{model}.json"
    path.write_text(json.dumps(record, ensure_ascii=False, indent=1))
    return path


def load_versions(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    """Every persisted version for a coordinate, oldest first (the timestamped filename sorts)."""
    vdir = versions_dir(concept, modality, difficulty, scope)
    out: list[dict[str, Any]] = []
    if not vdir.is_dir():
        return out
    for path in sorted(vdir.glob("*.json")):
        try:
            out.append(json.loads(path.read_text()))
        except (OSError, json.JSONDecodeError):
            continue
    return out
