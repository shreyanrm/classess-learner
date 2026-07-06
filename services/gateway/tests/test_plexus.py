"""Plexus engine tests. Mock mode only — deterministic, keyless, no network."""

from __future__ import annotations

import json

import pytest
from classess_gateway.app import CapabilityRequest, Gateway
from classess_gateway.cache import InMemoryCache
from classess_gateway.plexus import store
from classess_gateway.plexus.engines import _verify_sim, _verify_video
from classess_gateway.plexus.sanitize import sanitize_svg
from classess_gateway.providers import MockProvider
from classess_gateway.registry import ConsentTier
from classess_gateway.telemetry import MetricsSink
from classess_verifier.cas import parse_equation

ENGINES = ("engine.compose", "engine.simulate", "engine.diagram", "engine.video")


@pytest.fixture(autouse=True)
def cache_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("PLEXUS_CACHE_DIR", str(tmp_path))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_AI_API_KEY", raising=False)
    return tmp_path


def invoke(capability: str, **payload: object):
    gw = Gateway(MockProvider(), InMemoryCache(), MetricsSink())
    return gw.invoke(
        capability, CapabilityRequest(consent_tier=ConsentTier.UN_ELEVATED, payload=dict(payload))
    )


# --- every engine: verified, attributed, provenance-stamped ----------------------------


@pytest.mark.parametrize("cap", ENGINES)
def test_engine_output_is_verified_with_provenance(cap: str) -> None:
    resp = invoke(cap, concept="ohm's law", difficulty="core")
    out = resp.output
    assert out["verified"] is True
    assert out["seeded"] is False
    assert out["provenance"] == {
        "engine": cap,
        "model": "mock",
        "prompt_version": store.PROMPT_VERSION,
    }
    assert out["concept"] == "ohm's law"
    assert out["modality"] == cap.removeprefix("engine.")
    assert out["difficulty"] == "core"
    assert resp.tokens > 0


@pytest.mark.parametrize("cap", ENGINES)
def test_engine_mock_is_deterministic(cap: str) -> None:
    a = invoke(cap, concept="photosynthesis")
    b = invoke(cap, concept="photosynthesis")
    assert a.output == b.output


# --- compose ----------------------------------------------------------------------------


def test_compose_outline_shape() -> None:
    out = invoke("engine.compose", topic="fractions").output
    cards = out["artifact"]["cards"]
    assert len(cards) >= 3
    for card in cards:
        assert card["title"] and card["idea"] and card["reveal"]
        assert card["interaction"]["kind"] in {"tap", "drag", "slide", "type"}
        assert card["interaction"]["prompt"]
    assert out["artifact"]["topic"] == "fractions"
    # the mini-workbook and the boss ship with the outline, answers verified structurally
    for pool in ("workbook", "boss"):
        items = out["artifact"][pool]
        assert len(items) == 3
        for item in items:
            assert item["type"] in {"mcq", "fill"}
            assert item["prompt"] and item["answer"]
            if item["type"] == "mcq":
                assert sum(1 for o in item["options"] if o == item["answer"]) == 1


def test_compose_refuses_ambiguous_or_missing_answers() -> None:
    from classess_gateway.plexus.engines import _verify_items

    # answer absent from options
    assert (
        _verify_items([{"type": "mcq", "prompt": "p", "options": ["a", "b"], "answer": "c"}] * 3)
        is None
    )
    # answer present twice (duplicate options are refused)
    assert (
        _verify_items(
            [{"type": "mcq", "prompt": "p", "options": ["a", "a", "b"], "answer": "a"}] * 3
        )
        is None
    )
    # fewer than three sound items
    assert _verify_items([{"type": "fill", "prompt": "p ____", "answer": "x"}] * 2) is None
    ok = _verify_items(
        [
            {"type": "mcq", "prompt": "p", "options": ["a", "b"], "answer": "a"},
            {"type": "fill", "prompt": "p ____", "answer": "x"},
            {"type": "mcq", "prompt": "q", "options": ["c", "d", "e"], "answer": "d"},
        ]
    )
    assert ok is not None and len(ok) == 3


# --- simulate ---------------------------------------------------------------------------


def test_simulate_spec_shape_and_cas_verified_formula() -> None:
    spec = invoke("engine.simulate", concept="ohm's law").output["artifact"]
    assert spec["outputs"]
    parse_equation(spec["formula"])  # raises if the formula is not CAS-parseable
    for p in spec["params"]:
        assert set(p) == {"name", "min", "max", "default", "unit"}
        assert p["min"] <= p["default"] <= p["max"]
    for bp in spec["breakpoints"]:
        assert bp["param"] in {p["name"] for p in spec["params"]}
        assert bp["why"]
    assert isinstance(spec["layout"], str)


def test_simulate_refuses_non_mathematical_formula() -> None:
    good = _verify_sim(
        {
            "params": [{"name": "I", "min": 0, "max": 5, "default": 2, "unit": "A"}],
            "formula": "V = 2*I",
            "outputs": ["V"],
            "layout": "sliders-left",
        }
    )
    assert good is not None
    for bad_formula in ("V equals I times R", "V = I*R = P/I", "hope for the best"):
        assert (
            _verify_sim(
                {
                    "params": [{"name": "I", "min": 0, "max": 5, "default": 2, "unit": "A"}],
                    "formula": bad_formula,
                    "outputs": ["V"],
                    "layout": "sliders-left",
                }
            )
            is None
        )
    # a formula over symbols that are neither params nor outputs is refused too
    assert (
        _verify_sim(
            {
                "params": [{"name": "I", "min": 0, "max": 5, "default": 2, "unit": "A"}],
                "formula": "V = I*R",
                "outputs": ["V"],
                "layout": "sliders-left",
            }
        )
        is None
    )


# --- diagram ----------------------------------------------------------------------------


def test_diagram_is_clean_inline_svg() -> None:
    svg = invoke("engine.diagram", concept="a simple circuit").output["artifact"]
    assert svg.startswith("<svg")
    assert 'viewBox="' in svg
    assert "script" not in svg.lower()
    assert "foreignobject" not in svg.lower()


# --- video ------------------------------------------------------------------------------


def test_video_scenes_shape_and_keyless_null_audio() -> None:
    artifact = invoke("engine.video", topic="gravity").output["artifact"]
    assert artifact["narrationAudio"] is None  # no GEMINI_API_KEY in tests
    scenes = artifact["scenes"]
    assert scenes
    for scene in scenes:
        assert scene["id"] and scene["narration"]
        assert 0 < scene["durationMs"] <= 120_000
        assert scene["visual"]["kind"] in {"svg", "sim", "diagram"}
        if scene["visual"]["kind"] in {"svg", "diagram"}:
            assert "<svg" in scene["visual"]["payload"]
        else:
            parse_equation(scene["visual"]["payload"]["formula"])


# --- video model routing law (owner, 2026-07-07) ----------------------------------------

_VALID_PLAN = (
    '{"complexity":"%s","scenes":[{"id":"s1","durationMs":5000,"narration":"watch it move",'
    '"visual":{"kind":"svg","payload":"<svg viewBox=\\"0 0 10 10\\">'
    '<rect width=\\"5\\" height=\\"5\\"/></svg>"}}]}'
)


def _video_routing():
    from classess_gateway.registry import policy
    from classess_gateway.routing import resolve, resolve_any

    pol = policy("engine.video")
    sonnet = resolve(pol.primary, pol.track).provider_model
    fallbacks = tuple(resolve_any(n).provider_model for n in pol.fallback)
    return sonnet, fallbacks


def test_video_defaults_to_sonnet_and_escalates_to_reason() -> None:
    """engine.video storyboards on the sonnet tier and escalates to the frontier reasoner."""
    from classess_gateway.registry import policy
    from classess_gateway.routing import resolve, resolve_any

    pol = policy("engine.video")
    assert pol.primary == "frontier.sonnet"
    assert resolve(pol.primary, pol.track).provider_model == "anthropic/claude-sonnet-5"
    # the escalation target is the FIRST fallback: the frontier reasoner (Opus)
    assert pol.fallback[0] == "frontier.reason"
    assert resolve_any(pol.fallback[0]).provider_model == "anthropic/claude-opus-4-8"


def _patch_complete(monkeypatch, plans: dict[str, str]) -> list[str]:
    """Route each engine _complete call to a canned scene-plan JSON, recording the models hit."""
    from classess_gateway.plexus import engines

    calls: list[str] = []

    def fake(model: str, modality: str, user: str, fbs):  # noqa: ANN001
        calls.append(model)
        return plans[model], 7

    monkeypatch.setattr(engines, "_complete", fake)
    return calls


def test_video_escalates_when_scene_plan_flags_complex(monkeypatch) -> None:
    from classess_gateway.plexus.engines import _generate_video_live

    sonnet, fallbacks = _video_routing()
    opus = fallbacks[0]
    # sonnet returns a perfectly valid plan, but it self-declares complex -> escalate anyway
    calls = _patch_complete(
        monkeypatch, {sonnet: _VALID_PLAN % "complex", opus: _VALID_PLAN % "simple"}
    )
    artifact, model_used, _tokens, seeded = _generate_video_live(
        "orbital motion", "core", sonnet, fallbacks, "user"
    )
    assert calls == [sonnet, opus]  # tried sonnet, then escalated to the reasoner
    assert model_used == opus
    assert seeded is False
    assert artifact["scenes"]


def test_video_escalates_when_sonnet_draft_fails_verification(monkeypatch) -> None:
    from classess_gateway.plexus.engines import _generate_video_live

    sonnet, fallbacks = _video_routing()
    opus = fallbacks[0]
    # sonnet returns junk (fails structural verification) -> escalate to the reasoner
    calls = _patch_complete(monkeypatch, {sonnet: '{"scenes":[]}', opus: _VALID_PLAN % "simple"})
    artifact, model_used, _tokens, _seeded = _generate_video_live(
        "orbital motion", "core", sonnet, fallbacks, "user"
    )
    assert calls == [sonnet, opus]
    assert model_used == opus
    assert artifact["scenes"]


def test_video_stays_on_sonnet_for_a_simple_valid_plan(monkeypatch) -> None:
    from classess_gateway.plexus.engines import _generate_video_live

    sonnet, fallbacks = _video_routing()
    # a simple, valid plan never escalates — the reasoner is reserved for when it is needed
    calls = _patch_complete(monkeypatch, {sonnet: _VALID_PLAN % "simple"})
    _artifact, model_used, _tokens, _seeded = _generate_video_live(
        "a falling apple", "core", sonnet, fallbacks, "user"
    )
    assert calls == [sonnet]
    assert model_used == sonnet


def test_pcm_narration_wrapped_as_playable_wav() -> None:
    """Gemini returns raw PCM; the browser needs a WAV container to play it."""
    import base64

    from classess_gateway.plexus.media import _as_playable

    pcm_b64 = base64.b64encode(b"\x00\x01" * 100).decode()
    out = _as_playable("audio/pcm;rate=24000", pcm_b64)
    assert out["mime"] == "audio/wav"
    assert base64.b64decode(out["b64"]).startswith(b"RIFF")
    # an already-containerised track passes through untouched
    passthrough = _as_playable("audio/mp3", "abc")
    assert passthrough == {"mime": "audio/mp3", "b64": "abc"}


def test_seed_video_is_genuinely_animated() -> None:
    from classess_gateway.plexus.engines import _seed_video

    scenes = _seed_video("photosynthesis")["scenes"]
    joined = " ".join(s["visual"]["payload"] for s in scenes)
    assert "<animate" in joined  # SMIL motion, not slideware


def test_video_rejects_scene_with_unsafe_svg() -> None:
    bad = {
        "scenes": [
            {
                "id": "s1",
                "durationMs": 5000,
                "narration": "look here",
                "visual": {"kind": "svg", "payload": "<svg><script>alert(1)</script></svg>"},
            }
        ]
    }
    assert _verify_video(bad) is None  # no viewBox and a script: refused


# --- file cache under content/cache/ ----------------------------------------------------


def test_artifact_cached_on_disk_keyed_by_concept_modality_difficulty(cache_dir) -> None:
    first = invoke("engine.compose", concept="fractions", difficulty="core")
    path = store.artifact_path("fractions", "compose", "core")
    assert path.exists()
    record = json.loads(path.read_text())
    assert record["verified"] is True
    assert record["provenance"]["engine"] == "engine.compose"
    assert record["provenance"]["prompt_version"] == store.PROMPT_VERSION

    # a fresh gateway (fresh in-memory cache) serves the warm file cache: zero tokens
    second = invoke("engine.compose", concept="fractions", difficulty="core")
    assert first.output == second.output
    assert second.tokens == 0

    # a different difficulty is a different artifact file
    invoke("engine.compose", concept="fractions", difficulty="stretch")
    assert store.artifact_path("fractions", "compose", "stretch").exists()
    assert store.artifact_path("fractions", "compose", "stretch") != path


# --- sanitizer ---------------------------------------------------------------------------


def test_sanitizer_strips_scripts_and_handlers() -> None:
    dirty = (
        '<svg viewBox="0 0 10 10" onload="steal()">'
        "<script>alert(1)</script>"
        "<foreignObject><body>x</body></foreignObject>"
        '<rect width="5" height="5" onclick="x()"/>'
        '<a href="https://evil.example"><text>go</text></a>'
        '<use href="#local"/>'
        "</svg>"
    )
    clean = sanitize_svg(dirty)
    assert clean is not None
    lowered = clean.lower()
    assert "<script" not in lowered
    assert "foreignobject" not in lowered
    assert "onload" not in lowered and "onclick" not in lowered
    assert "evil.example" not in clean
    assert 'href="#local"' in clean  # fragment refs survive


def test_sanitizer_requires_viewbox_and_svg_root() -> None:
    assert sanitize_svg("<svg><rect/></svg>") is None
    assert sanitize_svg('<div viewBox="0 0 1 1">hi</div>') is None
    assert sanitize_svg("plain prose, no markup") is None
    assert sanitize_svg("") is None


def test_sanitizer_blocks_doctype_and_entities() -> None:
    assert sanitize_svg('<!DOCTYPE svg [<!ENTITY x "y">]><svg viewBox="0 0 1 1"/>') is None


def test_sanitizer_allows_data_image_and_extracts_from_prose() -> None:
    wrapped = (
        "Here is the diagram you asked for:\n```svg\n"
        '<svg viewBox="0 0 4 4"><image href="data:image/png;base64,AAAA"/></svg>\n```'
    )
    clean = sanitize_svg(wrapped)
    assert clean is not None
    assert clean.startswith("<svg")
    assert "data:image/png" in clean
