"""What the brain remembers of a learner, and how it forgets — ``POST /v1/me/erase``.

The memory page has always been able to clear the device: ``forget_all`` calls ``clearMind()``
and the dossier is gone from that phone. Nothing propagated. The brain kept its own copy — the
mind snapshot the learner's devices reconcile through (``learner.learner_state.mind``: the facts
Wobo was told and everything the twin summary is derived from), the conversation it caches per
learner (``learner.learner_threads``), and the generations it holds keyed to that learner (the
board turns still inside the resume window). A memory a learner cannot reach is not their memory,
so this module is the other half of the promise Wobo makes in their own words: "the app purges the
real memory and confirms exactly what left; never claim to have forgotten something you did not."

Three rules follow from that last clause:

* **Every store is attempted**, so one unreachable table cannot leave the rest behind.
* **The answer is the truth**, not the intent: what came back is counted and reported, and a store
  that refused is named. The route turns a partial erasure into a 502 rather than a reassurance.
* **Progress is not memory.** XP, streak and mastery are the learner's record of their own work;
  the mind snapshot is what Wobo was told about them. Forgetting empties the second and leaves the
  first, which is why the state row is patched rather than deleted. Deleting the whole account is
  a different control with a different warning ("erase and start over").

Transport is PostgREST with the service-role key, exactly as :mod:`wobo_gateway.consent` reads the
profile: server-side only, never in a client bundle, ``learner`` schema selected by header. With no
project configured (dev, tests, the keyless path) there is no durable store to erase — the answer
says so rather than pretending, and the in-process stores are still cleared.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("wobo.gateway.memory")

_HTTP_TIMEOUT_S = 5.0

#: The schema the learner plane lives in, and the tables this route may touch. Named explicitly:
#: an erase route that takes a table name from anywhere but this file is a delete primitive.
_SCHEMA = "learner"
_STATE_TABLE = "learner_state"
_THREADS_TABLE = "learner_threads"
_ID_COLUMN = "subject_id"

#: A subject reaches a PostgREST filter, so it is checked before it is interpolated. Supabase
#: subjects are uuids; the dev seam's are short slugs. Anything else is refused outright rather
#: than escaped and hoped for — a filter value is not a place to be clever.
_SUBJECT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")


@dataclass
class Erasure:
    """What actually left. Counts, not promises."""

    #: Durable facts dropped from the mind snapshot — the concierge's notepad.
    facts: int = 0
    #: Whether the twin summary went with them (it is derived from the same snapshot).
    twin_summary: bool = False
    #: Conversations the brain had cached for this learner.
    threads: int = 0
    #: Cached generations keyed to this learner: board turns still inside the resume window.
    boards: int = 0
    #: True when a durable store was configured and answered. False means device-side only.
    durable: bool = False
    #: Stores that refused. Non-empty means the learner has NOT been fully forgotten.
    failed: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "erased": {
                "facts": self.facts,
                "twin_summary": self.twin_summary,
                "threads": self.threads,
                "boards": self.boards,
            },
            "durable": self.durable,
            "failed": list(self.failed),
        }


def configured() -> tuple[str, str] | None:
    """``(base url, service key)`` when the brain has a durable store, else None."""
    base = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not base or not key:
        return None
    return base.rstrip("/"), key


def _url(base: str, table: str, subject: str, *, select: str | None = None) -> str:
    query: dict[str, str] = {_ID_COLUMN: f"eq.{subject}"}
    if select:
        query["select"] = select
        query["limit"] = "1"
    encoded = urllib.parse.urlencode(query, quote_via=urllib.parse.quote)
    return f"{base}/rest/v1/{urllib.parse.quote(table)}?{encoded}"


def _request(
    url: str, key: str, method: str, *, body: dict[str, Any] | None = None, want_rows: bool
) -> Any:
    """One PostgREST call. Split out so tests can substitute it without a database."""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        # PostgREST picks the schema by header. Reads use Accept-Profile, writes Content-Profile;
        # sending both is harmless and means one code path for all three verbs.
        "Accept-Profile": _SCHEMA,
        "Content-Profile": _SCHEMA,
        "Prefer": "return=representation" if want_rows else "return=minimal",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=_HTTP_TIMEOUT_S) as response:  # noqa: S310
        raw = response.read().decode() or ""
    if not want_rows or not raw.strip():
        return []
    return json.loads(raw)


_NETWORK_ERRORS = (urllib.error.URLError, TimeoutError, ValueError, OSError)


def _mind(rows: Any) -> dict[str, Any]:
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        mind = rows[0].get("mind")
        if isinstance(mind, dict):
            return mind
    return {}


def erase_durable(subject: str) -> Erasure:
    """Forget this learner in the brain's own store. Never raises; a refusal is reported."""
    out = Erasure()
    store = configured()
    if store is None or not _SUBJECT_RE.match(subject or ""):
        return out
    base, key = store
    out.durable = True

    # The mind snapshot: read what is there so the learner can be told exactly what left, then
    # empty it. Patched, never deleted — the same row carries their XP and their streak.
    try:
        mind = _mind(_request(_url(base, _STATE_TABLE, subject, select="mind"), key, "GET", want_rows=True))
        facts = mind.get("facts")
        out.facts = len(facts) if isinstance(facts, list) else 0
        # The twin summary is not stored; it is derived from this snapshot every time it is built,
        # so it exists exactly as long as the snapshot has anything in it — and goes with it.
        out.twin_summary = bool(mind)
        if mind:
            _request(
                _url(base, _STATE_TABLE, subject),
                key,
                "PATCH",
                body={"mind": {}},
                want_rows=False,
            )
    except _NETWORK_ERRORS as exc:
        logger.warning("memory: mind erase failed", extra={"fields": {"error": str(exc)}})
        out.failed.append(_STATE_TABLE)
        out.facts, out.twin_summary = 0, False

    # Wobo's cached conversation with this learner.
    try:
        rows = _request(_url(base, _THREADS_TABLE, subject), key, "DELETE", want_rows=True)
        out.threads = len(rows) if isinstance(rows, list) else 0
    except _NETWORK_ERRORS as exc:
        logger.warning("memory: thread erase failed", extra={"fields": {"error": str(exc)}})
        out.failed.append(_THREADS_TABLE)

    return out


def erase(subject: str, *, meter_key: str) -> Erasure:
    """Everything the brain holds about one learner, gone — durable store and process alike.

    ``meter_key`` is what the in-process stores are keyed on (an anonymous learner is counted per
    device, so their remembered turns are not under their subject), and it comes from the door,
    never from a body.
    """
    from wobo_gateway.board import stream as board_stream
    from wobo_gateway import voice

    out = erase_durable(subject)
    # Cached generations keyed to this learner: the board turns still replayable in the resume
    # window carry the learner's own words and Wobo's answer to them.
    out.boards = board_stream.forget(meter_key)
    # An outstanding voice token is a session about to be opened as them; forgetting a learner
    # must not leave one of those lying around.
    voice.forget(subject)
    logger.info("memory erased", extra={"fields": {"subject": subject, **out.as_dict()}})
    return out
