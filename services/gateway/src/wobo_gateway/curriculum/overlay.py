"""The learner's overlay (docs/CURRICULUM.md §6).

A learner may add, remove, reorder, rename, mark "not in my school", and attach their own
textbook. None of that touches a canonical node: the edits are an ordered patch keyed by
canonical node ids, stored per (subject, version), and re-applied when the version upgrades.

Six ops, and no seventh without a line in CURRICULUM.md:

    {"op": "add",               "parent_id": id|null, "kind": "unit"|"topic", "name": str,
                                "after": id|null}
    {"op": "remove",            "node_id": id}
    {"op": "rename",            "node_id": id, "name": str}
    {"op": "reorder",           "parent_id": id|null, "order": [id, ...]}
    {"op": "not_in_my_school",  "node_id": id, "value": bool}
    {"op": "attach_textbook",   "node_id": id, "textbook": {title, publisher?, url?, isbn?}}

Two properties the tests hold us to:

* **Order is meaning.** The patch is a list, applied in order, so a rename after a rename wins
  and a remove after an add removes. Nothing is merged by key.
* **An upgrade never loses an edit silently.** :func:`reapply` keeps every op whose node still
  exists and returns one plain line for each op it had to drop, which the learner reads.

Every op an added node carries an id of its own (``own:<uuid>``), so the learner's own chapter
can be renamed, reordered and removed like any other — and can never collide with a canonical id.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable, Sequence
from typing import Any

from wobo_gateway.curriculum.models import Node, NodeKind

OWN_PREFIX = "own:"

# Ceilings. An overlay is a learner's notes on a chapter list, not a document store: without a
# bound, one PATCH is an unbounded write into a row every read of that syllabus then loads.
MAX_OPS = 400
MAX_NAME = 200
MAX_ORDER = 500
MAX_TEXTBOOK_FIELD = 200
_ADDABLE_KINDS = frozenset({NodeKind.UNIT.value, NodeKind.TOPIC.value})
_TEXTBOOK_FIELDS = ("title", "publisher", "url", "isbn")
OPS = ("add", "remove", "rename", "reorder", "not_in_my_school", "attach_textbook")


class OverlayRejected(Exception):
    """A patch we will not store. The message is what the learner reads, in Wobo's voice."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def _text(value: Any, *, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise OverlayRejected(f"That edit needs a {field}.")
    text = value.strip()
    if len(text) > limit:
        raise OverlayRejected(f"That {field} is longer than I can keep. Try a shorter one.")
    return text


def _node_id(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise OverlayRejected("That edit does not say which item it is about.")
    ident = value.strip()
    if len(ident) > 128:
        raise OverlayRejected("That edit does not say which item it is about.")
    return ident


def _own_id(value: Any) -> str:
    """The id of a node the learner added. Theirs, in their own namespace, or minted here."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return f"{OWN_PREFIX}{uuid.uuid4()}"
    ident = _node_id(value)
    if not ident.startswith(OWN_PREFIX):
        raise OverlayRejected("I could not add that item.")
    return ident


def _textbook(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        raise OverlayRejected("Tell me the name of the textbook and I will attach it.")
    book = {
        key: _text(value[key], field=key, limit=MAX_TEXTBOOK_FIELD)
        for key in _TEXTBOOK_FIELDS
        if value.get(key) is not None
    }
    if "title" not in book:
        raise OverlayRejected("Tell me the name of the textbook and I will attach it.")
    url = book.get("url")
    if url is not None and not url.lower().startswith(("http://", "https://")):
        raise OverlayRejected("That textbook link does not look like a web address.")
    return book


def validate_op(op: Any) -> dict[str, Any]:
    """One op, normalised, or :class:`OverlayRejected`. Unknown keys are dropped, not stored."""
    if not isinstance(op, dict):
        raise OverlayRejected("I could not read that edit.")
    name = op.get("op")
    if name not in OPS:
        raise OverlayRejected("I do not know how to make that edit.")

    if name == "add":
        kind = str(op.get("kind") or NodeKind.TOPIC.value)
        if kind not in _ADDABLE_KINDS:
            raise OverlayRejected("You can add a chapter or a topic of your own.")
        parent = op.get("parent_id")
        after = op.get("after")
        return {
            "op": "add",
            # The learner may name their own node so a retry of the same add is idempotent, but
            # only inside their own namespace. A client-sent canonical id would put a learner's
            # item where a board's node lives: `op_node_ids` does not inspect an add's id, so the
            # unknown-node check never sees it, and a later remap would then rewrite a remove of
            # their own item into a remove of a canonical node in the next version.
            "id": _own_id(op.get("id")),
            "kind": kind,
            "name": _text(op.get("name"), field="name", limit=MAX_NAME),
            "parent_id": _node_id(parent) if parent else None,
            "after": _node_id(after) if after else None,
        }
    if name == "remove":
        return {"op": "remove", "node_id": _node_id(op.get("node_id"))}
    if name == "rename":
        return {
            "op": "rename",
            "node_id": _node_id(op.get("node_id")),
            "name": _text(op.get("name"), field="name", limit=MAX_NAME),
        }
    if name == "reorder":
        order = op.get("order")
        if not isinstance(order, list) or not order:
            raise OverlayRejected("Tell me the order you want and I will keep it.")
        if len(order) > MAX_ORDER:
            raise OverlayRejected("That is more items than I can reorder at once.")
        parent = op.get("parent_id")
        return {
            "op": "reorder",
            "parent_id": _node_id(parent) if parent else None,
            "order": [_node_id(item) for item in order],
        }
    if name == "not_in_my_school":
        return {
            "op": "not_in_my_school",
            "node_id": _node_id(op.get("node_id")),
            "value": bool(op.get("value", True)),
        }
    return {
        "op": "attach_textbook",
        "node_id": _node_id(op.get("node_id")),
        "textbook": _textbook(op.get("textbook")),
    }


def validate(ops: Any) -> list[dict[str, Any]]:
    """A whole patch. Rejects the patch, never half-stores it."""
    if not isinstance(ops, list):
        raise OverlayRejected("I could not read those edits.")
    if len(ops) > MAX_OPS:
        raise OverlayRejected("That is more edits than I can keep on one syllabus.")
    return [validate_op(op) for op in ops]


def merge(existing: Sequence[dict[str, Any]], incoming: Sequence[dict[str, Any]]) -> list[dict]:
    """Append new ops to the stored patch, keeping order, and stay under the ceiling.

    Ops are not folded together by node id on purpose: "rename, then remove" and "remove, then
    rename" are different intentions, and the second is a mistake we want to keep visible.
    """
    merged = [*existing, *incoming]
    if len(merged) > MAX_OPS:
        raise OverlayRejected("That is more edits than I can keep on one syllabus.")
    return merged


def op_node_ids(ops: Iterable[dict[str, Any]]) -> set[str]:
    """Every canonical node id a patch depends on. Ids the learner minted are not canonical."""
    ids: set[str] = set()
    for op in ops:
        if op.get("op") == "reorder":
            ids.update(str(i) for i in op.get("order", []) if not str(i).startswith(OWN_PREFIX))
            parent = op.get("parent_id")
            if parent and not str(parent).startswith(OWN_PREFIX):
                ids.add(str(parent))
            continue
        if op.get("op") == "add":
            parent = op.get("parent_id")
            if parent and not str(parent).startswith(OWN_PREFIX):
                ids.add(str(parent))
            continue
        node_id = op.get("node_id")
        if node_id and not str(node_id).startswith(OWN_PREFIX):
            ids.add(str(node_id))
    return ids


def _view(node: Node) -> dict[str, Any]:
    view = node.as_dict()
    view["own"] = False
    view["not_in_my_school"] = False
    view["textbook"] = None
    view["renamed_from"] = None
    return view


def _own_view(op: dict[str, Any], parent_id: str | None) -> dict[str, Any]:
    return {
        "id": op["id"],
        "kind": op["kind"],
        "name": op["name"],
        "parent_id": op.get("parent_id") or parent_id,
        "order": 0,
        "aliases": [],
        "source_ref": None,
        "concept_ids": [],
        "own": True,
        "not_in_my_school": False,
        "textbook": None,
        "renamed_from": None,
    }


def apply(
    nodes: Sequence[Node], ops: Sequence[dict[str, Any]], *, parent_id: str | None = None
) -> list[dict[str, Any]]:
    """The list the learner sees: canonical siblings plus their own, in their own order.

    ``nodes`` is one sibling set (the units of a subject, the topics of a unit). Ops that name a
    node outside it are skipped rather than raising — a stored patch spans a whole syllabus and
    is applied one list at a time.
    """
    views: dict[str, dict[str, Any]] = {node.id: _view(node) for node in nodes}
    order: list[str] = [node.id for node in nodes]

    for op in ops:
        name = op.get("op")
        if name == "add":
            if (op.get("parent_id") or parent_id) != parent_id:
                continue
            ident = str(op.get("id") or "")
            if not ident or ident in views:
                continue
            views[ident] = _own_view(op, parent_id)
            after = op.get("after")
            if after and after in order:
                order.insert(order.index(str(after)) + 1, ident)
            else:
                order.append(ident)
            continue

        if name == "reorder":
            if op.get("parent_id") != parent_id:
                continue
            wanted = [str(i) for i in op.get("order", []) if str(i) in views]
            order = wanted + [ident for ident in order if ident not in set(wanted)]
            continue

        node_id = str(op.get("node_id") or "")
        view = views.get(node_id)
        if view is None:
            continue
        if name == "remove":
            del views[node_id]
            order = [ident for ident in order if ident != node_id]
        elif name == "rename":
            if view["renamed_from"] is None:
                view["renamed_from"] = view["name"]
            view["name"] = op["name"]
        elif name == "not_in_my_school":
            view["not_in_my_school"] = bool(op.get("value", True))
        elif name == "attach_textbook":
            view["textbook"] = dict(op.get("textbook") or {})

    out: list[dict[str, Any]] = []
    for position, ident in enumerate(order):
        view = views[ident]
        view["order"] = position
        out.append(view)
    return out


def remap(old_nodes: Sequence[Node], new_nodes: Sequence[Node]) -> dict[str, str]:
    """Old node id -> the id of the same node in the new version.

    This is the whole reason an overlay survives an upgrade. A new version is a new extraction,
    so every id in it is new; matching by id alone would drop every edit a learner ever made.
    Two nodes are the same node when they have the same kind and the same normalised name under
    the same normalised parent path — the identity :func:`versions.diff` reports against, so the
    diff a learner reads and the edits we carry across can never disagree.
    """
    from wobo_gateway.curriculum.versions import path_key

    old_by_id = {node.id: node for node in old_nodes}
    new_by_id = {node.id: node for node in new_nodes}
    arrived = {path_key(node, new_by_id): node.id for node in new_nodes}
    return {
        node.id: arrived[path_key(node, old_by_id)]
        for node in old_nodes
        if path_key(node, old_by_id) in arrived
    }


def _rewrite(op: dict[str, Any], mapping: dict[str, str]) -> dict[str, Any]:
    """The same op, pointing at the new version's ids. Own ids are left exactly as they are."""

    def moved(ident: Any) -> Any:
        text = str(ident) if ident is not None else None
        if text is None or text.startswith(OWN_PREFIX):
            return ident
        return mapping.get(text, ident)

    out = dict(op)
    if "node_id" in out:
        out["node_id"] = moved(out["node_id"])
    if "parent_id" in out:
        out["parent_id"] = moved(out["parent_id"])
    if "after" in out:
        out["after"] = moved(out["after"])
    if isinstance(out.get("order"), list):
        out["order"] = [moved(ident) for ident in out["order"]]
    return out


def reapply(
    ops: Sequence[dict[str, Any]], mapping: dict[str, str]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    """Carry a patch onto a new version. Returns (kept and re-keyed, dropped, report).

    An op survives when every canonical node it names is still there under a new id. One that is
    not is dropped and reported in one plain line, because the alternative — silently applying it
    to whatever now sits at that position — is worse than losing it (§12).
    """
    kept: list[dict[str, Any]] = []
    dropped: list[dict[str, Any]] = []
    report: list[str] = []
    own: set[str] = set()

    for op in ops:
        needed = {
            ident
            for ident in op_node_ids([op])
            if not ident.startswith(OWN_PREFIX) and ident not in own
        }
        if op.get("op") == "add":
            own.add(str(op.get("id") or ""))
        if needed <= set(mapping):
            kept.append(_rewrite(op, mapping))
            continue
        dropped.append(op)
        report.append(_dropped_line(op))
    return kept, dropped, report


_DROP_LINES = {
    "rename": "your new name for {what}",
    "remove": "your removal of {what}",
    "not_in_my_school": "your note that {what} is not in your school",
    "attach_textbook": "your textbook on {what}",
    "reorder": "your order for {what}",
    "add": "your own item under {what}",
}


def _dropped_line(op: dict[str, Any]) -> str:
    what = str(op.get("node_name") or "").strip() or "something that has since moved"
    template = _DROP_LINES.get(str(op.get("op")), "your edit to {what}")
    return f"I could not carry across {template.format(what=what)}."


def annotate(ops: Sequence[dict[str, Any]], names: dict[str, str]) -> list[dict[str, Any]]:
    """Stamp each op with the name of the node it was made against, so a future upgrade can
    tell the learner WHICH edit it could not carry across rather than "one of your edits"."""
    out: list[dict[str, Any]] = []
    for op in ops:
        stamped = dict(op)
        target = str(op.get("node_id") or op.get("parent_id") or "")
        if target and target in names:
            stamped["node_name"] = names[target]
        out.append(stamped)
    return out
