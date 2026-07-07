#!/usr/bin/env python3
"""Idempotent patcher: wire the fact-base gate into plexus/validate.py.

Applies 5 exact-string edits (fails loudly if the source drifted). Safe to re-run: if the marker
helper is already present it exits without touching the file.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
TARGET = REPO / "services" / "gateway" / "src" / "classess_gateway" / "plexus" / "validate.py"

EDITS: list[tuple[str, str]] = [
    # 1) _judge: accept + append NCERT ground truth and detected contradictions
    (
        'def _judge(judge_model: str, modality: str, concept: str, artifact: Any) -> dict[str, Any] | None:\n'
        '    """Score the artifact via the LLM judge. Returns the parsed verdict, or ``None`` when the\n'
        '    judge is unreachable or unparseable (the caller then keeps the artifact, never blocks)."""\n'
        '    import litellm  # lazy: mock mode and tests never import litellm\n'
        '\n'
        '    from classess_gateway.vidya import _extract_json\n'
        '\n'
        '    litellm.drop_params = True\n'
        '    user = (\n'
        '        f"Modality: {modality}\\nConcept: {concept}\\n\\nArtifact JSON:\\n"\n'
        '        # cap the payload so a huge video/compose spec cannot blow the judge\'s context\n'
        '        + json.dumps(artifact, ensure_ascii=False)[:12000]\n'
        '    )\n',
        'def _judge(\n'
        '    judge_model: str,\n'
        '    modality: str,\n'
        '    concept: str,\n'
        '    artifact: Any,\n'
        '    facts: list[str] | None = None,\n'
        '    contradictions: list[str] | None = None,\n'
        ') -> dict[str, Any] | None:\n'
        '    """Score the artifact via the LLM judge. Returns the parsed verdict, or ``None`` when the\n'
        '    judge is unreachable or unparseable (the caller then keeps the artifact, never blocks).\n'
        '\n'
        '    ``facts`` (verified NCERT ground truth for the concept) and ``contradictions``\n'
        '    (deterministic fact-base conflicts) are appended for bio/social subjects so the judge\n'
        '    scores correctness against the fact base — SUBJECTS.md §2."""\n'
        '    import litellm  # lazy: mock mode and tests never import litellm\n'
        '\n'
        '    from classess_gateway.vidya import _extract_json\n'
        '\n'
        '    litellm.drop_params = True\n'
        '    user = (\n'
        '        f"Modality: {modality}\\nConcept: {concept}\\n\\nArtifact JSON:\\n"\n'
        '        # cap the payload so a huge video/compose spec cannot blow the judge\'s context\n'
        '        + json.dumps(artifact, ensure_ascii=False)[:12000]\n'
        '    )\n'
        '    if facts:\n'
        '        user += "\\n\\nNCERT GROUND TRUTH (verified fact base) — the artifact MUST NOT contradict these:\\n"\n'
        '        user += "\\n".join(f"- {c}" for c in facts[:40])\n'
        '    if contradictions:\n'
        '        user += (\n'
        '            "\\n\\nDETECTED CONTRADICTIONS (deterministic, high-confidence) — each is a CRITICAL "\n'
        '            "correctness error:\\n" + "\\n".join(f"- {c}" for c in contradictions)\n'
        '        )\n',
    ),
    # 2) helper functions inserted after _rank (before _promote_after_lint_failure)
    (
        '    return verdict["score"] - 1000.0 if verdict["critical"] else verdict["score"]\n'
        '\n'
        '\n'
        'def _promote_after_lint_failure(\n',
        '    return verdict["score"] - 1000.0 if verdict["critical"] else verdict["score"]\n'
        '\n'
        '\n'
        'def _factcheck(artifact: Any, concept: str, scope: dict[str, str]) -> tuple[list[str], list[str]]:\n'
        '    """(contradictions, verified-facts) from the NCERT fact base — empty unless this is a\n'
        '    bio/social subject. bio/social have no CAS: the fact base is the correctness solver\n'
        '    (SUBJECTS.md §2)."""\n'
        '    from classess_gateway.plexus import store\n'
        '    from classess_gateway.plexus.factcheck import FACTBASE_SUBJECTS, facts_for, validate_claims\n'
        '\n'
        '    if (scope or {}).get("subject") not in FACTBASE_SUBJECTS:\n'
        '        return [], []\n'
        '    cid = store.concept_id(concept, scope)\n'
        '    return validate_claims(artifact, cid), facts_for(cid)\n'
        '\n'
        '\n'
        'def _with_factbase(\n'
        '    verdict: dict[str, Any] | None, contradictions: list[str]\n'
        ') -> dict[str, Any] | None:\n'
        '    """A deterministic contradiction against a VERIFIED NCERT fact is a CRITICAL correctness\n'
        '    failure — force it onto the verdict so a fact-contradicting artifact never promotes\n'
        '    unchecked (even if the judge was lenient or unreachable)."""\n'
        '    if not contradictions:\n'
        '        return verdict\n'
        '    base = verdict or {"score": 0.0, "weak": [], "notes": ""}\n'
        '    return {\n'
        '        **base,\n'
        '        "critical": True,\n'
        '        "weak": sorted(set(base.get("weak", []) + ["correctness"])),\n'
        '        "notes": (base.get("notes", "") + " | fact-base: " + "; ".join(contradictions))[:500],\n'
        '    }\n'
        '\n'
        '\n'
        'def _promote_after_lint_failure(\n',
    ),
    # 3) base judge call: fact-check first, feed the judge, force-critical on a contradiction
    (
        '    verdict = _judge(judge_model, modality, concept, artifact)\n'
        '    best_artifact, best_model, best_verdict = artifact, base_model, verdict\n',
        '    contradictions, fact_context = _factcheck(artifact, concept, scope)\n'
        '    verdict = _with_factbase(\n'
        '        _judge(\n'
        '            judge_model, modality, concept, artifact,\n'
        '            facts=fact_context, contradictions=contradictions,\n'
        '        ),\n'
        '        contradictions,\n'
        '    )\n'
        '    best_artifact, best_model, best_verdict = artifact, base_model, verdict\n',
    ),
    # 4) escalation: fact-check the GPT-5.5 rebuild too, same ground truth
    (
        '        if alt is not None and not alt_seeded:\n'
        '            alt_verdict = _judge(judge_model, modality, concept, alt)\n'
        '            if _rank(alt_verdict) > _rank(verdict):\n',
        '        if alt is not None and not alt_seeded:\n'
        '            alt_contra, _ = _factcheck(alt, concept, scope)\n'
        '            alt_verdict = _with_factbase(\n'
        '                _judge(\n'
        '                    judge_model, modality, concept, alt,\n'
        '                    facts=fact_context, contradictions=alt_contra,\n'
        '                ),\n'
        '                alt_contra,\n'
        '            )\n'
        '            if _rank(alt_verdict) > _rank(verdict):\n',
    ),
    # 5) __main__ self-check: the patched _judge stub must tolerate the new kwargs
    (
        '    _judge = lambda jm, mo, co, art: {  # type: ignore[assignment] # noqa: E731\n',
        '    _judge = lambda jm, mo, co, art, **_k: {  # type: ignore[assignment] # noqa: E731\n',
    ),
]

MARKER = "def _factcheck(artifact: Any, concept: str, scope: dict[str, str])"


def main() -> int:
    src = TARGET.read_text(encoding="utf-8")
    if MARKER in src:
        print("patch_validate: already applied — nothing to do")
        return 0
    for i, (old, new) in enumerate(EDITS, 1):
        n = src.count(old)
        if n != 1:
            print(f"patch_validate: EDIT {i} matched {n} times (expected 1) — source drifted, aborting")
            return 2
        src = src.replace(old, new)
    TARGET.write_text(src, encoding="utf-8")
    print(f"patch_validate: applied {len(EDITS)} edits to {TARGET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
