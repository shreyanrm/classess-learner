"""Post-serve validation gate + GPT-5.5 (openai.frontier) escalation.

An artifact serves immediately as ``status="provisional"`` — the first learner never waits
on a judge. A background thread (spawned after serve, in :mod:`engines`) then scores the
provisional artifact with an LLM judge (``frontier.reason``) against the quality bars:
correctness, interactivity, visual-heaviness, guided-discovery register, and
grammar/sentence-case. On a quality-fail (score below the bar, or a critical/factual error)
the SAME spec is regenerated on ``openai.frontier`` (GPT-5.5); both artifacts are re-scored
and the BEST-OF is promoted to ``status="canonical"``.

Validation ALWAYS terminates in a canonical record, so a provisional is validated exactly
once and every later learner reuses the canonical core. When the judge is unreachable the
already structurally-verified artifact is promoted as-is (score ``None``) — the gate never
blocks a serve on a flaky judge.

Provenance on the promoted artifact records ``{model, prompt_version, validation:{model,
validatedAt, score}}`` — ``model`` is the model that actually produced the canonical
artifact (the escalation model when best-of chose it), so telemetry reports the real model.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from classess_gateway.plexus import store

logger = logging.getLogger("classess.gateway.plexus.validate")

PASS_THRESHOLD = 70.0  # overall score 0..100; below this (or a critical error) → escalate

_JUDGE_SYSTEM = (
    "You are a strict quality judge for Classess, an Indian K-12 guided-discovery learning app in "
    "the spirit of Brilliant. Score ONE generated learning artifact against these bars:\n"
    "  • correctness — every fact, formula, and label is right for an Indian middle-school learner "
    "(NCERT framing where it fits). A wrong fact or a wrong-subject law is a CRITICAL error.\n"
    "  • interactivity — the learner ACTS before any prose; each card/scene carries a real "
    "tap/drag/slide/type or moving visual. A dead, read-only artifact is critical.\n"
    "  • visual-heaviness — the visual does the teaching; prose is minimal (~40 words per card).\n"
    "  • guided-discovery register — one idea per beat, act-to-reveal, zero lecturing.\n"
    "  • grammar and sentence-case — calm copy, sentence case, no emoji, no exclamation marks.\n\n"
    "Reply with STRICT JSON only, no prose outside it:\n"
    '{"score": <0-100 overall quality>, "critical": <true if ANY factual error or broken '
    'interaction>, "weak": ["<names of bars that scored low>"], "notes": "<one sentence>"}'
)


def _judge(judge_model: str, modality: str, concept: str, artifact: Any) -> dict[str, Any] | None:
    """Score the artifact via the LLM judge. Returns the parsed verdict, or ``None`` when the
    judge is unreachable or unparseable (the caller then keeps the artifact, never blocks)."""
    import litellm  # lazy: mock mode and tests never import litellm

    from classess_gateway.vidya import _extract_json

    litellm.drop_params = True
    user = (
        f"Modality: {modality}\nConcept: {concept}\n\nArtifact JSON:\n"
        # cap the payload so a huge video/compose spec cannot blow the judge's context
        + json.dumps(artifact, ensure_ascii=False)[:12000]
    )
    try:
        response = litellm.completion(
            model=judge_model,
            messages=[
                {"role": "system", "content": _JUDGE_SYSTEM},
                {"role": "user", "content": user},
            ],
            max_tokens=800,
            temperature=0.0,
        )
        text = response.choices[0].message.content or ""
    except Exception:  # a flaky judge must never block a serve — promote as-is
        logger.warning("validate: judge call raised — promoting artifact unscored", exc_info=True)
        return None
    verdict = _extract_json(text)
    if not isinstance(verdict.get("score"), (int, float)) or isinstance(verdict.get("score"), bool):
        return None
    return {
        "score": float(verdict["score"]),
        "critical": bool(verdict.get("critical")),
        "weak": verdict["weak"] if isinstance(verdict.get("weak"), list) else [],
        "notes": str(verdict.get("notes") or ""),
    }


def _passes(verdict: dict[str, Any] | None) -> bool:
    """A None verdict means the judge was unreachable — never block on it; keep the artifact."""
    if verdict is None:
        return True
    return verdict["score"] >= PASS_THRESHOLD and not verdict["critical"]


def _score_of(verdict: dict[str, Any] | None) -> float:
    """The raw judge score (for logs and provenance). -1 when the judge was unreachable."""
    return -1.0 if verdict is None else verdict["score"]


def _rank(verdict: dict[str, Any] | None) -> float:
    """Best-of comparison key: a CRITICAL (factually wrong / broken) artifact ranks below any
    clean one whatever its raw score, so best-of never keeps a wrong artifact over a sound one."""
    if verdict is None:
        return -1.0
    return verdict["score"] - 1000.0 if verdict["critical"] else verdict["score"]


def validate_and_promote(
    *,
    concept: str,
    modality: str,
    difficulty: str,
    scope: dict[str, str],
    record: dict[str, Any],
    judge_model: str,
    escalation_model: str,
    fallbacks: tuple[str, ...] = (),
) -> dict[str, Any]:
    """Score the provisional artifact, escalate + best-of on a quality-fail, and promote the
    winner to canonical. ALWAYS writes a canonical record (validation is once-and-done)."""
    from classess_gateway.plexus.engines import _generate_live

    artifact = record["artifact"]
    base_model = record.get("provenance", {}).get("model", "unknown")
    verdict = _judge(judge_model, modality, concept, artifact)
    best_artifact, best_model, best_verdict = artifact, base_model, verdict

    if not _passes(verdict) and escalation_model:
        logger.info(
            "validate: quality-fail (score=%s critical=%s) — escalating %s to %s",
            _score_of(verdict),
            None if verdict is None else verdict["critical"],
            modality,
            escalation_model,
        )
        try:
            # regenerate the SAME spec (concept x difficulty) on GPT-5.5; empty payload (no raster)
            alt, alt_model, _tokens, seeded = _generate_live(
                modality, concept, difficulty, escalation_model, fallbacks, {}
            )
        except Exception:
            logger.warning("validate: escalation regeneration raised", exc_info=True)
            alt, alt_model, seeded = None, escalation_model, True
        # a seeded escalation is the honest floor, not a real regeneration — never best-of a seed
        if alt is not None and not seeded:
            alt_verdict = _judge(judge_model, modality, concept, alt)
            if _rank(alt_verdict) > _rank(verdict):
                best_artifact, best_model, best_verdict = alt, alt_model, alt_verdict
                logger.info(
                    "validate: best-of chose the escalated artifact (score=%s)",
                    _score_of(alt_verdict),
                )

    canonical = {
        **record,
        "status": store.CANONICAL,
        "artifact": best_artifact,
        "provenance": {
            **record.get("provenance", {}),
            "model": best_model,
            "validation": {
                "model": judge_model,
                "validatedAt": datetime.now(UTC).isoformat(timespec="seconds"),
                "score": None if best_verdict is None else best_verdict["score"],
            },
        },
    }
    store.save(concept, modality, difficulty, canonical, scope)
    logger.info(
        "validate: promoted %s/%r to canonical (model=%s score=%s)",
        modality,
        concept,
        best_model,
        _score_of(best_verdict),
    )
    return canonical


# ponytail: best-of regenerates the WHOLE artifact rather than patching only the judge's `weak`
# sections. Whole-artifact best-of is the smaller, sound version; add section-level optimization
# when a diff shows it measurably beats a full regeneration.


if __name__ == "__main__":  # runnable self-check — no framework, no network
    _rec = {
        "artifact": {"cards": ["base"]},
        "provenance": {"engine": "engine.compose", "model": "anthropic/x", "prompt_version": "v"},
    }
    store.save = lambda c, m, d, r, s: None  # type: ignore[assignment]

    # fail-then-escalate: base scores low, alt scores high → best-of promotes the alt on GPT-5.5.
    # Run as `python -m ...validate`: this module IS __main__, so rebinding the global `_judge`
    # here is what validate_and_promote (also in __main__) resolves. _generate_live is imported
    # fresh from the real engines module, so patch it there.
    _judge = lambda jm, mo, co, art: {  # type: ignore[assignment] # noqa: E731
        "score": 90.0 if art == {"cards": ["alt"]} else 40.0,
        "critical": False,
        "weak": [],
        "notes": "",
    }
    import classess_gateway.plexus.engines as _eng

    _eng._generate_live = lambda *a: ({"cards": ["alt"]}, "openai/gpt-5.5", 1, False)  # type: ignore[assignment]
    out = validate_and_promote(
        concept="c",
        modality="compose",
        difficulty="core",
        scope={},
        record=_rec,
        judge_model="anthropic/claude-opus-4-8",
        escalation_model="openai/gpt-5.5",
    )
    assert out["status"] == "canonical", out
    assert out["artifact"] == {"cards": ["alt"]}, out
    assert out["provenance"]["model"] == "openai/gpt-5.5", out
    assert out["provenance"]["validation"]["score"] == 90.0, out
    print("validate self-check ok")
