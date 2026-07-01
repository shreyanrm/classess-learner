"""Gateway telemetry: latency, tokens, cache hits, track, capability.

This is separate from the learner event store and does not emit contract events. It is
structured logging plus an in-memory metrics sink for dev and tests; a real metrics
exporter (feeding the cost dashboard) replaces the sink later.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass

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
    logger.info("gateway.telemetry", extra={"telemetry": asdict(event)})
