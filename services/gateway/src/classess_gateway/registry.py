"""Capability registry and per-capability routing policy.

Features call a capability name, never a raw model. Each capability has exactly one
policy: which track, the primary logical model, a fallback chain (which may escalate from
Track 2 to a Track 1 frontier model on a hard moment), latency and cost budgets, the
cache tier, and the consent-tier rule.

Most routine teaching turns target Track 2; the frontier (Track 1) is reserved for
verification, digests, and behavioural evaluation. ``archetype.classify`` and
``peakcut.evaluate`` are elevated-only — they refuse under the un-elevated consent tier.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from classess_gateway.cache import CacheTier
from classess_gateway.routing import Track, resolve, resolve_any, track_separation_holds


class ConsentTier(StrEnum):
    """Consent tier (DPDP). Travels on every invocation and gates downstream intelligence."""

    UN_ELEVATED = "un_elevated"
    ELEVATED = "elevated"


@dataclass(frozen=True)
class RoutingPolicy:
    capability: str
    track: Track
    primary: str
    fallback: tuple[str, ...]
    max_latency_ms: int
    cost_ceiling: float
    cache_tier: CacheTier
    elevated_only: bool = False

    def allows(self, consent_tier: ConsentTier) -> bool:
        return consent_tier is ConsentTier.ELEVATED or not self.elevated_only


_POLICIES: dict[str, RoutingPolicy] = {
    p.capability: p
    for p in (
        RoutingPolicy(
            capability="tutor.turn",
            track=Track.TRACK_2,
            primary="slm.tutor",
            fallback=("frontier.fast", "frontier.reason"),
            max_latency_ms=1200,
            cost_ceiling=0.004,
            cache_tier=CacheTier.SEMANTIC,
        ),
        RoutingPolicy(
            capability="vidya.turn",
            track=Track.TRACK_2,
            primary="slm.tutor",
            fallback=("frontier.fast", "frontier.reason"),
            max_latency_ms=900,
            cost_ceiling=0.004,
            cache_tier=CacheTier.SEMANTIC,
        ),
        RoutingPolicy(
            capability="grade.attempt",
            track=Track.TRACK_2,
            primary="slm.grade",
            fallback=("frontier.reason",),
            max_latency_ms=1000,
            cost_ceiling=0.003,
            cache_tier=CacheTier.EXACT,
        ),
        RoutingPolicy(
            capability="generate.opener",
            track=Track.TRACK_2,
            primary="edge.opener",
            fallback=("frontier.fast",),
            max_latency_ms=1500,
            cost_ceiling=0.003,
            cache_tier=CacheTier.EXACT,
        ),
        RoutingPolicy(
            capability="verify.math",
            track=Track.TRACK_1,
            primary="frontier.reason",
            fallback=("openai.crosscheck",),
            max_latency_ms=4000,
            cost_ceiling=0.05,
            cache_tier=CacheTier.EXACT,
        ),
        RoutingPolicy(
            capability="twin.query",
            track=Track.TRACK_2,
            primary="slm.tutor",
            fallback=("frontier.fast",),
            max_latency_ms=800,
            cost_ceiling=0.002,
            cache_tier=CacheTier.SEMANTIC,
        ),
        RoutingPolicy(
            capability="safety.moderate",
            track=Track.TRACK_2,
            primary="slm.safety",
            fallback=("frontier.reason",),
            max_latency_ms=600,
            cost_ceiling=0.002,
            cache_tier=CacheTier.EXACT,
        ),
        RoutingPolicy(
            capability="parent.companion.turn",
            track=Track.TRACK_2,
            primary="slm.companion",
            fallback=("frontier.reason",),
            max_latency_ms=1500,
            cost_ceiling=0.005,
            cache_tier=CacheTier.SEMANTIC,
        ),
        RoutingPolicy(
            capability="generate.digest",
            track=Track.TRACK_1,
            primary="frontier.fast",
            fallback=("frontier.reason",),
            max_latency_ms=6000,
            cost_ceiling=0.03,
            cache_tier=CacheTier.EXACT,
        ),
        RoutingPolicy(
            capability="generate.course",
            track=Track.TRACK_1,
            primary="frontier.fast",
            fallback=("frontier.reason",),
            max_latency_ms=8000,
            cost_ceiling=0.03,
            cache_tier=CacheTier.EXACT,
        ),
        RoutingPolicy(
            capability="archetype.classify",
            track=Track.TRACK_2,
            primary="slm.classify",
            fallback=("frontier.reason",),
            max_latency_ms=2000,
            cost_ceiling=0.01,
            cache_tier=CacheTier.EXACT,
            elevated_only=True,
        ),
        RoutingPolicy(
            capability="peakcut.evaluate",
            track=Track.TRACK_1,
            primary="frontier.reason",
            fallback=("openai.crosscheck",),
            max_latency_ms=3000,
            cost_ceiling=0.04,
            cache_tier=CacheTier.NONE,
            elevated_only=True,
        ),
    )
}

EXPECTED_CAPABILITIES: tuple[str, ...] = (
    "tutor.turn",
    "vidya.turn",
    "grade.attempt",
    "generate.opener",
    "verify.math",
    "twin.query",
    "safety.moderate",
    "parent.companion.turn",
    "generate.digest",
    "generate.course",
    "archetype.classify",
    "peakcut.evaluate",
)


def capabilities() -> tuple[str, ...]:
    return tuple(_POLICIES)


def policy(name: str) -> RoutingPolicy:
    return _POLICIES[name]


def validate_registry() -> None:
    """Fail fast on a malformed registry: track overlap, missing policy, or a model that
    does not resolve. The primary must live on the policy's declared track; fallbacks may
    escalate to either track."""
    if not track_separation_holds():
        raise RuntimeError("track 1 and track 2 model sets must not overlap")
    missing = set(EXPECTED_CAPABILITIES) - set(_POLICIES)
    if missing:
        raise RuntimeError(f"missing capability policies: {sorted(missing)}")
    for pol in _POLICIES.values():
        resolve(pol.primary, pol.track)
        for name in pol.fallback:
            resolve_any(name)


validate_registry()
