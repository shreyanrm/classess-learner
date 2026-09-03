# content/atom — the linear-equations atom (COMPLETED SPIKE, archived)

**Status: archived.** This is a finished spike, not a live production path. Nothing in
`services/gateway` imports `classess_atom`, and nothing should start to without the decision
below being taken deliberately.

## What it is

The one place in the repo that pairs the deterministic CAS verifier with a hint-safety
guardrail:

- `src/classess_atom/calibration.py` — 16 authored samples of learner working on linear
  equations in one variable, each labelled with truth (correct? which step first breaks the
  solution set? which misconception?).
- `src/classess_atom/grade.py` — **grounded grading**. `classess_verifier.cas` decides
  correctness and first-bad-step deterministically; the model is handed that verdict and adds
  only the misconception name and a graduated hint. The model never free-styles the math.
- `src/classess_atom/spike.py` — the calibration run (`uv run python -m classess_atom.spike`,
  needs live model keys).
- `spike-report.json` — the committed result of that run. Read it as a dated measurement,
  not as a current claim.

## What the spike found

From `spike-report.json` (16 samples): correctness and localization agreement `1.0`,
misconception agreement `0.875`, median latency `2.71 s`, and the finding that mattered —
`hint_never_hands_answer` was only `0.688` overall but `1.0` on the samples where the learner
was actually stuck. The leak was hints on *correct* work ("substitute x = 2 back in…"), which
restates the answer. Any wiring of this grader must carry that guardrail forward.

## Why it is still here

`content/atom/tests/test_grade.py` runs in CI with **no model call**: it asserts the
calibration labels are mathematically correct and that the verifier grounding agrees with
them. That test is a live regression gate on `classess_verifier.cas`, which is why the package
stays in the repo, in the uv workspace, and in `services/gateway/Dockerfile`'s manifest layer.

## The open decision

Either the grounded-grading pattern moves into the gateway (the free-response grading path
would call the verifier first and hand the model a verdict, exactly as `grade.py` does), or
this directory is deleted along with its uv-workspace membership and the Dockerfile line.
Until one of those happens, treat everything here as reference, not as a dependency.
