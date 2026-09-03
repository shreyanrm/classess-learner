"""Immutability, and the diff a learner reads on an upgrade (docs/CURRICULUM.md §2, §6).

Two laws, both enforced here and again in the database (migration 0008):

1. **Nothing is edited in place after publication.** A published version is frozen. A correction
   is a NEW version carrying ``supersedes``, so the old one is still there for every learner
   pinned to it. :func:`assert_editable` and :func:`correction` are the only two doors.
2. **A learner is told what moved.** :func:`diff` compares two versions' node trees and returns
   one line per change, in Wobo's voice — sentence case, no exclamation marks, no counts the
   learner did not ask for.

Matching nodes across versions is by shape, not by id: a new version is a new extraction, so
every id is new. Two nodes are "the same node" when they have the same kind and the same
normalised name under the same normalised parent path. That is why a rename shows up as a rename
only when the node stayed in place, and as a remove plus an add when it also moved: we would
rather report two honest lines than guess at an identity.
"""

from __future__ import annotations

import re
import unicodedata
import uuid
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, replace
from typing import Any

from wobo_gateway.curriculum.models import Node, NodeKind, Status, Version


class ImmutableVersion(Exception):
    """An attempt to change a published version. The answer is a new version, never an edit."""

    def __init__(self, version_id: str, what: str = "version") -> None:
        self.version_id = version_id
        super().__init__(
            f"{what} belongs to published version {version_id}: publish a new version "
            "with supersedes instead of editing this one"
        )


def assert_editable(version: Version, what: str = "version") -> None:
    """Raise unless this version is still a draft. Every write path calls this first."""
    if version.published:
        raise ImmutableVersion(version.id, what)


def publish(version: Version, *, at: str, status: Status | None = None) -> Version:
    """Freeze a draft. After this the only way to change anything is :func:`correction`."""
    assert_editable(version)
    return replace(
        version, published_at=at, status=status if status is not None else version.status
    )


def correction(
    version: Version,
    *,
    label: str,
    status: Status = Status.PROVISIONAL,
    version_id: str | None = None,
    source_url: str | None = None,
    document_hash: str | None = None,
) -> Version:
    """The successor of a published version: a new id, a new label, pointing back at the old one.

    ``supersedes`` is what makes a correction a correction rather than an unrelated edition, and
    it is what the upgrade offer follows.
    """
    if not label.strip():
        raise ValueError("a correction needs its own label")
    if label.strip() == version.label:
        raise ValueError("a correction needs a label of its own, not the one it supersedes")
    return Version(
        id=version_id or str(uuid.uuid4()),
        framework_id=version.framework_id,
        label=label.strip(),
        status=status,
        supersedes=version.id,
        published_at=None,
        document_hash=document_hash,
        source_url=source_url if source_url is not None else version.source_url,
    )


def supersedes_chain(versions: Sequence[Version], head: Version) -> list[Version]:
    """``head`` and everything it corrects, newest first. Cycles are broken, not followed."""
    by_id = {version.id: version for version in versions}
    chain: list[Version] = [head]
    seen = {head.id}
    cursor = head
    while cursor.supersedes and cursor.supersedes in by_id and cursor.supersedes not in seen:
        cursor = by_id[cursor.supersedes]
        seen.add(cursor.id)
        chain.append(cursor)
    return chain


# --- the diff ---------------------------------------------------------------------------------

_PUNCT = re.compile(r"[^a-z0-9]+")


def normalise(name: str) -> str:
    """A name reduced to what it means: lowercased, unaccented, punctuation collapsed.

    "Matter in Our Surroundings" and "matter in our surroundings" are one node. "Motion" and
    "Motion and force" are two — we do not fuzzy-match across a version boundary, because a
    near-match that is wrong loses the learner's edits silently.
    """
    folded = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return _PUNCT.sub(" ", folded.lower()).strip()


def path_key(node: Node, by_id: dict[str, Node]) -> tuple[str, ...]:
    """(kind, normalised name) for the node and each ancestor, root first.

    This tuple is the identity we match a node by across two versions."""
    parts: list[tuple[str, str]] = []
    cursor: Node | None = node
    seen: set[str] = set()
    while cursor is not None and cursor.id not in seen:
        seen.add(cursor.id)
        parts.append((cursor.kind.value, normalise(cursor.name)))
        cursor = by_id.get(cursor.parent_id) if cursor.parent_id else None
    parts.reverse()
    return tuple(f"{kind}:{name}" for kind, name in parts)


@dataclass(frozen=True)
class Change:
    """One line of the upgrade report, plus the machine-readable shape behind it."""

    kind: str  # added | removed | moved
    line: str
    node_id: str | None = None
    was_node_id: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "line": self.line,
            "node_id": self.node_id,
            "was_node_id": self.was_node_id,
        }


# Only the levels a learner navigates are worth a line. An objective moving inside a topic is
# noise in an upgrade notice; the topic list is what they will notice.
_REPORTED_KINDS = (NodeKind.LEVEL, NodeKind.SUBJECT, NodeKind.UNIT, NodeKind.TOPIC)


def _where(node: Node, by_id: dict[str, Node]) -> str:
    parent = by_id.get(node.parent_id) if node.parent_id else None
    return parent.name if parent is not None else ""


def diff(old: Iterable[Node], new: Iterable[Node]) -> list[Change]:
    """What moved between two versions, one line per change (§6, "diff on upgrade")."""
    old_nodes = [n for n in old if n.kind in _REPORTED_KINDS]
    new_nodes = [n for n in new if n.kind in _REPORTED_KINDS]
    old_by_id = {n.id: n for n in old}
    new_by_id = {n.id: n for n in new}

    old_keys = {path_key(n, old_by_id): n for n in old_nodes}
    new_keys = {path_key(n, new_by_id): n for n in new_nodes}

    changes: list[Change] = []

    for key, node in new_keys.items():
        if key in old_keys:
            was = old_keys[key]
            if was.order != node.order:
                changes.append(
                    Change(
                        kind="moved",
                        line=f"{node.name} moved to number {node.order + 1}",
                        node_id=node.id,
                        was_node_id=was.id,
                    )
                )
            continue
        where = _where(node, new_by_id)
        line = f"{node.name} is new" + (f", in {where}" if where else "")
        changes.append(Change(kind="added", line=line, node_id=node.id))

    for key, node in old_keys.items():
        if key in new_keys:
            continue
        where = _where(node, old_by_id)
        line = f"{node.name} is gone" + (f", from {where}" if where else "")
        changes.append(Change(kind="removed", line=line, was_node_id=node.id))

    # Deterministic order: what arrived, what left, what shuffled — and alphabetical inside each,
    # so the same upgrade reads the same way twice.
    rank = {"added": 0, "removed": 1, "moved": 2}
    changes.sort(key=lambda change: (rank[change.kind], change.line))
    return changes


def summarise(changes: Sequence[Change]) -> str:
    """One sentence above the list. Says the size of the change, never sells it."""
    if not changes:
        return "Nothing moved in this edition"
    if len(changes) == 1:
        return "One thing moved in this edition"
    return f"{len(changes)} things moved in this edition"
