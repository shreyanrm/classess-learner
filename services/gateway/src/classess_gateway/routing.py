"""Two-track model configuration.

Track 1 and Track 2 live in two separate structures and are never merged:

- **Track 1** — external market LLMs (Claude / Gemini / OpenAI), chosen per capability
  for quality. The expensive tier, reserved for hard moments.
- **Track 2** — proprietary fine-tuned models and edge SLMs. The margin and the moat.
  Most routine turns target Track 2.

The strings on the right of each table are LiteLLM model identifiers used only when
``LLM_MODE=live``; they are tunable config. Track 2 identifiers are placeholders for the
fine-tuned / edge models wired in later.

Because the two tables are disjoint (see :func:`track_separation_holds`), a logical model
name resolves to exactly one track — which is what lets a Track 2 policy escalate to a
Track 1 fallback without the two structures ever being conflated.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Track(StrEnum):
    """The two model tracks. Never conflated at the gateway."""

    TRACK_1 = "track_1"
    TRACK_2 = "track_2"


@dataclass(frozen=True)
class ModelSpec:
    name: str
    provider_model: str
    track: Track


# --- Track 1: external market LLMs (quality per capability; the frontier tier) --------
# Routing law (owner, 2026-07-06): Fable 5 is the orchestrator of ALL generation — content,
# motion physics, effects specs. By complexity the generator is Opus (frontier.reason) or
# Sonnet (frontier.sonnet); Gemini and OpenAI engines are prompted by the same orchestrator
# (gemini.voice / nano banana imagery / openai.crosscheck as the second-model verifier).
_TRACK_1: dict[str, str] = {
    "frontier.reason": "anthropic/claude-opus-4-8",
    "frontier.fast": "anthropic/claude-haiku-4-5",
    "frontier.sonnet": "anthropic/claude-sonnet-5",
    "gemini.voice": "gemini/gemini-2.5-flash",
    "openai.crosscheck": "openai/gpt-4.1",
    # The cross-family escalation target for the content validation gate: a quality-failed
    # artifact regenerates on GPT-5.5 and the best-of is promoted to canonical. Track 1
    # (a frontier model), OPENAI_API_KEY. See plexus.validate.validate_and_promote.
    "openai.frontier": "openai/gpt-5.5",
}

# --- Track 2: proprietary fine-tuned + edge SLMs (the margin and the moat) ------------
# ponytail: placeholder identifiers; the trained fine-tuned / edge models route through a
# LiteLLM custom provider once they exist — swap the strings, the policies do not change.
_TRACK_2: dict[str, str] = {
    "slm.tutor": "classess/vidya-tutor-slm",
    "slm.grade": "classess/grade-slm",
    "slm.companion": "classess/parent-companion-slm",
    "edge.opener": "classess/opener-edge-slm",
    "slm.classify": "classess/archetype-slm",
    "slm.safety": "classess/safety-slm",
}


def models_for(track: Track) -> dict[str, ModelSpec]:
    raw = _TRACK_1 if track is Track.TRACK_1 else _TRACK_2
    return {name: ModelSpec(name, provider_model, track) for name, provider_model in raw.items()}


_REGISTRY: dict[Track, dict[str, ModelSpec]] = {
    Track.TRACK_1: models_for(Track.TRACK_1),
    Track.TRACK_2: models_for(Track.TRACK_2),
}


def resolve(name: str, track: Track) -> ModelSpec:
    """Resolve a logical model name within a single track. Raises if it is not there."""
    try:
        return _REGISTRY[track][name]
    except KeyError as exc:
        raise KeyError(f"model {name!r} is not registered on {track.value}") from exc


def resolve_any(name: str) -> ModelSpec:
    """Resolve a logical model name on whichever track holds it.

    Unambiguous because the two tracks are disjoint. Used for fallback chains, which may
    escalate from Track 2 to a Track 1 frontier model on a hard moment.
    """
    for track in (Track.TRACK_1, Track.TRACK_2):
        spec = _REGISTRY[track].get(name)
        if spec is not None:
            return spec
    raise KeyError(f"model {name!r} is not registered on any track")


def track_separation_holds() -> bool:
    """No logical name and no provider model string may appear on both tracks."""
    if set(_TRACK_1) & set(_TRACK_2):
        return False
    return not (set(_TRACK_1.values()) & set(_TRACK_2.values()))
