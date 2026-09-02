"""The CAS parser is fed by learners, so it is treated as an attacker's input channel.

``parse_expr`` is ``eval`` underneath. Against SymPy's default namespace,
``__import__('os')`` really returns the ``os`` module — the verifier would happily read or
write files on behalf of whoever posted an equation, and a nested power would burn a worker
forever. These tests pin all three layers: the restricted namespace (the control), the
wall-clock budget, and the shape checks.
"""

from __future__ import annotations

import os
import time

import pytest
import sympy as sp
from classess_verifier import cas, sandbox
from sympy.parsing.sympy_parser import parse_expr


def _parse_without_shape_checks(text: str) -> object:
    """What ``cas._expr`` does, minus the length cap and character allowlist.

    This is the important entrypoint: it proves the parser layer (restricted namespace +
    token guard) stops these payloads on its own, so the shape checks stay what they are
    meant to be — defence in depth, not the control.
    """
    return parse_expr(
        text,
        transformations=cas._TRANSFORMS,
        global_dict=dict(cas._NAMESPACE),
        local_dict={},
        evaluate=True,
    )


# --- the namespace ------------------------------------------------------------------


def test_namespace_has_no_builtins_and_no_machine_touching_helpers() -> None:
    assert cas._NAMESPACE["__builtins__"] == {}
    for banned in ("open", "eval", "exec", "__import__", "globals", "compile", "input"):
        assert banned not in cas._NAMESPACE
    # sympy.preview shells out to LaTeX; sympy.test runs the test suite. Both are module-level
    # functions, so the "Basic classes and instances only" rule excludes them by construction.
    for banned in ("preview", "test", "doctest", "init_session"):
        assert banned not in cas._NAMESPACE
    # and the symbolic vocabulary that legitimate input needs is still there
    for wanted in ("Symbol", "Eq", "sin", "pi", "sqrt", "simplify", "Rational"):
        assert wanted in cas._NAMESPACE


@pytest.mark.parametrize(
    "payload",
    [
        "__import__('os')",
        "__import__('os').system('true')",
        "globals()",
        "eval(chr(112))",
        "().__class__.__mro__",
        "x.__class__.__mro__",
    ],
)
def test_builtin_escapes_degrade_to_symbols_or_errors(payload: str) -> None:
    """The namespace alone — no length cap, no allowlist — must already be enough."""
    try:
        result = _parse_without_shape_checks(payload)
    except Exception as exc:  # noqa: BLE001 - any refusal is a pass; a module is not
        assert not isinstance(exc, SystemExit)
        return
    assert isinstance(result, sp.Basic), f"{payload!r} escaped to {type(result).__name__}"


def test_no_file_is_written_by_a_file_writing_payload(tmp_path) -> None:
    """The third payload is the one that actually wrote a file before this was fixed.

    A string literal reaching an arithmetic operation is handed to ``sympify``, which
    re-parses it with SymPy's default namespace — real builtins — so emptying our own
    ``__builtins__`` did nothing for it. The token guard is what closes it.
    """
    target = tmp_path / "pwned.txt"
    payloads = [
        f"open('{target}','w')",
        f"__import__('os').system('touch {target}')",
        f"eval(compile('open(\"{target}\",\"w\").write(\"x\")','p','exec'))",
    ]
    for payload in payloads:
        with pytest.raises(Exception):  # noqa: B017 - the point is that it never succeeds
            _parse_without_shape_checks(payload)
        assert not target.exists()

    # and through the real entrypoint, where the shape check refuses it earlier still
    for payload in payloads:
        with pytest.raises(cas.CasError):
            cas.expressions_equivalent(payload, "0")
        assert not target.exists()


def test_bare_builtin_names_become_harmless_symbols() -> None:
    """Quote-free calls survive the allowlist, so they must be inert once parsed."""
    result = cas.expressions_equivalent("open(3)", "0")
    assert not result.passed  # o*p*e*n*3, a product of symbols — not a file handle
    assert not cas.expressions_equivalent("eval(chr(3))", "0").passed


# --- the shape checks (defence in depth) ---------------------------------------------


def test_dunder_and_quotes_and_brackets_are_refused() -> None:
    for hostile in ("x.__class__", "'os'", "x[0]", "lambda: 1", "x;y", "x\\n"):
        with pytest.raises(cas.CasError):
            cas.expressions_equivalent(hostile, "0")


def test_length_cap() -> None:
    with pytest.raises(cas.CasError):
        cas.expressions_equivalent("1+" * (cas.MAX_EXPRESSION_CHARS // 2 + 1) + "1", "0")


def test_step_count_cap() -> None:
    with pytest.raises(cas.CasError):
        cas.verify_step_chain("2x+3=7", ["2x=4"] * (cas.MAX_STEPS + 1))


def test_subscripted_names_still_parse() -> None:
    """A single underscore is ordinary physics notation; only the dunder walk is closed."""
    eq = cas.parse_equation("E_k = 0.5*m*v^2")
    assert {str(s) for s in eq.free_symbols} == {"E_k", "m", "v"}


# --- the budget ----------------------------------------------------------------------


def test_checks_run_in_a_separate_process() -> None:
    assert sandbox.run_bounded(os.getpid) != os.getpid()


def test_cpu_burn_is_stopped_within_the_budget(monkeypatch) -> None:
    monkeypatch.setattr(sandbox, "TIMEOUT_SECONDS", 0.2)
    started = time.monotonic()
    with pytest.raises(cas.CasTimeout):
        cas.expressions_equivalent("factorial(500000)", "0")
    elapsed = time.monotonic() - started
    assert elapsed < 5.0, f"the budget did not bound the call ({elapsed:.1f}s)"


def test_the_worker_recovers_after_a_kill(monkeypatch) -> None:
    monkeypatch.setattr(sandbox, "TIMEOUT_SECONDS", 0.2)
    with pytest.raises(cas.CasTimeout):
        cas.expressions_equivalent("factorial(600000)", "0")
    monkeypatch.setattr(sandbox, "TIMEOUT_SECONDS", sandbox.DEFAULT_TIMEOUT_SECONDS)
    assert cas.solution_satisfies("2x+3=7", "x=2").passed


def test_timeout_is_a_cas_error_so_the_gate_refuses() -> None:
    assert issubclass(cas.CasTimeout, cas.CasError)


# --- parity: legitimate input is unchanged -------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("2x+3=7", sp.Eq(2 * sp.Symbol("x") + 3, sp.Integer(7))),
        ("2x=4", sp.Eq(2 * sp.Symbol("x"), sp.Integer(4))),
        ("x=2", sp.Eq(sp.Symbol("x"), sp.Integer(2))),
        ("x=3.5", sp.Eq(sp.Symbol("x"), sp.Float(3.5))),
        ("0=2(y+1)", sp.Eq(sp.Integer(0), 2 * sp.Symbol("y") + 2)),
        ("0=sqrt(2)x^2", sp.Eq(sp.Integer(0), sp.sqrt(2) * sp.Symbol("x") ** 2)),
    ],
)
def test_legitimate_input_parses_identically(text: str, expected: sp.Eq) -> None:
    assert cas.parse_equation(text) == expected
