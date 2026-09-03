"""CAS proofs for the atom: linear equations in one variable."""

from __future__ import annotations

import pytest
from wobo_verifier import cas


def test_correct_solution_verifies() -> None:
    assert cas.solution_satisfies("2x+3=7", "x=2").passed
    assert cas.solution_satisfies("2x+3=7", "2").passed  # bare value form


def test_wrong_solution_rejected() -> None:
    assert not cas.solution_satisfies("2x+3=7", "x=3").passed


def test_expression_equivalence() -> None:
    assert cas.expressions_equivalent("2(x+1)", "2x+2").passed
    assert not cas.expressions_equivalent("2(x+1)", "2x+3").passed


def test_good_step_preserves_solutions() -> None:
    assert cas.step_preserves_solutions("2x+3=7", "2x=4").passed
    assert cas.step_preserves_solutions("2x=4", "x=2").passed


def test_wrong_solving_step_rejected() -> None:
    # Forgot to subtract 3 from the right-hand side: 2x+3=7 does NOT become 2x=7.
    assert not cas.step_preserves_solutions("2x+3=7", "2x=7").passed
    # And the full chain catches it.
    assert not cas.verify_step_chain("2x+3=7", ["2x=7", "x=3.5"]).passed
    assert cas.verify_step_chain("2x+3=7", ["2x=4", "x=2"]).passed


def test_unparseable_input_raises() -> None:
    with pytest.raises(cas.CasError):
        cas.parse_equation("2x+3==7")  # not a single '='
