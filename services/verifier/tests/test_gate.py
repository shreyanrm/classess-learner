"""Confidence gate, refusal posture, and verification hashing."""

from __future__ import annotations

from wobo_verifier import (
    CheckResult,
    MockCrossChecker,
    decide,
    verification_hash,
)

PASS = CheckResult(name="t", passed=True)
FAIL = CheckResult(name="t", passed=False)


def test_deterministic_pass_serves_with_hash() -> None:
    v = decide(content={"e": "2x+3=7"}, method="cas", checks=[PASS])
    assert v.verified
    assert v.action == "serve"
    assert v.confidence == 1.0
    assert v.verification_hash
    assert v.fallback is None


def test_deterministic_fail_refuses_with_fallback() -> None:
    v = decide(content={"e": "2x+3=7"}, method="cas", checks=[FAIL])
    assert not v.verified
    assert v.action == "refuse"
    assert v.confidence == 0.0
    assert v.verification_hash is None
    assert v.fallback == "cached_verified"


def test_crosscheck_below_threshold_refuses() -> None:
    # No deterministic check (non-deterministic content) + a low-confidence second model.
    cross = MockCrossChecker(agrees=True, confidence=0.4).review("some hint")
    v = decide(content="some hint", method="generic", checks=[], cross=cross, threshold=0.7)
    assert not v.verified
    assert v.action == "refuse"
    assert v.confidence == 0.4
    assert v.fallback == "cached_verified"


def test_crosscheck_above_threshold_serves() -> None:
    cross = MockCrossChecker(agrees=True, confidence=0.95).review("some hint")
    v = decide(content="some hint", method="generic", checks=[], cross=cross, threshold=0.7)
    assert v.verified
    assert v.confidence == 0.95
    assert v.verification_hash


def test_nothing_verified_refuses() -> None:
    v = decide(content="x", method="generic", checks=[])
    assert not v.verified
    assert v.confidence == 0.0


def test_verification_hash_stable_and_deterministic() -> None:
    a = verification_hash({"equation": "2x+3=7", "answer": "x=2"}, "cas.sympy.linear_eq_1v")
    b = verification_hash({"equation": "2x+3=7", "answer": "x=2"}, "cas.sympy.linear_eq_1v")
    assert a == b  # deterministic: same input, same hash, across calls
    assert len(a) == 64  # sha256 hex

    # Key order does not matter (content is normalized before hashing).
    reordered = verification_hash({"answer": "x=2", "equation": "2x+3=7"}, "cas.sympy.linear_eq_1v")
    assert a == reordered

    # Different content, method, or version => different hash.
    assert a != verification_hash({"equation": "2x+3=8", "answer": "x=2"}, "cas.sympy.linear_eq_1v")
    assert a != verification_hash({"equation": "2x+3=7", "answer": "x=2"}, "numeric")
    assert a != verification_hash(
        {"equation": "2x+3=7", "answer": "x=2"}, "cas.sympy.linear_eq_1v", version="v2"
    )
