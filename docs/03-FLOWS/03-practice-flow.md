# 03 · Practice / Evidence Flow

**WHEN:** orchestrator routes here from the learn loop; and on FSRS-scheduled retrieval (returning a concept for durable memory).
**WHERE:** the Practice surface (PracticeItem). Deliberately **unaided** — this is where *independence* is measured.
**WHY:** Practice is a **separate evidence engine**, not more teaching. **Independence is the keystone of mastery** — it can only be
measured when help is absent. FSRS makes memory durable; retention is one of the ten gap types.

**WHAT (steps):**
1. **Serve item** — FSRS picks what is due; orchestrator/IRT picks difficulty to be informative (not crushing). Verified content only.
2. **Unaided attempt** — Vidya is *not* helping here (she may quietly wait/dim). The response is the evidence.
3. **Grade** — deterministic where possible (CAS/numeric); model-graded with verifier cross-check otherwise. Grading calibration harness
   keeps model-grading aligned to human judgement (a first-class subsystem).
4. **Record evidence** — attempt → evidence, attributed, linked in the Evidence Graph; updates the six mastery factors (esp. Independence,
   Reliability, Recency, Consistency) and the relevant gap types.
5. **Schedule next retrieval** — FSRS sets the next due time; emits the schedule.

**HOW:** FSRS service + IRT/Bayesian ability estimate; verifier for grading correctness; evidence written via events to KGtoPG; the app
keeps a `mastery_cache` read view for UI.
**EVENTS:** `practice.item.served.v1`, `practice.item.answered.v1`, `practice.retrieval.scheduled.v1`, `evidence.recorded.v1`,
`mastery.band.changed.v1`, `integrity.signal.recorded.v1` (if anomaly).
**AI CALLS:** `grade.attempt` (+ `verify.*`), `orchestrator.select-item`, `calibration.check`.
**STATES:** due-item · unaided-attempt · grading · evidence-written · band-updated · next-scheduled · (anomaly→integrity).
**GUARDRAILS:** no help during evidence capture; predicted-score language is honest ranges; grading must pass calibration.
