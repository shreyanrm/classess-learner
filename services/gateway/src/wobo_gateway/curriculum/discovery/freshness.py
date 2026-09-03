"""Stage 5 — the syllabus that changed under us (``docs/CURRICULUM.md`` §9).

A board publishes next year's syllabus in March and says nothing. A verified framework that is
never looked at again quietly becomes a lie with our name on it, so a scheduled job re-fetches
each verified framework's document monthly and at the known release windows, compares the hash,
and — only when the bytes actually changed — runs discovery again into a **new version** with a
``supersedes`` pointer. Nothing is edited in place, ever (``CURRICULUM.md`` §2).

Then Wobo says what moved, one line per change, in the learner's own terms: "trigonometry is now
chapter five" is worth more to a fifteen-year-old than a version number.

Provisional and community syllabi are on a different clock: they are re-checked when a second
learner arrives, because a second learner is the first chance we get to find out whether the
first reading was right.

The whole thing is metered as a generation like any other discovery, against the system's own
meter subject rather than a learner's: nobody's free day is spent on our housekeeping.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from typing import Any

from wobo_gateway.curriculum.discovery.extract import Completion
from wobo_gateway.curriculum.discovery.fetch import Document, FetchRefused, fetch_document
from wobo_gateway.curriculum.discovery.job import (
    DiscoveryBudget,
    JobRecord,
    JobStore,
    run_discovery,
)

logger = logging.getLogger("wobo.gateway.curriculum.discovery.freshness")

# Monthly, as the law says. Everything else here is about catching a release sooner than that.
CADENCE_DAYS = 30

# When boards publish the coming year's syllabus. A starting point, not a claim to precision:
# being early costs one fetch and a hash compare, being late costs a learner the wrong chapters.
RELEASE_MONTHS: dict[str, tuple[int, ...]] = {
    "IN": (3, 4),  # CBSE, ICSE and the state boards, before the April session
    "GB": (7, 8),
    "US": (6, 7, 8),
    "AU": (11, 12),
    "CA": (6, 8),
    "SG": (11, 12),
    "AE": (7, 8),
}
DEFAULT_RELEASE_MONTHS: tuple[int, ...] = (3, 8)

# The system's meter subject. Housekeeping is metered, and it is never a learner's day.
SYSTEM_SUBJECT = "system:curriculum-freshness"

_REVISION = re.compile(r"^(?P<base>.+?)(?: rev (?P<n>\d+))?$")
_WS = re.compile(r"\s+")
_PUNCT = re.compile(r"[^a-z0-9 ]+")

# One line per change, then a tail. Past this a learner is reading a changelog, not a note.
MAX_SUMMARY_LINES = 8


def _norm(text: str) -> str:
    return _PUNCT.sub("", _WS.sub(" ", str(text or "").lower())).strip()


# --- the schedule --------------------------------------------------------------------------
def release_months(country: str | None) -> tuple[int, ...]:
    return RELEASE_MONTHS.get((country or "").upper(), DEFAULT_RELEASE_MONTHS)


def due(
    *,
    last_checked: datetime | None,
    now: datetime,
    country: str | None = None,
    cadence_days: int = CADENCE_DAYS,
) -> bool:
    """Is this framework's document due a re-fetch: monthly, or once inside a release window."""
    if last_checked is None:
        return True
    if (now - last_checked) >= timedelta(days=cadence_days):
        return True
    if now.month in release_months(country):
        window_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return last_checked < window_start
    return False


def next_check(
    *,
    last_checked: datetime,
    country: str | None = None,
    cadence_days: int = CADENCE_DAYS,
) -> datetime:
    """When this framework comes round again: the cadence, or the next release window if sooner."""
    monthly = last_checked + timedelta(days=cadence_days)
    months = release_months(country)
    candidates = [monthly]
    for offset in range(0, 14):
        month = ((last_checked.month - 1 + offset) % 12) + 1
        year = last_checked.year + (last_checked.month - 1 + offset) // 12
        if month in months:
            start = datetime(year, month, 1, tzinfo=last_checked.tzinfo or UTC)
            if start > last_checked:
                candidates.append(start)
                break
    return min(candidates)


def due_for_record(record: JobRecord, *, now: datetime, learners: int | None = None) -> bool:
    """The rule per status: verified on the calendar, provisional when a second learner arrives."""
    if record.status == "refused":
        return False
    if record.status in {"provisional", "community"}:
        count = learners if learners is not None else len(record.used_by)
        return count >= 2
    last = _parse_time(record.updated_at)
    return due(last_checked=last, now=now, country=record.request.country)


def _parse_time(stamp: str | None) -> datetime | None:
    if not stamp:
        return None
    try:
        parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


# --- versions ------------------------------------------------------------------------------
def revision_version(current: str | None, existing: Sequence[str] = ()) -> str:
    """The label a re-read gets: the same year, one revision on. Never the same label twice.

    A board that republishes the 2026-27 syllabus in June has not made a 2027-28 syllabus, so the
    year stays and the revision moves. If the document turns out to state a different year, the
    stored syllabus carries that year — this label only has to be unique and honest.
    """
    base = (current or "undated").strip()
    match = _REVISION.match(base)
    stem = (match.group("base") if match else base).strip()
    start = int(match.group("n")) if match and match.group("n") else 1
    seen = {label.strip() for label in existing}
    candidate = start + 1
    while f"{stem} rev {candidate}" in seen:
        candidate += 1
    return f"{stem} rev {candidate}"


def document_changed(previous_hash: str | None, document: Document) -> bool:
    """The only thing that triggers a new version: the bytes are different."""
    return bool(previous_hash) and document.document_sha256 != previous_hash


# --- the diff -------------------------------------------------------------------------------
@dataclass(frozen=True)
class SyllabusDiff:
    added_units: tuple[str, ...] = ()
    removed_units: tuple[str, ...] = ()
    renamed_units: tuple[tuple[str, str], ...] = ()
    moved_units: tuple[tuple[str, int, int], ...] = ()
    added_topics: tuple[tuple[str, str], ...] = ()
    removed_topics: tuple[tuple[str, str], ...] = ()

    @property
    def empty(self) -> bool:
        return not any(
            (
                self.added_units,
                self.removed_units,
                self.renamed_units,
                self.moved_units,
                self.added_topics,
                self.removed_topics,
            )
        )

    @property
    def count(self) -> int:
        return sum(
            len(part)
            for part in (
                self.added_units,
                self.removed_units,
                self.renamed_units,
                self.moved_units,
                self.added_topics,
                self.removed_topics,
            )
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "added_units": list(self.added_units),
            "removed_units": list(self.removed_units),
            "renamed_units": [list(pair) for pair in self.renamed_units],
            "moved_units": [list(item) for item in self.moved_units],
            "added_topics": [list(pair) for pair in self.added_topics],
            "removed_topics": [list(pair) for pair in self.removed_topics],
        }


def _units(syllabus: dict[str, Any] | None) -> list[dict[str, Any]]:
    units = (syllabus or {}).get("units")
    return [unit for unit in units if isinstance(unit, dict)] if isinstance(units, list) else []


def _topic_titles(unit: dict[str, Any]) -> list[str]:
    topics = unit.get("topics")
    if not isinstance(topics, list):
        return []
    return [str(topic.get("title") or "") for topic in topics if isinstance(topic, dict)]


def diff_syllabi(old: dict[str, Any] | None, new: dict[str, Any] | None) -> SyllabusDiff:
    """What moved between two versions, in the shapes a learner would notice.

    A unit is "the same unit" by name, or — when the name changed — by sitting at the same place
    with the same topics under it. That second rule is what stops a retitled chapter reading as
    one chapter deleted and another invented.
    """
    old_units = _units(old)
    new_units = _units(new)
    old_by_name = {_norm(unit.get("title", "")): unit for unit in old_units}
    new_by_name = {_norm(unit.get("title", "")): unit for unit in new_units}

    renamed: list[tuple[str, str]] = []
    matched_old: set[str] = set()
    matched_new: set[str] = set()
    for index, new_unit in enumerate(new_units):
        key = _norm(new_unit.get("title", ""))
        if key in old_by_name:
            continue
        if index >= len(old_units):
            continue
        old_unit = old_units[index]
        old_key = _norm(old_unit.get("title", ""))
        if old_key in new_by_name:
            continue
        old_topics = {_norm(title) for title in _topic_titles(old_unit)}
        new_topics = {_norm(title) for title in _topic_titles(new_unit)}
        if old_topics and old_topics == new_topics:
            renamed.append((str(old_unit.get("title", "")), str(new_unit.get("title", ""))))
            matched_old.add(old_key)
            matched_new.add(key)

    added = [
        str(unit.get("title", ""))
        for unit in new_units
        if _norm(unit.get("title", "")) not in old_by_name
        and _norm(unit.get("title", "")) not in matched_new
    ]
    removed = [
        str(unit.get("title", ""))
        for unit in old_units
        if _norm(unit.get("title", "")) not in new_by_name
        and _norm(unit.get("title", "")) not in matched_old
    ]

    moved: list[tuple[str, int, int]] = []
    added_topics: list[tuple[str, str]] = []
    removed_topics: list[tuple[str, str]] = []
    old_positions = {_norm(unit.get("title", "")): i + 1 for i, unit in enumerate(old_units)}
    for index, new_unit in enumerate(new_units, start=1):
        key = _norm(new_unit.get("title", ""))
        old_unit = old_by_name.get(key)
        if old_unit is None:
            continue
        was = old_positions.get(key, index)
        if was != index:
            moved.append((str(new_unit.get("title", "")), was, index))
        old_topics = {_norm(title): title for title in _topic_titles(old_unit)}
        new_topics = {_norm(title): title for title in _topic_titles(new_unit)}
        unit_title = str(new_unit.get("title", ""))
        added_topics += [
            (unit_title, title) for norm, title in new_topics.items() if norm not in old_topics
        ]
        removed_topics += [
            (unit_title, title) for norm, title in old_topics.items() if norm not in new_topics
        ]

    return SyllabusDiff(
        added_units=tuple(added),
        removed_units=tuple(removed),
        renamed_units=tuple(renamed),
        moved_units=tuple(moved),
        added_topics=tuple(added_topics),
        removed_topics=tuple(removed_topics),
    )


def summarise(diff: SyllabusDiff, *, version: str | None = None) -> tuple[str, ...]:
    """What Wobo says. One line per change, sentence case, no emoji, no exclamation marks."""
    if diff.empty:
        return ()
    where = f" in {version}" if version else ""
    lines: list[str] = []
    for title in diff.added_units:
        lines.append(f"{title} is new{where}.")
    for title in diff.removed_units:
        lines.append(f"{title} is no longer in your syllabus.")
    for old, new in diff.renamed_units:
        lines.append(f"{old} is now called {new}.")
    for title, was, now_at in diff.moved_units:
        lines.append(f"{title} is now chapter {now_at}, it used to be chapter {was}.")
    for unit, topic in diff.added_topics:
        lines.append(f"{unit} has a new topic, {topic}.")
    for unit, topic in diff.removed_topics:
        lines.append(f"{unit} no longer covers {topic}.")
    if len(lines) > MAX_SUMMARY_LINES:
        remaining = len(lines) - MAX_SUMMARY_LINES
        kept = lines[:MAX_SUMMARY_LINES]
        kept.append(
            f"There {'is' if remaining == 1 else 'are'} {remaining} more "
            f"{'change' if remaining == 1 else 'changes'} if you want to see them."
        )
        return tuple(kept)
    return tuple(lines)


# --- the run ---------------------------------------------------------------------------------
@dataclass(frozen=True)
class FreshnessOutcome:
    """What one freshness check found. ``new_record`` exists only when a version was published."""

    key: str
    changed: bool
    reason: str
    document: Document | None = None
    diff: SyllabusDiff | None = None
    summary: tuple[str, ...] = ()
    new_record: JobRecord | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "changed": self.changed,
            "reason": self.reason,
            "diff": self.diff.as_dict() if self.diff else None,
            "summary": list(self.summary),
            "new_key": self.new_record.key if self.new_record else None,
        }


def run_freshness_check(
    record: JobRecord,
    *,
    store: JobStore,
    fetch_fn: Callable[..., Document] = fetch_document,
    complete_generate: Completion | None = None,
    complete_verify: Completion | None = None,
    budget: DiscoveryBudget | None = None,
    meter_subject: str | None = SYSTEM_SUBJECT,
    second_reader: bool = True,
    now: datetime | None = None,
) -> FreshnessOutcome:
    """Re-fetch one stored syllabus's document; publish a new version only if it changed.

    Four outcomes, all of them honest: nothing stored to check, the document is gone, the bytes
    are identical, or the bytes changed and a new version now supersedes the old one. The old
    record is never touched — it keeps serving the learners pinned to it until they take the
    upgrade.
    """
    budget = budget or DiscoveryBudget()
    provenance = record.provenance or {}
    url = str(provenance.get("source_url") or "")
    if not url or record.syllabus is None:
        return FreshnessOutcome(key=record.key, changed=False, reason="nothing_stored")

    try:
        document = fetch_fn(url, budget=budget.fetch)
    except FetchRefused as exc:
        logger.info(
            "freshness.unreachable",
            extra={"fields": {"key": record.key, "url": url, "reason": exc.reason}},
        )
        return FreshnessOutcome(key=record.key, changed=False, reason=f"unreachable:{exc.reason}")

    if not document_changed(str(provenance.get("document_hash") or ""), document):
        return FreshnessOutcome(
            key=record.key, changed=False, reason="unchanged", document=document
        )

    version = revision_version(str(record.syllabus.get("version") or record.request.version or ""))
    request = replace(record.request, version=version)
    new_record = run_discovery(
        request,
        store=store,
        meter_subject=meter_subject,
        seed_urls=[document.url],
        fetch_fn=fetch_fn,
        complete_generate=complete_generate,
        complete_verify=complete_verify,
        budget=budget,
        second_reader=second_reader,
        supersedes=record.key,
    )
    if new_record.status != "provisional":
        # The document moved but we could not read the new one. The old version keeps serving —
        # a syllabus we cannot check does not replace one we could.
        logger.warning(
            "freshness.redraw refused",
            extra={"fields": {"key": record.key, "reason": new_record.reason}},
        )
        return FreshnessOutcome(
            key=record.key,
            changed=True,
            reason=f"refused:{new_record.reason}",
            document=document,
            new_record=new_record,
        )

    diff = diff_syllabi(record.syllabus, new_record.syllabus)
    summary = summarise(diff, version=str((new_record.syllabus or {}).get("version") or version))
    logger.info(
        "freshness.new version",
        extra={
            "fields": {
                "key": record.key,
                "new_key": new_record.key,
                "changes": diff.count,
                "url": document.url,
            }
        },
    )
    return FreshnessOutcome(
        key=record.key,
        changed=True,
        reason="new_version",
        document=document,
        diff=diff,
        summary=summary,
        new_record=new_record,
    )


def due_records(
    records: Sequence[JobRecord], *, now: datetime | None = None
) -> tuple[JobRecord, ...]:
    """The scheduler's queue: everything due a re-check right now, oldest first."""
    moment = now or datetime.now(UTC)
    due_now = [record for record in records if due_for_record(record, now=moment)]
    return tuple(sorted(due_now, key=lambda record: record.updated_at or ""))
