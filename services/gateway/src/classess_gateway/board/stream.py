"""The turn protocol — say, ink, action, ask, card, done, in order, with timestamps.

BOARD.md §4 is the wire. This module builds that sequence and serialises it as Server-Sent
Events over the SAME authenticated capability route as a non-streaming turn
(``POST /v1/capability/wobo.turn`` with ``Accept: text/event-stream``).

**Why SSE on the capability route and not a socket.** The gateway's door, its rate limiter and
its meter all live in one HTTP middleware keyed on the path prefix ``/v1/capability/``. A
WebSocket has no middleware — that is exactly why the voice relay had to mint its own short-lived
token — so a socket here would mean a second door, a second limiter and a second place a budget
could be forgotten. Streaming on the existing route means auth, consent, rate limiting and the
meter are the same code for a streamed turn and a plain one, and the only difference is the
response body. That is the whole argument.

**Ink before the word.** Her sentences are laid out on a clock at a speaking pace, the plan's
objects are re-based against that clock, and :data:`INK_LEAD_MS` guarantees what BOARD.md §4
requires: the first ``ink`` event lands before the first sentence ends. Objects may claim a
particular beat with ``meta.beat`` (``{"with": 1}`` / ``{"after": 1}``), which is how "she points
before she says *this*" is expressed as data rather than as hope.

**Resume.** Every frame carries an SSE ``id`` of ``<turn>:<seq>``. A client that loses the
connection reconnects with ``Last-Event-ID`` and the turn replays from the next event — from the
last event it acknowledged, not from the beginning, and without spending a second turn from the
learner's day, because the plan is still in the turn store.
"""

from __future__ import annotations

import json
import re
import secrets
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any

from classess_gateway.board.planner import Plan

EVENT_TYPES = ("say", "ink", "action", "ask", "card", "done")

#: Her speaking pace, in words per minute, and the breath between sentences. Used only to place
#: ink against speech — the voice itself is synthesised elsewhere and is the real clock.
WORDS_PER_MINUTE = 165
SENTENCE_GAP_MS = 220
MIN_SENTENCE_MS = 320

#: The first stroke starts this many milliseconds into the turn — ahead of the first full stop,
#: which is the law, and late enough that it reads as a hand rather than a paste.
INK_LEAD_MS = 120

#: The grammar's own default drawing time for an object that asked for none.
DEFAULT_INK_MS = 240
#: However crowded the board, a mark never draws faster than a hand can move.
MIN_INK_MS = 240

MAX_SENTENCES = 10
#: A finished turn is kept this long so a dropped connection can resume it without paying again.
TURN_TTL_S = 180.0
_MAX_TURNS = 512

_SENTENCE_SPLIT = re.compile(r"(?<=[.?!])\s+")


@dataclass(frozen=True)
class Event:
    """One event on the wire."""

    seq: int
    type: str
    t: int
    data: dict[str, Any]

    def payload(self) -> dict[str, Any]:
        return {"type": self.type, "t": self.t, **self.data}


@dataclass
class Turn:
    """One planned turn, replayable while it is still in the store."""

    id: str
    meter_key: str
    events: list[Event] = field(default_factory=list)
    created: float = field(default_factory=time.monotonic)

    def after(self, seq: int) -> list[Event]:
        return [e for e in self.events if e.seq > seq]


_turns: dict[str, Turn] = {}
_lock = threading.Lock()


def remember(turn: Turn) -> None:
    """Keep a turn for the resume window, evicting expired ones and then the oldest."""
    now = time.monotonic()
    with _lock:
        for stale in [k for k, v in _turns.items() if now - v.created > TURN_TTL_S]:
            del _turns[stale]
        while len(_turns) >= _MAX_TURNS:
            del _turns[next(iter(_turns))]
        _turns[turn.id] = turn


def recall(turn_id: str, meter_key: str) -> Turn | None:
    """A turn this caller may resume. Ownership is the meter key, so a resume is never a way to
    read somebody else's board."""
    with _lock:
        turn = _turns.get(turn_id)
        if turn is None:
            return None
        if turn.meter_key != meter_key or time.monotonic() - turn.created > TURN_TTL_S:
            return None
        return turn


def reset() -> None:
    """Test seam — drop every remembered turn."""
    with _lock:
        _turns.clear()


def parse_last_event_id(raw: str | None) -> tuple[str, int] | None:
    """``<turn>:<seq>`` from a ``Last-Event-ID`` header, or None when it is not one of ours."""
    if not raw or ":" not in raw:
        return None
    turn_id, _, seq = raw.rpartition(":")
    if not turn_id or not seq.isdigit() or len(turn_id) > 64:
        return None
    return turn_id, int(seq)


def sentences(say: str) -> list[str]:
    """Her line, split the way she speaks it. The first one is short by design (the two-word
    rule) so the voice starts almost immediately."""
    text = (say or "").strip()
    if not text:
        return []
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()][:MAX_SENTENCES]


def sentence_clock(parts: list[str]) -> list[tuple[int, int]]:
    """``[(start, duration)]`` in milliseconds for each sentence, at her speaking pace."""
    per_word = 60_000 / WORDS_PER_MINUTE
    clock: list[tuple[int, int]] = []
    cursor = 0
    for part in parts:
        duration = max(MIN_SENTENCE_MS, int(per_word * max(1, len(part.split()))))
        clock.append((cursor, duration))
        cursor += duration + SENTENCE_GAP_MS
    return clock


def _beat_slot(obj: dict[str, Any], clock: list[tuple[int, int]]) -> tuple[int, int] | None:
    """The ``(start, dur)`` an object asked for by naming a sentence, or None if it named none.

    The prompt the model is given (``wobo.py``) says exactly two things, and this is the half that
    makes them true:

    * ``{"with": n}`` — *land it as you BEGIN that sentence*: the pen touches down on the first
      syllable of sentence *n* and takes whatever time the object itself asked for.
    * ``{"after": n}`` — *land it as you finish it*: the pen touches down on the first syllable of
      sentence *n* and the last stroke arrives on its full stop. The object is FINISHED as she
      finishes the sentence, which is what "land it" means.

    ``after`` used to START the object when the sentence ended, which put the ink a whole sentence
    behind the word it belonged to — "ink that lands after the word", BOARD.md §11's own example of
    what kills the board.
    """
    meta = obj.get("meta")
    beat = meta.get("beat") if isinstance(meta, dict) else None
    if not isinstance(beat, dict) or not clock:
        return None
    own = int((obj.get("t") or {}).get("dur") or DEFAULT_INK_MS)
    if isinstance(beat.get("with"), int):
        index = max(0, min(len(clock) - 1, beat["with"]))
        return clock[index][0], own
    if isinstance(beat.get("after"), int):
        index = max(0, min(len(clock) - 1, beat["after"]))
        return clock[index][0], max(own, clock[index][1])
    return None


def _ink_clock(
    objects: list[dict[str, Any]], clock: list[tuple[int, int]]
) -> list[tuple[int, int]]:
    """``(start, dur)`` for each object: beats honoured, the rest spread across her whole line.

    An object that named no beat used to inherit the planner's cumulative schedule, whose default
    is 240 ms an object — so a twelve-object board finished drawing itself in under three seconds
    and then sat there while she talked over it for fifteen. The hand draws THROUGH the utterance
    instead: the unbeaten objects are laid out evenly from the lead-in to her last full stop, each
    taking its own slice, in the order the planner put them in.
    """
    if not objects:
        return []
    starts = [int((o.get("t") or {}).get("start") or 0) for o in objects]
    durations = [int((o.get("t") or {}).get("dur") or DEFAULT_INK_MS) for o in objects]
    origin = min(starts)
    first_end = (clock[0][0] + clock[0][1]) if clock else INK_LEAD_MS + 1
    lead = min(INK_LEAD_MS, max(0, first_end - 1))
    spoken = (clock[-1][0] + clock[-1][1]) if clock else 0

    slots: list[tuple[int, int] | None] = [_beat_slot(o, clock) for o in objects]
    free = [i for i, slot in enumerate(slots) if slot is None]
    span = spoken - lead
    if clock and free and span > 0:
        # Evenly across what is left of her line — one slice each, in the planner's order.
        step = span / len(free)
        for place, index in enumerate(free):
            start = lead + int(round(place * step))
            slots[index] = (start, max(durations[index], MIN_INK_MS, int(round(step))))
    else:
        for index in free:
            slots[index] = (lead + (starts[index] - origin), durations[index])

    out = [slot for slot in slots if slot is not None]
    # The law, enforced rather than assumed: something is on the board before she finishes her
    # first sentence, whatever the plan or the beats asked for. Only the EARLIEST stroke is pulled
    # forward — shifting the whole plan would drag every other mark off the word it belongs to,
    # and the choreography is the point of the beats.
    if out and min(start for start, _ in out) >= first_end:
        first = min(range(len(out)), key=lambda i: out[i][0])
        out[first] = (lead, out[first][1])
    return out


def build_events(
    plan: Plan,
    *,
    actions: list[dict[str, Any]] | None = None,
    card: dict[str, Any] | None = None,
) -> list[Event]:
    """The whole turn as an ordered, timestamped event list (BOARD.md §4).

    Ordered by timestamp, so the hand can play it straight through, and ``done`` is always last.
    """
    parts = sentences(plan.say)
    clock = sentence_clock(parts)
    paced = _ink_clock(plan.objects, clock)

    staged: list[tuple[int, int, str, dict[str, Any]]] = []
    for order, (part, (start, duration)) in enumerate(zip(parts, clock, strict=True)):
        staged.append((start, order, "say", {"text": part, "dur": duration}))
    for order, (obj, (start, dur)) in enumerate(zip(plan.objects, paced, strict=True)):
        drawn = {**obj, "t": {"start": start, "dur": dur}}
        staged.append((start, 1000 + order, "ink", {"object": drawn}))

    tail = max([s + d for s, d in clock] + [s + d for s, d in paced] + [0])
    for order, action in enumerate(actions or []):
        if isinstance(action, dict):
            staged.append((tail, 5000 + order, "action", {"action": action}))
    if card is not None:
        staged.append((tail, 6000, "card", {"card": card}))
    if plan.ask is not None:
        # ``ask`` pauses the performance, so it belongs after everything it refers to.
        staged.append((tail, 7000, "ask", plan.ask))

    staged.sort(key=lambda row: (row[0], row[1]))
    events = [
        Event(seq=i, type=kind, t=t, data=data) for i, (t, _order, kind, data) in enumerate(staged)
    ]
    events.append(
        Event(
            seq=len(events),
            type="done",
            t=tail,
            data={
                "presentation": plan.presentation,
                "objects": len(plan.objects),
                "verified": [c.name for c in plan.ledger.checks],
                **({"refused": plan.refusals} if plan.refusals else {}),
                **({"resumes_from": plan.resumes_from} if plan.resumes_from else {}),
            },
        )
    )
    return events


def new_turn(meter_key: str, events: list[Event]) -> Turn:
    turn = Turn(id=secrets.token_urlsafe(9), meter_key=meter_key, events=events)
    remember(turn)
    return turn


def frame(turn_id: str, event: Event) -> str:
    """One SSE frame. The ``id`` is what a reconnect sends back as ``Last-Event-ID``."""
    body = json.dumps(event.payload(), separators=(",", ":"), default=str)
    return f"id: {turn_id}:{event.seq}\nevent: {event.type}\ndata: {body}\n\n"


def iter_sse(turn: Turn, *, after: int = -1) -> Iterator[str]:
    """The turn as an SSE body, from the event after ``after``.

    A comment frame goes first so a proxy flushes headers immediately — that is the difference
    between the pen starting in a second and the pen starting when the whole plan is done.
    """
    yield ": open\n\n"
    for event in turn.after(after):
        yield frame(turn.id, event)


def as_json(turn: Turn) -> dict[str, Any]:
    """The same turn for a client that did not ask for a stream — one JSON body, same order."""
    return {"turn": turn.id, "events": [e.payload() for e in turn.events]}
