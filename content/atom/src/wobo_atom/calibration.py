"""The grading calibration set for the atom.

Each sample is a piece of learner working on a linear equation, with an authored ground-truth
label: whether the final answer is correct, the index of the first wrong form in the working
(``working[0]`` is the equation itself), and the misconception at play. The spike measures how well
the grounded grader (verifier for correctness + Claude for the diagnosis) agrees with these labels.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Sample:
    id: str
    equation: str
    working: list[str]
    correct: bool
    # Index into `working` of the first form that breaks the solution set (None if all steps are valid).
    error_step: int | None
    misconception: str


# Misconception vocabulary (a linear-equation-focused slice of the ten gap types).
MISCONCEPTIONS = frozenset(
    {
        "none",
        "transposition_sign",
        "division_error",
        "distribution_error",
        "arithmetic_slip",
        "incomplete_division",
        "combine_like_terms_error",
    }
)

SAMPLES: list[Sample] = [
    Sample("ok-1", "2x + 3 = 7", ["2x + 3 = 7", "2x = 4", "x = 2"], True, None, "none"),
    Sample(
        "sign-1", "2x + 3 = 7", ["2x + 3 = 7", "2x = 10", "x = 5"], False, 1, "transposition_sign"
    ),
    Sample("div-1", "3x = 12", ["3x = 12", "x = 9"], False, 1, "division_error"),
    Sample("ok-2", "5x - 2 = 13", ["5x - 2 = 13", "5x = 15", "x = 3"], True, None, "none"),
    Sample(
        "dist-1",
        "2(x + 3) = 10",
        ["2(x + 3) = 10", "2x + 3 = 10", "2x = 7", "x = 7/2"],
        False,
        1,
        "distribution_error",
    ),
    Sample(
        "ok-3",
        "2(x + 3) = 10",
        ["2(x + 3) = 10", "2x + 6 = 10", "2x = 4", "x = 2"],
        True,
        None,
        "none",
    ),
    Sample("arith-1", "x + 7 = 12", ["x + 7 = 12", "x = 6"], False, 1, "arithmetic_slip"),
    Sample("ok-4", "x + 7 = 12", ["x + 7 = 12", "x = 5"], True, None, "none"),
    Sample(
        "incdiv-1",
        "2x + 4 = 10",
        ["2x + 4 = 10", "2x = 6", "x = 6"],
        False,
        2,
        "incomplete_division",
    ),
    Sample(
        "sign-2",
        "4x - 5 = 11",
        ["4x - 5 = 11", "4x = 6", "x = 3/2"],
        False,
        1,
        "transposition_sign",
    ),
    Sample("ok-5", "4x - 5 = 11", ["4x - 5 = 11", "4x = 16", "x = 4"], True, None, "none"),
    Sample(
        "combine-1",
        "3x + 2x = 10",
        ["3x + 2x = 10", "6x = 10", "x = 5/3"],
        False,
        1,
        "combine_like_terms_error",
    ),
    Sample("ok-6", "3x + 2x = 10", ["3x + 2x = 10", "5x = 10", "x = 2"], True, None, "none"),
    Sample("ok-7", "7 = 2x + 1", ["7 = 2x + 1", "6 = 2x", "x = 3"], True, None, "none"),
    Sample("ok-8", "x/2 = 5", ["x/2 = 5", "x = 10"], True, None, "none"),
    Sample("div-2", "x/3 = 4", ["x/3 = 4", "x = 4/3"], False, 1, "division_error"),
]
