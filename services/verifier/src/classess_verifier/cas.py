"""Symbolic CAS checks (SymPy) for linear equations in one variable — the atom.

These are deterministic proofs, not heuristics:
- ``solution_satisfies`` — does a claimed answer actually satisfy the equation?
- ``expressions_equivalent`` — are two expressions equal? (``simplify(a - b) == 0``)
- ``step_preserves_solutions`` — does a solving step keep the exact same solution set?

A check that cannot be parsed raises ``CasError`` rather than guessing; the gate then
refuses, which is the safe posture for a correctness substrate.
"""

from __future__ import annotations

from tokenize import TokenError

import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from .gate import CheckResult

# Accept learner-style input: "2x" (implicit multiply) and "x^2" (caret as power).
_TRANSFORMS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

_PARSE_ERRORS = (SyntaxError, TokenError, TypeError, ValueError, sp.SympifyError)


class CasError(ValueError):
    """Raised when an expression or equation cannot be parsed or pinned to one variable."""


def _expr(text: str) -> sp.Expr:
    try:
        return parse_expr(text, transformations=_TRANSFORMS, evaluate=True)
    except _PARSE_ERRORS as exc:
        raise CasError(f"could not parse expression: {text!r}") from exc


def parse_equation(text: str) -> sp.Eq:
    if text.count("=") != 1:
        raise CasError(f"equation must contain exactly one '=': {text!r}")
    lhs, rhs = text.split("=")
    return sp.Eq(_expr(lhs), _expr(rhs))


def _single_symbol(*exprs: sp.Expr, prefer: str | None = None) -> sp.Symbol:
    symbols: set[sp.Symbol] = set().union(*(e.free_symbols for e in exprs))
    if prefer is not None:
        wanted = sp.Symbol(prefer)
        if wanted in symbols:
            return wanted
    if len(symbols) == 1:
        return next(iter(symbols))
    if not symbols:
        raise CasError("no variable found; expected a single-variable equation")
    raise CasError(f"expected one variable, found {sorted(str(s) for s in symbols)}")


def _claimed_value(claimed: str, eq: sp.Eq, var: str | None) -> sp.Expr:
    """Read a claimed answer, whether written as ``x = 2``, ``2 = x``, or just ``2``."""
    text = claimed.strip()
    if "=" not in text:
        return _expr(text)
    left, right = text.split("=", 1)
    left_e, right_e = _expr(left), _expr(right)
    sym = _single_symbol(eq.lhs, eq.rhs, prefer=var)
    if left_e == sym:
        return right_e
    if right_e == sym:
        return left_e
    solutions = sp.solve(sp.Eq(left_e, right_e), sym)
    if len(solutions) != 1:
        raise CasError(f"claimed answer does not pin a single value: {claimed!r}")
    return solutions[0]


def solution_satisfies(equation: str, claimed: str, *, var: str | None = None) -> CheckResult:
    """True iff substituting the claimed value makes both sides equal."""
    eq = parse_equation(equation)
    value = _claimed_value(claimed, eq, var)
    sym = _single_symbol(eq.lhs, eq.rhs, prefer=var)
    residual = sp.simplify((eq.lhs - eq.rhs).subs(sym, value))
    return CheckResult(
        name="cas.solution_satisfies",
        passed=bool(residual == 0),
        detail=f"{equation} at {sym}={value} leaves residual {residual}",
    )


def expressions_equivalent(a: str, b: str) -> CheckResult:
    """True iff the two expressions are symbolically equal."""
    diff = sp.simplify(_expr(a) - _expr(b))
    return CheckResult(
        name="cas.expressions_equivalent",
        passed=bool(diff == 0),
        detail=f"simplify(({a}) - ({b})) = {diff}",
    )


def _solution_set(eq: sp.Eq, sym: sp.Symbol) -> sp.Set:
    return sp.solveset(eq, sym, domain=sp.S.Reals)


def step_preserves_solutions(before: str, after: str, *, var: str | None = None) -> CheckResult:
    """True iff the two equation forms have the exact same real solution set."""
    eb, ea = parse_equation(before), parse_equation(after)
    sym = _single_symbol(eb.lhs, eb.rhs, ea.lhs, ea.rhs, prefer=var)
    sb, sa = _solution_set(eb, sym), _solution_set(ea, sym)
    return CheckResult(
        name="cas.step_preserves_solutions",
        passed=bool(sb == sa),
        detail=f"{before} -> {sb}; {after} -> {sa}",
    )


def verify_step_chain(equation: str, steps: list[str], *, var: str | None = None) -> CheckResult:
    """Each consecutive form (starting from the equation) must preserve the solution set."""
    forms = [equation, *steps]
    for before, after in zip(forms, forms[1:], strict=False):
        result = step_preserves_solutions(before, after, var=var)
        if not result.passed:
            return CheckResult(
                name="cas.step_chain",
                passed=False,
                detail=f"step {before!r} -> {after!r} changes the solution set ({result.detail})",
            )
    return CheckResult(
        name="cas.step_chain",
        passed=True,
        detail=f"all {len(steps)} step(s) preserve the solution set",
    )
