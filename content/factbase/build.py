"""Fact base builder — content/factbase (SUBJECTS.md §2, the owned build item).

Seeds the NCERT-aligned fact base from what we OWN — the verified board catalogs
(chapter/topic names, orderings, board mappings) — and runs the candidate pipeline:
Opus generates atomic candidate facts per CBSE-10 bio/social topic, then GPT-5.5 verifies
each one. Only cross-model AGREEMENTS promote to ``confidence:"verified"``; disagreements are
written to the review queue for a human (never silently kept, never silently dropped).

Run:
  python content/factbase/build.py            # rebuild facts.v1.jsonl from catalogs — offline, deterministic
  python content/factbase/build.py --live      # + Opus->GPT-5.5 candidate pipeline for CBSE-10 bio/social topics

Claude Code builds the machine; the ``--live`` model pipeline is run offline by an operator
(it needs API keys), never at request time.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

VERSION = "v1"
KINDS = frozenset({"definition", "process-step", "date", "place", "structure", "relation"})
CONFIDENCE = frozenset({"verified", "unverified"})

FACTBASE_DIR = Path(__file__).resolve().parent
REPO = FACTBASE_DIR.parents[1]  # content/factbase/build.py -> repo root
FACTS_PATH = FACTBASE_DIR / f"facts.{VERSION}.jsonl"
REVIEW_PATH = FACTBASE_DIR / f"review-queue.{VERSION}.jsonl"

# CBSE Class 10 keeps biology INSIDE "science" and history/geography/civics/economics inside
# "social" — there is no standalone "biology" subject id at this grade, so the fact base v1 seeds
# both and the runtime gate fires for either (plexus/factcheck.FACTBASE_SUBJECTS mirrors this).
FACTBASE_SUBJECTS = ("science", "social")
SEED_GRADES = ("Class 9", "Class 10")

CANDIDATE_MODEL = "anthropic/claude-opus-4-8"  # content primary (owner verdict 2026-07-07)
VERIFIER_MODEL = "openai/gpt-5.5"  # cross-family second opinion


def slug(text: str) -> str:
    """Concept key. MIRRORS ``plexus/store._slug`` byte-for-byte so a fact's conceptId equals the
    id the runtime resolves for the same topic (store.concept_id -> _slug). Keep the two in sync."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "concept"


def make_fact(
    *,
    conceptId: str,
    claim: str,
    kind: str,
    subject: str,
    source: dict[str, Any],
    confidence: str,
    check: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """One atomic fact. ``id`` is a stable hash of conceptId+claim so re-runs dedupe."""
    if kind not in KINDS:
        raise ValueError(f"bad kind {kind!r}")
    if confidence not in CONFIDENCE:
        raise ValueError(f"bad confidence {confidence!r}")
    fid = hashlib.sha1(f"{conceptId}|{claim}".encode()).hexdigest()[:16]
    fact = {
        "id": fid,
        "conceptId": conceptId,
        "claim": claim,
        "kind": kind,
        "subject": subject,
        "source": source,
        "confidence": confidence,
    }
    if isinstance(check, dict):
        fact["check"] = check
    return fact


# --- (1) SEED from what we OWN: the verified catalogs (deterministic, runs now) ---------------


def extract_catalog_facts(catalog_path: Path) -> list[dict[str, Any]]:
    """Structural facts from a board catalog: which chapters/topics exist, their order, and each
    topic's blurb — all confidence:"verified" because the catalog itself is the owned, cross-checked
    ground truth (its per-subject provenance rides into ``source``). Chapter/ordering facts are
    keyed by the chapter slug; topic facts by the topic slug — the SAME conceptId the runtime
    resolves for that topic, so the gate can query them (see plexus/factcheck)."""
    data = json.loads(catalog_path.read_text(encoding="utf-8"))
    board = data.get("board", "CBSE")
    rel = catalog_path.relative_to(REPO).as_posix()
    facts: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add(fact: dict[str, Any]) -> None:
        if fact["id"] not in seen:
            seen.add(fact["id"])
            facts.append(fact)

    for grade in data.get("grades", []):
        gname = grade.get("grade")
        if gname not in SEED_GRADES:
            continue
        for subj in grade.get("subjects", []):
            sid = subj.get("id")
            if sid not in FACTBASE_SUBJECTS:
                continue
            sname = subj.get("name", sid)
            prov = subj.get("provenance", "")

            # Bound per subject, not captured by a closure: a nested `src()` would read
            # `gname`/`sid`/`prov` late, at call time (ruff B023). Each fact gets its own copy
            # so callers can never mutate a shared dict.
            catalog_src: dict[str, Any] = {
                "type": "catalog",
                "file": rel,
                "board": board,
                "grade": gname,
                "subject": sid,
                "provenance": prov,
            }

            prev_ch: str | None = None
            for ch in subj.get("chapters", []):
                cname = ch.get("name")
                if not cname:
                    continue
                cid = slug(cname)
                add(make_fact(
                    conceptId=cid,
                    claim=f"In {board} {gname} {sname}, '{cname}' is a chapter.",
                    kind="structure", subject=sid, source=dict(catalog_src), confidence="verified",
                ))
                if prev_ch:
                    add(make_fact(
                        conceptId=cid,
                        claim=f"In {board} {gname} {sname}, the chapter '{prev_ch}' comes before '{cname}'.",
                        kind="relation", subject=sid, source=dict(catalog_src), confidence="verified",
                    ))
                prev_ch = cname
                for t in ch.get("topics", []):
                    tname = t.get("name")
                    if not tname:
                        continue
                    tid = slug(tname)
                    add(make_fact(
                        conceptId=tid,
                        claim=f"In {board} {gname} {sname}, '{tname}' is a topic in the chapter '{cname}'.",
                        kind="structure", subject=sid, source=dict(catalog_src), confidence="verified",
                    ))
                    blurb = (t.get("blurb") or "").strip()
                    if blurb:
                        add(make_fact(
                            conceptId=tid,
                            claim=f"'{tname}' covers: {blurb}",
                            kind="definition", subject=sid, source=dict(catalog_src), confidence="verified",
                        ))
    return facts


def catalog_topics(catalog_path: Path) -> list[tuple[str, str, str]]:
    """(subject, grade, topicName) for every CBSE-10 bio/social topic — the candidate-pipeline
    worklist. Class 10 only (v1 breadth); Class 9 structure is seeded but not candidate-generated."""
    data = json.loads(catalog_path.read_text(encoding="utf-8"))
    out: list[tuple[str, str, str]] = []
    for grade in data.get("grades", []):
        if grade.get("grade") != "Class 10":
            continue
        for subj in grade.get("subjects", []):
            sid = subj.get("id")
            if sid not in FACTBASE_SUBJECTS:
                continue
            for ch in subj.get("chapters", []):
                for t in ch.get("topics", []):
                    if t.get("name"):
                        out.append((sid, grade["grade"], t["name"]))
    return out


# --- (2) candidate pipeline: Opus generate -> GPT-5.5 verify -> promote agreements ------------


def _extract_json(text: str) -> Any:
    """Best-effort JSON out of a model reply (tolerates ```json fences and surrounding prose)."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"[\[{].*[\]}]", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    return None


def _live_model_call(model: str, system: str, user: str) -> str:
    import litellm  # lazy: the deterministic build + tests never import litellm

    litellm.drop_params = True
    resp = litellm.completion(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=1500,
        temperature=0.0,
    )
    return resp.choices[0].message.content or ""


_CANDIDATE_SYSTEM = (
    "You are an NCERT-aligned fact author for an Indian K-12 learning app. Given a subject, grade, "
    "and topic, list the atomic, self-contained, checkable facts an NCERT textbook would assert for "
    "that topic — definitions, process steps, dates, places, structures, relations. Each fact is ONE "
    "assertion. Reply STRICT JSON only: a list of {\"claim\": str, \"kind\": one of "
    "[definition,process-step,date,place,structure,relation], \"check\": optional "
    "{\"entity\": str, \"value\": str, \"kind\": \"year\"|\"number\"}}. Add a check ONLY for a date or "
    "a hard number (year, count, quantity); omit it otherwise."
)

_VERIFIER_SYSTEM = (
    "You independently verify ONE factual claim against NCERT / standard-reference ground truth for "
    "an Indian K-12 curriculum. Reply STRICT JSON only: {\"verdict\": \"agree\"|\"disagree\", "
    "\"reason\": one short sentence}. 'agree' means the claim is correct and NCERT-appropriate."
)


def generate_candidates(
    subject: str,
    grade: str,
    topic: str,
    *,
    model: str = CANDIDATE_MODEL,
    model_call: Callable[[str, str, str], str] = _live_model_call,
) -> list[dict[str, Any]]:
    """Opus proposes candidate facts (provenance model-generated-unverified). Malformed rows dropped.
    Keyed by the topic slug — the same conceptId the runtime resolves for that topic."""
    text = model_call(model, _CANDIDATE_SYSTEM, f"Subject: {subject}\nGrade: {grade}\nTopic: {topic}")
    raw = _extract_json(text)
    cid = slug(topic)
    out: list[dict[str, Any]] = []
    for row in raw if isinstance(raw, list) else []:
        if not isinstance(row, dict):
            continue
        claim = str(row.get("claim") or "").strip()
        kind = row.get("kind")
        if not claim or kind not in KINDS:
            continue
        check = row.get("check") if isinstance(row.get("check"), dict) else None
        out.append(make_fact(
            conceptId=cid, claim=claim, kind=kind, subject=subject,
            source={"type": "model-generated-unverified", "model": model},
            confidence="unverified", check=check,
        ))
    return out


def verify_candidate(
    fact: dict[str, Any],
    *,
    model: str = VERIFIER_MODEL,
    model_call: Callable[[str, str, str], str] = _live_model_call,
) -> tuple[bool, str]:
    """GPT-5.5's independent verdict on one candidate claim."""
    text = model_call(model, _VERIFIER_SYSTEM, f"Claim: {fact['claim']}")
    v = _extract_json(text)
    if not isinstance(v, dict):
        return False, "verifier returned no parseable verdict"
    return v.get("verdict") == "agree", str(v.get("reason") or "")


def verify_candidates(
    candidates: list[dict[str, Any]],
    *,
    verify: Callable[[dict[str, Any]], tuple[bool, str]] = verify_candidate,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Promote cross-model AGREEMENTS to verified; route disagreements to the review queue.
    Returns (promoted, review) — a disagreement is never kept in the base and never dropped."""
    promoted: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []
    for c in candidates:
        agree, reason = verify(c)
        if agree:
            promoted.append({
                **c,
                "confidence": "verified",
                "source": {
                    "type": "model-verified",
                    "models": [c["source"].get("model", CANDIDATE_MODEL), VERIFIER_MODEL],
                    "verifierReason": reason,
                },
            })
        else:
            review.append({
                **c,
                "confidence": "unverified",
                "source": {**c["source"], "verifierVerdict": "disagree", "verifierReason": reason},
            })
    return promoted, review


# --- assembly + IO ---------------------------------------------------------------------------


def _dedupe(facts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for f in facts:
        if f["id"] not in seen:
            seen.add(f["id"])
            out.append(f)
    return out


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in records),
        encoding="utf-8",
    )


def build_from_catalogs() -> list[dict[str, Any]]:
    return _dedupe(extract_catalog_facts(REPO / "content" / "catalogs" / "cbse.json"))


def run_candidate_pipeline() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Live Opus->GPT-5.5 pass over CBSE-10 bio/social topics. Returns (promoted, review)."""
    promoted: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []
    for subject, grade, topic in catalog_topics(REPO / "content" / "catalogs" / "cbse.json"):
        try:
            cands = generate_candidates(subject, grade, topic)
        except Exception as exc:  # one flaky topic must not sink the batch
            print(f"  ! generate failed for {subject}/{topic}: {exc}")
            continue
        p, r = verify_candidates(cands)
        promoted += p
        review += r
        print(f"  {subject}/{topic}: {len(p)} verified, {len(r)} to review")
    return promoted, review


def _self_check() -> None:
    """Deterministic promotion-logic check — no network, fake verifier."""
    cands = [
        make_fact(conceptId="x", claim="The Dandi March began in 1930.", kind="date",
                  subject="social", source={"type": "model-generated-unverified", "model": "opus"},
                  confidence="unverified", check={"entity": "Dandi March", "value": "1930", "kind": "year"}),
        make_fact(conceptId="x", claim="The Dandi March began in 1929.", kind="date",
                  subject="social", source={"type": "model-generated-unverified", "model": "opus"},
                  confidence="unverified"),
    ]
    promoted, review = verify_candidates(cands, verify=lambda f: ("1930" in f["claim"], "self-check"))
    assert len(promoted) == 1 and promoted[0]["confidence"] == "verified", promoted
    assert promoted[0]["source"]["type"] == "model-verified", promoted
    assert len(review) == 1 and review[0]["confidence"] == "unverified", review
    assert slug("Nationalism in India") == "nationalism-in-india", slug("Nationalism in India")
    print("build self-check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="also run the Opus->GPT-5.5 candidate pipeline")
    args = ap.parse_args()

    _self_check()
    facts = build_from_catalogs()

    if args.live:
        promoted, review = run_candidate_pipeline()
        facts = _dedupe(facts + promoted)
        write_jsonl(REVIEW_PATH, review)
        print(f"factbase: {len(review)} disagreements -> {REVIEW_PATH.name} (human review)")

    write_jsonl(FACTS_PATH, facts)
    print(f"factbase: wrote {len(facts)} verified facts -> {FACTS_PATH.name}")
