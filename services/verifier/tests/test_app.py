"""Endpoint wiring. Calls the route handlers directly (no HTTP client dependency)."""

from __future__ import annotations

import pytest
from classess_verifier.app import (
    GenericVerifyRequest,
    MathVerifyRequest,
    NumericBounds,
    healthz,
    verify_generic,
    verify_math,
)
from pydantic import ValidationError


def test_healthz() -> None:
    assert healthz() == {"status": "ok"}


def test_math_correct_answer_is_served() -> None:
    res = verify_math(MathVerifyRequest(equation="2x+3=7", claimed_answer="x=2"))
    assert res.verified
    assert res.action == "serve"
    assert res.verification_hash


def test_math_wrong_answer_is_refused() -> None:
    res = verify_math(MathVerifyRequest(equation="2x+3=7", claimed_answer="x=3"))
    assert not res.verified
    assert res.action == "refuse"
    assert res.fallback == "cached_verified"
    assert res.verification_hash is None


def test_math_requires_something_to_verify() -> None:
    with pytest.raises(ValidationError):
        MathVerifyRequest(equation="2x+3=7")


def test_generic_numeric_bounds() -> None:
    served = verify_generic(
        GenericVerifyRequest(
            content={"v": 0.5}, numeric=NumericBounds(value=0.5, low=0.0, high=1.0)
        )
    )
    assert served.verified

    refused = verify_generic(
        GenericVerifyRequest(
            content={"v": 2.0}, numeric=NumericBounds(value=2.0, low=0.0, high=1.0)
        )
    )
    assert not refused.verified
    assert refused.fallback == "cached_verified"


def test_generic_crosscheck_seam() -> None:
    res = verify_generic(GenericVerifyRequest(content="a generated hint", crosscheck=True))
    assert res.verified  # mock cross-checker agrees with confidence 0.9 >= 0.7
