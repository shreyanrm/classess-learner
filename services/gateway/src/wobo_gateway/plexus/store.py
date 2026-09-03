"""File cache under ``content/cache/`` — tier 1 of the content economy.

Artifacts are keyed (concept x modality x difficulty). The concept is BOARD-AGNOSTIC: the same
topic under a different board / grade / chapter is the SAME concept and reuses ONE verified
artifact — that reuse is the whole cost economy (CONTEXT.md) and keying to board paths instead is
the SUBJECTS.md §9 anti-pattern that kills it. board / grade / subject / chapter are a *mapping
layer* only: they resolve a request to a conceptId at serve time (via ``concept_id``), they never
enter the artifact key. Difficulty DOES stay in the key (a stretch variant is genuinely different
content). Personalization is NEVER in the key or the record — Wobo personalizes the shared
artifact at runtime. Each record carries provenance ``{engine, model, prompt_version}``.

Server-side only for now. ``learner.content_cache`` (Supabase) is the eventual shared-sync
home; this file cache is the source of truth until that sync lands.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import re
import tempfile
from datetime import UTC, datetime
from functools import lru_cache
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


# --- board-agnostic concept keying (SUBJECTS.md §9) ------------------------------------
# The curriculum coordinate that rides in every engine payload. It is NOT part of the artifact
# key — it is only ever the mapping layer that resolves a request to a conceptId (and the audit
# trail for the shared cache). ``contentVersion`` is retained here so payloads still carry it, but
# a content-version bump regenerates via PROMPT_VERSION + the engine's staleness checks, not by
# forking the key. engines._scope reads this tuple, so it stays defined.
SCOPE_KEYS = ("board", "grade", "subject", "chapter", "contentVersion")


def _concepts_file() -> Path:
    override = os.getenv("PLEXUS_CONCEPTS_PATH")
    if override:
        return Path(override)
    return Path(__file__).resolve().parents[5] / "content" / "catalogs" / "concepts.json"


@lru_cache(maxsize=1)
def _overrides() -> dict[str, str]:
    """Explicit ``board|grade|subject|chapter|topic`` -> conceptId remaps from the registry. Empty
    when the registry has none — in which case pure topic-identity derivation is authoritative.
    Overrides exist for the two hard cases: boards that NAME the same concept differently (merge
    them onto one id) and boards that reuse a generic name for DIFFERENT concepts (split them)."""
    try:
        data = json.loads(_concepts_file().read_text())
    except (OSError, json.JSONDecodeError):
        return {}
    raw = data.get("overrides") if isinstance(data, dict) else None
    if not isinstance(raw, dict):
        return {}
    return {str(k).lower().strip(): str(v).strip() for k, v in raw.items() if v}


def _override_key(concept: str, scope: dict[str, str] | None) -> str:
    s = scope or {}
    parts = [str(s.get(k) or "") for k in ("board", "grade", "subject", "chapter")]
    return "|".join([*parts, concept]).lower().strip()


def concept_identity(concept: str, scope: dict[str, str] | None = None) -> str:
    """The FULL normalized identity of a concept — lowercased, whitespace-collapsed, untruncated.

    This, not the slug, is what the cache digest binds to. ``_slug`` cuts at 60 characters, so two
    different long topics that share a prefix produce the same slug; keying on the slug would let
    one topic's artifact be served for another (cache poisoning by collision). The slug stays as
    the human-readable half of the filename; the digest carries the real identity."""
    ov = _overrides()
    if ov:
        hit = ov.get(_override_key(concept, scope))
        if hit:
            concept = hit
    return re.sub(r"\s+", " ", concept).strip().lower()


def concept_id(concept: str, scope: dict[str, str] | None = None) -> str:
    """Resolve a (topic, curriculum scope) request to its board-agnostic concept id. An explicit
    registry override wins; otherwise the id IS the topic's normalized identity, so two boards that
    name a topic identically collapse to one id (and one cache entry)."""
    return _slug(concept_identity(concept, scope))


def _inside_cache(path: Path) -> Path:
    """Assert a computed artifact path really lands inside the cache directory.

    Every path component is slugged before it gets here, so this can only fire on a coding
    mistake — but the assertion is what makes that guarantee checkable rather than assumed
    (a traversal in ``difficulty`` or ``modality`` would otherwise write anywhere on disk)."""
    root = cache_dir().resolve()
    resolved = path.resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"artifact path escapes the cache directory: {path}")
    return resolved


def artifact_path(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> Path:
    # The key is the CONCEPT (board-agnostic), never the curriculum path. ``scope`` is consulted
    # only to resolve the conceptId (registry overrides); board/grade/chapter never touch the key.
    # modality and difficulty are slugged BEFORE they become path components: they arrive from the
    # request body, and "../../etc" is a directory traversal, not a difficulty.
    cid = concept_id(concept, scope)
    modality = _slug(modality)
    difficulty = _slug(difficulty)
    identity = concept_identity(concept, scope)
    digest = hashlib.sha256(f"{identity}\x00{modality}\x00{difficulty}".encode()).hexdigest()[:16]
    return _inside_cache(cache_dir() / modality / f"{cid}--{difficulty}--{digest}.json")


def _legacy_artifact_path(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> Path:
    """Where this artifact lived before the digest bound to the full concept identity.

    Read-only: :func:`load` falls back to it and re-indexes the record onto the current key, so a
    warm cache survives the change without a bulk copy and without ever touching the old file
    (retention law). :func:`migrate` does the same sweep for an operator who wants it done eagerly.
    """
    cid = concept_id(concept, scope)
    digest = hashlib.sha256(f"{cid}\x00{modality}\x00{difficulty}".encode()).hexdigest()[:12]
    name = f"{cid}--{_slug(difficulty)}--{digest}.json"
    return _inside_cache(cache_dir() / _slug(modality) / name)


def _carry_manifests(src: Path, dst: Path) -> None:
    """Re-key a video's render manifests alongside its record.

    A baked MP4 is found through ``{stem}.*.render-manifest.json``, so a record that moves to a
    new key without its manifests silently loses the film it already has. The MP4 itself is
    named independently and lives in the same directory, so only the manifests are re-keyed."""
    for man in src.parent.glob(f"{src.stem}.*.render-manifest.json"):
        target = dst.parent / man.name.replace(src.stem, dst.stem, 1)
        if not target.exists():
            _write_atomic(target, man.read_text(encoding="utf-8"))


def _write_atomic(path: Path, text: str) -> None:
    """Write a cache file so a concurrent reader never sees a half-written record.

    A background thread (post-serve validation / promotion) rewrites the same path a reader may be
    parsing, and ``Path.write_text`` truncates in place — a reader between the truncate and the
    flush gets a torn file and a JSONDecodeError. Writing to a temp file in the SAME directory (so
    the rename cannot cross a filesystem) and ``os.replace``-ing it makes the swap atomic: a reader
    sees either the whole old record or the whole new one. The encoding is pinned to UTF-8 because
    records carry non-ASCII content and the platform default is not guaranteed to be UTF-8."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            os.unlink(tmp)
        raise


def _read(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def load(
    concept: str, modality: str, difficulty: str, scope: dict[str, str] | None = None
) -> dict[str, Any] | None:
    path = artifact_path(concept, modality, difficulty, scope)
    record = _read(path)
    if record is not None:
        return record
    legacy = _legacy_artifact_path(concept, modality, difficulty, scope)
    if legacy == path:
        return None
    record = _read(legacy)
    if record is None:
        return None
    try:  # self-heal: re-index onto the current key. The old file is never touched.
        _write_atomic(path, legacy.read_text(encoding="utf-8"))
        _carry_manifests(legacy, path)
    except OSError:
        pass  # a read-only cache dir still serves the record; it just re-reads the legacy path
    return record


def save(
    concept: str,
    modality: str,
    difficulty: str,
    record: dict[str, Any],
    scope: dict[str, str] | None = None,
) -> None:
    path = artifact_path(concept, modality, difficulty, scope)
    _write_atomic(path, json.dumps(record, ensure_ascii=False, indent=1))


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
    _write_atomic(path, json.dumps(record, ensure_ascii=False, indent=1))
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
            out.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    return out


# --- migration to concept keys (retention law: re-index, never delete) -----------------
# Pre-concept caches were keyed by the curriculum path (raw concept + board+grade+subject+chapter).
# migrate() re-indexes every one onto its board-agnostic conceptId key: it COPIES the record to the
# new key (if absent) and appends an alias record — the old file is never touched, so retention and
# the version ledger survive. Several old scoped variants of one concept collapse onto a single
# conceptId: the first wins the live pointer, the rest are recorded as aliases (the reuse the whole
# re-key exists to produce). Idempotent — a file already at its conceptId key is skipped.


def _alias_log() -> Path:
    return cache_dir() / "_migrations" / "aliases.jsonl"


def _logged_aliases() -> set[tuple[str, str]]:
    """The (from, to) pairs already recorded, so a re-run reports nothing new."""
    log = _alias_log()
    seen: set[tuple[str, str]] = set()
    if not log.is_file():
        return seen
    for line in log.read_text(encoding="utf-8").splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        seen.add((str(rec.get("from")), str(rec.get("to"))))
    return seen


def migrate() -> list[dict[str, Any]]:
    """Re-index the on-disk cache onto concept keys. Returns the alias records written.

    Idempotent: a pair already in the alias log is skipped, so running this twice is a no-op
    (the source file is never touched, so it keeps mapping to the same destination forever)."""
    aliases: list[dict[str, Any]] = []
    root = cache_dir()
    if not root.is_dir():
        return aliases
    already = _logged_aliases()
    for mdir in sorted(p for p in root.iterdir() if p.is_dir() and not p.name.startswith("_")):
        modality = mdir.name
        for path in sorted(mdir.glob("*.json")):
            if path.name.endswith(".render-manifest.json"):
                continue
            try:
                record = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            concept = str(record.get("concept") or "").strip()
            difficulty = str(record.get("difficulty") or "core").strip() or "core"
            if not concept or str(record.get("modality") or "") != modality:
                continue
            new_path = artifact_path(concept, modality, difficulty)  # concept identity — no scope
            if new_path == path:
                continue  # already conceptId-keyed
            if (path.name, new_path.name) in already:
                continue  # re-indexed on an earlier run
            if not new_path.exists():
                # re-index; old file untouched (retention)
                _write_atomic(new_path, path.read_text(encoding="utf-8"))
                _carry_manifests(path, new_path)  # keep a re-keyed video's baked MP4
            alias = {
                "from": path.name,
                "to": new_path.name,
                "concept": concept,
                "conceptId": concept_id(concept),
                "modality": modality,
                "difficulty": difficulty,
                "migratedAt": datetime.now(UTC).isoformat(timespec="seconds"),
            }
            aliases.append(alias)
    if aliases:
        log = _alias_log()
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open("a", encoding="utf-8") as fh:
            for alias in aliases:
                fh.write(json.dumps(alias, ensure_ascii=False) + "\n")
    return aliases


if __name__ == "__main__":  # operator entrypoint: python -m wobo_gateway.plexus.store
    written = migrate()
    print(f"migrated {len(written)} cache artifact(s) onto concept keys")
    for a in written:
        print(f"  {a['modality']}/{a['from']} -> {a['to']}  ({a['conceptId']})")
