"""Numeric-bounds check and the re-run-simulator hook.

``numeric_within_bounds`` confirms a value sits inside an expected interval — used for
content whose correctness is a numeric range rather than a symbolic identity. The simulator
hook is the typed seam for re-running a pre-tested simulator template; the default stub never
confirms a match, so simulator content fails safe until a real runner is wired.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .gate import CheckResult


def numeric_within_bounds(
    value: float,
    low: float | None = None,
    high: float | None = None,
    *,
    inclusive: bool = True,
) -> CheckResult:
    """True iff ``value`` is within the given bounds. Requires at least one bound."""
    if low is None and high is None:
        raise ValueError("numeric bounds require at least one of low/high")
    ok = True
    parts: list[str] = []
    if low is not None:
        ok = ok and (value >= low if inclusive else value > low)
        parts.append(f">= {low}" if inclusive else f"> {low}")
    if high is not None:
        ok = ok and (value <= high if inclusive else value < high)
        parts.append(f"<= {high}" if inclusive else f"< {high}")
    return CheckResult(
        name="numeric.within_bounds",
        passed=ok,
        detail=f"{value} expected {' and '.join(parts)}",
    )


@dataclass(frozen=True)
class SimulatorResult:
    matched: bool
    detail: str = ""


class SimulatorRunner(Protocol):
    """Re-runs a frozen, pre-tested simulator template and reports whether output matches.

    The real runner executes the template in a sandbox; this seam keeps the verifier
    decoupled from the simulator service.
    """

    def rerun(
        self, template_id: str, params: dict[str, object], expected: object
    ) -> SimulatorResult: ...


@dataclass(frozen=True)
class StubSimulatorRunner:
    """Default runner: no simulator wired, so it never confirms a match (fail-safe)."""

    def rerun(
        self, template_id: str, params: dict[str, object], expected: object
    ) -> SimulatorResult:
        return SimulatorResult(matched=False, detail="simulator runner not configured")


def check_simulation(
    runner: SimulatorRunner,
    template_id: str,
    params: dict[str, object],
    expected: object,
) -> CheckResult:
    result = runner.rerun(template_id, params, expected)
    return CheckResult(name="numeric.simulation_rerun", passed=result.matched, detail=result.detail)
