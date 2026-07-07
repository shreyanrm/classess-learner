"""Validation gate + GPT-5.5 escalation tests. Mock mode only — the judge and the escalation
regeneration are monkeypatched, so no network and no keys."""

from __future__ import annotations

import pytest
from classess_gateway.plexus import store
from classess_gateway.plexus.validate import PASS_THRESHOLD, validate_and_promote
from classess_gateway.routing import Track, resolve, track_separation_holds


@pytest.fixture(autouse=True)
def cache_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("PLEXUS_CACHE_DIR", str(tmp_path))
    return tmp_path


def _provisional(artifact, *, model="anthropic/claude-opus-4-8"):
    """A freshly-served provisional record, as run_engine writes it."""
    return {
        "concept": "photosynthesis",
        "modality": "compose",
        "difficulty": "core",
        "verified": True,
        "seeded": False,
        "status": store.PROVISIONAL,
        "provenance": {"engine": "engine.compose", "model": model, "prompt_version": "plexus-v3"},
        "artifact": artifact,
    }


def _promote(monkeypatch, record, *, judge, regen=None):
    monkeypatch.setattr("classess_gateway.plexus.validate._judge", judge)
    if regen is not None:
        monkeypatch.setattr("classess_gateway.plexus.engines._generate_live", regen)
    return validate_and_promote(
        concept="photosynthesis",
        modality="compose",
        difficulty="core",
        scope={},
        record=record,
        judge_model="anthropic/claude-opus-4-8",
        escalation_model="openai/gpt-5.5",
    )


# --- the served envelope carries status; a mock/seed artifact is canonical (nothing to promote) --


def test_mock_engine_serves_canonical_status(cache_dir) -> None:
    from classess_gateway.app import CapabilityRequest, Gateway
    from classess_gateway.cache import InMemoryCache
    from classess_gateway.providers import MockProvider
    from classess_gateway.registry import ConsentTier
    from classess_gateway.telemetry import MetricsSink

    gw = Gateway(MockProvider(), InMemoryCache(), MetricsSink())
    resp = gw.invoke(
        "engine.compose",
        CapabilityRequest(consent_tier=ConsentTier.UN_ELEVATED, payload={"concept": "fractions"}),
    )
    assert resp.output["status"] == store.CANONICAL  # mock is the stable floor, never provisional


# --- routing: openai.frontier is registered on Track 1, separation intact ---------------


def test_openai_frontier_registered_on_track_1() -> None:
    spec = resolve("openai.frontier", Track.TRACK_1)
    assert spec.provider_model == "openai/gpt-5.5"
    assert spec.track is Track.TRACK_1
    assert track_separation_holds()


# --- provisional -> canonical on a passing score ----------------------------------------


def test_pass_promotes_to_canonical_without_escalation(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})
    escalated = {"called": False}

    def regen(*_a):
        escalated["called"] = True
        return {"cards": ["alt"]}, "openai/gpt-5.5", 1, False

    out = _promote(
        monkeypatch,
        record,
        judge=lambda *_a: {"score": 92.0, "critical": False, "weak": [], "notes": "clean"},
        regen=regen,
    )
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["base"]}  # a passing artifact is kept, not regenerated
    assert escalated["called"] is False  # no escalation on a pass
    # provenance carries the validation record; the base model is unchanged
    val = out["provenance"]["validation"]
    assert out["provenance"]["model"] == "anthropic/claude-opus-4-8"
    assert val["model"] == "anthropic/claude-opus-4-8"
    assert val["score"] == 92.0
    assert val["validatedAt"]
    # it is actually persisted as canonical
    loaded = store.load("photosynthesis", "compose", "core", {})
    assert store.status(loaded) == store.CANONICAL
    assert loaded["artifact"] == {"cards": ["base"]}


# --- quality-fail -> GPT-5.5 escalation -> best-of promotes the escalated artifact -------


def test_fail_escalates_and_best_of_promotes_gpt55(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, art):
        score = 88.0 if art == {"cards": ["alt"]} else 45.0  # base fails, alt wins
        return {"score": score, "critical": False, "weak": ["correctness"], "notes": ""}

    def regen(modality, concept, difficulty, provider_model, fallbacks, payload):
        assert provider_model == "openai/gpt-5.5"  # the SAME spec regenerates on GPT-5.5
        return {"cards": ["alt"]}, provider_model, 7, False

    out = _promote(monkeypatch, record, judge=judge, regen=regen)
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["alt"]}  # best-of chose the escalated artifact
    assert out["provenance"]["model"] == "openai/gpt-5.5"  # actual model recorded
    assert out["provenance"]["validation"]["score"] == 88.0
    assert PASS_THRESHOLD == 70.0


def test_fail_but_base_still_best_keeps_base(monkeypatch, cache_dir) -> None:
    """Escalation fires on a fail, but the regenerated artifact scores no better — keep the base
    (best-of never downgrades)."""
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, art):
        return {"score": 60.0 if art == {"cards": ["base"]} else 30.0, "critical": False,
                "weak": [], "notes": ""}

    out = _promote(
        monkeypatch,
        record,
        judge=judge,
        regen=lambda *_a: ({"cards": ["alt"]}, "openai/gpt-5.5", 1, False),
    )
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["base"]}
    assert out["provenance"]["model"] == "anthropic/claude-opus-4-8"
    assert out["provenance"]["validation"]["score"] == 60.0


def test_critical_error_escalates_even_with_high_score(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, art):
        if art == {"cards": ["alt"]}:
            return {"score": 80.0, "critical": False, "weak": [], "notes": ""}
        return {"score": 95.0, "critical": True, "weak": ["correctness"], "notes": "wrong fact"}

    out = _promote(
        monkeypatch,
        record,
        judge=judge,
        regen=lambda *_a: ({"cards": ["alt"]}, "openai/gpt-5.5", 1, False),
    )
    # a critical error fails the gate despite the high score; the clean escalated artifact wins
    assert out["artifact"] == {"cards": ["alt"]}
    assert out["provenance"]["model"] == "openai/gpt-5.5"


# --- judge unreachable: promote as-is, never block --------------------------------------


def test_unreachable_judge_promotes_unscored(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})
    escalated = {"called": False}

    def regen(*_a):
        escalated["called"] = True
        return {"cards": ["alt"]}, "openai/gpt-5.5", 1, False

    out = _promote(monkeypatch, record, judge=lambda *_a: None, regen=regen)
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["base"]}  # kept as-is
    assert out["provenance"]["validation"]["score"] is None
    # a None verdict never escalates — the gate never blocks a serve on a flaky judge
    assert escalated["called"] is False


# --- seeded escalation is refused (never best-of a floor) -------------------------------


def test_seeded_escalation_is_not_chosen(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, _art):
        return {"score": 40.0, "critical": False, "weak": [], "notes": ""}

    # the escalation regeneration itself fell back to a seed — must NOT be promoted over the base
    out = _promote(
        monkeypatch,
        record,
        judge=judge,
        regen=lambda *_a: ({"cards": ["seed"]}, "seed", 0, True),
    )
    assert out["artifact"] == {"cards": ["base"]}
    assert out["provenance"]["model"] == "anthropic/claude-opus-4-8"
