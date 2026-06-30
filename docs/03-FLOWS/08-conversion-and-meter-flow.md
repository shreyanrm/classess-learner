# 08 · The Meter & Conversion Flow

**WHEN:** every free-tier session (the meter) + lifecycle-gated conversion moments (asks sharpen from week 3).
**WHERE:** MeterSheet (frost) within sessions; conversion moments appear contextually at emotional peaks.
**WHY:** open access with a sustainable cost ceiling, converting on *honour and aspiration*, not pressure. **Spike to onboard, never to
retain. Engineer compulsion only toward independence. Never cut before a real win that day.** This is the most ethically loaded flow —
build it exactly to the rules.

**WHAT (steps):**
1. **Daily budget** — the meter is a **behavioural budget measured in concepts mastered**, not a clock. Each day opens a budget.
2. **Consume** — as the learner works, budget is consumed. The UI shows it calmly (no countdown anxiety, no exclamation).
3. **Peak-cut (elevated only)** — the invisible peak-cut engine reads mastery events + flow + fatigue onset and cuts the free session **at
   the liking-peak while wanting is still high** — but **only after at least one real win that day**. Under un-elevated tier, the peak-cut
   engine is **off**; a simpler fixed-but-fair budget applies (no behavioural reading).
4. **Conversion moment** — at genuine emotional peaks (a hard concept mastered, a streak milestone, a constellation lighting up), a calm,
   aspirational offer appears. **Near-silent weeks 1–2; sharpen from week 3.** Sell the next self (~80% aspiration / 20% fear).
5. **Founding-member + referral queue** — scarcity-as-honour (founding status, referral queue), never discounting. **No free trials.**
6. **Subscribe** — single premium plan ("Superstar"), ₹999/mo or ₹8,999/yr (annual hero). Payment is the final phase (with auth).

**HOW:** meter_state in Supabase; peak-cut reads ephemeral in-session signals (persist outcomes, never a behavioural dossier); archetype
engine (elevated only) tailors **copy/reward/paywall framing/timing — NEVER price**. Conversion moments are event-triggered, not timed.
**EVENTS:** `meter.session.opened.v1`, `meter.budget.consumed.v1`, `meter.peak.detected.v1`, `conversion.moment.shown.v1`,
`conversion.completed.v1`.
**AI CALLS:** `archetype.classify` (**elevated only**), `peakcut.evaluate` (**elevated only**), `orchestrator.*` (for "real win" detection).
**STATES:** budget-open · consuming · real-win-reached · peak-detected(elevated) · cut · conversion-shown · subscribed · (un-elevated: fixed-budget path).
**GUARDRAILS (enforce in code):** never cut before a real win; archetype never touches price; under-18/un-elevated → no behavioural
targeting at all; weeks 1–2 near-silent; aspiration-led; no FOMO/guilt notifications; no free trials.
