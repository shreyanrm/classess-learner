"""The three laws with logic behind them: honest labels (§5), immutable versions (§2), and an
overlay that survives an upgrade (§6).

These are the rules CURRICULUM.md §12 says kill the product when they slip, so each one is
asserted against the wording and the behaviour the document specifies, not against the code.
"""

from __future__ import annotations

import pytest
from wobo_gateway.curriculum import labels, overlay, versions
from wobo_gateway.curriculum.models import (
    Framework,
    FrameworkKind,
    JobState,
    Node,
    NodeKind,
    Status,
    Version,
)

BOARD = Framework(
    id="cbse",
    name="CBSE",
    kind=FrameworkKind.NATIONAL,
    status=Status.VERIFIED,
    levels=("Class 9",),
)


def node(ident: str, name: str, kind: NodeKind, parent: str | None, order: int = 0) -> Node:
    return Node(id=ident, version_id="v", kind=kind, name=name, parent_id=parent, order=order)


# --- labels (§5) -------------------------------------------------------------------------------
def test_the_four_labels_are_the_ones_the_document_names() -> None:
    assert labels.label(Status.VERIFIED, framework_name="CBSE", version_label="2026-27") == (
        "Official CBSE 2026-27, verified"
    )
    assert labels.label(Status.PROVISIONAL) == "Found on the board's site, still checking"
    assert labels.label(Status.COMMUNITY) == "Shared by another learner, not yet checked"
    assert labels.label(Status.PERSONAL) == "Drafted from your syllabus, check it"


def test_only_verified_names_the_board() -> None:
    """The other three are vague about the source because we are vague about the source."""
    for status in (Status.PROVISIONAL, Status.COMMUNITY, Status.PERSONAL):
        assert "CBSE" not in labels.label(status, framework_name="CBSE", version_label="2026-27")


def test_an_unknown_status_reads_as_the_weakest_claim() -> None:
    assert labels.label("gold-plated") == labels.label(Status.PROVISIONAL)


def test_labels_are_sentence_case_with_no_emoji_or_exclamation() -> None:
    for text in labels.all_labels().values():
        assert not text.endswith((".", "!"))
        assert text[0].isupper()
        assert text.isascii()


def test_the_pair_is_labelled_by_its_weaker_half() -> None:
    """A verified board whose extraction is still provisional is provisional, not verified."""
    draft = Version(id="v", framework_id="cbse", label="2026-27", status=Status.PROVISIONAL)
    assert labels.label_for(BOARD, draft) == labels.label(Status.PROVISIONAL)
    checked = Version(id="v", framework_id="cbse", label="2026-27", status=Status.VERIFIED)
    assert labels.label_for(BOARD, checked) == "Official CBSE 2026-27, verified"


def test_a_personal_framework_keeps_its_own_label() -> None:
    mine = Framework(
        id="own",
        name="My syllabus",
        kind=FrameworkKind.PERSONAL,
        status=Status.PERSONAL,
        owner_subject="s1",
    )
    verified = Version(id="v", framework_id="own", label="2026", status=Status.VERIFIED)
    assert labels.label_for(mine, verified) == "Drafted from your syllabus, check it"


def test_a_refused_search_says_so_and_opens_the_other_door() -> None:
    message = labels.job_message(JobState.REFUSED)
    assert "could not find" in message
    assert "Show me yours" in message


# --- immutability (§2) --------------------------------------------------------------------------
def test_a_published_version_cannot_be_edited() -> None:
    published = versions.publish(
        Version(id="v1", framework_id="cbse", label="2026-27"), at="2026-01-01T00:00:00Z"
    )
    with pytest.raises(versions.ImmutableVersion):
        versions.assert_editable(published)
    with pytest.raises(versions.ImmutableVersion):
        versions.publish(published, at="2026-02-01T00:00:00Z")


def test_a_correction_is_a_new_version_pointing_at_the_old_one() -> None:
    published = versions.publish(
        Version(id="v1", framework_id="cbse", label="2026-27", status=Status.VERIFIED),
        at="2026-01-01T00:00:00Z",
    )
    fixed = versions.correction(published, label="2026-27 rev 2")
    assert fixed.id != published.id
    assert fixed.supersedes == published.id
    assert fixed.framework_id == published.framework_id
    assert not fixed.published  # a correction starts as a draft, and claims the least
    assert fixed.status is Status.PROVISIONAL


def test_a_correction_needs_a_label_of_its_own() -> None:
    published = versions.publish(
        Version(id="v1", framework_id="cbse", label="2026-27"), at="2026-01-01T00:00:00Z"
    )
    with pytest.raises(ValueError):
        versions.correction(published, label="2026-27")
    with pytest.raises(ValueError):
        versions.correction(published, label="  ")


def test_the_supersedes_chain_walks_back_and_survives_a_cycle() -> None:
    first = Version(id="a", framework_id="f", label="1")
    second = Version(id="b", framework_id="f", label="2", supersedes="a")
    third = Version(id="c", framework_id="f", label="3", supersedes="b")
    assert [v.id for v in versions.supersedes_chain([first, second, third], third)] == [
        "c",
        "b",
        "a",
    ]
    loop_a = Version(id="a", framework_id="f", label="1", supersedes="b")
    loop_b = Version(id="b", framework_id="f", label="2", supersedes="a")
    assert len(versions.supersedes_chain([loop_a, loop_b], loop_b)) == 2


# --- the upgrade diff (§6) -----------------------------------------------------------------------
def _tree(units: list[tuple[str, str]], *, orders: dict[str, int] | None = None) -> list[Node]:
    orders = orders or {}
    out = [node("sub", "Science", NodeKind.SUBJECT, None)]
    for ident, name in units:
        out.append(node(ident, name, NodeKind.UNIT, "sub", orders.get(ident, 0)))
    return out


def test_diff_reports_what_arrived_left_and_moved() -> None:
    old = _tree([("u1", "Matter"), ("u2", "Motion")], orders={"u1": 0, "u2": 1})
    new = _tree(
        [("n1", "Matter"), ("n3", "Sound"), ("n2", "Motion")],
        orders={"n1": 0, "n3": 1, "n2": 2},
    )
    changes = versions.diff(old, new)
    kinds = {change.kind for change in changes}
    assert kinds == {"added", "moved"}
    lines = [change.line for change in changes]
    assert "Sound is new, in Science" in lines
    assert "Motion moved to number 3" in lines


def test_diff_reports_a_removal() -> None:
    old = _tree([("u1", "Matter"), ("u2", "Motion")], orders={"u1": 0, "u2": 1})
    new = _tree([("n1", "Matter")], orders={"n1": 0})
    changes = versions.diff(old, new)
    assert [c.kind for c in changes] == ["removed"]
    assert changes[0].line == "Motion is gone, from Science"


def test_diff_matches_across_new_ids_and_ignores_casing() -> None:
    """A new version is a new extraction: every id changed, so identity is the shape."""
    old = _tree([("u1", "Matter in our surroundings")])
    new = _tree([("zzz", "MATTER IN OUR SURROUNDINGS")])
    assert versions.diff(old, new) == []


def test_diff_is_deterministic() -> None:
    old = _tree([("u1", "A"), ("u2", "B")])
    new = _tree([("n1", "C"), ("n2", "D")])
    assert versions.diff(old, new) == versions.diff(old, new)


def test_summary_never_shouts() -> None:
    assert versions.summarise([]) == "Nothing moved in this edition"
    assert "!" not in versions.summarise(versions.diff(_tree([("a", "A")]), _tree([])))


# --- the overlay (§6) ----------------------------------------------------------------------------
UNITS = [
    node("u1", "Matter", NodeKind.UNIT, "sub", 0),
    node("u2", "Motion", NodeKind.UNIT, "sub", 1),
    node("u3", "Sound", NodeKind.UNIT, "sub", 2),
]


def test_every_op_in_the_document_is_supported() -> None:
    assert set(overlay.OPS) == {
        "add",
        "remove",
        "rename",
        "reorder",
        "not_in_my_school",
        "attach_textbook",
    }


def test_rename_leaves_the_canonical_node_untouched() -> None:
    ops = overlay.validate([{"op": "rename", "node_id": "u1", "name": "Matter around us"}])
    view = overlay.apply(UNITS, ops, parent_id="sub")
    assert view[0]["name"] == "Matter around us"
    assert view[0]["renamed_from"] == "Matter"
    assert UNITS[0].name == "Matter"  # §12: nothing is edited in place


def test_remove_and_not_in_my_school_are_different_things() -> None:
    removed = overlay.apply(
        UNITS, overlay.validate([{"op": "remove", "node_id": "u2"}]), parent_id="sub"
    )
    assert [v["name"] for v in removed] == ["Matter", "Sound"]
    marked = overlay.apply(
        UNITS, overlay.validate([{"op": "not_in_my_school", "node_id": "u2"}]), parent_id="sub"
    )
    assert [v["name"] for v in marked] == ["Matter", "Motion", "Sound"]
    assert marked[1]["not_in_my_school"] is True


def test_reorder_puts_the_named_ones_first_and_keeps_the_rest() -> None:
    ops = overlay.validate([{"op": "reorder", "parent_id": "sub", "order": ["u3", "u1"]}])
    view = overlay.apply(UNITS, ops, parent_id="sub")
    assert [v["name"] for v in view] == ["Sound", "Matter", "Motion"]
    assert [v["order"] for v in view] == [0, 1, 2]


def test_add_lands_after_the_node_it_names_and_carries_an_own_id() -> None:
    ops = overlay.validate(
        [{"op": "add", "parent_id": "sub", "kind": "unit", "name": "Our project", "after": "u1"}]
    )
    view = overlay.apply(UNITS, ops, parent_id="sub")
    assert [v["name"] for v in view] == ["Matter", "Our project", "Motion", "Sound"]
    assert view[1]["own"] is True
    assert str(view[1]["id"]).startswith(overlay.OWN_PREFIX)


def test_an_added_node_can_then_be_renamed_and_removed() -> None:
    ops = overlay.validate([{"op": "add", "parent_id": "sub", "name": "Mine", "id": "own:x"}])
    ops += overlay.validate([{"op": "rename", "node_id": "own:x", "name": "Mine, renamed"}])
    view = overlay.apply(UNITS, ops, parent_id="sub")
    assert view[-1]["name"] == "Mine, renamed"
    ops += overlay.validate([{"op": "remove", "node_id": "own:x"}])
    assert len(overlay.apply(UNITS, ops, parent_id="sub")) == 3


def test_order_of_ops_is_meaning() -> None:
    rename_then_remove = overlay.validate(
        [
            {"op": "rename", "node_id": "u1", "name": "X"},
            {"op": "remove", "node_id": "u1"},
        ]
    )
    assert len(overlay.apply(UNITS, rename_then_remove, parent_id="sub")) == 2
    remove_then_rename = list(reversed(rename_then_remove))
    view = overlay.apply(UNITS, remove_then_rename, parent_id="sub")
    assert [v["name"] for v in view] == ["Motion", "Sound"]


def test_ops_for_another_parent_are_skipped_not_applied() -> None:
    ops = overlay.validate([{"op": "reorder", "parent_id": "elsewhere", "order": ["u3"]}])
    assert [v["name"] for v in overlay.apply(UNITS, ops, parent_id="sub")] == [
        "Matter",
        "Motion",
        "Sound",
    ]


def test_a_textbook_needs_a_title_and_a_real_link() -> None:
    ops = overlay.validate(
        [
            {
                "op": "attach_textbook",
                "node_id": "u1",
                "textbook": {"title": "NCERT Science", "url": "https://example.invalid/book"},
            }
        ]
    )
    assert overlay.apply(UNITS, ops, parent_id="sub")[0]["textbook"]["title"] == "NCERT Science"
    with pytest.raises(overlay.OverlayRejected):
        overlay.validate([{"op": "attach_textbook", "node_id": "u1", "textbook": {}}])
    with pytest.raises(overlay.OverlayRejected):
        overlay.validate(
            [
                {
                    "op": "attach_textbook",
                    "node_id": "u1",
                    "textbook": {"title": "T", "url": "javascript:alert(1)"},
                }
            ]
        )


@pytest.mark.parametrize(
    "op",
    [
        {"op": "drop_the_database"},
        {"op": "rename", "node_id": "u1"},
        {"op": "rename", "name": "x"},
        {"op": "rename", "node_id": "u1", "name": "x" * 500},
        {"op": "add", "parent_id": "sub", "kind": "level", "name": "Class 9"},
        {"op": "reorder", "parent_id": "sub", "order": []},
        "not a dict",
    ],
)
def test_a_patch_we_will_not_store_is_refused_whole(op: object) -> None:
    with pytest.raises(overlay.OverlayRejected):
        overlay.validate([op])


def test_the_patch_has_a_ceiling() -> None:
    ops = [{"op": "not_in_my_school", "node_id": "u1"}] * (overlay.MAX_OPS + 1)
    with pytest.raises(overlay.OverlayRejected):
        overlay.validate(ops)
    with pytest.raises(overlay.OverlayRejected):
        overlay.merge([{"op": "remove", "node_id": "u1"}] * overlay.MAX_OPS, [{"op": "x"}])


# --- the overlay survives an upgrade (§6, §12) ----------------------------------------------------
def _version_nodes(prefix: str, names: list[str]) -> list[Node]:
    out = [node(prefix + "sub", "Science", NodeKind.SUBJECT, None)]
    for index, name in enumerate(names):
        out.append(node(f"{prefix}u{index}", name, NodeKind.UNIT, prefix + "sub", index))
    return out


def test_remap_follows_a_node_across_a_whole_new_set_of_ids() -> None:
    """A new version is a new extraction: not one id survives, and every edit still must."""
    old = _version_nodes("a-", ["Matter", "Motion"])
    new = _version_nodes("b-", ["Matter", "Motion", "Sound"])
    mapping = overlay.remap(old, new)
    assert mapping["a-u0"] == "b-u0"
    assert mapping["a-u1"] == "b-u1"


def test_an_edit_survives_an_upgrade_and_points_at_the_new_id() -> None:
    old = _version_nodes("a-", ["Matter", "Motion"])
    new = _version_nodes("b-", ["Matter", "Sound", "Motion"])
    ops = overlay.annotate(
        overlay.validate([{"op": "rename", "node_id": "a-u0", "name": "Matter around us"}]),
        {"a-u0": "Matter"},
    )
    kept, dropped, report = overlay.reapply(ops, overlay.remap(old, new))
    assert not dropped and not report
    assert kept[0]["node_id"] == "b-u0"
    # And it still renders, against the new version's own nodes.
    view = overlay.apply(
        [n for n in new if n.kind is NodeKind.UNIT], kept, parent_id="b-sub"
    )
    assert [v["name"] for v in view] == ["Matter around us", "Sound", "Motion"]


def test_reapply_keeps_what_still_matches_and_reports_what_it_dropped() -> None:
    old = _version_nodes("a-", ["Matter", "Motion"])
    new = _version_nodes("b-", ["Matter"])  # Motion is gone from the new edition
    ops = overlay.annotate(
        overlay.validate(
            [
                {"op": "rename", "node_id": "a-u0", "name": "Matter around us"},
                {"op": "not_in_my_school", "node_id": "a-u1"},
            ]
        ),
        {"a-u0": "Matter", "a-u1": "Motion"},
    )
    kept, dropped, report = overlay.reapply(ops, overlay.remap(old, new))
    assert len(kept) == 1 and len(dropped) == 1
    assert report == ["I could not carry across your note that Motion is not in your school."]


def test_reorder_is_re_keyed_wholesale_or_dropped() -> None:
    old = _version_nodes("a-", ["Matter", "Motion"])
    new = _version_nodes("b-", ["Matter", "Motion"])
    ops = overlay.validate(
        [{"op": "reorder", "parent_id": "a-sub", "order": ["a-u1", "a-u0"]}]
    )
    kept, _, _ = overlay.reapply(ops, overlay.remap(old, new))
    assert kept[0]["order"] == ["b-u1", "b-u0"]
    assert kept[0]["parent_id"] == "b-sub"


def test_reapply_keeps_the_learners_own_additions() -> None:
    ops = overlay.validate(
        [
            {"op": "add", "parent_id": None, "name": "Mine", "id": "own:x"},
            {"op": "rename", "node_id": "own:x", "name": "Mine again"},
        ]
    )
    kept, dropped, report = overlay.reapply(ops, {})
    assert len(kept) == 2 and not dropped and not report
    assert kept[0]["id"] == "own:x"


def test_reapply_never_silently_reassigns_an_edit() -> None:
    """The failure §12 names: a learner's edits lost — or worse, applied to the wrong topic."""
    ops = overlay.annotate(
        overlay.validate([{"op": "remove", "node_id": "gone"}]), {"gone": "Heredity"}
    )
    kept, _, report = overlay.reapply(ops, {"something-else": "new-id"})
    assert kept == []
    assert "Heredity" in report[0]


def test_a_report_line_reads_as_a_sentence() -> None:
    ops = overlay.annotate(
        overlay.validate([{"op": "rename", "node_id": "x", "name": "y"}]), {"x": "Sound"}
    )
    _, _, report = overlay.reapply(ops, {})
    assert report[0].endswith(".") and "!" not in report[0]
