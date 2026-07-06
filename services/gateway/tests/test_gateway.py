"""Gateway tests. Mock mode only — no provider is ever called and litellm is never imported."""

from __future__ import annotations

import pytest
from classess_gateway.app import (
    CapabilityRequest,
    ConsentDenied,
    Gateway,
    create_app,
)
from classess_gateway.cache import InMemoryCache
from classess_gateway.providers import MockProvider
from classess_gateway.registry import (
    EXPECTED_CAPABILITIES,
    ConsentTier,
    capabilities,
    policy,
    validate_registry,
)
from classess_gateway.routing import Track, models_for, resolve, track_separation_holds
from classess_gateway.telemetry import MetricsSink

ELEVATED_ONLY = ("archetype.classify", "peakcut.evaluate")


def make_gateway(sink: MetricsSink | None = None) -> Gateway:
    return Gateway(MockProvider(), InMemoryCache(), sink or MetricsSink())


def req(tier: ConsentTier, **payload: object) -> CapabilityRequest:
    return CapabilityRequest(consent_tier=tier, payload=dict(payload))


# --- registry completeness ------------------------------------------------------------
def test_registry_is_complete_and_valid() -> None:
    validate_registry()  # raises on a malformed registry
    assert set(capabilities()) == set(EXPECTED_CAPABILITIES)
    assert len(capabilities()) == 12
    for name in capabilities():
        assert policy(name).capability == name


# --- track separation invariant -------------------------------------------------------
def test_tracks_are_never_conflated() -> None:
    assert track_separation_holds()
    t1, t2 = models_for(Track.TRACK_1), models_for(Track.TRACK_2)
    assert set(t1) & set(t2) == set()
    t1_models = {m.provider_model for m in t1.values()}
    t2_models = {m.provider_model for m in t2.values()}
    assert t1_models & t2_models == set()
    # every policy's primary lives on its own declared track
    for name in capabilities():
        pol = policy(name)
        assert resolve(pol.primary, pol.track).track is pol.track
    # most routine teaching turns target track 2; frontier is reserved
    assert policy("vidya.turn").track is Track.TRACK_2
    assert policy("grade.attempt").track is Track.TRACK_2
    assert policy("verify.math").track is Track.TRACK_1


# --- consent-tier gating --------------------------------------------------------------
@pytest.mark.parametrize("cap", ELEVATED_ONLY)
def test_elevated_only_denied_under_un_elevated(cap: str) -> None:
    with pytest.raises(ConsentDenied):
        make_gateway().invoke(cap, req(ConsentTier.UN_ELEVATED))


@pytest.mark.parametrize("cap", ELEVATED_ONLY)
def test_elevated_only_allowed_when_elevated(cap: str) -> None:
    resp = make_gateway().invoke(cap, req(ConsentTier.ELEVATED))
    assert resp.capability == cap


def test_teaching_capabilities_work_under_both_tiers() -> None:
    gw = make_gateway()
    for tier in (ConsentTier.UN_ELEVATED, ConsentTier.ELEVATED):
        resp = gw.invoke("tutor.turn", req(tier))
        assert resp.output["handed_answer"] is False


# --- mock determinism + cache ---------------------------------------------------------
def test_mock_is_deterministic_across_fresh_gateways() -> None:
    r1 = make_gateway().invoke("grade.attempt", req(ConsentTier.UN_ELEVATED, attempt="2x=4"))
    r2 = make_gateway().invoke("grade.attempt", req(ConsentTier.UN_ELEVATED, attempt="2x=4"))
    assert r1.output == r2.output
    assert r1.model == r2.model
    assert r1.track == "track_2"
    assert r1.cache_hit is False and r2.cache_hit is False
    assert r1.tokens == r2.tokens


def test_cache_returns_hit_on_repeat() -> None:
    gw = make_gateway()
    first = gw.invoke("grade.attempt", req(ConsentTier.UN_ELEVATED, node="x"))
    second = gw.invoke("grade.attempt", req(ConsentTier.UN_ELEVATED, node="x"))
    assert first.cache_hit is False
    assert second.cache_hit is True
    assert second.output == first.output
    assert second.tokens == 0  # served from cache, no model call


def test_peakcut_never_caches() -> None:
    gw = make_gateway()
    first = gw.invoke("peakcut.evaluate", req(ConsentTier.ELEVATED, learner="a"))
    second = gw.invoke("peakcut.evaluate", req(ConsentTier.ELEVATED, learner="a"))
    assert first.cache_hit is False and second.cache_hit is False


# --- telemetry ------------------------------------------------------------------------
def test_telemetry_records_each_invocation() -> None:
    sink = MetricsSink()
    make_gateway(sink).invoke("vidya.turn", req(ConsentTier.UN_ELEVATED, t=1))
    assert len(sink.events) == 1
    ev = sink.events[0]
    assert ev.capability == "vidya.turn"
    assert ev.track == "track_2"
    assert ev.cache_hit is False
    assert ev.tokens > 0


# --- http surface ---------------------------------------------------------------------
def test_http_surface() -> None:
    from fastapi.testclient import TestClient

    client = TestClient(create_app(make_gateway()))

    assert client.get("/healthz").json()["status"] == "ok"

    caps = client.get("/v1/capabilities").json()
    assert len(caps) == 12

    denied = client.post(
        "/v1/capability/archetype.classify",
        json={"consent_tier": "un_elevated", "payload": {}},
    )
    assert denied.status_code == 403
    assert denied.json()["error"] == "consent_denied"

    ok = client.post(
        "/v1/capability/tutor.turn",
        json={"consent_tier": "un_elevated", "payload": {}},
    )
    assert ok.status_code == 200
    assert ok.json()["track"] == "track_2"

    unknown = client.post(
        "/v1/capability/nope.turn",
        json={"consent_tier": "un_elevated", "payload": {}},
    )
    assert unknown.status_code == 404


# --- voice ------------------------------------------------------------------------------
def test_voice_session_is_unavailable_without_a_key(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(create_app(make_gateway()))
    assert client.get("/v1/voice/session").json() == {"mode": "unavailable"}
