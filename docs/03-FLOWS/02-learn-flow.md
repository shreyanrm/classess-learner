# 02 · The Learn Loop (core)

**WHEN:** learner enters any ontology node (from onboarding, the map, next-best, or create-anything).
**WHERE:** the Learn surface — OpenerCard + CanvasSurface + (on demand) VidyaPanel + RevealPanel.
**WHY:** **build, don't watch.** Active mastery via **pose → struggle → reveal**, never explain-first. Serve modalities until the
mastery band crosses **independent**. This is the heart of the product.

**WHAT (steps):**
1. **Enter node** — node loads monochrome. Context assembled (turn/session/lifetime/curriculum).
2. **Pose (opener)** — an active, interactive prompt (JSXGraph/Mafs/custom). Never a lecture. The learner must *do* something.
3. **Struggle** — the learner attempts on the **CanvasSurface**. Attempts recorded (aided/unaided, latency, correctness signal).
4. **Stuck? → Vidya** — if struggle crosses a threshold (misses, time, frustration signal), Vidya is offered/steps in: perceives the
   working, gives a **graduated hint** (ask-before-tell), never the answer. (See `04-vidya-flow.md`.)
5. **Reveal (fading)** — once they've grappled, the reveal arrives: Vidya's annotation on the canvas (primary), or a short nugget/reading
   (library). Reveal is a *fade-in after effort*, never the opener.
6. **Orchestrator decides** — the three reactive rules fire: **switch representation on repeated failure**, **select forward** (best node
   to advance mastery, not just linear next), **detect frustration before disengagement** (ease/encourage/switch).
7. **Enough? → Practice** — when the orchestrator judges readiness, route to **unaided Practice** (the evidence engine) to test independence.
8. **Mastery + ignite** — evidence updates the band; crossing a threshold triggers **ignite** (monochrome→color) and **constellation-ignite**
   (lights unlocked neighbours). Advance to next node.

**HOW:** orchestrator policy (heuristic now) reads governed mastery + prereq graph; all served content is **verifier-passed**; modality
switches pull alternate verified representations from the content cache or generate+verify on miss; Vidya via the gateway.

**EVENTS:** `learn.node.entered.v1`, `learn.opener.posed.v1`, `learn.attempt.submitted.v1`, `vidya.hint.escalated.v1`,
`learn.reveal.shown.v1`, `learn.modality.switched.v1`, `practice.item.served.v1`, `evidence.recorded.v1`, `mastery.band.changed.v1`,
`learn.node.completed.v1`.
**AI CALLS:** `generate.opener`, `verify.*`, `orchestrator.step` (switch/forward/frustration), `vidya.turn`, `grade.attempt`.
**STATES:** monochrome-enter · pose · struggle · stuck→vidya · reveal · modality-switch · practice-gate · ignite · constellation · advance ·
(reduced-motion equivalents for ignite/constellation).
**GUARDRAILS:** never explain-first; never serve unverified content; Vidya never hands the answer; mastery (not vibes) ends the loop.
