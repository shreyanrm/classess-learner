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


def test_register_is_defensive() -> None:
    bag: dict[str, object] = {}
    image.register(bag)
    assert bag[image.ENGINE_NAME] is image.ENGINE

    class Reg:
        def __init__(self) -> None:
            self.seen: list[object] = []

        def register(self, engine: object) -> None:
            self.seen.append(engine)

    reg = Reg()
    image.register(reg)
    assert reg.seen == [image.ENGINE]

    image.register(None)  # must not raise
