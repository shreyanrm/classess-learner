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


# --- compose: the type universe (guided-discovery + organic imageSpec) ------------------


def _valid_discovery() -> dict:
    """A guided-discovery spec that mirrors what Discovery.tsx's parser accepts."""
    return {
        "id": "d1",
        "title": "tip the balance",
        "stages": [
            {
                "visual": {
                    "marks": [
                        {"id": "beam", "shape": "line", "x": 28, "y": 30, "x2": 72, "y2": 30},
                        {"id": "load", "shape": "circle", "x": 70, "y": 40, "r": 4, "tone": "hue"},
                    ]
                },
                "interaction": {
                    "kind": "slide",
                    "prompt": "slide to add weight",
                    "min": 0,
                    "max": 10,
                    "from": 0,
                    "at": 6,
                    "unit": "kg",
                    "valueLabel": "{v} kg",
                    "bind": {"mark": "load", "prop": "r", "at": [3, 9]},
                },
                "reveal": "the balance tips until you match it",
                "caption": "whatever you add to one side, add to the other",
            }
        ],
    }


def _compose_spec(cards: list[dict]) -> dict:
    """A minimally valid compose spec (three cards + workbook + boss) to feed _verify_compose."""
    base = [
        {
            "kind": "text",
            "title": f"card {i}",
            "idea": "one idea",
            "interaction": {"kind": "tap", "prompt": "tap it"},
            "reveal": "there it is",
        }
        for i in range(1, 4)
    ]
    for i, extra in enumerate(cards):
        base[i] = {**base[i], **extra}
    items = [
        {"type": "mcq", "prompt": "p", "options": ["a", "b"], "answer": "a"},
        {"type": "fill", "prompt": "q ____", "answer": "x"},
        {"type": "mcq", "prompt": "r", "options": ["c", "d"], "answer": "c"},
    ]
    return {"cards": base, "workbook": items, "boss": items}


def test_verify_discovery_mirrors_client_contract() -> None:
    from classess_gateway.plexus.engines import _verify_discovery

    ok = _verify_discovery(_valid_discovery())
    assert ok is not None
    stage = ok["stages"][0]
    assert {m["id"] for m in stage["visual"]["marks"]} == {"beam", "load"}
    assert stage["interaction"]["kind"] == "slide"

    # a tap whose target is not among the marks is refused (id-integrity, like the client)
    bad_target = _valid_discovery()
    bad_target["stages"][0]["interaction"] = {
        "kind": "tap",
        "prompt": "tap",
        "targets": ["ghost"],
    }
    assert _verify_discovery(bad_target) is None

    # empty marks, a slide with min >= max, and >6 stages are all refused
    no_marks = {"stages": [{"visual": {"marks": []}, "reveal": "r", "caption": "c"}]}
    assert _verify_discovery(no_marks) is None
    bad_slide = _valid_discovery()
    bad_slide["stages"][0]["interaction"]["min"] = 10
    bad_slide["stages"][0]["interaction"]["max"] = 0
    assert _verify_discovery(bad_slide) is None
    too_many = {"stages": _valid_discovery()["stages"] * 7, "id": "d", "title": "t"}
    assert _verify_discovery(too_many) is None


def test_compose_keeps_valid_discovery_and_drops_malformed() -> None:
    from classess_gateway.plexus.engines import _verify_compose

    spec = _compose_spec(
        [
            {"kind": "sim", "discovery": _valid_discovery()},  # card 1: valid discovery kept
            {"kind": "text", "discovery": {"stages": [{"junk": True}]}},  # card 2: dropped
        ]
    )
    out = _verify_compose(spec, "balance", "core")
    assert out is not None
    assert "discovery" in out["cards"][0] and out["cards"][0]["discovery"]["stages"]
    assert "discovery" not in out["cards"][1]  # malformed dropped — the card still teaches
    assert len(out["cards"]) == 3  # a bad discovery never fails the whole course


def test_compose_emits_image_spec_for_organic_visual() -> None:
    from classess_gateway.plexus.engines import _verify_compose, _verify_image_spec

    assert _verify_image_spec({"subject": "a plant cell", "caption": "labelled"}) == {
        "subject": "a plant cell",
        "caption": "labelled",
    }
    assert _verify_image_spec({"subject": "   "}) is None
    assert _verify_image_spec("plant cell") is None

    spec = _compose_spec([{"kind": "diagram", "imageSpec": {"subject": "the human eye"}}])
    out = _verify_compose(spec, "the eye", "core")
    assert out is not None
    assert out["cards"][0]["imageSpec"] == {"subject": "the human eye"}


# --- compose: the FULL type universe preserved through the verifier ----------------------


def _valid_activities() -> dict:
    """One valid spec per rich activity field — mirrors each client parser's accept shape."""
    return {
        "perturbation": {
            "id": "p1",
            "title": "break ohm",
            "law": "I = V / R",
            "param": {
                "id": "R",
                "label": "resistance",
                "min": 0,
                "max": 50,
                "from": 25,
                "unit": "Ω",
            },
            "output": {"label": "current", "expr": "12 / R", "unit": "A"},
            "breakpoint": {
                "at": 0,
                "approach": "below",
                "assumption": "wires are ideal",
                "revelation": "real wires carry internal resistance",
            },
        },
        "whatIf": {
            "id": "w1",
            "title": "ladder",
            "problem": "a ladder rises {h} m",
            "values": [
                {"id": "h", "label": "height", "value": 10, "min": 1, "max": 30, "unit": "m"}
            ],
            "scene": {
                "marks": [{"id": "m1", "shape": "line", "x": 10, "y": 10, "x2": 50, "y2": 50}]
            },
            "solve": [{"id": "s1", "label": "double it", "expr": "h * 2"}],
        },
        "compare": {
            "id": "cmp",
            "title": "cells",
            "left": {
                "label": "animal",
                "marks": [{"id": "a1", "shape": "circle", "x": 30, "y": 30, "r": 10}],
            },
            "right": {
                "label": "plant",
                "marks": [{"id": "b1", "shape": "rect", "x": 30, "y": 30, "w": 20, "h": 20}],
            },
            "links": [
                {
                    "id": "l1",
                    "left": "a1",
                    "right": "b1",
                    "note": "both hold a nucleus",
                    "kind": "same",
                }
            ],
        },
        "conceptMap": {
            "id": "cm",
            "title": "map",
            "nodes": [{"id": "n1", "label": "acids"}, {"id": "n2", "label": "bases"}],
            "edges": [{"from": "n1", "to": "n2", "label": "neutralise"}],
        },
        "workbook": {
            "id": "wb",
            "title": "order it",
            "items": [
                {
                    "id": "i1",
                    "kind": "order",
                    "prompt": "order the steps",
                    "steps": ["first", "then", "last"],
                }
            ],
        },
        "flashcards": {
            "id": "fc",
            "title": "deck",
            "cards": [{"id": "c1", "front": "H2O?", "back": "water"}],
        },
        "derivation": {
            "id": "d1",
            "formula": "(a+b)^2",
            "label": "the identity",
            "steps": [{"expr": "a^2 + 2ab + b^2", "note": "expand the square"}],
        },
        "wordProblem": {
            "id": "wp",
            "title": "trip",
            "problem": "a car covers 120 km at 60 km/h",
            "given": ["distance 120 km", "speed 60 km/h"],
            "find": "the time taken",
            "plan": ["divide distance by speed"],
            "solve": [{"expr": "120 / 60", "note": "time is distance over speed"}],
            "answer": "2 hours",
        },
        "podcast": {
            "id": "pc",
            "title": "revision",
            "chapters": [
                {
                    "id": "ch1",
                    "title": "intro",
                    "script": "a calm walk back through acids and bases",
                }
            ],
        },
        "arcade": {
            "id": "ar",
            "title": "catch it",
            "game": "catch",
            "rounds": [{"id": "r1", "prompt": "2 + 2", "answer": "4", "distractors": ["3", "5"]}],
        },
    }


def test_compose_preserves_every_rich_activity_field() -> None:
    """The verifier orchestrates the full type universe: every valid card activity survives to the
    client verbatim; a malformed one is dropped, never the card (fix, 2026-07-07)."""
    from classess_gateway.plexus.engines import _CARD_ACTIVITIES, _verify_compose

    activities = _valid_activities()
    assert set(activities) == set(
        _CARD_ACTIVITIES
    )  # the test covers every field the verifier gates
    spec = _compose_spec(
        [
            {"kind": "sim", **activities},  # card 0: all ten valid activities preserved
            {
                "kind": "text",
                "perturbation": {"law": "x", "param": {}},
            },  # card 1: malformed → dropped
        ]
    )
    out = _verify_compose(spec, "acids and bases", "core")
    assert out is not None
    assert len(out["cards"]) == 3
    for field in _CARD_ACTIVITIES:
        assert out["cards"][0][field] == activities[field], f"{field} must survive verbatim"
    assert "perturbation" not in out["cards"][1]  # malformed dropped — the card still teaches


@pytest.mark.parametrize(
    "field,mangle",
    [
        ("whatIf", lambda s: {**s, "values": []}),  # no values
        (
            "compare",
            lambda s: {**s, "links": [{"id": "x", "left": "ghost", "right": "b1", "note": "n"}]},
        ),
        ("conceptMap", lambda s: {**s, "nodes": s["nodes"][:1]}),  # <2 nodes
        (
            "workbook",
            lambda s: {**s, "items": [{"kind": "order", "prompt": "p", "steps": ["only one"]}]},
        ),
        ("arcade", lambda s: {**s, "rounds": [{"prompt": "p", "answer": "a", "distractors": []}]}),
        ("derivation", lambda s: {**s, "steps": []}),
    ],
)
def test_compose_drops_malformed_activity_but_keeps_card(field: str, mangle) -> None:
    from classess_gateway.plexus.engines import _verify_compose

    bad = mangle(_valid_activities()[field])
    out = _verify_compose(_compose_spec([{field: bad}]), "topic", "core")
    assert out is not None and len(out["cards"]) == 3
    assert field not in out["cards"][0]  # dropped, but the card and course stand


def test_verify_video_has_no_upper_duration_cap() -> None:
    """Video beats carry no upper duration cap — length serves understanding (fix, 2026-07-07)."""
    long_scene = {
        "scenes": [
            {
                "id": "s1",
                "durationMs": 10_000_000,
                "narration": "one long, unhurried beat",
                "visual": {
                    "kind": "svg",
                    "payload": '<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>',
                },
            }
        ]
    }
    out = _verify_video(long_scene)
    assert out is not None and out["scenes"][0]["durationMs"] == 10_000_000
    # a non-positive duration is still refused
    bad = {
        "scenes": [
            {
                "id": "s1",
                "durationMs": 0,
                "narration": "x",
                "visual": {
                    "kind": "svg",
                    "payload": '<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>',
                },
            }
        ]
    }
    assert _verify_video(bad) is None


def test_seed_compose_teaches_via_guided_discovery() -> None:
    """Guided-discovery is the DEFAULT format — the honest floor demonstrates it too, so the shell
    is exercised in mock mode, not only reachable through a live model."""
    out = invoke("engine.compose", concept="linear equations").output["artifact"]
    discovery_cards = [c for c in out["cards"] if "discovery" in c]
    assert discovery_cards, "the seed course must carry at least one guided-discovery card"
    stage = discovery_cards[0]["discovery"]["stages"][0]
    ids = {m["id"] for m in stage["visual"]["marks"]}
    inter = stage["interaction"]
    # the seed's own discovery obeys the id-integrity law the verifier enforces
    if inter["kind"] == "slide" and "bind" in inter:
        assert inter["bind"]["mark"] in ids


def test_image_raster_seam_wraps_gemini_result(monkeypatch) -> None:
    """engine.diagram's raster path (the Nano Banana seam) wraps a Gemini image as inline SVG."""
    from classess_gateway.plexus import engines, image

    monkeypatch.setattr(
        image,
        "generate_image",
        lambda concept, difficulty="core": {
            "status": "ready",
            "mime": "image/png",
            "b64": "AAAA",
            "provenance": {},
        },
    )
    svg = engines._raster_diagram("a plant cell", "core")
    assert svg is not None and svg.startswith("<svg") and "<image" in svg
    assert "data:image/png;base64,AAAA" in svg
    # a refusal (unavailable) yields no raster — the caller falls through to the SVG path
    monkeypatch.setattr(image, "generate_image", lambda *a, **k: {"status": "unavailable"})
    assert engines._raster_diagram("a plant cell", "core") is None


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


# --- simulate: topic-aware seed + retry (fix, 2026-07-07) -------------------------------


def test_seed_sim_is_topic_aware_and_never_wrong_subject() -> None:
    from classess_gateway.plexus.engines import _seed_sim

    assert _seed_sim("Ohm's law and circuits")["formula"] == "V = I*R"
    assert _seed_sim("speed, distance and time")["formula"] == "d = v*t"
    assert _seed_sim("Newton's force and mass")["formula"] == "F = m*a"
    # an unrecognised (e.g. biology) concept NEVER gets a wrong-subject law — a neutral relationship
    bio = _seed_sim("photosynthesis in plants")
    assert bio["formula"] == "y = k*x"
    # every seed is CAS-verifiable by construction (so the always-verify floor never fails)
    for concept in ("ohm's law", "speed", "force", "photosynthesis"):
        assert _verify_sim(_seed_sim(concept)) is not None


_BAD_SIM = '{"formula":"V equals I times R, roughly"}'
_GOOD_SIM = (
    '{"params":[{"name":"I","min":0,"max":5,"default":2,"unit":"A"}],'
    '"formula":"V = 2*I","outputs":["V"],"layout":"sliders-left"}'
)


def test_generate_sim_live_retries_once_feeding_the_verifier_reason(monkeypatch) -> None:
    from classess_gateway.plexus import engines

    drafts = iter([_BAD_SIM, _GOOD_SIM])
    seen: list[str] = []

    def fake(model, modality, user, fbs):  # noqa: ANN001
        seen.append(user)
        return next(drafts), 5

    monkeypatch.setattr(engines, "_complete", fake)
    artifact, model_used, tokens = engines._generate_sim_live(
        "ohm's law", "core", "m", (), "Concept: ohm"
    )
    parse_equation(artifact["formula"])  # the retry produced a CAS-valid formula
    assert len(seen) == 2  # drafted once, then retried once
    assert "did NOT pass the CAS verifier" in seen[1]  # the verifier reason was fed back
    assert tokens == 10


def test_generate_sim_live_raises_after_a_failed_retry(monkeypatch) -> None:
    """A sim that refuses even after the retry raises — the caller seeds a topic-aware floor rather
    than swallowing the refusal and serving a wrong sim."""
    from classess_gateway.plexus import engines

    monkeypatch.setattr(engines, "_complete", lambda *a, **k: (_BAD_SIM, 3))
    with pytest.raises(ValueError):
        engines._generate_sim_live("some mystery topic", "core", "m", (), "user")


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
        assert scene["durationMs"] > 0  # positive; no upper cap — length serves understanding
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


def test_wav_duration_ms_measures_beat_length() -> None:
    """The measured WAV length is the authoritative beat duration (MOTION.md §5)."""
    import base64

    from classess_gateway.plexus.media import _as_playable, wav_duration_ms

    # 24000 frames (2 bytes each) at 24 kHz mono == exactly one second
    wav = _as_playable("audio/pcm;rate=24000", base64.b64encode(b"\x00\x01" * 24000).decode())
    assert wav_duration_ms(wav["b64"]) == 1000
    assert wav_duration_ms("not a wav at all") is None


def test_video_attaches_per_scene_audio(monkeypatch) -> None:
    """Live video synthesizes narration PER SCENE and attaches {mime,b64,durationMs} to each —
    never one joined blob (MOTION.md §5 sync law)."""
    import base64

    from classess_gateway.plexus import engines
    from classess_gateway.plexus.media import _as_playable

    sonnet, fallbacks = _video_routing()
    _patch_complete(monkeypatch, {sonnet: _VALID_PLAN % "simple"})
    wav = _as_playable("audio/pcm;rate=24000", base64.b64encode(b"\x00\x01" * 24000).decode())
    monkeypatch.setattr(
        engines, "synthesize_narration", lambda text: dict(wav) if text.strip() else None
    )
    artifact, _model, _tokens, seeded = engines._generate_video_live(
        "sound waves", "core", sonnet, fallbacks, "user"
    )
    assert seeded is False
    assert artifact["scenes"]
    for scene in artifact["scenes"]:
        assert scene["audio"]["mime"] == "audio/wav"
        assert scene["audio"]["durationMs"] == 1000  # measured, not the plan's authored value


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


# --- board-shared cache: keyed board+grade+subject+chapter+topic+contentVersion ---------


def test_cache_key_widens_with_curriculum_scope() -> None:
    # empty scope reproduces the original concept x modality x difficulty digest exactly, so
    # every pre-scope warm file still hits.
    assert store.artifact_path("fractions", "compose", "core", {}) == store.artifact_path(
        "fractions", "compose", "core"
    )
    cbse = {"board": "CBSE", "grade": "7", "subject": "maths", "chapter": "c1"}
    icse = {**cbse, "board": "ICSE"}
    v2 = {**cbse, "contentVersion": "v2"}
    # same topic under a different board / contentVersion is a distinct verified artifact
    assert store.artifact_path("fractions", "compose", "core", cbse) != store.artifact_path(
        "fractions", "compose", "core", icse
    )
    assert store.artifact_path("fractions", "compose", "core", cbse) != store.artifact_path(
        "fractions", "compose", "core", v2
    )
    # identical scope is stable (a real cache hit)
    assert store.artifact_path("fractions", "compose", "core", dict(cbse)) == store.artifact_path(
        "fractions", "compose", "core", dict(cbse)
    )


def test_board_shared_hit_reuses_and_personalization_never_baked_in(cache_dir) -> None:
    scope = {"board": "CBSE", "grade": "7", "subject": "science", "chapter": "c3"}
    # miss: first learner on this coordinate pays; a personalization field rides in the payload
    first = invoke("engine.compose", concept="pressure", user="learner-a", **scope)
    # hit: a different learner on the same coordinate reuses the verified core, zero tokens
    second = invoke("engine.compose", concept="pressure", user="learner-b", **scope)
    assert first.output == second.output
    assert second.tokens == 0

    record = json.loads(store.artifact_path("pressure", "compose", "core", scope).read_text())
    # the cached artifact is the shared core — no user / personalization ever baked in
    blob = json.dumps(record)
    assert "learner-a" not in blob and "learner-b" not in blob
    assert "user" not in record and "user" not in record["artifact"]


def test_one_generation_per_user_gate() -> None:
    from classess_gateway.plexus import engines

    # simulate a generation already in flight for this user
    engines._gen_in_flight.add("busy-user")
    try:
        with pytest.raises(engines.GenerationBusy):
            invoke("engine.compose", concept="fractions", user="busy-user")
        # a different user is unaffected — one slot is per user, not global
        assert invoke("engine.compose", concept="fractions", user="free-user").output["verified"]
    finally:
        engines._gen_in_flight.discard("busy-user")
    # once the slot clears, the first user proceeds
    assert invoke("engine.compose", concept="algebra", user="busy-user").output["verified"]
    # the slot is always released after a generation — nothing leaks
    assert engines._gen_in_flight == set()


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
