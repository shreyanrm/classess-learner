"""Model providers.

``mock`` returns deterministic, capability-shaped responses and never touches a network
(this is the only mode tests run in). ``live`` routes through LiteLLM using provider keys
from the environment. LiteLLM is imported lazily inside the live provider so mock callers
never need it installed.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Protocol

# The six silent archetypes, mirrored from the contract vocabulary. Only computed under
# the elevated consent tier (the gateway enforces that before reaching a provider).
_ARCHETYPES = (
    "competitor",
    "mastery_seeker",
    "exam_anxious",
    "ritualist",
    "belonger",
    "dabbler",
)


@dataclass(frozen=True)
class ProviderResponse:
    output: dict[str, Any]
    tokens: int


class Provider(Protocol):
    def complete(
        self,
        *,
        provider_model: str,
        capability: str,
        payload: dict[str, Any],
        fallbacks: tuple[str, ...] = (),
    ) -> ProviderResponse: ...


def _seed(capability: str, payload: dict[str, Any]) -> int:
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return int(hashlib.sha256(f"{capability}\x00{body}".encode()).hexdigest(), 16)


def _shape(capability: str, seed: int) -> dict[str, Any]:
    """A deterministic, capability-shaped mock payload. Calm copy: no emoji, no hype."""
    flag = seed % 2 == 0
    if capability in {"tutor.turn", "vidya.turn", "parent.companion.turn"}:
        return {
            "message": f"mock {capability} response",
            "assistance_level": "hint",
            "grounded": True,
            "handed_answer": False,
        }
    if capability == "grade.attempt":
        return {"correct": flag, "feedback": "mock grading feedback"}
    if capability == "generate.opener":
        return {"opener": "mock opener line"}
    if capability == "verify.math":
        return {"verified": True, "method": "mock_cas"}
    if capability == "twin.query":
        return {"facts": ["mock recalled fact"]}
    if capability == "safety.moderate":
        return {"allow": True, "categories": []}
    if capability == "generate.digest":
        return {"summary": "mock digest summary"}
    if capability == "archetype.classify":
        return {"archetype": _ARCHETYPES[seed % len(_ARCHETYPES)], "confidence": 0.5}
    if capability == "peakcut.evaluate":
        return {"recommend_offer": flag, "reason": "mock evaluation"}
    return {"message": f"mock {capability} response"}


class MockProvider:
    def complete(
        self,
        *,
        provider_model: str,
        capability: str,
        payload: dict[str, Any],
        fallbacks: tuple[str, ...] = (),
    ) -> ProviderResponse:
        seed = _seed(capability, payload)
        return ProviderResponse(output=_shape(capability, seed), tokens=(seed % 500) + 1)


class LiveProvider:
    def complete(
        self,
        *,
        provider_model: str,
        capability: str,
        payload: dict[str, Any],
        fallbacks: tuple[str, ...] = (),
    ) -> ProviderResponse:
        import litellm  # lazy: mock mode and tests never import litellm

        messages = payload.get("messages")
        if not messages:
            prompt = payload.get("input") or json.dumps(payload, sort_keys=True)
            messages = [{"role": "user", "content": str(prompt)}]

        response = litellm.completion(
            model=provider_model,
            messages=messages,
            fallbacks=list(fallbacks) or None,
        )
        choice = response.choices[0]
        text = getattr(choice.message, "content", "") or ""
        usage = getattr(response, "usage", None)
        tokens = int(getattr(usage, "total_tokens", 0) or 0)
        return ProviderResponse(output={"capability": capability, "message": text}, tokens=tokens)


def build_provider(mode: str) -> Provider:
    if mode == "mock":
        return MockProvider()
    if mode == "live":
        return LiveProvider()
    raise ValueError(f"unknown LLM_MODE: {mode!r} (expected 'mock' or 'live')")
