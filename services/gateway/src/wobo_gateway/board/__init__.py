"""The board — the brain's half of `docs/BOARD.md`.

``planner`` turns a compact model plan into validated, anchored objects; ``pipelines`` compute the
geometry for each domain; ``verify`` is the gate every number crosses; ``stream`` is the turn
protocol on the wire; ``schema`` is the grammar both sides agree on.
"""

from __future__ import annotations

from wobo_gateway.board.planner import MAX_OBJECTS, Plan, Surface, TooMuchAtOnce, plan_board
from wobo_gateway.board.stream import Event, Turn, build_events, iter_sse, new_turn
from wobo_gateway.board.verify import Unverified

__all__ = [
    "MAX_OBJECTS",
    "Event",
    "Plan",
    "Surface",
    "TooMuchAtOnce",
    "Turn",
    "Unverified",
    "build_events",
    "iter_sse",
    "new_turn",
    "plan_board",
]
