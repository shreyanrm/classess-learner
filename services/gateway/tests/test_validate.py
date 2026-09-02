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
        subject="validate-test-learner",
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
        judge=lambda *_a, **_k: {"score": 92.0, "critical": False, "weak": [], "notes": "clean"},
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

    def judge(_jm, _mo, _co, art, **_k):
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

    def judge(_jm, _mo, _co, art, **_k):
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

    def judge(_jm, _mo, _co, art, **_k):
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

    out = _promote(monkeypatch, record, judge=lambda *_a, **_k: None, regen=regen)
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == {"cards": ["base"]}  # kept as-is
    assert out["provenance"]["validation"]["score"] is None
    # a None verdict never escalates — the gate never blocks a serve on a flaky judge
    assert escalated["called"] is False


# --- seeded escalation is refused (never best-of a floor) -------------------------------


def test_seeded_escalation_is_not_chosen(monkeypatch, cache_dir) -> None:
    record = _provisional({"cards": ["base"]})

    def judge(_jm, _mo, _co, _art, **_k):
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


# --- content order (owner verdict 2026-07-07): OPUS primary + judge, GPT-5.5 the quality-backup --
# (Opus led the storyboard comparison; GPT-5.5 made subtle React/SVG errors — hence the lint gate.)


def test_content_engines_route_primary_to_opus_and_escalate_to_gpt() -> None:
    from classess_gateway.registry import policy

    for cap in ("engine.compose", "engine.simulate", "engine.diagram", "engine.video"):
        pol = policy(cap)
        # PRIMARY is Opus via the logical frontier.reason, on Track 1
        assert pol.primary == "frontier.reason"
        assert resolve(pol.primary, pol.track).provider_model == "anthropic/claude-opus-4-8"
        # GPT-5.5 (openai.frontier) waits in the fallback chain as the quality-backup
        assert "openai.frontier" in pol.fallback
    assert resolve("openai.frontier", Track.TRACK_1).provider_model == "openai/gpt-5.5"


def test_spawn_validation_escalates_to_gpt_not_opus(monkeypatch) -> None:
    """The post-serve gate's quality-backup is GPT-5.5: Opus is primary and judge, and on a
    quality-fail GPT-5.5 rebuilds the same spec (both minds compete). Run the spawned thread
    synchronously and capture the resolved models."""
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
    record = {"artifact": {}, "provenance": {"model": "anthropic/claude-opus-4-8"}}
    engines._spawn_validation(record, "c", "compose", "core", {}, ())
    assert captured["escalation_model"] == "openai/gpt-5.5"  # GPT-5.5 rebuilds
    assert captured["judge_model"] == "anthropic/claude-opus-4-8"  # Opus judges


# --- owner law: every version is kept FOREVER (audit trail + manual-edit substrate) ------


def test_superseded_loser_survives_promotion(monkeypatch, cache_dir) -> None:
    """When the Opus rebuild wins best-of, the GPT-5.5 provisional it replaced is NOT deleted — it
    persists in the immutable version ledger as a superseded record, artifact intact."""
    record = _provisional({"cards": ["base"]})  # GPT-5.5 primary

    def judge(_jm, _mo, _co, art, **_k):
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

    def judge(_jm, _mo, _co, art, **_k):
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


# --- deterministic technical lint: a subtle SVG/spec defect routes a rebuild on the quality- ------
# --- backup WITHOUT a judge call; the broken version persists as REJECTED with the lint reasons. --
# Current content order (owner verdict 2026-07-07): Opus is primary + judge, GPT-5.5 is the
# quality-backup that rebuilds — so a lint failure routes to GPT-5.5. The lint mechanism itself is
# model-agnostic (it rebuilds on whatever escalation_model is passed); these pass models explicitly.
_GPT = "openai/gpt-5.5"

_CLEAN_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
    '<circle cx="5" cy="5" r="2" fill="#111"/></svg>'
)


def _lint_record(modality, artifact):
    return {
        "concept": "photosynthesis",
        "modality": modality,
        "difficulty": "core",
        "verified": True,
        "seeded": False,
        "status": store.PROVISIONAL,
        "provenance": {"engine": f"engine.{modality}", "model": _OPUS,  # Opus is the primary
                       "prompt_version": "plexus-v4"},
        "artifact": artifact,
    }


def _run_lint_gate(monkeypatch, *, modality, artifact, rebuild_artifact, rebuild_seeded=False):
    """Drive validate_and_promote through the lint gate. Returns (out, judge_calls, rebuild_calls).
    The judge is a tripwire — the lint-failure path must NEVER call it. Wired like production:
    judge on Opus, rebuild on the GPT-5.5 quality-backup."""
    judge_calls: list = []
    rebuild_calls: list = []

    def judge(*a, **_k):
        judge_calls.append(a)
        return {"score": 99.0, "critical": False, "weak": [], "notes": "should never run"}

    def regen(modality_, concept, difficulty, provider_model, fallbacks, payload):
        rebuild_calls.append(provider_model)  # capture the model the rebuild routed to
        return rebuild_artifact, provider_model, 5, rebuild_seeded

    monkeypatch.setattr("classess_gateway.plexus.validate._judge", judge)
    monkeypatch.setattr("classess_gateway.plexus.engines._generate_live", regen)
    out = validate_and_promote(
        concept="photosynthesis",
        modality=modality,
        difficulty="core",
        scope={},
        record=_lint_record(modality, artifact),
        judge_model=_OPUS,
        escalation_model=_GPT,
    )
    return out, judge_calls, rebuild_calls


def _rejected(modality):
    versions = store.load_versions("photosynthesis", modality, "core", {})
    return [v for v in versions if v["status"] == store.REJECTED]


def test_lint_undefined_attr_rejects_and_rebuilds_without_judging(monkeypatch, cache_dir) -> None:
    """The exact production bug: cx="undefined" parses as XML but renders NaN. The lint catches it,
    routes a quality-backup rebuild WITHOUT a judge call, and keeps the broken version REJECTED."""
    broken = _CLEAN_SVG.replace('cx="5"', 'cx="undefined"')
    out, judge_calls, rebuild_calls = _run_lint_gate(
        monkeypatch, modality="diagram", artifact=broken, rebuild_artifact=_CLEAN_SVG
    )
    assert judge_calls == []  # NO judge call was burned on a technically-broken artifact
    assert rebuild_calls == [_GPT]  # the SAME spec routed to the quality-backup
    assert out["status"] == store.CANONICAL
    assert out["artifact"] == _CLEAN_SVG  # the lint-clean rebuild is promoted
    assert out["provenance"]["model"] == _GPT
    rejected = _rejected("diagram")
    assert len(rejected) == 1
    assert rejected[0]["artifact"] == broken  # the broken version is kept forever, not deleted
    assert any("undefined" in r for r in rejected[0]["provenance"]["lint"])


def test_lint_bad_smil_dur_rejects_video_scene(monkeypatch, cache_dir) -> None:
    bad = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
        '<rect x="1" y="1" width="2" height="2">'
        '<animate attributeName="x" values="1;5" dur="abc"/></rect></svg>'
    )
    clean_video = {"scenes": [{"id": "s1", "durationMs": 1000, "narration": "n",
                               "visual": {"kind": "svg", "payload": _CLEAN_SVG}}]}
    artifact = {"scenes": [{"id": "s1", "visual": {"kind": "svg", "payload": bad}}]}
    out, judge_calls, rebuild_calls = _run_lint_gate(
        monkeypatch, modality="video", artifact=artifact, rebuild_artifact=clean_video
    )
    assert judge_calls == []
    assert rebuild_calls == [_GPT]
    assert out["artifact"] == clean_video
    assert any("dur" in r for r in _rejected("video")[0]["provenance"]["lint"])


def test_lint_dangling_url_ref_rejects(monkeypatch, cache_dir) -> None:
    broken = _CLEAN_SVG.replace('fill="#111"', 'fill="url(#missing)"')
    out, judge_calls, _rc = _run_lint_gate(
        monkeypatch, modality="diagram", artifact=broken, rebuild_artifact=_CLEAN_SVG
    )
    assert judge_calls == []
    assert out["artifact"] == _CLEAN_SVG
    assert any("missing" in r for r in _rejected("diagram")[0]["provenance"]["lint"])


def test_lint_non_numeric_coord_rejects_discovery_mark(monkeypatch, cache_dir) -> None:
    """A discovery mark coordinate must be numeric (Discovery.tsx); a stringy 'undefined' is a
    spec-shape defect the deterministic lint catches even without any SVG."""
    artifact = {"cards": [{"id": "c1", "discovery": {"stages": [
        {"visual": {"marks": [{"id": "m1", "shape": "circle", "x": "undefined", "y": 10}]}}
    ]}}]}
    out, judge_calls, _rc = _run_lint_gate(
        monkeypatch, modality="compose", artifact=artifact, rebuild_artifact={"cards": ["ok"]}
    )
    assert judge_calls == []
    assert out["artifact"] == {"cards": ["ok"]}
    assert any("numeric" in r for r in _rejected("compose")[0]["provenance"]["lint"])


def test_lint_wrong_enum_rejects(monkeypatch, cache_dir) -> None:
    artifact = {"cards": [{"id": "c1", "interaction": {"kind": "wiggle", "prompt": "x"}}]}
    out, judge_calls, _rc = _run_lint_gate(
        monkeypatch, modality="compose", artifact=artifact, rebuild_artifact={"cards": ["ok"]}
    )
    assert judge_calls == []
    assert out["artifact"] == {"cards": ["ok"]}
    assert any("vocabulary" in r for r in _rejected("compose")[0]["provenance"]["lint"])


def test_lint_rebuild_also_broken_falls_to_seed_loudly(monkeypatch, cache_dir) -> None:
    """When the quality-backup's rebuild is ALSO technically broken, refuse to the honest seed —
    keep BOTH broken versions (the provisional and the failed rebuild) REJECTED, never deleted."""
    broken = _CLEAN_SVG.replace('cx="5"', 'cx="undefined"')
    still_broken = _CLEAN_SVG.replace('cy="5"', 'cy="NaN"')
    out, judge_calls, rebuild_calls = _run_lint_gate(
        monkeypatch, modality="diagram", artifact=broken, rebuild_artifact=still_broken
    )
    assert judge_calls == []  # still no judge call
    assert rebuild_calls == [_GPT]
    assert out["status"] == store.CANONICAL
    assert out["seeded"] is True  # the honest floor, served as canonical
    assert out["provenance"]["model"] == "seed"
    from classess_gateway.plexus.lint import lint_artifact

    assert lint_artifact("diagram", out["artifact"]).ok  # the seed itself is lint-clean
    rejected = _rejected("diagram")
    artifacts = {r["artifact"] for r in rejected}
    assert broken in artifacts and still_broken in artifacts  # both broken versions survive
    assert len(rejected) == 2


def test_lint_clean_artifact_takes_the_normal_judge_path(monkeypatch, cache_dir) -> None:
    """A lint-clean provisional is NOT short-circuited: the LLM judge still runs and promotes it."""
    judged: list = []

    def judge(_jm, _mo, _co, _art, **_k):
        judged.append(True)
        return {"score": 91.0, "critical": False, "weak": [], "notes": "clean"}

    out = _promote(monkeypatch, _provisional({"cards": ["base"]}), judge=judge,
                   regen=lambda *_a: ({"cards": ["alt"]}, _OPUS, 1, False))
    assert judged == [True]  # lint passed → the judge ran exactly once
    assert out["status"] == store.CANONICAL
    assert out["provenance"]["validation"]["score"] == 91.0
