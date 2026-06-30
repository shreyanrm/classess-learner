# 05 · Practice (unaided evidence)

**Purpose:** measure independence via unaided, FSRS-scheduled retrieval (see `03-FLOWS/03-practice-flow.md`).
**Contains:** PracticeItem (verified, IRT-difficulty-picked) · unaided attempt input · honest feedback after grading · next-due indication.
**States:** due-item · unaided-attempt · grading · result · next-scheduled · anomaly(integrity) · empty(nothing due).
**Vidya:** deliberately **steps back** — present but quiet, dimmed to an ember; she does not help here. (A small, honest "I'll wait" posture.)
**Events:** `practice.item.served.v1`, `practice.item.answered.v1`, `practice.retrieval.scheduled.v1`, `evidence.recorded.v1`, `mastery.band.changed.v1`.
**AI:** `grade.attempt` · `verify.*` · `orchestrator.select-item` · `calibration.check`.
**Guardrails:** no help during evidence; grading must pass calibration; predicted language is honest ranges; integrity signals recorded.
