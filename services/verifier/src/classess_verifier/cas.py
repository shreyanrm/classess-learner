"""Symbolic CAS checks (SymPy) for linear equations in one variable — the atom.

These are deterministic proofs, not heuristics:
- ``solution_satisfies`` — does a claimed answer actually satisfy the equation?
- ``expressions_equivalent`` — are two expressions equal? (``simplify(a - b) == 0``)
- ``step_preserves_solutions`` — does a solving step keep the exact same solution set?

A check that cannot be parsed raises ``CasError`` rather than guessing; the gate then
refuses, which is the safe posture for a correctness substrate.

**Learner text is hostile until proven otherwise.** ``parse_expr`` is ``eval`` underneath,
and with SymPy's default namespace ``__import__('os')`` really imports ``os`` — a learner
string could read or write files, and a nested power could burn CPU forever. Four layers
guard it, in order of importance:

1. **Namespace** (the control). Parsing runs against a namespace built only from SymPy's
   symbolic names, with ``__builtins__`` emptied, so no builtin — ``open``, ``eval``,
   ``__import__``, ``globals`` — is reachable at all. Those names degrade to plain symbols,
   which are not callable, so the expression dies as a ``TypeError`` and is refused.
2. **Token guard** (the other half of the control). An emptied namespace is *not* enough on
   its own: a string literal that meets a SymPy object is handed to ``sympify``, which
   re-parses it with SymPy's default namespace, and a ``__class__`` chain walks out through
   the class graph. Both are refused at the token level, before evaluation.
3. **Budget.** Every parse, simplify and solve runs in a separate process under a
   wall-clock budget and is killed on overrun (see ``sandbox``).
4. **Shape** (defence in depth, never the control). A length cap and a character allowlist
   reject what no equation needs — quotes, brackets, doubled underscores — so hostile text
   usually never reaches the parser at all.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from tokenize import NAME, STRING, TokenError
from typing import Any

import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from . import sandbox
from .gate import CheckResult


class CasError(ValueError):
    """Raised when an expression or equation cannot be parsed or pinned to one variable."""


class CasTimeout(CasError):
    """Raised when a check exceeds its wall-clock budget — refuse, do not guess."""


def _reject_hostile_tokens(
    tokens: list[tuple[int, str]],
    local_dict: dict[str, Any],
    global_dict: dict[str, Any],
) -> list[tuple[int, str]]:
    """Kill the two escapes that survive an emptied ``__builtins__``, at the token level.

    **String literals.** Any Python string that meets a SymPy object in an arithmetic
    operation is passed to ``sympify``, and ``sympify`` re-parses it with SymPy's *default*
    namespace — real builtins and all. So ``eval(compile('open("f","w").write("x")',...))``
    writes the file even against a restricted namespace: the inner string is sympified on
    the way into a ``Mul``. Verified, not theorised. No equation needs a string literal.

    **Dunder names.** ``x.__class__.__mro__`` walks straight out of any namespace into the
    class graph. No equation needs a name with a leading or doubled underscore either
    (``v_0`` and ``E_k``, which learners do write, are untouched).
    """
    for tok_num, tok_val in tokens:
        if tok_num == STRING:
            raise CasError("an expression may not contain a string literal")
        if tok_num == NAME and (tok_val.startswith("_") or "__" in tok_val):
            raise CasError(f"reserved name in expression: {tok_val!r}")
    return tokens


# Accept learner-style input: "2x" (implicit multiply) and "x^2" (caret as power).
# The token guard runs first, before any other transformation can rewrite what it sees.
_TRANSFORMS = (
    (_reject_hostile_tokens,)
    + standard_transformations
    + (
        implicit_multiplication_application,
        convert_xor,
    )
)

#: Long enough for any equation a learner writes; short enough that the parser's own
#: super-linear behaviour on nested structure cannot be reached.
MAX_EXPRESSION_CHARS = 400
#: A solving chain longer than this is not a learner's working.
MAX_STEPS = 50

# Everything an equation needs and nothing else: no quote (so no string literal can be
# formed and no file can be named), no bracket, no colon, no backslash. A single underscore
# stays legal because subscripted names are ordinary physics (``v_0``, ``E_k``); a *double*
# underscore is rejected separately below, which is what closes the ``__class__`` walk out
# of the namespace.
_ALLOWED_CHARS = frozenset(
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "_+-*/^().,= \t"
)

# Plain SymPy helpers that are not classes and so are not caught by the type filter below.
_EXTRA_NAMES = (
    "sqrt",
    "cbrt",
    "root",
    "simplify",
    "expand",
    "factor",
    "together",
    "cancel",
    "apart",
    "nsimplify",
    "gcd",
    "lcm",
)


def _build_namespace() -> dict[str, Any]:
    """SymPy's symbolic vocabulary, and nothing that can touch the machine.

    Only classes and instances of ``Basic`` (``Symbol``, ``sin``, ``pi``, ``Eq`` …) plus a
    short list of named helpers. Module-level *functions* like ``sympy.preview`` (shells out
    to LaTeX) and ``sympy.test`` are excluded by construction, not by denylist.

    ``__builtins__`` must be present and empty: ``eval`` injects the real builtins into any
    globals mapping that lacks the key, which is exactly how ``__import__('os')`` works
    against the default namespace.
    """
    namespace: dict[str, Any] = {}
    for name in dir(sp):
        if name.startswith("_"):
            continue
        obj = getattr(sp, name)
        if isinstance(obj, sp.Basic) or (isinstance(obj, type) and issubclass(obj, sp.Basic)):
            namespace[name] = obj
    for name in _EXTRA_NAMES:
        helper = getattr(sp, name, None)
        if helper is not None:
            namespace[name] = helper
    namespace["__builtins__"] = {}
    return namespace


_NAMESPACE = _build_namespace()

# Widened deliberately: a hostile string reaches SymPy as an attribute walk (AttributeError),
# a call on a Symbol (TypeError), or deep nesting (RecursionError), none of which the
# original SyntaxError/TypeError/ValueError set caught. ``SympifyError`` is a ``ValueError``.
_PARSE_ERRORS = (
    ArithmeticError,
    AttributeError,
    LookupError,
    MemoryError,
    RecursionError,
    SyntaxError,
    TokenError,
    TypeError,
    ValueError,
)


def _short(value: object, limit: int = 200) -> str:
    """Printable, bounded. ``str()`` of a huge integer raises; a detail string never should."""
    try:
        text = str(value)
    except (ValueError, RecursionError, MemoryError):
        return "<unprintable>"
    return text if len(text) <= limit else text[: limit - 3] + "..."


def _validate(text: str) -> str:
    """Shape check, in the parent process, before anything is parsed."""
    if not isinstance(text, str):
        raise CasError("expression must be text")
    stripped = text.strip()
    if not stripped:
        raise CasError("empty expression")
    if len(stripped) > MAX_EXPRESSION_CHARS:
        raise CasError(
            f"expression too long: {len(stripped)} characters (limit {MAX_EXPRESSION_CHARS})"
        )
    unsupported = sorted(set(stripped) - _ALLOWED_CHARS)
    if unsupported:
        raise CasError(f"expression contains unsupported characters: {''.join(unsupported)!r}")
    if "__" in stripped:
        # Every route out of the restricted namespace runs through a dunder attribute.
        raise CasError("expression contains a reserved name")
    return stripped


def _split_equation(text: str) -> tuple[str, str]:
    if text.count("=") != 1:
        raise CasError(f"equation must contain exactly one '=': {text!r}")
    lhs, rhs = text.split("=")
    return lhs, rhs


def _validate_equation(text: str) -> str:
    stripped = _validate(text)
    _split_equation(stripped)
    return stripped


# --- inside the sandbox worker -------------------------------------------------------
# Everything below runs in the bounded child process. Module-level by necessity: the
# functions are pickled by reference to be dispatched there.


def _expr(text: str) -> sp.Expr:
    try:
        return parse_expr(
            _validate(text),
            transformations=_TRANSFORMS,
            global_dict=dict(_NAMESPACE),
            local_dict={},
            evaluate=True,
        )
    except CasError:
        raise
    except _PARSE_ERRORS as exc:
        raise CasError(f"could not parse expression: {text!r}") from exc


def _parse_equation(text: str) -> sp.Eq:
    lhs, rhs = _split_equation(_validate(text))
    return sp.Eq(_expr(lhs), _expr(rhs))


def _single_symbol(*exprs: sp.Expr, prefer: str | None = None) -> sp.Symbol:
    symbols: set[sp.Symbol] = set().union(*(e.free_symbols for e in exprs))
    if prefer is not None:
        wanted = sp.Symbol(_validate(prefer))
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


def _solution_set(eq: sp.Eq, sym: sp.Symbol) -> sp.Set:
    return sp.solveset(eq, sym, domain=sp.S.Reals)


def _compute_solution_satisfies(equation: str, claimed: str, var: str | None) -> tuple[bool, str]:
    eq = _parse_equation(equation)
    value = _claimed_value(claimed, eq, var)
    sym = _single_symbol(eq.lhs, eq.rhs, prefer=var)
    residual = sp.simplify((eq.lhs - eq.rhs).subs(sym, value))
    return bool(residual == 0), (
        f"{equation} at {sym}={_short(value)} leaves residual {_short(residual)}"
    )


def _compute_expressions_equivalent(a: str, b: str) -> tuple[bool, str]:
    diff = sp.simplify(_expr(a) - _expr(b))
    return bool(diff == 0), f"simplify(({a}) - ({b})) = {_short(diff)}"


def _compute_step_preserves(before: str, after: str, var: str | None) -> tuple[bool, str]:
    eb, ea = _parse_equation(before), _parse_equation(after)
    sym = _single_symbol(eb.lhs, eb.rhs, ea.lhs, ea.rhs, prefer=var)
    sb, sa = _solution_set(eb, sym), _solution_set(ea, sym)
    return bool(sb == sa), f"{before} -> {_short(sb)}; {after} -> {_short(sa)}"


def _compute_step_chain(forms: list[str], var: str | None) -> tuple[bool, str]:
    for before, after in zip(forms, forms[1:], strict=False):
        passed, detail = _compute_step_preserves(before, after, var)
        if not passed:
            return False, (
                f"step {before!r} -> {after!r} changes the solution set ({detail})"
            )
    return True, f"all {len(forms) - 1} step(s) preserve the solution set"


def _worker(func: Callable[..., Any], *args: Any) -> Any:
    """Sandbox entry point. Any symbolic blow-up becomes a refusal, never a 500."""
    try:
        return func(*args)
    except CasError:
        raise
    except _PARSE_ERRORS as exc:
        raise CasError(f"could not check this expression ({type(exc).__name__})") from exc


# --- parent-process API --------------------------------------------------------------


def _run(func: Callable[..., Any], args: Sequence[Any]) -> Any:
    try:
        return sandbox.run_bounded(_worker, (func, *args))
    except sandbox.SandboxTimeout as exc:
        raise CasTimeout("this check took too long and was stopped") from exc
    except sandbox.SandboxUnavailable as exc:
        raise CasError("the symbolic checker is unavailable") from exc


def parse_equation(text: str) -> sp.Eq:
    """Parse ``lhs = rhs`` into a SymPy equation (inside the sandbox)."""
    return _run(_parse_equation, (_validate_equation(text),))


def solution_satisfies(equation: str, claimed: str, *, var: str | None = None) -> CheckResult:
    """True iff substituting the claimed value makes both sides equal."""
    equation = _validate_equation(equation)
    claimed = _validate(claimed)
    if var is not None:
        _validate(var)
    passed, detail = _run(_compute_solution_satisfies, (equation, claimed, var))
    return CheckResult(name="cas.solution_satisfies", passed=passed, detail=detail)


def expressions_equivalent(a: str, b: str) -> CheckResult:
    """True iff the two expressions are symbolically equal."""
    passed, detail = _run(_compute_expressions_equivalent, (_validate(a), _validate(b)))
    return CheckResult(name="cas.expressions_equivalent", passed=passed, detail=detail)


def step_preserves_solutions(before: str, after: str, *, var: str | None = None) -> CheckResult:
    """True iff the two equation forms have the exact same real solution set."""
    before, after = _validate_equation(before), _validate_equation(after)
    if var is not None:
        _validate(var)
    passed, detail = _run(_compute_step_preserves, (before, after, var))
    return CheckResult(name="cas.step_preserves_solutions", passed=passed, detail=detail)


def verify_step_chain(equation: str, steps: list[str], *, var: str | None = None) -> CheckResult:
    """Each consecutive form (starting from the equation) must preserve the solution set."""
    if len(steps) > MAX_STEPS:
        raise CasError(f"too many steps: {len(steps)} (limit {MAX_STEPS})")
    forms = [_validate_equation(equation), *(_validate_equation(s) for s in steps)]
    if var is not None:
        _validate(var)
    passed, detail = _run(_compute_step_chain, (forms, var))
    return CheckResult(name="cas.step_chain", passed=passed, detail=detail)
