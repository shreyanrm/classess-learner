"""Model routing: the owner's tiers, and the two tracks.

**Tiers (owner directive, WOBO-PLAN §9).** In product the brain routes by *tier*, never by
name. A feature names a job; :mod:`registry` maps the job to a tier; the tier resolves to a
provider id here and nowhere else. Generation runs on the GPT-5.6 family, the latest Claude
models cross-check and carry the conversation, Gemini stays as it is for voice and imagery,
and the cheap models take everything basic. Every text chain ends at Gemini, so no single
provider's outage or empty balance can leave a learner with no answer at all:

===========  ==================================  ==================================
tier         primary                             fallback
===========  ==================================  ==================================
``tiny``     ``openai/gpt-5.6-luna``             ``anthropic/claude-haiku-4-5``
``turn``     ``anthropic/claude-sonnet-5``       ``openai/gpt-5.6-terra``
``generate`` ``openai/gpt-5.6-terra``            ``anthropic/claude-opus-5``
``reason``   ``openai/gpt-5.6-sol``              ``anthropic/claude-opus-5``
``verify``   ``anthropic/claude-opus-5``         ``openai/gpt-5.6-terra``
``voice``    Gemini 2.5 Flash (unchanged)        —
``image``    Gemini 2.5 Flash Image (unchanged)  —
===========  ==================================  ==================================

**The cost rule (owner, 2026-09-02): generation goes to the cheapest model that passes
verification and escalates only on failure.** Terra by default for every board plan and
lesson; a verifier or second-opinion rejection escalates ONE rung (``generate`` → ``reason``)
through :func:`escalate`, which logs the escalation and its reason on the telemetry logger so
the hard list stays honest. Every fallback chain crosses providers, so a second opinion is
always the other mind.

Retired from the router (owner, 2026-09-02): Claude Opus 4.8, GPT-5.5, GPT-4.1.
``claude-fable-5-1`` is available on the key but reserved — it is not in the product router
until a job proves it needs it.

**Tracks.** Track 1 and Track 2 live in two separate structures and are never merged:

- **Track 1** — external market LLMs (Claude / Gemini / OpenAI). Every tier above is Track 1.
- **Track 2** — proprietary fine-tuned models and edge SLMs. The margin and the moat. The
  slots are declared but unfilled, so no capability targets Track 2 yet: a placeholder id is
  not a model, and routing a live learner at one bought an error and a failover on every call.
  When a trained SLM lands, its capability's policy moves to Track 2 and the tier stays as the
  escalation chain behind it.

The strings on the right of each table are LiteLLM model identifiers used only when
``LLM_MODE=live``; they are tunable config.

Because the two tables are disjoint (see :func:`track_separation_holds`), a logical model
name resolves to exactly one track — which is what lets a Track 2 policy escalate to a
Track 1 fallback without the two structures ever being conflated.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import StrEnum

logger = logging.getLogger("wobo.gateway.routing")
# An escalation is a COST event, so it is logged on the telemetry logger — the same JSON stream
# the cost lines land in, not a second place to look. (Importing the telemetry MODULE here would
# be a cycle: telemetry -> registry -> routing.)
_telemetry = logging.getLogger("wobo.gateway.telemetry")


class Track(StrEnum):
    """The two model tracks. Never conflated at the gateway."""

    TRACK_1 = "track_1"
    TRACK_2 = "track_2"


class Tier(StrEnum):
    """The owner's routing tiers. A capability declares one; the ids live in this module."""

    TINY = "tiny"
    TURN = "turn"
    GENERATE = "generate"
    REASON = "reason"
    VERIFY = "verify"
    VOICE = "voice"
    IMAGE = "image"


@dataclass(frozen=True)
class ModelSpec:
    name: str
    provider_model: str
    track: Track


# --- Track 1: the owner's tiers (external market LLMs) --------------------------------
_TRACK_1: dict[str, str] = {
    "tier.tiny": "openai/gpt-5.6-luna",
    "tier.tiny.fallback": "anthropic/claude-haiku-4-5",
    "tier.turn": "anthropic/claude-sonnet-5",
    "tier.generate": "openai/gpt-5.6-terra",
    "tier.reason": "openai/gpt-5.6-sol",
    "tier.verify": "anthropic/claude-opus-5",
    # Voice and imagery are unchanged by the tier directive. The live seams pin their own
    # Gemini ids (voice.VOICE_MODEL, plexus.media.TTS_MODEL, plexus.image.MODEL); these two
    # entries are the routing law those seams answer to.
    "tier.voice": "gemini/gemini-2.5-flash",
    "tier.image": "gemini/gemini-2.5-flash-image",
    # A THIRD provider on every text chain. Two is not redundancy when one account can run
    # out of credit and the other can refuse a parameter: on 2026-09-04 both happened at once
    # and a learner got nothing. Gemini already carries voice and imagery on its own key, so
    # it costs nothing new to let it answer when the other two cannot.
    "tier.text.last": "gemini/gemini-2.5-flash",
    # --- legacy logical names, kept as ALIASES so the plexus engines keep resolving ------
    # engines._spawn_validation asks for these two by name. They are aliases, not a second
    # opinion about routing: the JUDGE of a generated artifact is the verify tier (Opus 5 —
    # always the other provider from the GPT-5.6 generator), and the REBUILD target of a
    # judge rejection is one rung up from generate, which is the reason tier (Sol).
    "frontier.reason": "anthropic/claude-opus-5",
    "openai.frontier": "openai/gpt-5.6-sol",
}

# --- Track 2: proprietary fine-tuned + edge SLMs (the margin and the moat) ------------
# ponytail: placeholder identifiers; the trained fine-tuned / edge models route through a
# LiteLLM custom provider once they exist — swap the strings, the policies do not change.
# Nothing routes here today (see the module docstring).
_TRACK_2: dict[str, str] = {
    "slm.tutor": "wobo/tutor-slm",
    "slm.grade": "wobo/grade-slm",
    "slm.companion": "wobo/parent-companion-slm",
    "edge.opener": "wobo/opener-edge-slm",
    "slm.classify": "wobo/archetype-slm",
    "slm.safety": "wobo/safety-slm",
}

# tier -> (primary logical name, fallback chain). Every chain crosses providers.
_TIER_CHAIN: dict[Tier, tuple[str, tuple[str, ...]]] = {
    Tier.TINY: ("tier.tiny", ("tier.tiny.fallback", "tier.text.last")),
    Tier.TURN: ("tier.turn", ("tier.generate", "tier.text.last")),
    Tier.GENERATE: ("tier.generate", ("tier.verify", "tier.text.last")),
    Tier.REASON: ("tier.reason", ("tier.verify", "tier.text.last")),
    Tier.VERIFY: ("tier.verify", ("tier.generate", "tier.text.last")),
    Tier.VOICE: ("tier.voice", ()),
    Tier.IMAGE: ("tier.image", ()),
}

# The cost rule's ladder: one rung per rejection, cheapest first. ``verify`` is the top —
# the verifier itself has nothing above it to appeal to. Voice and imagery do not escalate.
_ESCALATION: dict[Tier, Tier] = {
    Tier.TINY: Tier.TURN,
    Tier.TURN: Tier.GENERATE,
    Tier.GENERATE: Tier.REASON,
    Tier.REASON: Tier.VERIFY,
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


# --- the tiers ------------------------------------------------------------------------
def tier_primary(tier: Tier) -> str:
    """The logical name of a tier's primary model."""
    return _TIER_CHAIN[tier][0]


def tier_fallbacks(tier: Tier) -> tuple[str, ...]:
    """The logical names of a tier's fallback chain, cheapest-first, always cross-provider."""
    return _TIER_CHAIN[tier][1]


def tier_model(tier: Tier) -> ModelSpec:
    """The provider model a tier resolves to right now."""
    return resolve(tier_primary(tier), Track.TRACK_1)


def escalation_tier(tier: Tier) -> Tier | None:
    """One rung up the cost ladder, or ``None`` at the top."""
    return _ESCALATION.get(tier)


def escalate(tier: Tier, *, capability: str, reason: str) -> ModelSpec | None:
    """The cost rule: a verifier or second-opinion REJECTION escalates one tier.

    Returns the escalated tier's model, or ``None`` when the caller is already at the top of
    the ladder (nothing above the verifier to appeal to) — the caller then keeps what it has.
    Every escalation is logged with its reason so the hard list stays honest.
    """
    nxt = escalation_tier(tier)
    fields = {"capability": capability, "from_tier": tier.value, "reason": reason}
    if nxt is None:
        _telemetry.info("gateway.escalation declined (top of the ladder)", extra={"fields": fields})
        return None
    spec = tier_model(nxt)
    _telemetry.info(
        "gateway.escalation",
        extra={"fields": {**fields, "to_tier": nxt.value, "model": spec.provider_model}},
    )
    return spec


def track_separation_holds() -> bool:
    """No logical name and no provider model string may appear on both tracks."""
    if set(_TRACK_1) & set(_TRACK_2):
        return False
    return not (set(_TRACK_1.values()) & set(_TRACK_2.values()))
