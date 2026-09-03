"""engine.image — keyless-path tests (CI-safe, never touches the network).

The live Nano Banana path is proven separately against real Gemini; here we lock the
deterministic contract: keyless -> unavailable, empty concept -> unavailable, nothing
written on the keyless path, a cached artifact is served without a key, and prompt
composition / moderation / verification behave.
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

import pytest
from classess_gateway.plexus import image


@pytest.fixture(autouse=True)
def _isolate(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CLASSESS_IMAGE_CACHE_DIR", str(tmp_path))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_AI_API_KEY", raising=False)


def test_keyless_is_unavailable_and_writes_nothing(tmp_path: Path) -> None:
    assert image.generate_image("plant cell") == {"status": "unavailable"}
    assert not list(tmp_path.glob("*.json"))


def test_empty_concept_is_unavailable() -> None:
    assert image.generate_image("") == {"status": "unavailable"}
    assert image.generate_image("   ") == {"status": "unavailable"}


def test_cached_artifact_serves_without_a_key(tmp_path: Path) -> None:
    key = image._cache_key("plant cell", "core")
    entry = {"b64": "QUJD", "mime": "image/png", "provenance": {"engine": image.ENGINE_NAME}}
    (tmp_path / f"{key}.json").write_text(json.dumps(entry))
    served = image.generate_image("plant cell")
    assert served["status"] == "ready"
    assert served["b64"] == "QUJD"
    assert served["provenance"]["engine"] == image.ENGINE_NAME


def test_prompt_composition_and_moderation() -> None:
    prompt = image._compose_prompt("plant cell")
    assert prompt.startswith("plant cell") and prompt.endswith(image._PROMPT_STYLE)
    assert image._moderation_ok("plant cell", prompt) is True
    assert image._moderation_ok("  ", "  ") is False


def test_verification_rejects_trivial_payloads() -> None:
    assert image._valid_b64_png("QUJD") is False  # 3 bytes — a refusal, not an image
    assert image._valid_b64_png("not-base64!!") is False
    assert image._valid_b64_png(base64.b64encode(b"x" * 300).decode()) is True


def test_there_is_no_unwired_registry_seam() -> None:
    """The ENGINE descriptor and register() hook were deleted: nothing ever called them, and the
    one live caller (engines._raster_diagram) imports generate_image directly."""
    assert not hasattr(image, "ENGINE")
    assert not hasattr(image, "register")


def test_moderation_runs_the_real_child_safety_classifier() -> None:
    """Sweep regression: ``_moderation_ok`` was a stub that returned True for anything non-empty,
    so an image was the one artifact a learner could ask for in their own words and get back
    whole with no screen at all."""
    assert image._moderation_ok("the water cycle", image._compose_prompt("the water cycle"))
    for hostile in ("send nudes", "a bitch", "how to kill her"):
        assert not image._moderation_ok(hostile, image._compose_prompt(hostile)), hostile


def test_a_flagged_concept_never_generates_and_never_caches(tmp_path, monkeypatch) -> None:
    """Refusing after generating would still spend the key and still write the cache."""
    monkeypatch.setenv("CLASSESS_IMAGE_CACHE_DIR", str(tmp_path))
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-a-real-one")

    def _explode(*_a: object, **_k: object) -> None:
        raise AssertionError("a flagged concept must never reach the image API")

    monkeypatch.setattr(image, "_gemini_image", _explode)
    out = image.generate_image("send nudes", difficulty="core")
    assert out["status"] == "unavailable"
    assert not list(tmp_path.glob("*"))
