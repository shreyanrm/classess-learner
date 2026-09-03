"""Second-model cross-check seam.

A second model independently reviews content that deterministic checks cannot prove
(natural-language hints, reveals, nuggets). This is the typed interface plus a deterministic
mock; the real implementation routes through the model gateway. It lives in its own module so
the gate can depend on the result type without pulling a model client.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CrossCheckResult:
    agrees: bool
    confidence: float  # the second model's own confidence, clamped to [0, 1] by the gate
    model: str
    detail: str = ""


class CrossChecker(Protocol):
    """Reviews a piece of content against a claim and reports agreement + confidence."""

    def review(self, content: str, claim: str = "") -> CrossCheckResult: ...


@dataclass(frozen=True)
class MockCrossChecker:
    """Deterministic stand-in for the real second model.

    Returns a fixed verdict so the seam is testable end to end; construct with a lower
    ``confidence`` to exercise the refuse-below-threshold path. Swap for a gateway-backed
    checker once Track-1/Track-2 routing exists.
    """

    agrees: bool = True
    confidence: float = 0.9
    model: str = "mock-crosscheck-v0"

    def review(self, content: str, claim: str = "") -> CrossCheckResult:
        return CrossCheckResult(
            agrees=self.agrees,
            confidence=self.confidence,
            model=self.model,
            detail="mock second-model crosscheck",
        )
