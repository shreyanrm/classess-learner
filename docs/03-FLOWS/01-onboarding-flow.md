# 01 · Onboarding Flow

**WHEN:** first open (dev: mock user, no login). Also re-entry before consent elevation.
**WHERE:** Onboarding surface → straight into a real Learn node (no empty home).
**WHY:** frictionless onboarding to a fast first win; **guarantee an aha moment within 60 seconds**; set the age-branch (DPDP) and a goal
that makes the next-self visible. Sell aspiration. Never a wall of forms.

**WHAT (steps):**
1. **Door choice** — Template door (board → grade → subject) or Create-anything door ("learn anything"). Calm, two clear doors.
2. **Age at the door = the branch.** Capture age/grade. This sets `consent_tier` default: **18+ → can run full engine on own consent
   later; under-18 → un-elevated until verified parental consent.** Country captured as a policy dimension. (No real auth yet — recorded
   against the mock/opaque subject; the branch logic is built and testable now.)
3. **Goal set** — one aspirational goal ("get confident with algebra", an exam, a self-defined topic). Shown back as a visible next-self.
4. **Micro-diagnostic** — 2–4 adaptive items to place the learner on the prereq graph. **Diagnostic opens map partly-lit** (endowed
   progress — they start with some nodes already glowing).
5. **First node = the aha** — drop them immediately into an opener engineered to produce a real win fast (≤60s to "oh, I get it").
   Vidya greets briefly and steps back (she earns presence; she doesn't smother the first win).

**HOW (mechanism / services / AI):**
- Identity via the **identity abstraction** (mock now). `consent_tier` written to context on every subsequent event.
- Diagnostic placement calls **orchestrator** + **mastery.getBands / getNextBestNode** (governed views). Items are **verified** content.
- First-session engineering reads only ephemeral signals; **un-elevated → no archetype/profiling** (the aha is engineered by content design,
  not behavioural targeting).

**EVENTS:** `session.started.v1`, `onboarding.step.completed.v1`, `onboarding.goal.set.v1`, `onboarding.diagnostic.answered.v1`,
`identity.subject.created.v1` (mock), `learn.node.entered.v1` (the aha node).
**AI CALLS:** `orchestrator.place`, `mastery.getNextBestNode`, `generate.opener` (verified), `vidya.turn` (brief greeting).
**STATES:** door-select · age-branch (18+/under-18) · goal · diagnostic (adaptive) · aha-node · (consent un-elevated default).
**GUARDRAILS:** no behavioural profiling pre-consent; aha must be a *real* win; copy calm, no exclamation.
