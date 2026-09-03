"""The curriculum ontology, as data (docs/CURRICULUM.md §2).

    framework -> version -> level -> subject -> unit -> topic -> objective

Everything below ``framework`` is one :class:`Node` table with a ``kind`` and a ``parent_id``,
exactly as the schema stores it, because the shape of a board is data and not five classes.

Two rules live here rather than in a caller:

* **Scope.** Grades 4 to 13, school level only (§11). :func:`level_order` reads the number out of
  "Class 9", "Grade 10", "Year 11"; :func:`in_scope` drops a numbered level outside the band and
  keeps an unnumbered one ("IGCSE", "MYP 1"), because we cannot judge what we cannot read.
* **Honesty.** ``status`` is one of four values and nothing else. A row with an unrecognised
  status reads as ``provisional`` — the label that claims the least — never as ``verified``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

# The band the product covers. A framework may publish Class 1 to Class 12; we serve 4 to 13.
LEVEL_MIN = 4
LEVEL_MAX = 13


class Status(StrEnum):
    """How well we know a framework, a version, or a node. Drives the label the learner reads."""

    VERIFIED = "verified"
    PROVISIONAL = "provisional"
    COMMUNITY = "community"
    PERSONAL = "personal"


class FrameworkKind(StrEnum):
    NATIONAL = "national"
    STATE = "state"
    INTERNATIONAL = "international"
    OPEN = "open"
    HOMESCHOOL = "homeschool"
    ONLINE = "online"
    PERSONAL = "personal"


class NodeKind(StrEnum):
    LEVEL = "level"
    SUBJECT = "subject"
    UNIT = "unit"
    TOPIC = "topic"
    OBJECTIVE = "objective"


class JobState(StrEnum):
    """The discovery state machine (§4). ``refused`` is the honest end: nothing official found."""

    QUEUED = "queued"
    SEARCHING = "searching"
    EXTRACTING = "extracting"
    CHECKING = "checking"
    STORED = "stored"
    FAILED = "failed"
    REFUSED = "refused"


_OPEN_STATES = frozenset(
    {JobState.QUEUED, JobState.SEARCHING, JobState.EXTRACTING, JobState.CHECKING}
)


def job_is_open(state: JobState | str) -> bool:
    """Is this job still working? An open job is why a second discovery is never enqueued."""
    return coerce_job_state(state) in _OPEN_STATES


def coerce_status(value: Any) -> Status:
    """Any stored value -> the status we will stand behind. Unknown reads as provisional."""
    if isinstance(value, Status):
        return value
    if isinstance(value, str):
        try:
            return Status(value.strip().lower())
        except ValueError:
            return Status.PROVISIONAL
    return Status.PROVISIONAL


def coerce_kind(value: Any) -> FrameworkKind:
    if isinstance(value, FrameworkKind):
        return value
    if isinstance(value, str):
        try:
            return FrameworkKind(value.strip().lower())
        except ValueError:
            return FrameworkKind.OPEN
    return FrameworkKind.OPEN


def coerce_node_kind(value: Any) -> NodeKind:
    if isinstance(value, NodeKind):
        return value
    if isinstance(value, str):
        try:
            return NodeKind(value.strip().lower())
        except ValueError as exc:
            raise ValueError(f"unknown node kind: {value!r}") from exc
    raise ValueError(f"unknown node kind: {value!r}")


def coerce_job_state(value: Any) -> JobState:
    if isinstance(value, JobState):
        return value
    if isinstance(value, str):
        try:
            return JobState(value.strip().lower())
        except ValueError:
            return JobState.FAILED
    return JobState.FAILED


_LEVEL_NUMBER = re.compile(r"(\d{1,2})")
# Roman numerals appear on Indian board documents ("Class IX"). Only the ones inside the band.
_ROMAN = {
    "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9,
    "X": 10, "XI": 11, "XII": 12, "XIII": 13,
}  # fmt: skip


def level_order(name: str | None) -> int | None:
    """The grade number inside a level name, or None when the name carries no number.

    "Class 9" -> 9, "Grade 10" -> 10, "Year 11" -> 11, "Class IX" -> 9, "IGCSE" -> None.
    """
    if not name:
        return None
    text = name.strip()
    match = _LEVEL_NUMBER.search(text)
    if match:
        return int(match.group(1))
    for token in re.split(r"[\s\-_/]+", text.upper()):
        if token in _ROMAN:
            return _ROMAN[token]
    return None


def in_scope(name: str | None) -> bool:
    """Grades 4 to 13, school level only (§11). An unnumbered level is kept, not guessed at."""
    order = level_order(name)
    return order is None or LEVEL_MIN <= order <= LEVEL_MAX


def _strings(value: Any) -> list[str]:
    """Tolerant list-of-strings: the seed and the database both hand us ragged data."""
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, (list, tuple)):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _int(value: Any, default: int = 0) -> int:
    """Tolerant integer: a string order from PostgREST, a float from JSON, or nothing at all."""
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class Framework:
    """One board, programme, or curriculum. ``owner_subject`` is set only on a personal one."""

    id: str
    name: str
    kind: FrameworkKind = FrameworkKind.OPEN
    status: Status = Status.PROVISIONAL
    aliases: tuple[str, ...] = ()
    country: str | None = None
    region: str | None = None
    languages: tuple[str, ...] = ("en",)
    levels: tuple[str, ...] = ()
    official_site: str | None = None
    owner_subject: str | None = None

    @property
    def personal(self) -> bool:
        return self.owner_subject is not None

    def levels_in_scope(self) -> tuple[str, ...]:
        return tuple(level for level in self.levels if in_scope(level))

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> Framework:
        """One database or seed row -> a Framework. Extra fields are ignored; missing ones fall
        back. Raises ValueError only when there is no id and no name to stand on."""
        ident = str(row.get("id") or "").strip()
        name = str(row.get("name") or "").strip()
        if not ident or not name:
            raise ValueError("a framework needs both an id and a name")
        levels = tuple(level for level in _strings(row.get("levels")) if in_scope(level))
        return cls(
            id=ident,
            name=name,
            kind=coerce_kind(row.get("kind")),
            status=coerce_status(row.get("status")),
            aliases=tuple(dict.fromkeys(_strings(row.get("aliases")))),
            country=(str(row["country"]).strip().upper() or None) if row.get("country") else None,
            region=(str(row["region"]).strip() or None) if row.get("region") else None,
            languages=tuple(_strings(row.get("languages"))) or ("en",),
            levels=levels,
            official_site=(str(row["official_site"]) or None) if row.get("official_site") else None,
            owner_subject=(str(row["owner_subject_id"]) if row.get("owner_subject_id") else None),
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind.value,
            "status": self.status.value,
            "aliases": list(self.aliases),
            "country": self.country,
            "region": self.region,
            "languages": list(self.languages),
            "levels": list(self.levels_in_scope()),
            "official_site": self.official_site,
            "personal": self.personal,
        }


@dataclass(frozen=True)
class Version:
    """One academic year or edition. Immutable once ``published_at`` is set (§2)."""

    id: str
    framework_id: str
    label: str
    status: Status = Status.PROVISIONAL
    supersedes: str | None = None
    published_at: str | None = None
    document_hash: str | None = None
    source_url: str | None = None

    @property
    def published(self) -> bool:
        return bool(self.published_at)

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> Version:
        ident = str(row.get("id") or "").strip()
        framework_id = str(row.get("framework_id") or "").strip()
        label = str(row.get("label") or "").strip()
        if not ident or not framework_id or not label:
            raise ValueError("a version needs an id, a framework_id and a label")
        return cls(
            id=ident,
            framework_id=framework_id,
            label=label,
            status=coerce_status(row.get("status")),
            supersedes=str(row["supersedes"]) if row.get("supersedes") else None,
            published_at=str(row["published_at"]) if row.get("published_at") else None,
            document_hash=str(row["document_hash"]) if row.get("document_hash") else None,
            source_url=str(row["source_url"]) if row.get("source_url") else None,
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "framework_id": self.framework_id,
            "label": self.label,
            "status": self.status.value,
            "supersedes": self.supersedes,
            "published_at": self.published_at,
        }


@dataclass(frozen=True)
class Node:
    """A level, subject, unit, topic or objective. ``order`` is the framework's own order."""

    id: str
    version_id: str
    kind: NodeKind
    name: str
    parent_id: str | None = None
    order: int = 0
    aliases: tuple[str, ...] = ()
    source_ref: dict[str, Any] | None = None
    concept_ids: tuple[str, ...] = ()

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> Node:
        ident = str(row.get("id") or "").strip()
        version_id = str(row.get("version_id") or "").strip()
        name = str(row.get("name") or "").strip()
        if not ident or not version_id or not name:
            raise ValueError("a node needs an id, a version_id and a name")
        source_ref = row.get("source_ref")
        return cls(
            id=ident,
            version_id=version_id,
            kind=coerce_node_kind(row.get("kind")),
            name=name,
            parent_id=str(row["parent_id"]) if row.get("parent_id") else None,
            order=_int(row.get("order_index", row.get("order", 0))),
            aliases=tuple(_strings(row.get("aliases"))),
            source_ref=source_ref if isinstance(source_ref, dict) else None,
            concept_ids=tuple(_strings(row.get("concept_ids"))),
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind.value,
            "name": self.name,
            "parent_id": self.parent_id,
            "order": self.order,
            "aliases": list(self.aliases),
            "source_ref": self.source_ref,
            "concept_ids": list(self.concept_ids),
        }


@dataclass(frozen=True)
class Provenance:
    """Where a node came from and who checked it (§5). No node is served without one."""

    version_id: str
    node_id: str | None = None
    source_url: str | None = None
    source_page_or_section: str | None = None
    document_hash: str | None = None
    fetched_at: str | None = None
    extractor_model: str | None = None
    verifier_model: str | None = None
    checks_passed: tuple[str, ...] = ()
    verified_at: str | None = None
    verified_by: str | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> Provenance:
        return cls(
            version_id=str(row.get("version_id") or ""),
            node_id=str(row["node_id"]) if row.get("node_id") else None,
            source_url=row.get("source_url"),
            source_page_or_section=row.get("source_page_or_section"),
            document_hash=row.get("document_hash"),
            fetched_at=row.get("fetched_at"),
            extractor_model=row.get("extractor_model"),
            verifier_model=row.get("verifier_model"),
            checks_passed=tuple(_strings(row.get("checks_passed"))),
            verified_at=row.get("verified_at"),
            verified_by=row.get("verified_by"),
        )

    def as_dict(self) -> dict[str, Any]:
        """What a learner is shown about a source. The model ids stay inside the brain: a
        provider name in a learner-facing payload breaks the white-label rule (WOBO-PLAN §1)."""
        return {
            "source_url": self.source_url,
            "source": self.source_page_or_section,
            "fetched_at": self.fetched_at,
            "checks_passed": list(self.checks_passed),
            "verified_at": self.verified_at,
            "verified_by": self.verified_by,
        }


@dataclass
class Overlay:
    """The learner's edits on one version, as an ordered patch of ops (§6)."""

    subject_id: str
    version_id: str
    patch: list[dict[str, Any]] = field(default_factory=list)
    last_report: list[str] = field(default_factory=list)
    updated_at: str | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> Overlay:
        patch = row.get("patch")
        report = row.get("last_report")
        return cls(
            subject_id=str(row.get("subject_id") or ""),
            version_id=str(row.get("version_id") or ""),
            patch=[op for op in patch if isinstance(op, dict)] if isinstance(patch, list) else [],
            last_report=_strings(report),
            updated_at=row.get("updated_at"),
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "version_id": self.version_id,
            "ops": list(self.patch),
            "last_report": list(self.last_report),
            "updated_at": self.updated_at,
        }


@dataclass
class DiscoveryJob:
    """One run of §4, from the moment a learner asked for a syllabus we do not hold."""

    id: str
    query: str
    state: JobState = JobState.QUEUED
    framework_id: str | None = None
    level: str | None = None
    subject: str | None = None
    message: str | None = None
    result: dict[str, Any] | None = None
    requested_by: str | None = None
    attempts: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @property
    def open(self) -> bool:
        return job_is_open(self.state)

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> DiscoveryJob:
        ident = str(row.get("id") or "").strip()
        if not ident:
            raise ValueError("a discovery job needs an id")
        result = row.get("result")
        return cls(
            id=ident,
            query=str(row.get("query") or ""),
            state=coerce_job_state(row.get("state")),
            framework_id=str(row["framework_id"]) if row.get("framework_id") else None,
            level=str(row["level"]) if row.get("level") else None,
            subject=str(row["subject"]) if row.get("subject") else None,
            message=row.get("message"),
            result=result if isinstance(result, dict) else None,
            requested_by=str(row["requested_by"]) if row.get("requested_by") else None,
            attempts=_int(row.get("attempts")),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.id,
            "state": self.state.value,
            "framework_id": self.framework_id,
            "level": self.level,
            "subject": self.subject,
            "open": self.open,
        }
