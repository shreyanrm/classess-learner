# 06 · Verification Checklists (run at each gate; Shreyan verifies)

## Phase 0 — Foundation
- [ ] Monorepo builds; typecheck/lint/CI green across TS + python.
- [ ] `WoboEvent` envelope + initial typed payloads exist; taxonomy documented; example events validate.
- [ ] Outbox append is transactional; relay publishes at-least-once, ordered, idempotent; consumer dedupes on `event_id`.
- [ ] KGtoPG contract seed present (event schemas, mastery model, ontology types, evaluation contracts, AI-fabric interfaces, consent
      primitives, migrations); institutional surfaces excluded.
- [ ] Supabase migrations apply; **RLS enabled + policies pass against the mock subject**; Realtime/Storage/pgvector configured.
- [ ] **Auth deferred-but-wired:** identity abstraction returns mock user with `DEV_AUTH=true`; phone-OTP / consent / linking seams typed & stubbed; no auth logic implemented.
- [ ] Gateway routes via capability registry; **Track 1/Track 2 config separated**; verifier confidence-gate + SymPy harness run; gateway telemetry emits.
- [ ] Design/motion/Wobo packages scaffolded; tokens defined; Wobo identity locked in code.

## Phase 1 — The Atom (the big one)
- [ ] **Perception spike:** Wobo reliably reads on-canvas working + spoken Hinglish for linear equations via event/state stream (not screen-share). Measured, reported.
- [ ] **Grading spike:** grounded+verifier grading agrees with human judgement within the calibration threshold. Measured, reported.
- [ ] Learn loop runs pose→struggle→reveal; never explain-first; canvas state persisted.
- [ ] Wobo's five capabilities live on the atom; graduated hints never hand the answer; sub-second feel; gooey listening; memory writes.
- [ ] Practice is unaided; FSRS schedules; evidence updates the six factors (Independence keystone) + gap types.
- [ ] Mastery band reaches **independent** on a real run; **ignite** + **constellation-ignite** fire on real mastery.
- [ ] **Nothing unverified served**; all events emitted; efficacy pre→post captured.
- [ ] Wobo-cute license visibly applied on this surface; identity unaltered.

## Phase 2 — The Loops
- [ ] Orchestrator's three reactive rules demonstrably fire on a multi-node graph.
- [ ] Create-anything compiles + ontology-maps + verifier-gates + places + teaches.
- [ ] Constellation map + twin queries (honest ranges) + next-best + goal-gradient/cliffhangers work.
- [ ] Meter behavioural budget; **peak-cut never cuts before a real win**; conversion moments week-3+ gated, aspiration-led; **archetype never touches price**.
- [ ] Parent WhatsApp digest is true-to-evidence, pride-first; ask-anything works; consent seam present.
- [ ] Safety moderation on all free-text (fail-closed) + crisis escalation; integrity signals recorded.
- [ ] **Un-elevated vs elevated** difference demonstrated: un-elevated path wires **zero** profiling capabilities.

## Phase 3 — Breadth
- [ ] Content widened via Plexus, every node verified; Wobo widened with measured perception on new scope.
- [ ] New surfaces respect independence + safety rules (no leaderboards/leagues, no answer-giving, no BYO dark patterns).
- [ ] Remotion library consistent with design system; reduced-motion parity everywhere; full polish.
- [ ] Cost economy: three-tier routing live; more turns on Track-2; cost dashboard.

## Phase 4 — Auth & Launch
- [ ] Supabase Auth (phone OTP) live; `DEV_AUTH=false`; **all RLS verified under real auth.uid()**; mock user removed cleanly.
- [ ] Verifiable parental consent (DigiLocker-grade) + tier elevation end to end; immutable consent record.
- [ ] Payments live (Razorpay/IAP); honest billing; no dark patterns.
- [ ] Hardening: rate/cost limits, observability/alerting, data export/delete, security review, load.
- [ ] Store + PWA deploy ready.
