"""Offline grounding test: the deterministic verifier must agree with the authored calibration labels.

This runs with no model call (CI-safe). It validates two things at once: that the calibration set is
mathematically correct, and that the verifier grounding (correctness + first-bad-step localization) is
trustworthy — which is the foundation the whole grading spike stands on.
"""

from __future__ import annotations

import pytest
from classess_atom.calibration import MISCONCEPTIONS, SAMPLES
from classess_atom.grade import verifier_ground


@pytest.mark.parametrize("sample", SAMPLES, ids=[s.id for s in SAMPLES])
def test_verifier_matches_ground_truth(sample) -> None:
    findings = verifier_ground(sample.equation, sample.working)
    assert findings.final_correct == sample.correct, (
        f"{sample.id}: verifier correctness {findings.final_correct} != truth {sample.correct}"
    )
    assert findings.first_bad_step == sample.error_step, (
        f"{sample.id}: verifier first-bad-step {findings.first_bad_step} != truth {sample.error_step}"
    )


def test_misconception_labels_are_in_the_vocabulary() -> None:
    for sample in SAMPLES:
        assert sample.misconception in MISCONCEPTIONS
