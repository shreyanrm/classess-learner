"""Gateway telemetry: latency, tokens, cache hits, track, capability.

This is separate from the learner event store and does not emit contract events. It is
structured logging plus an in-memory metrics sink for dev and tests; a real metrics
exporter (feeding the cost dashboard) replaces the sink later.
"""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import asdict, dataclass
from typing import Any

logger = logging.getLogger("wobo.gateway.telemetry")


@dataclass(frozen=True)
class TelemetryEvent:
    capability: str
    track: str
    model: str
    latency_ms: float
    tokens: int
    cache_hit: bool


# One process serves every learner for as long as it lives, so an unbounded list here is a slow
# leak: the sink exists for dev inspection and test assertions, and a window of the most recent
# events answers both. The durable record is the structured log line emit() writes.
MAX_RETAINED_EVENTS = 1000


class MetricsSink:
    """In-memory sink. Holds the last :data:`MAX_RETAINED_EVENTS` events for inspection in dev
    and assertions in tests; older ones fall off the back rather than accumulating forever."""

    def __init__(self, maxlen: int = MAX_RETAINED_EVENTS) -> None:
        self.events: deque[TelemetryEvent] = deque(maxlen=maxlen)

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
            from wobo_gateway.registry import policy

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
