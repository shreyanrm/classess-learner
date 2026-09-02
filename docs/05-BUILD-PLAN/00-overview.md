# 00 · Build Plan — Overview

Build in this order. **Do not skip phases. Stop at every gate and wait for Shreyan's verification.** Foundation and the atom come before
breadth; auth comes last. "No MVP" applies to *quality*, not scope sequencing — each phase ships production-grade for its scope.

## The phases
- **Phase 0 — Foundation.** Repo, monorepo packages, the event contract, the KGtoPG contract seed, Supabase (RLS-ready, auth-deferred-but-wired),
  the model gateway + verifier skeleton, the design/motion/Wobo packages scaffolded, CI. No product features yet — the spine.
- **Phase 1 — The Atom (the proof gate).** Linear equations in one variable, taught end to end: the learn loop, the canvas, Wobo transcendent
  on this topic (perception + grounded reasoning + natural response), practice/evidence, mastery + ignite. **This is the gate the whole product
  rests on.** Includes the perception-and-grading spike up front.
- **Phase 2 — The Loops.** Generalize: orchestrator (3 reactive rules), create-anything, progress/constellation + twin, the meter +
  conversion moments, the parent companion, safety/integrity subsystems. Breadth of *mechanics*, still narrow content.
- **Phase 3 — Breadth.** Widen content (full middle-school math, then beyond), more surfaces (exam-as-subject, belonging/social if/when),
  Wobo widened beyond the atom, Remotion nugget library, full design polish across all pages.
- **Phase 4 — Auth & Launch (LAST, on approval).** Real Supabase Auth (phone OTP), verifiable parental consent (DigiLocker-grade) + tier
  elevation, payments (Razorpay/IAP), production hardening, store submission. **Build only on Shreyan's explicit go.**

## The gate model (how each phase ends)
At the end of each phase, Claude Code must:
1. Produce a **phase report**: what was built, where it lives, how to run it, what events it emits, what's verified.
2. Run the phase's **verification checklist** (`06-verification-checklists.md`) and show results.
3. **Stop and request verification.** Do not start the next phase until Shreyan approves.

## Working rules across all phases
- Event contract from commit 1; every feature emits its events.
- Nothing served to a learner unverified.
- Identity abstraction everywhere (mock user in dev); no auth assumptions baked in.
- Consent tier honoured by construction (un-elevated paths simply don't wire profiling capabilities).
- Design system, motion system, Wobo spec + **Wobo-cute license** respected on every surface.
- Production-grade: typed, tested where it matters, accessible, responsive, observable.
