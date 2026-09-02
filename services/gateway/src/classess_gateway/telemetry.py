"""Gateway telemetry: latency, tokens, cache hits, track, capability.

This is separate from the learner event store and does not emit contract events. It is
structured logging plus an in-memory metrics sink for dev and tests; a real metrics
exporter (feeding the cost dashboard) replaces the sink later.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Any

logger = logging.getLogger("classess.gateway.telemetry")


@dataclass(frozen=True)
class TelemetryEvent:
    capability: str
    track: str
    model: str
    latency_ms: float
    tokens: int
    cache_hit: bool


class MetricsSink:
    """In-memory sink. Holds events for inspection in dev and assertions in tests."""

    def __init__(self) -> None:
        self.events: list[TelemetryEvent] = []

    def record(self, event: TelemetryEvent) -> None:
        self.events.append(event)


def emit(sink: MetricsSink, event: TelemetryEvent) -> None:
    sink.record(event)
    # The JSON log formatter (app._JsonFormatter) merges ``record.fields`` into the line; anything
    # under another key is dropped on the floor, so telemetry emits under "fields" like every other
    # structured log in the gateway.
    logger.info("gateway.telemetry", extra={"fields": asdict(event)})


def record_cost(
    *,
    capability: str,
    model: str,
    response: Any,
    cost_ceiling: float | None = None,
) -> float | None:
    """Log what one model call actually cost, against the capability's ``cost_ceiling``.

    Returns the cost in USD, or ``None`` when it cannot be computed (a provider that reports no
    usage, or a model litellm has no price for). Never raises: cost accounting must not be able
    to fail a learner's turn. A call over its ceiling logs a warning — that line is the signal
    the cost dashboard and the budget dials are tuned from.
    """
    if cost_ceiling is None:
        try:
            from classess_gateway.registry import policy

            cost_ceiling = policy(capability).cost_ceiling
        except (KeyError, ImportError):
            cost_ceiling = None
    try:
        import litellm

        cost = float(litellm.completion_cost(completion_response=response))
    except Exception:  # no price table, no usage, provider quirk — accounting is best-effort
        logger.debug("cost unavailable", extra={"fields": {"capability": capability}})
        return None
    fields = {
        "capability": capability,
        "model": model,
        "cost_usd": round(cost, 6),
        "cost_ceiling": cost_ceiling,
    }
    if cost_ceiling is not None and cost > cost_ceiling:
        logger.warning("gateway.cost over ceiling", extra={"fields": fields})
    else:
        logger.info("gateway.cost", extra={"fields": fields})
    return cost
