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
    # vidya.turn never reaches here — MockProvider routes it to vidya.mock_vidya_turn
    if capability in {"tutor.turn", "parent.companion.turn"}:
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
    if capability == "generate.course":
        return {
            "title": "Your course",
            "estMinutes": 90,
            "nodes": [
                {"id": "n1", "name": "Getting oriented", "blurb": "Where we start and why."},
                {"id": "n2", "name": "The core idea", "blurb": "The concept the rest rests on."},
                {"id": "n3", "name": "Working it out", "blurb": "Try it step by step, unhurried."},
                {"id": "n4", "name": "Common snags", "blurb": "Where learners slip up."},
                {"id": "n5", "name": "Putting it together", "blurb": "Bring the pieces together."},
            ],
        }
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
        if capability.startswith("engine."):
            from classess_gateway.plexus import run_engine

            return run_engine(
                capability=capability, payload=payload, provider_model=provider_model, live=False
            )
        seed = _seed(capability, payload)
        if capability == "vidya.turn":
            # her mock brain classifies by keyword into the five paths — works keyless
            from classess_gateway.vidya import mock_vidya_turn

            return ProviderResponse(output=mock_vidya_turn(payload), tokens=(seed % 500) + 1)
        return ProviderResponse(output=_shape(capability, seed), tokens=(seed % 500) + 1)


_COURSE_SYSTEM = (
    "You are a curriculum designer for Classess, an Indian K-12 learning app. Given a learner's "
    "free-text goal, design a short course as an ordered path of concept nodes. Order nodes by "
    "prerequisite: each builds on the ones before it. Use Indian middle/high-school framing where "
    "it fits (NCERT-style topics, class levels, familiar examples). Keep names and blurbs calm, "
    "plain, and encouraging: no emoji, no hype.\n\n"
    "Reply with strict JSON only, no prose outside it:\n"
    '{"title":"<short course title>","estMinutes":<integer total minutes>,'
    '"nodes":[{"id":"n1","name":"<concept>","blurb":"<one calm sentence>"}, ...]}\n'
    "Include 6 to 10 nodes with ids n1, n2, ... in prerequisite order."
)


def _generate_course(
    *,
    provider_model: str,
    payload: dict[str, Any],
    fallbacks: tuple[str, ...] = (),
) -> ProviderResponse:
    """Generate a course path (title, estMinutes, ordered nodes) from a free-text goal."""
    import litellm

    # Claude 5 family accepts only default sampling; drop unsupported params instead of erroring.
    litellm.drop_params = True

    from classess_gateway.vidya import _extract_json  # same robust code-fence/JSON parser

    goal = str(payload.get("goal") or "").strip() or "learn the basics of this topic"

    response = litellm.completion(
        model=provider_model,
        messages=[
            {"role": "system", "content": _COURSE_SYSTEM},
            {"role": "user", "content": f"Learner's goal: {goal}"},
        ],
        fallbacks=list(fallbacks) or None,
        max_tokens=1200,
        temperature=0.4,
    )
    text = response.choices[0].message.content or ""
    parsed = _extract_json(text)

    # Keep camelCase keys the frontend reads directly; coerce shapes defensively.
    nodes = parsed.get("nodes")
    if not isinstance(nodes, list):
        nodes = []
    parsed = {
        "title": str(parsed.get("title") or "Your course"),
        "estMinutes": parsed.get("estMinutes"),
        "nodes": nodes,
    }
    usage = getattr(response, "usage", None)
    tokens = int(getattr(usage, "total_tokens", 0) or 0)
    return ProviderResponse(output=parsed, tokens=tokens)


class LiveProvider:
    def complete(
        self,
        *,
        provider_model: str,
        capability: str,
        payload: dict[str, Any],
        fallbacks: tuple[str, ...] = (),
    ) -> ProviderResponse:
        # Vidya's turn is capability-specific: grounded by the verifier and returning say + actions.
        if capability == "vidya.turn":
            from classess_gateway.vidya import run_vidya_turn

            output, tokens = run_vidya_turn(
                provider_model=provider_model, payload=payload, fallbacks=fallbacks
            )
            return ProviderResponse(output=output, tokens=tokens)

        if capability == "generate.course":
            return _generate_course(
                provider_model=provider_model, payload=payload, fallbacks=fallbacks
            )

        if capability.startswith("engine."):
            from classess_gateway.plexus import run_engine

            return run_engine(
                capability=capability,
                payload=payload,
                provider_model=provider_model,
                live=True,
                fallbacks=fallbacks,
            )

        import litellm  # lazy: mock mode and tests never import litellm

        litellm.drop_params = True

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
