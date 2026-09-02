# 00 · The Flow Map (the neural network of the app)

This section is the **circuit diagram** of the Wobo app. Each flow doc below uses the same five-lens structure so nothing is
ambiguous: **WHEN** (trigger/state) · **WHERE** (surface) · **WHAT** (the steps) · **WHY** (the intent/principle) ·
**HOW** (the mechanism: services, events, AI). Every flow lists the **events it emits** and the **AI capabilities it calls**.

## The spine (read this as one sentence)
A learner enters → is met by an active **opener** (pose→struggle→reveal) → the **orchestrator** decides what comes next →
**Wobo** tutors on the shared canvas when they're stuck → **Practice** generates unaided evidence → **mastery** updates and the
concept **ignites** → **constellation-ignite** lights what it unlocks → the **meter** governs the free day and cuts at the peak →
**conversion** is offered at emotional peaks (week 3+) → the **parent companion** sends pride-first artifacts → the **knowledge twin**
deepens. Every arrow emits events upward; every decision reads governed views downward; consent tier gates the intelligence.

## Circuit
```
                 ┌────────────┐
   open app ───► │ ONBOARDING │ ─ goal + diagnostic + first 60s aha ─┐
                 └────────────┘                                      │
                                                                     ▼
   ┌──────────────────────────── THE LEARN LOOP (per node) ───────────────────────────┐
   │  enter node ─► OPENER(pose) ─► STRUGGLE ─► [stuck?] ─► WOBO(canvas, hints) ─►     │
   │  REVEAL(fading) ─► ORCHESTRATOR(switch repr / forward / detect frustration) ─►     │
   │  [enough?] ─► PRACTICE(unaided, FSRS) ─► EVIDENCE ─► MASTERY band ─► IGNITE ─►      │
   │  CONSTELLATION-IGNITE(unlocks) ─► next node                                        │
   └───────────────────────────────────────────────────────────────────────────────────┘
        │                         │                          │                  │
        ▼                         ▼                          ▼                  ▼
   CREATE-ANYTHING          THE METER + CONVERSION      KNOWLEDGE TWIN      PARENT COMPANION
   (learner-defined →       (daily budget, peak-cut,    (queryable self-    (WhatsApp pride-first
    compiled to ontology)    week-3+ asks)               model)              weekly artifact)

   crosscutting: SAFETY + INTEGRITY (every free-text/UGC surface) · CONSENT TIER (gates all intelligence)
```

## Flow index
1. `01-onboarding-flow.md` — door, age-branch, goal, diagnostic, first 60-second aha.
2. `02-learn-flow.md` — the core pose→struggle→reveal node loop.
3. `03-practice-flow.md` — unaided evidence + FSRS spaced retrieval.
4. `04-wobo-flow.md` — perceive → understand → reason → respond → remember.
5. `05-mastery-evidence-flow.md` — attempt → evidence → mastery band → ignite.
6. `06-create-anything-flow.md` — learner-defined course → compiled ontology.
7. `07-progress-knowledge-twin-flow.md` — the constellation map + twin queries.
8. `08-conversion-and-meter-flow.md` — daily meter, peak-cut, conversion moments.
9. `09-parent-flow.md` — link, weekly digest, ask-anything (WhatsApp).
10. `10-safety-integrity-consent-flow.md` — crosscutting guardrails + the DPDP consent branch.
