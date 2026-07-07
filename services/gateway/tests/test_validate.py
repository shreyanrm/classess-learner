"""Validation gate + escalation tests. Mock mode only — the judge and the escalation regeneration
are monkeypatched, so no network and no keys. Post model-order flip (owner law, 2026-07-07): the
content primary is GPT-5.5 and OPUS is the quality-backup that rebuilds on a fail; validate itself
is model-agnostic (it takes the escalation_model), so the older tests pass a stand-in model."""

from __future__ import annotations

import pytest
from classess_gateway.plexus import store
from classess_gateway.plexus.validate import PASS_THRESHOLD, validate_and_promote
from classess_gateway.routing import Track, resolve, track_separation_holds


@pytest.fixture(autouse=True)
def cache_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("PLEXUS_CACHE_DIR", str(tmp_path))
    return tmp_path


def _provisional(artifact, *, model="openai/gpt-5.5"):
    """A freshly-served provisional record, as run_engine writes it (GPT-5.5 primary post-flip)."""
    return {
        "concept": "photosynthesis",
        "modality": "compose",
        "difficulty": "core",
        "verified": True,
        "seeded": False,
        "status": store.PROVISIONAL,
        "provenance": {"engine": "engine.compose", "model": model, "prompt_version": "plexus-v4"},
        "artifact": artifact,
    }


def _promote(monkeypatch, record, *, judge, regen=None, escalation_model="openai/gpt-5.5"):
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
        escalation_model=escalation_model,
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
    # provenance carries the validation record; the base (GPT-5.5 primary) model is unchanged, the
    # validation model is the Opus judge
    val = out["provenance"]["validation"]
    assert out["provenance"]["model"] == "openai/gpt-5.5"
    assert val["model"] == "anthropic/claude-opus-4-8"
    assert val["score"] == 92.0
    assert val["validatedAt"]
    # it is actually persisted as canonical
    loaded = store.load("photosynthesis", "compose", "core", {})
    assert store.status(loaded) == store.CANONICAL
    assert loaded["artifact"] == {"cards": ["base"]}


# --- quality-fail -> Opus rebuild -> best-of promotes the escalated artifact -------------
_OPUS = "anthropic/claude-opus-4-8"


def test_fail_escalates_and_best_of_promotes_opus_rebuild(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})  # GPT-5.5 primary

    def judge(_jm, _mo, _co, art):
        score = 88.0 if art == {"cards": ["alt"]} else 45.0  # GPT base fails, Opus rebuild wins
        return {"score": score, "critical": False, "weak": ["correctness"], "notes": ""}

    def regen(modality, concept, difficulty, provider_model, fallbacks, payload):
        assert provider_model == _OPUS  # the SAME spec regenerates on Opus (the quality-backup)
        return {"cards": ["alt"]}, provider_model, 7, False

    out = _promote(monkeypatch, record, judge=judge, regen=regen, escalation_model=_OPUS)
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["alt"]}  # best-of chose the Opus rebuild
    assert out["provenance"]["model"] == _OPUS  # actual model recorded (honest telemetry)
    assert out["provenance"]["validation"]["score"] == 88.0
    assert PASS_THRESHOLD == 70.0


def test_fail_but_base_still_best_keeps_base(monkeypatch, cache_dir) -> None:
    """Escalation fires on a fail, but the Opus rebuild scores no better — keep the GPT base
    (best-of never downgrades)."""
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, art):
        return {"score": 60.0 if art == {"cards": ["base"]} else 30.0, "critical": False,
                "weak": [], "notes": ""}

    out = _promote(
        monkeypatch,
        record,
        judge=judge,
        regen=lambda *_a: ({"cards": ["alt"]}, _OPUS, 1, False),
        escalation_model=_OPUS,
    )
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["base"]}
    assert out["provenance"]["model"] == "openai/gpt-5.5"  # the GPT primary is kept
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
        regen=lambda *_a: ({"cards": ["alt"]}, _OPUS, 1, False),
        escalation_model=_OPUS,
    )
    # a critical error fails the gate despite the high score; the clean Opus rebuild wins
    assert out["artifact"] == {"cards": ["alt"]}
    assert out["provenance"]["model"] == _OPUS


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
        escalation_model=_OPUS,
    )
    assert out["artifact"] == {"cards": ["base"]}
    assert out["provenance"]["model"] == "openai/gpt-5.5"  # the GPT primary is kept


# --- model-order flip: content engines route primary to GPT-5.5, escalate to Opus -------


def test_content_engines_route_primary_to_gpt_and_escalate_to_opus() -> None:
    from classess_gateway.registry import policy

    for cap in ("engine.compose", "engine.simulate", "engine.diagram", "engine.video"):
        pol = policy(cap)
        # PRIMARY is GPT-5.5 via the logical openai.frontier, on Track 1
        assert pol.primary == "openai.frontier"
        assert resolve(pol.primary, pol.track).provider_model == "openai/gpt-5.5"
        # Opus (frontier.reason) waits in the fallback chain as the quality-backup
        assert "frontier.reason" in pol.fallback
    assert resolve("frontier.reason", Track.TRACK_1).provider_model == "anthropic/claude-opus-4-8"


def test_spawn_validation_escalates_to_opus_not_gpt(monkeypatch) -> None:
    """The post-serve gate's quality-backup is now Opus: GPT-5.5 fails -> Opus rebuilds (not the
    other way around). Run the spawned thread synchronously and capture the resolved models."""
    import classess_gateway.plexus.engines as engines

    captured: dict = {}
    monkeypatch.setattr(
        "classess_gateway.plexus.validate.validate_and_promote",
        lambda **kw: captured.update(kw),
    )

    class _SyncThread:  # run the "background" validation inline, deterministically
        def __init__(self, *, target, daemon=None, name=None):
            self._target = target

        def start(self):
            self._target()

    monkeypatch.setattr(engines.threading, "Thread", _SyncThread)
    record = {"artifact": {}, "provenance": {"model": "openai/gpt-5.5"}}
    engines._spawn_validation(record, "c", "compose", "core", {}, ())
    assert captured["escalation_model"] == "anthropic/claude-opus-4-8"  # Opus rebuilds
    assert captured["judge_model"] == "anthropic/claude-opus-4-8"  # Opus judges


# --- owner law: every version is kept FOREVER (audit trail + manual-edit substrate) ------


def test_superseded_loser_survives_promotion(monkeypatch, cache_dir) -> None:
    """When the Opus rebuild wins best-of, the GPT-5.5 provisional it replaced is NOT deleted — it
    persists in the immutable version ledger as a superseded record, artifact intact."""
    record = _provisional({"cards": ["base"]})  # GPT-5.5 primary

    def judge(_jm, _mo, _co, art):
        return {"score": 88.0 if art == {"cards": ["alt"]} else 40.0, "critical": False,
                "weak": [], "notes": ""}

    out = _promote(
        monkeypatch,
        record,
        judge=judge,
        regen=lambda *_a: ({"cards": ["alt"]}, _OPUS, 5, False),
        escalation_model=_OPUS,
    )
    assert out["artifact"] == {"cards": ["alt"]}  # Opus rebuild won and is canonical

    versions = store.load_versions("photosynthesis", "compose", "core", {})
    by_status = {v["status"]: v for v in versions}
    # the winner is recorded canonical AND the loser survives as superseded — nothing deleted
    assert store.CANONICAL in by_status
    assert store.SUPERSEDED in by_status
    assert by_status[store.CANONICAL]["artifact"] == {"cards": ["alt"]}
    assert by_status[store.SUPERSEDED]["artifact"] == {"cards": ["base"]}  # loser content intact
    assert by_status[store.SUPERSEDED]["provenance"]["model"] == "openai/gpt-5.5"


def test_rejected_loser_survives_when_base_wins(monkeypatch, cache_dir) -> None:
    """When the Opus rebuild loses best-of, the rebuild itself is kept as a rejected record — every
    generated version persists, even the ones that never served."""
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, art):
        return {"score": 60.0 if art == {"cards": ["base"]} else 20.0, "critical": False,
                "weak": [], "notes": ""}

    _promote(
        monkeypatch,
        record,
        judge=judge,
        regen=lambda *_a: ({"cards": ["alt"]}, _OPUS, 3, False),
        escalation_model=_OPUS,
    )
    versions = store.load_versions("photosynthesis", "compose", "core", {})
    by_status = {v["status"]: v for v in versions}
    assert by_status[store.CANONICAL]["artifact"] == {"cards": ["base"]}  # GPT base won
    assert by_status[store.REJECTED]["artifact"] == {"cards": ["alt"]}  # losing rebuild kept
    assert by_status[store.REJECTED]["provenance"]["model"] == _OPUS
