"""Render seam tests (task #27): the promote-to-canonical -> MP4 render queue hook, the gateway's
renderedUrl fill, and the Manim escalation rung. Mock mode only — no network, no keys, no Remotion.
The render worker + manim container are out-of-band/future infra; these cover the REAL seams (the
queue contract, the flag, the served URL), not the renderers."""

from __future__ import annotations

import base64
import json

import pytest
from classess_gateway.plexus import store, validate
from classess_gateway.plexus.validate import validate_and_promote


@pytest.fixture(autouse=True)
def cache_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("PLEXUS_CACHE_DIR", str(tmp_path))
    monkeypatch.delenv("RENDER_QUEUE_PATH", raising=False)
    return tmp_path


_CLEAN_SVG = '<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>'


def _video_record(svg=_CLEAN_SVG, *, model="anthropic/claude-opus-4-8"):
    return {
        "concept": "refraction of light",
        "modality": "video",
        "difficulty": "core",
        "verified": True,
        "seeded": False,
        "status": store.PROVISIONAL,
        "provenance": {"engine": "engine.video", "model": model, "prompt_version": "plexus-v4"},
        "artifact": {
            "scenes": [
                {
                    "id": "s1",
                    "durationMs": 5000,
                    "narration": "n",
                    "visual": {"kind": "svg", "payload": svg},
                }
            ],
            "narrationAudio": None,
        },
    }


def _promote_video(monkeypatch, record, *, score=92.0):
    monkeypatch.setattr(
        validate,
        "_judge",
        lambda *_a: {"score": score, "critical": False, "weak": [], "notes": "ok"},
    )
    return validate_and_promote(
        concept="refraction of light",
        modality="video",
        difficulty="core",
        scope={},
        record=record,
        judge_model="anthropic/claude-opus-4-8",
        escalation_model="openai/gpt-5.5",
    )


# --- the render-queue hook (task #27.1) -------------------------------------------------


def _queue_lines(cache_dir):
    q = cache_dir / "_render-queue.jsonl"
    return [json.loads(x) for x in q.read_text().splitlines() if x.strip()] if q.exists() else []


def test_promoting_a_video_enqueues_a_render_job(monkeypatch, cache_dir) -> None:
    out = _promote_video(monkeypatch, _video_record())
    assert out["status"] == store.CANONICAL
    jobs = _queue_lines(cache_dir)
    assert len(jobs) == 1
    job = jobs[0]
    assert job["artifact"].endswith(".json")
    assert job["artifact"] == str(store.artifact_path("refraction of light", "video", "core", {}))
    assert job["sceneSpecHash"] and job["out"] is None and job["enqueuedAt"]


def test_render_enqueue_is_idempotent_per_scene_spec(monkeypatch, cache_dir) -> None:
    _promote_video(monkeypatch, _video_record())
    _promote_video(monkeypatch, _video_record())  # same film promoted twice
    assert len(_queue_lines(cache_dir)) == 1  # no duplicate pending job


def test_a_changed_film_enqueues_a_second_job(monkeypatch, cache_dir) -> None:
    _promote_video(monkeypatch, _video_record())
    other = _CLEAN_SVG.replace('width="5"', 'width="7"')
    _promote_video(monkeypatch, _video_record(svg=other))
    assert len({j["sceneSpecHash"] for j in _queue_lines(cache_dir)}) == 2


def test_compose_promotion_does_not_enqueue_a_render(monkeypatch, cache_dir) -> None:
    record = {
        "concept": "fractions",
        "modality": "compose",
        "difficulty": "core",
        "verified": True,
        "seeded": False,
        "status": store.PROVISIONAL,
        "provenance": {"engine": "engine.compose", "model": "anthropic/claude-opus-4-8"},
        "artifact": {"cards": ["base"]},
    }
    monkeypatch.setattr(
        validate, "_judge", lambda *_a: {"score": 90.0, "critical": False, "weak": [], "notes": ""}
    )
    validate_and_promote(
        concept="fractions",
        modality="compose",
        difficulty="core",
        scope={},
        record=record,
        judge_model="anthropic/claude-opus-4-8",
        escalation_model="openai/gpt-5.5",
    )
    assert _queue_lines(cache_dir) == []


def test_seeded_video_is_not_enqueued(cache_dir) -> None:
    """A honest-floor seed promoted as canonical is a placeholder, not worth a render."""
    validate._maybe_enqueue_render(
        "refraction of light",
        "video",
        "core",
        {},
        {"seeded": True, "artifact": {"scenes": []}},
    )
    assert _queue_lines(cache_dir) == []


def test_render_enqueue_never_blocks_promotion(monkeypatch, cache_dir) -> None:
    """A queue write failure must not break the promotion (best-effort seam)."""
    blocker = cache_dir / "blocker"
    blocker.write_text("i am a file, not a dir")
    # mkdir under a file -> the enqueue fails; the promotion must still succeed
    monkeypatch.setenv("RENDER_QUEUE_PATH", str(blocker / "queue.jsonl"))
    out = _promote_video(monkeypatch, _video_record())
    assert out["status"] == store.CANONICAL  # promotion still succeeded


# --- the gateway renderedUrl fill (task #27.3) -----------------------------------------


def test_rendered_url_is_none_without_a_manifest(cache_dir) -> None:
    from classess_gateway.plexus import engines

    assert engines._rendered_url("refraction of light", "video", "core", {}) is None
    assert engines._rendered_url("fractions", "compose", "core", {}) is None  # never for non-video


def test_rendered_url_inlines_the_mp4_when_a_manifest_exists(cache_dir) -> None:
    from classess_gateway.plexus import engines

    base = store.artifact_path("refraction of light", "video", "core", {})
    base.parent.mkdir(parents=True, exist_ok=True)
    base.write_text("{}")  # the canonical artifact file
    mp4_name = f"{base.stem}.abc123.mp4"
    (base.parent / mp4_name).write_bytes(b"\x00\x01MP4BYTES")
    (base.parent / f"{base.stem}.abc123.render-manifest.json").write_text(
        json.dumps({"sceneSpecHash": "abc123", "output": mp4_name})
    )
    url = engines._rendered_url("refraction of light", "video", "core", {})
    assert url is not None and url.startswith("data:video/mp4;base64,")
    assert base64.b64decode(url.split(",", 1)[1]) == b"\x00\x01MP4BYTES"


def test_public_attaches_rendered_url_to_the_served_video_artifact() -> None:
    from classess_gateway.plexus import engines

    record = {
        "concept": "c",
        "modality": "video",
        "difficulty": "core",
        "verified": True,
        "provenance": {"model": "m"},
        "artifact": {"scenes": [{"id": "s1"}]},
    }
    served = engines._public(record, "data:video/mp4;base64,AAAA")
    assert served["artifact"]["renderedUrl"] == "data:video/mp4;base64,AAAA"
    assert served["artifact"]["scenes"] == [{"id": "s1"}]  # live fallback fields ride along
    assert "renderedUrl" not in record["artifact"]  # the cached record is NOT mutated


# --- the Manim escalation rung (task #27.4) --------------------------------------------


@pytest.mark.parametrize(
    "plan",
    [
        {"scenes": [{"narration": "we morph the equation term by term"}]},
        {"scenes": [{"narration": "rotate the cube in 3D to see each face"}]},
        {"title": "a geometric proof of the theorem", "scenes": []},
        {"complexity": "manim", "scenes": []},
        {"needsManim": True, "scenes": []},
    ],
)
def test_needs_manim_flags_complex_plans(plan) -> None:
    from classess_gateway.plexus.manim_rung import needs_manim

    assert needs_manim(plan) is True


@pytest.mark.parametrize(
    "plan",
    [
        {"scenes": [{"narration": "a bar grows to show the value"}]},
        {"scenes": [{"narration": "tap the triangle to reveal its area"}]},
        {"scenes": []},
        "not a plan",
        None,
    ],
)
def test_needs_manim_leaves_simple_plans_on_svg(plan) -> None:
    from classess_gateway.plexus.manim_rung import needs_manim

    assert needs_manim(plan) is False


def test_enqueue_manim_appends_to_the_manim_queue(cache_dir, monkeypatch) -> None:
    monkeypatch.delenv("MANIM_QUEUE_PATH", raising=False)
    from classess_gateway.plexus.manim_rung import enqueue_manim

    path = enqueue_manim({"artifact": "/x.json", "reason": "proof choreography"})
    assert path == cache_dir / "_manim-queue.jsonl"
    rec = json.loads(path.read_text().splitlines()[0])
    assert rec["artifact"] == "/x.json"
    assert rec["reason"] == "proof choreography"
    assert rec["enqueuedAt"]
