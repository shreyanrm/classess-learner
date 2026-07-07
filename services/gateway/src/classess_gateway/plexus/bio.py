"""Biology scene validator — the §5-biology gate (SUBJECTS.md).

A biology scene (``bioScene`` card field) is one of four kinds — ``dragLabel`` (a labelled
diagram the learner builds), ``punnett`` (a Punnett square the learner fills), ``foodWeb`` (a
food chain / web), ``taxonomy`` (a classification tree). The renderer is ``BioScene.tsx``; this
is the server-side proof that a generated scene is STRUCTURALLY sound, refused otherwise.

Only the COMPUTATIONAL / STRUCTURAL parts live here — free-text facts (which organism, which
kingdom) are the fact base's job (``factcheck.py``). What this module proves:

  1. dragLabel — every label carries a numeric target zone ``(x, y, r)`` so the drop test is
     deterministic; at least two labels; the figure has at least one mark to label.
  2. punnett — the parent genotypes are well-formed single-gene alleles (e.g. ``Bb``); the
     4-cell cross is PURE MATH, so we compute it and, if the spec also authors the answer cells,
     REFUSE any authored cell that cannot come from the parents' cross (the rigged case).
  3. foodWeb — every edge references two distinct node ids that exist; at least two nodes and
     one edge, so energy actually flows.
  4. taxonomy — the ranks run in canonical descending order (kingdom → … → species) and each
     rank's answer is one of its offered options.

Refusal is INVISIBLE: a malformed scene is dropped from the card (the card still teaches via its
base kind), never a hard failure. Wire it into the compose verifier by adding one line to
``engines._CARD_ACTIVITIES``:  ``"bioScene": bio.verify_bio_scene``.

Pure stdlib, deterministic — no deps. ``python -m classess_gateway.plexus.bio`` runs the
self-check at the bottom (ponytail: one runnable assert block, no framework).
"""

from __future__ import annotations

from typing import Any

_KINDS = {"dragLabel", "punnett", "foodWeb", "taxonomy"}

# Linnaean ranks in canonical descending order — a taxonomy scene must walk them top-down.
_RANK_ORDER = ["domain", "kingdom", "phylum", "class", "order", "family", "genus", "species"]
_RANK_INDEX = {r: i for i, r in enumerate(_RANK_ORDER)}


def _d(v: Any) -> dict[str, Any] | None:
    return v if isinstance(v, dict) else None


def _list(v: Any) -> list[Any]:
    return v if isinstance(v, list) else []


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _nes(v: Any) -> bool:
    return isinstance(v, str) and bool(v.strip())


# --- punnett genetics (pure math — the flagship) ------------------------------------------


def valid_genotype(g: Any) -> bool:
    """A single-gene genotype is two letters of the SAME gene, e.g. ``Bb``/``BB``/``bb``."""
    return (
        isinstance(g, str)
        and len(g) == 2
        and g.isalpha()
        and g[0].lower() == g[1].lower()
    )


def canonical(a: str, b: str) -> str:
    """Order an allele pair with the dominant (uppercase) allele first: ``('b','B') -> 'Bb'``."""
    # sort by gene letter, then uppercase-before-lowercase (islower() False sorts ahead of True)
    return "".join(sorted((a, b), key=lambda c: (c.lower(), c.islower())))


def punnett_cross(parent_a: str, parent_b: str) -> list[str] | None:
    """The four offspring genotypes for ``parent_a`` x ``parent_b`` (single gene), canonicalised.

    Returns ``None`` if either parent genotype is malformed or the two describe different genes.
    ``Bb`` x ``Bb`` -> ``['BB','Bb','Bb','bb']`` — the 1:2:1 genotype cross.
    """
    if not (valid_genotype(parent_a) and valid_genotype(parent_b)):
        return None
    if parent_a[0].lower() != parent_b[0].lower():
        return None  # a cross must be over the same gene
    return [canonical(x, y) for x in parent_a for y in parent_b]


def phenotype_ratio(cells: list[str]) -> tuple[int, int]:
    """(dominant, recessive) counts — dominant if any uppercase allele is present.

    ``['BB','Bb','Bb','bb']`` -> ``(3, 1)`` (the 3:1 dominant:recessive law).
    """
    dominant = sum(1 for g in cells if any(c.isupper() for c in g))
    return dominant, len(cells) - dominant


def _multiset(cells: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for g in cells:
        out[g] = out.get(g, 0) + 1
    return out


# --- the gate -----------------------------------------------------------------------------


def _ok_drag_label(r: dict[str, Any]) -> dict[str, Any] | None:
    figure = [m for m in _list(r.get("figure")) if isinstance(m, dict) and _nes(m.get("id"))]
    if not figure:
        return None
    labels = [
        lb
        for lb in _list(r.get("labels"))
        if isinstance(lb, dict)
        and _nes(lb.get("id"))
        and _nes(lb.get("text"))
        and _num(lb.get("x"))
        and _num(lb.get("y"))
        and _num(lb.get("r"))
        and float(lb["r"]) > 0
    ]
    return r if len(labels) >= 2 else None


def _ok_punnett(r: dict[str, Any]) -> dict[str, Any] | None:
    cross = punnett_cross(r.get("parentA"), r.get("parentB"))
    if cross is None:
        return None
    authored = r.get("cells")
    if authored is not None:
        # if the spec states the answer cells, they MUST equal the true cross (the rigged case)
        if not isinstance(authored, list) or len(authored) != len(cross):
            return None
        if any(not valid_genotype(g) for g in authored):
            return None
        # compare canonicalised multisets — a cell that cannot come from the cross is refused
        if _multiset([canonical(g[0], g[1]) for g in authored]) != _multiset(cross):
            return None
    return r


def _ok_food_web(r: dict[str, Any]) -> dict[str, Any] | None:
    nodes = [
        n
        for n in _list(r.get("nodes"))
        if isinstance(n, dict) and _nes(n.get("id")) and _nes(n.get("label"))
    ]
    if len(nodes) < 2:
        return None
    ids = {n["id"] for n in nodes}
    edges = [
        e
        for e in _list(r.get("edges"))
        if isinstance(e, dict)
        and e.get("from") in ids
        and e.get("to") in ids
        and e.get("from") != e.get("to")
    ]
    return r if edges else None


def _ok_taxonomy(r: dict[str, Any]) -> dict[str, Any] | None:
    ranks: list[dict[str, Any]] = []
    for rk in _list(r.get("ranks")):
        d = _d(rk)
        if not d or not _nes(d.get("rank")) or not _nes(d.get("answer")):
            return None
        options = [o for o in _list(d.get("options")) if _nes(o)]
        if d["answer"] not in options or len(options) < 2:
            return None
        ranks.append(d)
    if len(ranks) < 2:
        return None
    # ranks must run in canonical descending order (kingdom before class before species …)
    order = [_RANK_INDEX.get(str(rk["rank"]).strip().lower(), -1) for rk in ranks]
    if any(i < 0 for i in order):
        return None
    if any(order[i] >= order[i + 1] for i in range(len(order) - 1)):
        return None
    return r


def verify_bio_scene(raw: Any) -> dict[str, Any] | None:
    """Accept a biology scene verbatim, or None if it is not structurally sound.

    The punnett gate is the crux: the 4-cell cross is computed from the parents, and an authored
    answer that includes a genotype impossible from that cross (the rigged case) is refused."""
    r = _d(raw)
    if not r or r.get("kind") not in _KINDS:
        return None
    kind = r["kind"]
    if kind == "dragLabel":
        return _ok_drag_label(r)
    if kind == "punnett":
        return _ok_punnett(r)
    if kind == "foodWeb":
        return _ok_food_web(r)
    return _ok_taxonomy(r)


if __name__ == "__main__":
    # ponytail: one runnable assert block — the smallest thing that fails if the logic breaks.

    # --- the flagship: Bb x Bb -> 1 BB : 2 Bb : 1 bb, phenotype 3:1 ---
    cross = punnett_cross("Bb", "Bb")
    assert cross is not None
    assert _multiset(cross) == {"BB": 1, "Bb": 2, "bb": 1}, cross
    assert phenotype_ratio(cross) == (3, 1)

    # homozygous / test crosses
    assert _multiset(punnett_cross("BB", "bb")) == {"Bb": 4}  # all heterozygous, 4:0 dominant
    assert phenotype_ratio(punnett_cross("BB", "bb")) == (4, 0)
    assert _multiset(punnett_cross("Bb", "bb")) == {"Bb": 2, "bb": 2}  # test cross 1:1
    assert phenotype_ratio(punnett_cross("Bb", "bb")) == (2, 2)

    # canonicalisation puts the dominant allele first regardless of input order
    assert canonical("b", "B") == "Bb"
    assert canonical("B", "b") == "Bb"

    # malformed genotypes are refused
    assert punnett_cross("Bx", "Bb") is None  # different genes
    assert punnett_cross("B", "Bb") is None  # not two alleles
    assert not valid_genotype("B7")

    # --- punnett gate: authored cells must equal the true cross ---
    good = {"kind": "punnett", "parentA": "Bb", "parentB": "Bb", "cells": ["BB", "Bb", "Bb", "bb"]}
    assert verify_bio_scene(good) is good
    # the RIGGED case: a genotype (BB x3) that cannot come from Bb x Bb -> REJECTED
    rigged = {"kind": "punnett", "parentA": "Bb", "parentB": "Bb", "cells": ["BB", "BB", "Bb", "bb"]}
    assert verify_bio_scene(rigged) is None
    # order-insensitive: authored cells in any order accepted if the multiset matches
    shuffled = {"kind": "punnett", "parentA": "Bb", "parentB": "Bb", "cells": ["bb", "Bb", "BB", "bB"]}
    assert verify_bio_scene(shuffled) is shuffled
    # a punnett with no authored cells still validates (the client computes them)
    assert verify_bio_scene({"kind": "punnett", "parentA": "Rr", "parentB": "Rr"}) is not None

    # --- dragLabel gate ---
    dl = {
        "kind": "dragLabel",
        "figure": [{"id": "cell", "shape": "ellipse"}],
        "labels": [
            {"id": "nucleus", "text": "nucleus", "x": 50, "y": 50, "r": 10},
            {"id": "wall", "text": "cell wall", "x": 10, "y": 10, "r": 8},
        ],
    }
    assert verify_bio_scene(dl) is dl
    # only one label, or a label missing its zone -> refused
    assert verify_bio_scene({**dl, "labels": dl["labels"][:1]}) is None
    bad_zone = {**dl, "labels": [{"id": "n", "text": "n", "x": 1, "y": 1}, dl["labels"][1]]}
    assert verify_bio_scene(bad_zone) is None

    # --- foodWeb gate ---
    fw = {
        "kind": "foodWeb",
        "nodes": [{"id": "grass", "label": "grass"}, {"id": "rabbit", "label": "rabbit"}],
        "edges": [{"from": "grass", "to": "rabbit"}],
    }
    assert verify_bio_scene(fw) is fw
    # an edge to a non-existent node -> refused
    assert verify_bio_scene({**fw, "edges": [{"from": "grass", "to": "wolf"}]}) is None
    # a self-loop -> refused
    assert verify_bio_scene({**fw, "edges": [{"from": "grass", "to": "grass"}]}) is None

    # --- taxonomy gate ---
    tx = {
        "kind": "taxonomy",
        "organism": "tiger",
        "ranks": [
            {"rank": "kingdom", "answer": "Animalia", "options": ["Animalia", "Plantae"]},
            {"rank": "class", "answer": "Mammalia", "options": ["Mammalia", "Aves"]},
            {"rank": "species", "answer": "tigris", "options": ["tigris", "leo"]},
        ],
    }
    assert verify_bio_scene(tx) is tx
    # ranks out of canonical order (species before kingdom) -> refused
    reversed_ranks = {**tx, "ranks": list(reversed(tx["ranks"]))}
    assert verify_bio_scene(reversed_ranks) is None
    # answer not among options -> refused
    bad_answer = {
        **tx,
        "ranks": [
            {"rank": "kingdom", "answer": "Fungi", "options": ["Animalia", "Plantae"]},
            {"rank": "class", "answer": "Mammalia", "options": ["Mammalia", "Aves"]},
        ],
    }
    assert verify_bio_scene(bad_answer) is None

    print("bio.py self-check passed: punnett cross (Bb x Bb -> 1:2:1, 3:1), dragLabel, foodWeb, taxonomy")
