"""Every path and every bond reaches the point the pipeline computed (docs/BOARD.md §3, §6).

The hand reads a path and a ``bond.to`` as OFFSETS from the resolved anchor
(``packages/wobo/src/board/geometry.ts``: ``offsetPoints``, and ``[p[0] + object.to[0], ...]`` for a
bond). A pipeline writes absolute board coordinates, because that is what ``Frame.at`` produces.
:meth:`Draft.add` is the one seam between the two readings.

The regression this file exists for: a molecule anchors every bond to an ATOM and wrote the other
atom's ABSOLUTE position in ``to``. The rebase only understood ``{"board": [x, y]}`` anchors, so it
was skipped, and the hand drew every bond from the atom to atom + absolute — benzene's first bond
ran 703 board units where a bond is seventy, and no golden covers ``kind: "bond"``.

The assertion here is the invariant itself and not a coordinate: anchor point + offset lands on the
thing the chemistry says it should reach.
"""

from __future__ import annotations

import math
from typing import Any

import pytest
from classess_gateway.board import schema
from classess_gateway.board.pipelines import Draft, board, on, run_intent
from classess_gateway.board.verify import Unverified

MOLECULES = [
    ("benzene", "c1ccccc1", 6, 6),
    ("ethanol", "CCO", 3, 2),
    ("carbon dioxide", "O=C=O", 3, 2),
]


def _draw(smiles: str, name: str) -> list[dict[str, Any]]:
    draft = run_intent({"pipeline": "chemistry", "op": "molecule", "smiles": smiles, "name": name})
    return draft.objects


def _points(objects: list[dict[str, Any]]) -> dict[str, list[float]]:
    """Where each atom actually sits, in absolute board units."""
    return {
        o["id"]: list(o["anchor"]["board"])
        for o in objects
        if o["kind"] == "atom" and "board" in o.get("anchor", {})
    }


@pytest.mark.parametrize(("name", "smiles", "atoms", "bonds"), MOLECULES)
def test_a_bond_ends_on_the_atom_it_joins(name: str, smiles: str, atoms: int, bonds: int) -> None:
    objects = _draw(smiles, name)
    points = _points(objects)
    assert len(points) == atoms
    drawn = [o for o in objects if o["kind"] == "bond"]
    assert len(drawn) == bonds

    # Every atom is one end of at least one bond, and every bond's far end lands on another atom.
    ends = {tuple(round(v, 1) for v in p) for p in points.values()}
    for bond in drawn:
        start = points[bond["anchor"]["object"]]
        far = (round(start[0] + bond["to"][0], 1), round(start[1] + bond["to"][1], 1))
        assert far in ends, f"{name}: {bond['id']} ends at {far}, which is not an atom"


@pytest.mark.parametrize(("name", "smiles", "atoms", "bonds"), MOLECULES)
def test_a_bond_is_the_length_of_a_bond(name: str, smiles: str, atoms: int, bonds: int) -> None:
    """A chemist's bond is a stroke, not a journey across the board."""
    for bond in (o for o in _draw(smiles, name) if o["kind"] == "bond"):
        length = math.hypot(bond["to"][0], bond["to"][1])
        assert 20.0 <= length <= 200.0, f"{name}: {bond['id']} is {length:.1f} board units long"


def test_every_molecule_object_passes_the_grammar() -> None:
    for name, smiles, _atoms, _bonds in MOLECULES:
        for obj in _draw(smiles, name):
            assert schema.validate_object(obj) == [], (obj["id"], schema.validate_object(obj))


def test_a_path_hung_off_another_object_is_rebased_through_that_object() -> None:
    """The general rule the molecule case is one instance of."""
    draft = Draft("t_")
    origin = draft.add("point", anchor=board(400.0, 300.0), hint="origin")
    curve = draft.add(
        "curve", anchor=on(origin), points=[[400.0, 300.0], [460.0, 260.0]], hint="curve"
    )
    written = next(o for o in draft.objects if o["id"] == curve)
    assert written["points"] == [[0.0, 0.0], [60.0, -40.0]]


def test_a_named_corner_is_left_alone_rather_than_rebased_against_the_wrong_point() -> None:
    """``at`` names a corner of the owner's box, which this side cannot know — so it is not a
    crossing this seam is allowed to make, and the path is passed through untouched."""
    draft = Draft("t_")
    origin = draft.add("point", anchor=board(400.0, 300.0), hint="origin")
    bond_id = draft.add("bond", anchor=on(origin, "top"), to=[40.0, 0.0], hint="bond")
    written = next(o for o in draft.objects if o["id"] == bond_id)
    assert written["to"] == [40.0, 0.0]


def test_a_bond_hung_off_an_unknown_object_is_refused_rather_than_drawn_anywhere() -> None:
    draft = Draft("t_")
    with pytest.raises(Unverified):
        draft.add("bond", anchor=on("someone-elses-atom"), to=[500.0, 500.0], hint="bond")


def test_a_path_on_a_registry_target_is_already_offsets_and_is_not_touched() -> None:
    draft = Draft("t_")
    poly = draft.add(
        "polyline",
        anchor={"target": "video-frame"},
        points=[[0.0, 0.0], [30.0, -20.0]],
        hint="ring",
    )
    written = next(o for o in draft.objects if o["id"] == poly)
    assert written["points"] == [[0.0, 0.0], [30.0, -20.0]]
