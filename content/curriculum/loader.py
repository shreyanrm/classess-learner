"""Read ``frameworks.seed.json`` into typed rows.

The one supported way to get the seed into a program. ``build.py`` writes the file,
this reads it, and nothing else in the repository should be parsing that JSON by hand.

    from loader import load_seed
    for framework in load_seed():
        ...

Standard library only, and no imports from this repository, so the same module serves
the gateway, a migration script, and a one-off at a shell prompt. The gateway's own
``wobo_gateway.curriculum.store.load_seed`` reads the same file into its richer
``Seed`` (frameworks plus the stored syllabi under ``syllabi/``); this is the narrow
frameworks-only view, and the two agree entry for entry — a test holds them to it.

Two rules this module keeps, both from ``docs/CURRICULUM.md``:

- **Levels are filtered to grades 4 to 13** (§11). A level whose name carries no number
  is kept rather than guessed at, because "IGCSE" and "Secondary 3" are real level names
  and dropping them would be worse than keeping them.
- **``verified`` is never inferred** (§5). A row is verified only if the file says so
  *and* carries the confirmed site check that says so, which is a claim about the board's
  website on the date recorded and about nothing else. A row that disagrees with itself
  is read as provisional, the weaker of the two claims.
"""

from __future__ import annotations

import json
import os
import re
from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

__all__ = [
    "Framework",
    "SeedError",
    "load_seed",
    "load_document",
    "seed_path",
    "in_scope",
    "level_order",
    "KINDS",
    "STATUSES",
    "LEVEL_MIN",
    "LEVEL_MAX",
]

HERE = Path(__file__).resolve().parent
SEED_FILENAME = "frameworks.seed.json"

KINDS = frozenset(
    {"national", "state", "international", "open", "homeschool", "online", "personal"}
)
STATUSES = frozenset({"verified", "provisional", "community", "personal"})

# 4 to 13 (§11), plus 14 for Northern Ireland, which numbers its school years 1 to 14 —
# one ahead of England — so its Year 14 is the same last year of school as England's Year 13.
# ``build.py`` draws the range the same way; the two must agree or the builder would pass a
# file this loader then strips.
LEVEL_MIN, LEVEL_MAX = 4, 14

# A number is a grade ONLY when the level is named in grade vocabulary. This is the whole
# subtlety of the field, and getting it wrong is silent: "Secondary 1", "S1", "MYP 1", "JC1"
# and "DP Year 1" all carry a 1 that counts from the start of a *stage*, not from the start
# of school. Reading it as a grade puts Singapore's Secondary 1, Scotland's S1, IB MYP 1 and
# the whole of IB DP outside grades 4 to 13 and drops them, leaving a learner who picks IB DP
# with no level to choose. So the rule is narrow on purpose: range-check what is unambiguously
# a grade, and carry everything else the way the framework wrote it, exactly as "IGCSE" is
# carried. ``build.py``'s GRADE_LEVEL_RE is the same vocabulary, deliberately.
_GRADE_NAME = re.compile(
    r"^(?:Class|Grade|Year|Standard|Form|Stage)\s+(\d{1,2}|[IVX]+)$", re.IGNORECASE
)
_ROMAN = {
    "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9,
    "X": 10, "XI": 11, "XII": 12, "XIII": 13,
}  # fmt: skip


class SeedError(Exception):
    """The seed file is missing, unreadable, or not the shape this module contracts for.

    Raised rather than swallowed: a caller seeding a database from an empty list would
    write nothing and report success, which is the failure that hides longest.
    """


# --------------------------------------------------------------------------- levels


def level_order(name: str | None) -> int | None:
    """The grade number a level name states, or ``None`` when it states none.

    ``"Class 9"`` -> 9, ``"Grade 10"`` -> 10, ``"Year 11"`` -> 11, ``"Class IX"`` -> 9.

    ``None`` for everything that is not a bare grade name, digits in it or not:
    ``"IGCSE"``, ``"S1"``, ``"Secondary 1"``, ``"MYP 1"``, ``"JC2"``, ``"DP Year 1"``.
    Those numbers count from the start of a stage, not from the start of school, and
    reading one as a grade is how a framework loses its levels.
    """
    if not name:
        return None
    match = _GRADE_NAME.match(name.strip())
    if not match:
        return None
    token = match.group(1)
    if token.isdigit():
        return int(token)
    return _ROMAN.get(token.upper())


def in_scope(name: str | None) -> bool:
    """School level, grades 4 to 13 (§11).

    A level that does not state a grade is in scope. We would rather carry "IGCSE",
    "Secondary 1" and "DP Year 1" than drop them for failing to look like a grade —
    the framework's own vocabulary is the one the learner picks from (§11), and a name
    we cannot read a grade out of is not evidence the level is out of range.
    """
    order = level_order(name)
    return order is None or LEVEL_MIN <= order <= LEVEL_MAX


# ------------------------------------------------------------------------ the row


@dataclass(frozen=True)
class Framework:
    """One row of the registry: a board, programme, or curriculum.

    Frozen, because a loaded seed is a reading of a file on disk and callers that want
    to change one should change the file and re-run ``build.py``.
    """

    id: str
    name: str
    kind: str
    country: str | None = None
    region: str | None = None
    aliases: tuple[str, ...] = ()
    languages: tuple[str, ...] = ("en",)
    levels: tuple[str, ...] = ()
    official_site: str | None = None
    status: str = "provisional"
    #: The site's page title corroborated this entry's name (or an owner reviewed it). What
    #: `verified` stands on — never reachability alone, which is `site_reachable`.
    verified_site: bool = False
    #: The declared official site answered under 400. A fact about a host, not about a board.
    site_reachable: bool = False
    #: One line saying why this entry reads verified or provisional, written by `build.py`.
    status_reason: str | None = None
    checked_at: str | None = None
    note: str | None = None
    check: dict[str, Any] = field(default_factory=dict, repr=False, compare=False)

    @property
    def verified(self) -> bool:
        return self.status == "verified"

    @property
    def search_terms(self) -> tuple[str, ...]:
        """Name first, then aliases, deduplicated case-insensitively. What type-ahead matches."""
        seen: dict[str, str] = {}
        for term in (self.name, *self.aliases):
            seen.setdefault(_fold(term), term)
        return tuple(seen.values())

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> Framework:
        """One JSON object -> one ``Framework``.

        Raises :class:`SeedError` on a row with no id or no name, and on an unknown kind.
        Everything else is coerced, because a ragged optional field should not stop a
        registry of several hundred entries from loading.
        """
        ident = _text(row.get("id"))
        name = _text(row.get("name"))
        if not ident or not name:
            raise SeedError(f"a framework needs both an id and a name: {row!r:.120}")

        kind = _text(row.get("kind")).lower()
        if kind not in KINDS:
            raise SeedError(f"{ident}: unknown kind {kind!r}")

        status = _text(row.get("status")).lower() or "provisional"
        if status not in STATUSES:
            status = "provisional"

        check = row.get("check") if isinstance(row.get("check"), dict) else {}
        confirmed = bool(row.get("verified_site")) and bool(check.get("ok"))
        # §5: verified is a claim, and a claim needs its evidence attached. A row that
        # says verified without a passing check is read down, never up.
        if status == "verified" and not confirmed:
            status = "provisional"

        country = _text(row.get("country")).upper() or None
        return cls(
            id=ident,
            name=name,
            kind=kind,
            country=country,
            region=_text(row.get("region")) or None,
            aliases=_unique_strings(row.get("aliases")),
            languages=_unique_strings(row.get("languages")) or ("en",),
            levels=tuple(lv for lv in _unique_strings(row.get("levels")) if in_scope(lv)),
            official_site=_text(row.get("official_site")) or None,
            status=status,
            verified_site=confirmed,
            site_reachable=bool(row.get("site_reachable")) or bool(check.get("ok")),
            status_reason=_text(row.get("status_reason")) or None,
            checked_at=_text(row.get("checked_at")) or None,
            note=_text(row.get("note")) or None,
            check=dict(check),
        )

    def as_dict(self) -> dict[str, Any]:
        """The shape the API hands a client. No ``check`` — that is review material, not product."""
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind,
            "country": self.country,
            "region": self.region,
            "aliases": list(self.aliases),
            "languages": list(self.languages),
            "levels": list(self.levels),
            "official_site": self.official_site,
            "status": self.status,
        }


# --------------------------------------------------------------------------- coerce


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _fold(value: str) -> str:
    return " ".join(value.split()).casefold()


def _unique_strings(value: Any) -> tuple[str, ...]:
    """A list of non-empty strings, order kept, duplicates dropped case-insensitively."""
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, (list, tuple)):
        return ()
    seen: dict[str, str] = {}
    for item in value:
        text = _text(item) if isinstance(item, str) else _text(str(item))
        if text:
            seen.setdefault(_fold(text), text)
    return tuple(seen.values())


# ----------------------------------------------------------------------------- io


def seed_path(root: str | os.PathLike[str] | None = None) -> Path:
    """Where the seed lives.

    ``root`` wins, then ``WOBO_CURRICULUM_CONTENT`` so a test or a container can point
    somewhere else, then this file's own directory. A directory is resolved to the seed
    inside it; a path to a ``.json`` file is taken as the file itself.
    """
    base = root if root is not None else os.getenv("WOBO_CURRICULUM_CONTENT") or HERE
    path = Path(base).expanduser()
    return path if path.suffix == ".json" else path / SEED_FILENAME


def load_document(root: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    """The whole seed file, header and all. ``load_seed`` is what most callers want."""
    path = seed_path(root)
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SeedError(f"cannot read the curriculum seed at {path}: {exc}") from exc
    try:
        document = json.loads(raw)
    except ValueError as exc:
        raise SeedError(f"the curriculum seed at {path} is not valid JSON: {exc}") from exc
    if not isinstance(document, dict):
        raise SeedError(f"the curriculum seed at {path} is not a JSON object")
    return document


def load_seed(root: str | os.PathLike[str] | None = None) -> list[Framework]:
    """Every framework in the registry, in file order.

    Raises :class:`SeedError` if the file is missing, unreadable, not JSON, carries no
    framework list, or holds a duplicate id. A duplicate id is fatal rather than skipped
    because ids are written into learner records: two rows claiming one id means one
    learner's board silently becomes another's, and it must be caught at the seam.
    """
    document = load_document(root)
    rows = document.get("frameworks")
    if not isinstance(rows, list) or not rows:
        raise SeedError("the curriculum seed carries no frameworks")

    frameworks: list[Framework] = []
    seen: dict[str, int] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise SeedError(f"entry {index} is not an object")
        framework = Framework.from_row(row)
        if framework.id in seen:
            raise SeedError(
                f"duplicate framework id {framework.id!r} at entries "
                f"{seen[framework.id]} and {index}"
            )
        seen[framework.id] = index
        frameworks.append(framework)
    return frameworks


# ------------------------------------------------------------------------ helpers


def by_id(frameworks: Sequence[Framework] | None = None) -> dict[str, Framework]:
    """An id -> framework index, for a caller resolving a stored framework id."""
    return {f.id: f for f in (frameworks if frameworks is not None else load_seed())}


def alias_index(frameworks: Sequence[Framework] | None = None) -> dict[str, str]:
    """A folded search term -> framework id map. Names and aliases, both.

    Every term in the file is unique across the whole registry — ``build.py`` fails the
    build otherwise — so this never has to decide between two boards.
    """
    index: dict[str, str] = {}
    for framework in frameworks if frameworks is not None else load_seed():
        for term in framework.search_terms:
            index.setdefault(_fold(term), framework.id)
    return index


def iter_seed(root: str | os.PathLike[str] | None = None) -> Iterator[Framework]:
    """``load_seed`` as an iterator, for a caller streaming rows into a database."""
    yield from load_seed(root)
