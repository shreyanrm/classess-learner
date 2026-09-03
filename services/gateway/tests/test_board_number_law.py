"""The verified-number law, in both places a model could get round it (docs/BOARD.md §6, §11).

"A number the model wrote instead of the code computing it" is one of the five things BOARD.md says
kills the board. Two holes were open in this wave:

1. The law read a hard-coded list of five field names. A ``table``'s numbers live in ``rows``, and
   the hand writes every cell through ``writeText``, glyph by glyph, exactly like a label — so a
   model-authored gravity table walked straight past a law that refused the identical text in a
   ``label``.
2. ``plan_board`` allowed the check name ``board.frame`` on every turn whether or not anything ran,
   which made it a universal laundering token: name it, and any numeral reached the board.
"""

from __future__ import annotations

from typing import Any

from classess_gateway.board import schema
from classess_gateway.board.planner import plan_board

GRAVITY_ROWS = [["body", "gravity"], ["Mercury", "3.71 m/s2"], ["Venus", "24.79 m/s2"]]


def _table(**extra: Any) -> dict[str, Any]:
    return {
        "id": "tally",
        "kind": "table",
        "anchor": {"board": [200, 300]},
        "w": 400,
        "rows": GRAVITY_ROWS,
        **extra,
    }


def test_a_table_cell_is_visible_text_like_any_other() -> None:
    assert schema.validate_object(_table()) == [
        "an object showing a number must name the check that verified it (check: ...)"
    ]
    assert schema.validate_object(_table(check="board.numbers_agree:gravity")) == []


def test_a_table_with_no_numerals_needs_no_check() -> None:
    assert (
        schema.validate_object(
            {
                "id": "t",
                "kind": "table",
                "anchor": {"board": [200, 300]},
                "w": 400,
                "rows": [["kingdom", "example"], ["fungi", "a mushroom"]],
            }
        )
        == []
    )


def test_a_grids_row_count_is_a_ruler_not_a_claim() -> None:
    """``grid.rows`` and ``table.rows`` share a name and mean different things, so the
    classification is per kind — ruling eight rows does not demand a verifier."""
    assert (
        schema.validate_object(
            {
                "id": "g",
                "kind": "grid",
                "anchor": {"board": [120, 120]},
                "cols": 10,
                "rows": 8,
                "w": 760,
                "h": 700,
            }
        )
        == []
    )


def test_every_board_field_is_classified_as_visible_or_not() -> None:
    """A new field on a kind must be answered for, or the law quietly forgets it again."""
    unclassified = {
        name
        for required, optional in schema._FIELDS.values()
        for name in (*required, *optional)
        if name not in schema._VISIBLE_BY_NAME
    }
    assert unclassified == set(), f"classify these in _VISIBLE_BY_NAME: {sorted(unclassified)}"


def test_a_model_authored_table_of_numbers_never_reaches_the_board() -> None:
    plan = plan_board({"say": "here they are", "objects": [_table()]})
    assert plan.objects == []
    assert plan.refusals and "check" in plan.refusals[0]


def test_board_frame_is_not_a_standing_licence_for_a_number() -> None:
    """Nothing ran on this turn, so no check name is allowed — least of all a general one."""
    plan = plan_board(
        {
            "say": "gravity on earth",
            "objects": [
                {
                    "id": "g",
                    "kind": "label",
                    "anchor": {"board": [400, 300]},
                    "text": "g = 42.7 m/s2 on Earth",
                    "check": "board.frame",
                }
            ],
        }
    )
    assert plan.objects == []
    assert plan.ledger.checks == []
    assert any("did not run on this turn" in r for r in plan.refusals)


def test_a_check_that_actually_ran_still_signs_its_number() -> None:
    """The law refuses what nothing verified; it never blocks what a pipeline computed."""
    plan = plan_board(
        {
            "say": "the tangent",
            "intents": [{"pipeline": "math", "op": "graph", "expr": "x**2", "domain": [-3, 3]}],
        }
    )
    ran = {c.name for c in plan.ledger.checks}
    assert ran
    for obj in plan.objects:
        if obj.get("check"):
            assert obj["check"] in ran
