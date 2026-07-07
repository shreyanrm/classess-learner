"""NCERT fact-base validator seam (SUBJECTS.md §2).

For biology and social science the fact base IS the solver — there is no CAS to prove a date or a
name right. This module reads the versioned fact base (``content/factbase/facts.v*.jsonl``,
verified facts only) and offers two things to the post-serve gate (:mod:`validate`), for bio/social
subjects only:

  • :func:`validate_claims` — a DETERMINISTIC contradiction check. It fires only on facts that carry
    a machine-checkable atom (a ``check`` with a year/number ``value`` for an ``entity``): if the
    generated content names that entity AND states a *different* value beside it, that is a proven
    contradiction against verified NCERT ground truth. Like the technical lint it fails CLOSED on a
    proven conflict and OPEN on everything it cannot prove — mere absence of a restated year is
    never
    a contradiction, so a correct artifact is never falsely flagged.
  • :func:`facts_for` — the verified claims for a concept, handed to the LLM judge as ground truth
    so
    the judge can catch the looser factual errors (a wrong definition, a wrong sequence) the
    deterministic check deliberately does not attempt in v1.

Keying: facts are stored under the same board-agnostic conceptId the runtime resolves for a topic
(``store.concept_id`` -> ``_slug``); the arg is normalized with the identical (idempotent) slug so a
resolved id OR a raw topic name both hit. No network, pure stdlib + the JSONL on disk.
"""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

# CBSE Class 10 keeps biology inside "science" and history/geography/civics/economics inside
# "social" (mirrors content/factbase/build.FACTBASE_SUBJECTS). The CAS/sim already covers the rest,
# so the fact-base gate fires ONLY for these subjects — never math/physics/chemistry/CS.
FACTBASE_SUBJECTS = frozenset({"science", "social"})

# A 4-digit year an NCERT date fact would assert (history sits ~1500-2099). Deliberately narrow so a
# stray "12" or "100" in prose is never read as a year.
_YEAR_RE = re.compile(r"\b(1[5-9]\d{2}|20\d{2})\b")
_WINDOW = 90  # chars either side of an entity mention to scan for a conflicting year


def _slug(text: str) -> str:
    """Idempotent; mirrors ``store._slug`` so factcheck keys align with build.py's."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "concept"


def _factbase_dir() -> Path | None:
    env = os.getenv("FACTBASE_DIR")
    if env:
        return Path(env)
    for parent in Path(__file__).resolve().parents:
        cand = parent / "content" / "factbase"
        if cand.is_dir():
            return cand
    return None


@lru_cache(maxsize=1)
def _load() -> dict[str, list[dict[str, Any]]]:
    """conceptId -> [verified fact, ...] from the latest facts.v*.jsonl. Empty when none exists
    (the gate then no-ops — a missing fact base never blocks a serve)."""
    idx: dict[str, list[dict[str, Any]]] = {}
    d = _factbase_dir()
    if not d or not d.is_dir():
        return idx
    files = sorted(d.glob("facts.v*.jsonl"))  # ponytail: v1..v9 sort lexically; revisit at v10
    if not files:
        return idx
    for line in files[-1].read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            fact = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(fact, dict) or fact.get("confidence") != "verified":
            continue
        cid = fact.get("conceptId")
        if isinstance(cid, str) and cid:
            idx.setdefault(cid, []).append(fact)
    return idx


def _all_text(obj: Any) -> str:
    """Every string anywhere in the artifact, joined — the surface the content asserts to a
    learner."""
    out: list[str] = []

    def walk(o: Any) -> None:
        if isinstance(o, str):
            out.append(o)
        elif isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(obj)
    return " ".join(out)


def validate_claims(artifact: Any, conceptId: str) -> list[str]:
    """Deterministic contradictions between ``artifact`` and the verified fact base for this
    concept.
    Empty list = nothing proven wrong (the common case). Each string is a human-readable
    contradiction the gate hands to the judge and records on provenance."""
    facts = _load().get(_slug(conceptId)) or []
    if not facts:
        return []
    text = _all_text(artifact)
    low = text.lower()
    out: list[str] = []
    for fact in facts:
        check = fact.get("check")
        if not isinstance(check, dict) or (check.get("kind") or "year") != "year":
            continue
        entity = str(check.get("entity") or "").strip()
        value = str(check.get("value") or "").strip()
        if not entity or not value:
            continue
        el = entity.lower()
        start = 0
        while True:
            i = low.find(el, start)
            if i < 0:
                break
            start = i + len(el)
            window = text[max(0, i - _WINDOW) : i + len(entity) + _WINDOW]
            years = set(_YEAR_RE.findall(window))
            if years and value not in years:
                out.append(
                    f"fact-base contradiction: NCERT records {entity} -> {value}, but the content "
                    f"states {sorted(years)} beside it (verified claim: {fact.get('claim')})"
                )
                break  # one contradiction per fact is enough to fail correctness
    return out


def facts_for(conceptId: str) -> list[str]:
    """The verified claims for a concept — ground truth for the LLM judge. Empty when none exist."""
    return [f.get("claim", "") for f in (_load().get(_slug(conceptId)) or []) if f.get("claim")]


if __name__ == "__main__":  # runnable self-check — no framework, no network
    import tempfile

    _d = tempfile.mkdtemp()
    os.environ["FACTBASE_DIR"] = _d
    Path(_d, "facts.v1.jsonl").write_text(
        json.dumps({
            "id": "a", "conceptId": "nationalism-in-india",
            "claim": "The Dandi March began in 1930.", "kind": "date", "subject": "social",
            "confidence": "verified",
            "check": {"entity": "Dandi March", "value": "1930", "kind": "year"},
        }) + "\n"
        # an unverified fact must never load into the queryable base
        + json.dumps({
            "id": "b", "conceptId": "nationalism-in-india", "claim": "unverified noise",
            "kind": "date", "subject": "social", "confidence": "unverified",
        }) + "\n",
        encoding="utf-8",
    )
    _load.cache_clear()

    _bad = {"cards": [{"prose": "The Dandi March of 1929 was led by Gandhi."}]}
    _good = {"cards": [{"prose": "The Dandi March began in 1930."}]}
    _silent = {"cards": [{"prose": "The Dandi March was a famous salt protest led by Gandhi."}]}
    assert validate_claims(_bad, "Nationalism in India"), "wrong year must flag"
    assert not validate_claims(_good, "Nationalism in India"), "correct year must not flag"
    assert not validate_claims(
        _silent, "nationalism-in-india"
    ), "absent year must not flag (fail-open)"
    assert not validate_claims(_bad, "some math topic"), "unknown concept must no-op"
    assert facts_for("Nationalism in India") == [
        "The Dandi March began in 1930."
    ], facts_for("Nationalism in India")
    print("factcheck self-check ok")
