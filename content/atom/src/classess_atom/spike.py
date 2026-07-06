"""The perception + grading spike — the keystone verification of the atom.

Runs the grounded grader over the calibration set on real AI and measures agreement with the authored
ground truth. Reports four numbers that matter:

  - correctness agreement: does the verifier's deterministic correctness match the truth? (grounding)
  - localization agreement: does the verifier find the first wrong step? (perception of the working)
  - misconception agreement: does Claude's diagnosis match the human label? (model quality)
  - hint safety: fraction of hints that never hand over the answer (the hard guardrail)

Run:  uv run python -m classess_atom.spike
Writes content/atom/spike-report.json.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from .calibration import SAMPLES, Sample
from .grade import Grade, grounded_grade, verifier_ground


def _run_sample(sample: Sample) -> tuple[Grade, float]:
    findings = verifier_ground(sample.equation, sample.working)
    started = time.perf_counter()
    grade = grounded_grade(sample.equation, sample.working, findings)
    elapsed = time.perf_counter() - started
    return grade, elapsed


def run_spike() -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    latencies: list[float] = []

    for sample in SAMPLES:
        grade, elapsed = _run_sample(sample)
        latencies.append(elapsed)
        rows.append(
            {
                "id": sample.id,
                "equation": sample.equation,
                "truth_correct": sample.correct,
                "graded_correct": grade.correct,
                "truth_error_step": sample.error_step,
                "graded_error_step": grade.error_step,
                "truth_misconception": sample.misconception,
                "graded_misconception": grade.misconception,
                "hint": grade.hint,
                "hint_reveals_answer": grade.hint_reveals_answer,
                "latency_s": round(elapsed, 2),
            }
        )

    n = len(rows)
    incorrect = [r for r in rows if r["truth_correct"] is False]
    correctness = sum(1 for r in rows if r["graded_correct"] == r["truth_correct"]) / n
    localization = (
        sum(1 for r in incorrect if r["graded_error_step"] == r["truth_error_step"])
        / len(incorrect)
        if incorrect
        else 1.0
    )
    misconception = (
        sum(1 for r in rows if r["graded_misconception"] == r["truth_misconception"]) / n
    )
    hint_safety = sum(1 for r in rows if not r["hint_reveals_answer"]) / n
    # The real guardrail: when the learner is STUCK (wrong working), Vidya must never hand the answer.
    # (On correct working, affirming the answer they already found is not a violation.)
    hint_safety_when_stuck = (
        sum(1 for r in incorrect if not r["hint_reveals_answer"]) / len(incorrect)
        if incorrect
        else 1.0
    )

    return {
        "samples": n,
        "metrics": {
            "correctness_agreement": round(correctness, 3),
            "localization_agreement": round(localization, 3),
            "misconception_agreement": round(misconception, 3),
            "hint_never_hands_answer": round(hint_safety, 3),
            "hint_never_hands_answer_when_stuck": round(hint_safety_when_stuck, 3),
            "median_latency_s": round(sorted(latencies)[len(latencies) // 2], 2),
        },
        "rows": rows,
    }


def main() -> None:
    print("Running the atom perception + grading spike on real AI...\n")
    report = run_spike()
    m = report["metrics"]

    print(
        f"{'id':10} {'truth':>6} {'graded':>7} {'errStep':>8} {'misconception':>26} {'hintSafe':>9}"
    )
    for r in report["rows"]:
        graded_err = "-" if r["graded_error_step"] is None else r["graded_error_step"]
        match = "OK" if r["graded_misconception"] == r["truth_misconception"] else "XX"
        print(
            f"{r['id']:10} {str(r['truth_correct']):>6} {str(r['graded_correct']):>7} "
            f"{str(graded_err):>8} {r['graded_misconception']:>20} {match:>3} "
            f"{'yes' if not r['hint_reveals_answer'] else 'NO':>9}"
        )

    print("\n--- spike metrics ---")
    print(f"correctness agreement (verifier vs truth):     {m['correctness_agreement']:.0%}")
    print(f"localization agreement (first bad step):        {m['localization_agreement']:.0%}")
    print(f"misconception agreement (Claude vs human):      {m['misconception_agreement']:.0%}")
    print(f"hint never hands the answer (all):              {m['hint_never_hands_answer']:.0%}")
    print(
        f"hint never hands the answer WHEN STUCK:          {m['hint_never_hands_answer_when_stuck']:.0%}"
    )
    print(f"median grade latency:                           {m['median_latency_s']}s")

    out = Path(__file__).resolve().parents[2] / "spike-report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
