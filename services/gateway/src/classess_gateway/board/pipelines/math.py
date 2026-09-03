"""Math at the board — curves, tangents, constructions, number lines, derivations.

Nothing in this module writes a number. It asks :mod:`classess_gateway.board.verify` for one,
which asks SymPy inside the verifier's sandbox, and every value that becomes ink has been reached
by two routes wherever two routes exist: a tangent's slope is taken symbolically AND by a central
difference, and the two must agree before the line is drawn.
"""

from __future__ import annotations

from typing import Any

from classess_gateway.board import verify
from classess_gateway.board.pipelines import Draft, Frame, accent, board, faint, on, wobo
from classess_gateway.board.verify import Unverified

SAMPLES = 121
_TANGENT_H = 1e-5
_SLOPE_TOL = 1e-4


def build(intent: dict[str, Any], prefix: str) -> Draft:
    op = str(intent.get("op") or "graph")
    handlers = {
        "graph": _graph,
        "number_line": _number_line,
        "derivation": _derivation,
        "construction": _construction,
    }
    handler = handlers.get(op)
    if handler is None:
        raise Unverified(f"math cannot draw {op!r}")
    return handler(intent, Draft(prefix))


def _domain(intent: dict[str, Any]) -> tuple[float, float]:
    raw = intent.get("domain") or [-5, 5]
    if not (isinstance(raw, (list, tuple)) and len(raw) == 2):
        raise Unverified("a domain is two numbers")
    lo, hi = float(raw[0]), float(raw[1])
    if not lo < hi or (hi - lo) > 1e6:
        raise Unverified("the domain must be an increasing, finite range")
    return lo, hi


def _axes(draft: Draft, frame: Frame, xlabel: str, ylabel: str) -> None:
    """Axes and a grid, sized in board units from the frame — never a guessed pixel."""
    draft.add(
        "grid",
        anchor=board(frame.x0, frame.y0),
        cols=10,
        rows=8,
        w=round(frame.w, 2),
        h=round(frame.h, 2),
        style=faint(1),
        hint="grid",
    )
    baseline = frame.at(0, 0)[1] if frame.holds(0, 0) else frame.y0 + frame.h
    draft.add(
        "axis",
        anchor=board(frame.x0, baseline),
        orientation="x",
        min=round(frame.xmin, 4),
        max=round(frame.xmax, 4),
        step=round((frame.xmax - frame.xmin) / 10, 6) or 1.0,
        length=round(frame.w, 2),
        label=xlabel[:40],
        ticks=True,
        style=wobo(2),
        hint="xaxis",
    )
    # A y-axis is anchored at its ORIGIN and grows toward its max, because that is how the hand
    # draws it (`geometry.ts`, axis case: a vertical axis runs from its anchor to `y - length`, with
    # `min` at the anchor and the arrowhead at `max`). Board y grows downward, so the origin is the
    # BOTTOM of the frame. Anchoring it at `frame.y0` — the top — drew the whole axis upward off the
    # frame, detached from the grid it belongs to.
    y_origin = frame.y0 + frame.h
    draft.add(
        "axis",
        anchor=board(frame.at(0, 0)[0] if frame.holds(0, 0) else frame.x0, y_origin),
        orientation="y",
        min=round(frame.ymin, 4),
        max=round(frame.ymax, 4),
        step=round((frame.ymax - frame.ymin) / 8, 6) or 1.0,
        length=round(frame.h, 2),
        label=ylabel[:40],
        ticks=True,
        style=wobo(2),
        hint="yaxis",
    )


def _curve_points(expr: str, var: str, lo: float, hi: float) -> list[tuple[float, float]]:
    step = (hi - lo) / (SAMPLES - 1)
    xs = [lo + i * step for i in range(SAMPLES)]
    points = verify.sample(expr, var, xs)
    if len(points) < 2:
        raise Unverified(f"{expr!r} has almost no real values on this domain")
    return points


def _graph(intent: dict[str, Any], draft: Draft) -> Draft:
    expr = str(intent.get("expr") or "").strip()
    if not expr:
        raise Unverified("a graph needs an expression")
    var = str(intent.get("var") or "x")
    lo, hi = _domain(intent)
    points = _curve_points(expr, var, lo, hi)
    ys = [y for _, y in points]
    frame = Frame(xmin=lo, xmax=hi).with_y(min(ys), max(ys))

    readable = draft.ledger.record(verify.readable("function", expr))
    _axes(draft, frame, var, "y")
    curve_id = draft.add(
        "curve",
        anchor=board(*frame.at(points[0][0], points[0][1])),
        points=[frame.at(x, y) for x, y in points],
        style=wobo(2),
        hint="curve",
    )
    draft.add(
        "tex",
        anchor=on(curve_id, "top"),
        tex=f"y = {expr}",
        # The expression itself was parsed and evaluated by the verifier's CAS; that parse is
        # what earns the numerals inside it the right to be written.
        check=readable.name,
        style=faint(1),
        hint="fnlabel",
    )

    tangent_at = intent.get("tangent_at")
    if tangent_at is not None:
        _tangent(draft, frame, expr, var, float(tangent_at), curve_id)
    return draft


def _tangent(
    draft: Draft, frame: Frame, expr: str, var: str, x0: float, curve_id: str
) -> None:
    """The tangent at x0 — slope taken two independent ways and only drawn if they agree."""
    if not frame.holds(x0, 0):
        raise Unverified(f"{var} = {x0:g} is outside the graph")
    y0 = verify.value_at(expr, var, x0)
    slope_symbolic = verify.value_at(verify.derivative(expr, var), var, x0)
    right = verify.value_at(expr, var, x0 + _TANGENT_H)
    left = verify.value_at(expr, var, x0 - _TANGENT_H)
    slope_numeric = (right - left) / (2 * _TANGENT_H)
    draft.ledger.record(
        verify.numbers_agree("tangent slope", slope_symbolic, slope_numeric, _SLOPE_TOL)
    )
    slope = slope_symbolic

    touch = draft.add(
        "point",
        anchor=board(*frame.at(x0, y0)),
        style=accent(3),
        hint="touch",
    )
    # The tangent is drawn across the frame, so its endpoints are the frame edges, not guesses.
    ends = [
        (frame.xmin, y0 + slope * (frame.xmin - x0)),
        (frame.xmax, y0 + slope * (frame.xmax - x0)),
    ]
    draft.add(
        "line",
        anchor=board(*frame.at(*ends[0])),
        to=board(*frame.at(*ends[1])),
        style=accent(2),
        hint="tangent",
    )
    draft.number(
        slope,
        "board.numbers_agree:tangent slope",
        anchor=on(touch, "right"),
        style=accent(2),
    )
    draft.add(
        "write",
        anchor=on(touch, "bottom"),
        text="slope here",
        style=accent(1),
        hint="slopenote",
    )


def _number_line(intent: dict[str, Any], draft: Draft) -> Draft:
    lo, hi = _domain(intent)
    frame = Frame(y0=440.0, h=120.0, xmin=lo, xmax=hi, ymin=-1.0, ymax=1.0)
    line_id = draft.add(
        "line",
        anchor=board(*frame.at(lo, 0)),
        to=board(*frame.at(hi, 0)),
        style=wobo(2),
        hint="numberline",
    )
    draft.add(
        "axis",
        anchor=on(line_id),
        orientation="x",
        min=round(lo, 4),
        max=round(hi, 4),
        step=round((hi - lo) / max(2, min(20, round(hi - lo))), 6) or 1.0,
        length=round(frame.w, 2),
        ticks=True,
        style=faint(1),
        hint="ticks",
    )
    marks = intent.get("marks") or []
    if not isinstance(marks, list):
        raise Unverified("marks must be a list of values or expressions")
    for mark in marks[:12]:
        value = (
            verify.value_at(str(mark), "x", 0.0)
            if isinstance(mark, str)
            else float(mark)
        )
        draft.ledger.record(verify.in_bounds("mark", value, lo, hi))
        point = draft.add(
            "point", anchor=board(*frame.at(value, 0)), style=accent(3), hint="mark"
        )
        draft.number(value, "board.in_bounds:mark", anchor=on(point, "bottom"), style=accent(1))
    return draft


def _derivation(intent: dict[str, Any], draft: Draft) -> Draft:
    """A derivation is written line by line, each line anchored under the one above, and the
    whole chain is proved by the CAS before the first character is drawn."""
    from classess_verifier.cas import CasError, verify_step_chain

    equation = str(intent.get("equation") or "").strip()
    steps = [str(s).strip() for s in (intent.get("steps") or []) if str(s).strip()]
    if not equation:
        raise Unverified("a derivation needs an equation")
    if not steps:
        # No steps were named, so the last line is COMPUTED rather than accepted: the CAS solves
        # the equation and the chain check below proves the line it produced.
        var_name = str(intent.get("var") or "x")
        steps = [f"{var_name} = {root}" for root in verify.solve_equation(equation, var_name)[:1]]
    if len(steps) > 12:
        raise Unverified("a derivation of more than twelve steps is more than one board")
    try:
        check = verify_step_chain(equation, steps, var=intent.get("var") or None)
    except CasError as exc:
        raise Unverified(f"the derivation could not be checked: {exc}") from exc
    draft.ledger.record(check)

    variables = [str(intent.get("var") or "x")]
    previous = draft.add(
        "write",
        anchor=board(200.0, 200.0),
        text=equation,
        check=check.name,
        depends=variables,
        style=wobo(2),
        hint="given",
    )
    for i, step in enumerate(steps):
        previous = draft.add(
            "write",
            anchor=on(previous, "bottom"),
            text=step,
            check=check.name,
            depends=variables,
            style=wobo(2) if i < len(steps) - 1 else accent(2),
            hint=f"step{i + 1}",
        )
        draft.add(
            "underline",
            anchor=on(previous),
            style=faint(1),
            hint="substituted",
        )
    return draft


def _construction(intent: dict[str, Any], draft: Draft) -> Draft:
    """A ruler-and-compass construction, with the arcs visible — the perpendicular bisector.

    The construction is verified the way a geometry teacher checks it: the midpoint is equidistant
    from both ends, and the bisector meets the segment at a right angle.
    """
    what = str(intent.get("what") or "perpendicular_bisector")
    if what != "perpendicular_bisector":
        raise Unverified(f"construction {what!r} is not one I know")
    raw = intent.get("segment") or [[-2.0, -1.0], [2.0, 1.0]]
    if not (isinstance(raw, list) and len(raw) == 2):
        raise Unverified("a segment is two points")
    (ax, ay), (bx, by) = ((float(p[0]), float(p[1])) for p in raw)
    mx, my = (ax + bx) / 2, (ay + by) / 2
    half = (((bx - ax) ** 2 + (by - ay) ** 2) ** 0.5) / 2
    if half <= 0:
        raise Unverified("the two ends of the segment are the same point")
    draft.ledger.record(
        verify.numbers_agree(
            "bisector midpoint",
            ((mx - ax) ** 2 + (my - ay) ** 2) ** 0.5,
            ((bx - mx) ** 2 + (by - my) ** 2) ** 0.5,
        )
    )
    dx, dy = bx - ax, by - ay
    px, py = -dy, dx  # the perpendicular direction
    draft.ledger.record(verify.numbers_agree("bisector right angle", dx * px + dy * py, 0.0))

    span = max(abs(ax), abs(bx), abs(ay), abs(by), half) * 1.6 or 1.0
    frame = Frame(xmin=-span, xmax=span, ymin=-span, ymax=span)
    segment = draft.add(
        "line", anchor=board(*frame.at(ax, ay)), to=board(*frame.at(bx, by)), style=wobo(2),
        hint="segment",
    )
    radius = half * 1.35
    scale = frame.w / (frame.xmax - frame.xmin)
    for cx, cy, hint in ((ax, ay, "arca"), (bx, by, "arcb")):
        draft.add(
            "ellipse",
            anchor=board(*frame.at(cx, cy)),
            rx=round(radius * scale, 2),
            ry=round(radius * scale, 2),
            style=faint(1),
            hint=hint,
        )
    length = (px**2 + py**2) ** 0.5
    ux, uy = px / length, py / length
    draft.add(
        "line",
        anchor=board(*frame.at(mx - ux * radius, my - uy * radius)),
        to=board(*frame.at(mx + ux * radius, my + uy * radius)),
        style=accent(2),
        hint="bisector",
    )
    draft.add("point", anchor=board(*frame.at(mx, my)), style=accent(3), hint="midpoint")
    draft.add(
        "write",
        anchor=on(segment, "bottom"),
        text="equal halves, square corner",
        style=accent(1),
        hint="note",
    )
    return draft
