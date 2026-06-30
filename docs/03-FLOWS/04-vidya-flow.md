# 04 · Vidya Flow (perceive → understand → reason → respond → remember)

**WHEN:** learner taps Vidya, or the learn loop invokes her on a struggle threshold. Not during unaided Practice.
**WHERE:** VidyaPresence (floating) → VidyaPanel (frosted) over the CanvasSurface.
**WHY:** Vidya is the signature interaction and the moat. A realistic tutor who *sees your work*, hints without handing answers, and
remembers you. She makes the product feel taught, not delivered.

**WHAT (steps):**
1. **Perceive** *(keystone)* — she reads the learner's current working from the **app event/state stream** (canvas expressions/strokes,
   recent attempts, current node). NOT screen-share. Atom scope: on-canvas working + spoken Hinglish.
2. **Understand context** — the **context assembler** stitches four layers: this turn, this session, the learner's lifetime (twin/memory),
   the curriculum position. That bundle is the gateway input.
3. **Reason grounded in correctness** — she proposes steps; the **verifier checks** before she commits. She never free-styles math.
4. **Respond naturally** — sub-second first token, interruptible, voice + text; **graduated hints (ask-before-tell)**: a nudge, then a
   leading question, then a worked-adjacent example — escalating only as needed, **never the final answer**.
5. **Remember** — salient facts (misconceptions cleared, preferences, milestones) persist to the **knowledge twin** via events.

**HOW / latency:** most turns route to fast **Track-2 SLMs**; **frontier (Track 1) only at hard moments** — this is the two-track gateway
in action. Streaming via Supabase Realtime. Voice-listening state renders as gooey metaballs. **Per-page choreography is free** (the
Vidya-cute license) — entrance, placement, reactions, and flame play are chosen for the page; identity is fixed.

**EVENTS:** `vidya.opened.v1`, `vidya.perceived.work.v1`, `vidya.turn.user.v1`, `vidya.turn.assistant.v1`, `vidya.hint.escalated.v1`,
(twin write) `evidence.recorded.v1` / memory event.
**AI CALLS:** `vidya.turn` (orchestrated 5 capabilities), `verify.*`, `twin.write`, `twin.read`.
**STATES:** idle-float · perceiving · thinking(lean) · hint-L1/L2/L3 · listening(metaballs) · celebrating(squish/flame-flare) · waiting(ember).
**GUARDRAILS:** never hands the answer; never perceives via screen-share; grounded-in-verifier; un-elevated tier still fully teaches (no
behavioural profiling, just tutoring). **Vidya must be transcendent on the atom before widening.**
