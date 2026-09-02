# 03 · Rules & Guardrails (override everything)

## Build rules
1. **No MVP.** Production-grade from line one. Features are *sequenced* (build plan); the *foundation* is built complete. No stubs on the critical path.
2. **Event contract from the first commit.** Every meaningful action emits a clean, attributed event (`01-ARCHITECTURE/01-data-and-event-contract.md`). What is not captured is lost forever.
3. **Correctness substrate is mandatory.** No generated content reaches a learner unverified: deterministic checks (symbolic CAS for math, re-run tested sims, numeric bounds) + a second-model cross-check + a confidence gate that refuses to serve unverified content.
4. **Authentication is built LAST.** Do NOT implement real auth/login/consent flows until Shreyan explicitly approves (final phase). DO build now: the Supabase Auth structure, a typed `User`/session abstraction, RLS-ready schema, an opaque-UUID identity boundary, and a **dev-mode mock user** so every surface is built and testable now and auth wires in cleanly later (`01-ARCHITECTURE/03-supabase.md`).
5. **Two physically separate databases.** Founder-operated platform core (KGtoPG) + Wobo's operational DB (Supabase, RLS-ready). **No cross-DB foreign keys.** Canonical references are opaque UUIDs validated through services. The team builds the *app* and *calls* platform capabilities — it never builds the orchestrator/agents or touches platform DBs directly. In this repo the KGtoPG **contract seed** is the interface; heavy platform services mature separately.

## Product/ethics guardrails (enforce in code)
- **Engineer compulsion only toward independence.** Every growth mechanic must point at mastery/retrieval/independent attempts.
- **The meter never cuts before a real win that day.** Conversion asks fire at emotional peaks, never timers; near-silent weeks 1–2.
- **Archetype engine never touches price.** Copy/reward/paywall *framing*/timing only. Never tailor the commercial ask to a minor.
- **Parent surface leads with pride, never deficit-shame.** Any "capacity" number must be real.
- **Child-safety subsystem** on every free-text surface: moderation before any UGC reaches another learner; crisis detection + escalation; no unmonitored channels.

## Compliance (DPDP — India)
- Treat essentially the whole base as **children (under 18)**. Build a **consent-and-age-tiered intelligence model**:
  - **Un-elevated (no verified parental consent):** behavioural engine OFF — no archetype detection, no behavioural peak-cut, no profiling. A genuinely good, constrained experience.
  - **Elevated (verified parental consent):** deep engine on, pointed at *teaching*, never at behaviourally targeting the commercial ask.
- Age at the door is the branch: **18+ runs the full engine on own consent; under-18 routes through the consented path.** Country is a policy dimension (India-under-18 is the strictest row; other jurisdictions added as policy, not rewrites).
- Parental consent needs verification (DigiLocker-grade), not just OTP (auth phase). Safe-by-default: assume no education-institution exemption unless counsel confirms.

## Confidentiality (all seeded content, mock data, copy)
- Never surface the platform-intelligence-layer **codename** — always "platform intelligence layer."
- **KGtoPG** and **Plexus** may be named (internal/founder-facing).
- Mock data: no real institutions — use **"Northfield International"**. Fictional learners: **"Aanya"**, mentor **"Mr. Rao"**.
- Dummy pricing ₹999 / ₹8,999.

## Copy rules (product UI voice)
- **No emoji. No exclamation marks in product copy.** Calm, certain, plain. Active voice. Sentence case. Name things by what the user controls, never by how the system is built.
