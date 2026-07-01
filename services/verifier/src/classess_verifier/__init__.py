"""Correctness verifier — nothing reaches a learner unverified.

Deterministic CAS checks (SymPy) for linear equations in one variable, a numeric-bounds
check, a re-run-simulator hook, a second-model cross-check seam, and a confidence gate that
refuses to serve anything it cannot stand behind. Every verified item carries a stable
``verification_hash`` so the content cache can be keyed by it.

The FastAPI app lives in ``classess_verifier.app`` (``app:app``); importing this package keeps
the core verification API free of the web layer.
"""

from __future__ import annotations

from .cas import (
    CasError,
    expressions_equivalent,
    parse_equation,
    solution_satisfies,
    step_preserves_solutions,
    verify_step_chain,
)
from .crosscheck import CrossChecker, CrossCheckResult, MockCrossChecker
from .gate import (
    DEFAULT_THRESHOLD,
    VERSION,
    CheckResult,
    Verdict,
    confidence,
    decide,
    verification_hash,
)
from .numeric import (
    SimulatorResult,
    SimulatorRunner,
    StubSimulatorRunner,
    check_simulation,
    numeric_within_bounds,
)

__all__ = [
    "DEFAULT_THRESHOLD",
    "VERSION",
    "CasError",
    "CheckResult",
    "CrossCheckResult",
    "CrossChecker",
    "MockCrossChecker",
    "SimulatorResult",
    "SimulatorRunner",
    "StubSimulatorRunner",
    "Verdict",
    "check_simulation",
    "confidence",
    "decide",
    "expressions_equivalent",
    "numeric_within_bounds",
    "parse_equation",
    "solution_satisfies",
    "step_preserves_solutions",
    "verification_hash",
    "verify_step_chain",
]
