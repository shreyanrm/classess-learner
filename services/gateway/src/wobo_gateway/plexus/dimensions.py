"""Dimensional analysis — unit algebra over a physics scene spec's own quantities.

A physics scene declares each output as ``expr`` (arithmetic over param ids + physical constants)
plus a declared ``unit``. This module PROVES the expression's dimension equals the declared unit's
dimension. A spec whose equation is dimensionally inconsistent is REJECTED before a learner ever
sees it: a projectile *range* declared in metres whose formula actually yields ``m/s`` ships a wrong
mental model, and this refuses it deterministically. It also enforces the two physics correctness
rules a plausible-but-wrong model breaks — you cannot add unlike dimensions (``m + s``), and a
trig /
log / exp argument must be dimensionless.

Pure stdlib: a tiny recursive-descent evaluator over dimension vectors, mirroring the client's safe
``evaluateExpr`` grammar (SimRunner.tsx) but computing units instead of numbers. No sympy, no eval —
fully deterministic, the same spec always analyses the same way.
"""

from __future__ import annotations

import re

# SI base dimensions, fixed order: mass, length, time, current, temperature, amount, luminosity.
Dim = tuple[float, ...]
_ZERO: Dim = (0.0,) * 7
_IDX = {"kg": 0, "m": 1, "s": 2, "A": 3, "K": 4, "mol": 5, "cd": 6}


def _mk(**exps: float) -> Dim:
    v = [0.0] * 7
    for k, e in exps.items():
        v[_IDX[k]] = float(e)
    return tuple(v)


def _mul(a: Dim, b: Dim) -> Dim:
    return tuple(x + y for x, y in zip(a, b, strict=True))


def _div(a: Dim, b: Dim) -> Dim:
    return tuple(x - y for x, y in zip(a, b, strict=True))


def _pow(a: Dim, n: float) -> Dim:
    return tuple(x * n for x in a)


def _eq(a: Dim, b: Dim) -> bool:
    return all(abs(x - y) < 1e-9 for x, y in zip(a, b, strict=True))


# Named units → dimension. Angles (rad/deg) and pure ratios are dimensionless.
_UNITS: dict[str, Dim] = {
    "": _ZERO, "1": _ZERO, "dimensionless": _ZERO, "rad": _ZERO, "deg": _ZERO,
    "kg": _mk(kg=1), "m": _mk(m=1), "s": _mk(s=1), "A": _mk(A=1), "K": _mk(K=1),
    "mol": _mk(mol=1), "cd": _mk(cd=1),
    "N": _mk(kg=1, m=1, s=-2),
    "J": _mk(kg=1, m=2, s=-2),
    "W": _mk(kg=1, m=2, s=-3),
    "Pa": _mk(kg=1, m=-1, s=-2),
    "Hz": _mk(s=-1),
    "C": _mk(A=1, s=1),
    "V": _mk(kg=1, m=2, s=-3, A=-1),
    "ohm": _mk(kg=1, m=2, s=-3, A=-2),
    "T": _mk(kg=1, s=-2, A=-1),  # tesla
}

# Physical constants: symbol -> (value, dimension). A wrong constant ships a wrong mental model,
# so a
# scene referencing ``g``/``c`` inherits the enforced value + dimension here (SI, CODATA-rounded).
CONSTANTS: dict[str, tuple[float, Dim]] = {
    "g": (9.80665, _mk(m=1, s=-2)),          # standard gravity
    "c": (2.99792458e8, _mk(m=1, s=-1)),     # speed of light
    "G": (6.674e-11, _mk(m=3, kg=-1, s=-2)),  # gravitational constant
    "h": (6.626e-34, _mk(kg=1, m=2, s=-1)),  # Planck
    "k_e": (8.988e9, _mk(kg=1, m=3, s=-4, A=-2)),  # Coulomb constant
    "pi": (3.141592653589793, _ZERO),
    "e": (2.718281828459045, _ZERO),
}

# Trig/log take a dimensionless argument and return dimensionless; sqrt halves the dimension.
_DIMLESS_FUNCS = {"sin", "cos", "tan", "asin", "acos", "atan", "exp", "log"}
_SUPER = {"²": "^2", "³": "^3", "⁴": "^4", "¹": "^1", "⁰": "^0"}


def parse_unit(u: object) -> Dim | None:
    """A unit expression: named units joined by ``* · /`` with optional ``^n`` powers. None if any
    token is unknown ("m/s^2", "kg*m/s^2", "N", "" all parse; "bogus" does not)."""
    if not isinstance(u, str):
        return None
    s = u.strip()
    for k, v in _SUPER.items():
        s = s.replace(k, v)
    s = s.replace("·", "*").replace("×", "*").replace(" ", "")
    if s in _UNITS:
        return _UNITS[s]
    dim = _ZERO
    for sign, factor in re.findall(r"([*/]?)([^*/]+)", s):
        m = re.fullmatch(r"([A-Za-z_]+|1)(?:\^(-?\d+(?:\.\d+)?))?", factor)
        if not m:
            return None
        base = _UNITS.get("" if m.group(1) == "1" else m.group(1))
        if base is None:
            return None
        term = _pow(base, float(m.group(2)) if m.group(2) else 1.0)
        dim = _div(dim, term) if sign == "/" else _mul(dim, term)
    return dim


# --- expression → dimension (recursive descent, the client's evaluator grammar) ------------------

_TOKEN_RE = re.compile(r"(\d+\.?\d*|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/^(),·×])|(\s+)|(.)")


def _tokenize(src: str) -> list[tuple[str, object]] | None:
    out: list[tuple[str, object]] = []
    for m in _TOKEN_RE.finditer(src):
        if m.group(1) is not None:
            out.append(("num", float(m.group(1))))
        elif m.group(2) is not None:
            out.append(("id", m.group(2)))
        elif m.group(3) is not None:
            out.append(("op", "*" if m.group(3) in "·×" else m.group(3)))
        elif m.group(4) is not None:
            continue
        else:
            return None  # an unknown character — refuse rather than guess
    return out


class _DimErr(Exception):
    pass


def dimension_of(expr: object, param_units: dict[str, str]) -> Dim | None:
    """Dimension of an arithmetic expression over param ids (each with a unit) + physical constants.
    None when the expression is malformed OR dimensionally inconsistent (adding ``m`` to ``s``, a
    dimensionful trig argument, an unknown symbol, a dimensionful exponent)."""
    toks = _tokenize(expr) if isinstance(expr, str) else None
    if not toks:
        return None
    pos = 0
    pdims: dict[str, Dim] = {}
    for pid, unit in param_units.items():
        d = parse_unit(unit)
        if d is None:
            return None
        pdims[pid] = d

    def peek() -> tuple[str, object] | None:
        return toks[pos] if pos < len(toks) else None

    def take_op(*ops: str) -> str | None:
        nonlocal pos
        t = peek()
        if t and t[0] == "op" and t[1] in ops:
            pos += 1
            return t[1]  # type: ignore[return-value]
        return None

    def parse_expr() -> Dim:
        left = parse_term()
        while True:
            op = take_op("+", "-")
            if not op:
                return left
            right = parse_term()
            if not _eq(left, right):
                raise _DimErr(f"cannot {op} unlike dimensions {left} and {right}")

    def parse_term() -> Dim:
        left = parse_factor()
        while True:
            op = take_op("*", "/")
            if not op:
                return left
            right = parse_factor()
            left = _mul(left, right) if op == "*" else _div(left, right)

    def parse_factor() -> Dim:
        if take_op("-"):
            return parse_factor()
        take_op("+")
        base = parse_primary()
        if take_op("^"):
            return _pow(base, parse_number_const())  # exponent must be a dimensionless constant
        return base

    def parse_number_const() -> float:
        # a pure numeric exponent: optional sign, a literal, or a parenthesised numeric expr
        # (½ etc.)
        nonlocal pos
        if take_op("-"):
            return -parse_number_const()
        take_op("+")
        t = peek()
        if t and t[0] == "num":
            pos += 1
            return float(t[1])  # type: ignore[arg-type]
        if take_op("("):
            val = parse_number_const()
            while True:
                op = take_op("*", "/")
                if not op:
                    break
                r = parse_number_const()
                val = val * r if op == "*" else val / r
            if not take_op(")"):
                raise _DimErr("missing )")
            return val
        raise _DimErr("exponent must be a constant number")

    def parse_primary() -> Dim:
        nonlocal pos
        t = peek()
        if t is None:
            raise _DimErr("unexpected end")
        if t[0] == "num":
            pos += 1
            return _ZERO  # a bare number is dimensionless
        if t[0] == "id":
            pos += 1
            name = t[1]
            if name in _DIMLESS_FUNCS and take_op("("):
                arg = parse_expr()
                while take_op(","):
                    parse_expr()
                if not take_op(")"):
                    raise _DimErr("missing )")
                if not _eq(arg, _ZERO):
                    raise _DimErr(f"{name}() needs a dimensionless argument, got {arg}")
                return _ZERO
            if name == "sqrt" and take_op("("):
                arg = parse_expr()
                if not take_op(")"):
                    raise _DimErr("missing )")
                return _pow(arg, 0.5)
            if name in ("abs", "min", "max") and take_op("("):
                first = parse_expr()
                while take_op(","):
                    other = parse_expr()
                    if not _eq(first, other):
                        raise _DimErr(f"{name}() operands differ: {first} vs {other}")
                if not take_op(")"):
                    raise _DimErr("missing )")
                return first
            if name in pdims:
                return pdims[name]
            if name in CONSTANTS:
                return CONSTANTS[name][1]
            raise _DimErr(f"unknown name {name}")
        if take_op("("):
            val = parse_expr()
            if not take_op(")"):
                raise _DimErr("missing )")
            return val
        raise _DimErr("unexpected token")

    try:
        val = parse_expr()
        return val if pos == len(toks) else None
    except _DimErr:
        return None
    except Exception:
        return None


def units_consistent(expr: object, declared_unit: object, param_units: dict[str, str]) -> bool:
    """True iff the expression's dimension equals the declared unit's dimension."""
    got = dimension_of(expr, param_units)
    want = parse_unit(declared_unit)
    return got is not None and want is not None and _eq(got, want)


def constant_ok(symbol: str, value: float, tol: float = 0.02) -> bool:
    """A declared numeric constant must match the enforced physical value within ``tol``
    (fractional).
    A scene that hard-codes g = 3 is refused — the constants table is law."""
    if symbol not in CONSTANTS:
        return False
    canon = CONSTANTS[symbol][0]
    return abs(value - canon) <= abs(canon) * tol


if __name__ == "__main__":  # runnable self-check — no framework, no network
    _pu = {"v": "m/s", "theta": "deg"}
    # projectile closed forms — every declared unit must match its formula's dimension
    assert units_consistent("v^2 * sin(2*theta*pi/180) / g", "m", _pu), "range is metres"
    assert units_consistent("v^2 * sin(theta*pi/180)^2 / (2*g)", "m", _pu), "height is metres"
    assert units_consistent("2*v*sin(theta*pi/180)/g", "s", _pu), "flight time is seconds"
    # a RIGGED bad spec: range declared metres but formula (missing /g) yields m/s — REJECTED
    assert not units_consistent(
        "v^2 * sin(2*theta*pi/180)", "m", _pu
    ), "rigged spec slipped through"
    assert dimension_of("v + g", {"v": "m/s"}) is None, "added unlike dimensions"
    assert dimension_of("sin(v)", {"v": "m/s"}) is None, "dimensionful trig argument"
    # free-body resultant + kinetic energy
    assert units_consistent("sqrt(Fx^2 + Fy^2)", "N", {"Fx": "N", "Fy": "N"})
    assert units_consistent("0.5*m*v^2", "J", {"m": "kg", "v": "m/s"})
    assert not units_consistent("0.5*m*v^2", "W", {"m": "kg", "v": "m/s"})
    # unit parser + constants
    assert parse_unit("kg*m/s^2") == _UNITS["N"]
    assert parse_unit("bogus") is None
    assert constant_ok("g", 9.8) and not constant_ok("g", 3.0) and constant_ok("c", 3.0e8)
    print("dimensions self-check ok")
