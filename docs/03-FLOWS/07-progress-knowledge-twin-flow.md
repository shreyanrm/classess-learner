# 07 · Progress & Knowledge-Twin Flow

**WHEN:** learner opens Progress; parent digest generation; any "what am I weakest at" query.
**WHERE:** the Progress surface (ConstellationMap) + twin query UI; feeds the parent companion.
**WHY:** make the learner's mind visible and queryable. The map turning on over time is the core long-term motivator (investment moat via
twin personalization). The twin is also what makes parent pride *real*.

**WHAT (steps):**
1. **Constellation map** — the prereq graph rendered: mastered nodes glow their color, unmastered stay monochrome; edges show what unlocks
   what. The visible "map of my mind." Endowed progress from day one (diagnostic partly lights it).
2. **Twin query** — learner (or parent companion) asks the **knowledge twin**: strengths, weaknesses, what to do next, readiness ranges.
   Answers in honest conditional ranges.
3. **Next-best surfacing** — the twin/orchestrator recommends the next node or retrieval; one clear next action (next-best-action, not a feed).
4. **Goal-gradient** — near a chapter/goal completion, acceleration cues appear (goal-gradient); pre-loaded cliffhangers at session end seed
   the next session — **all pointed at independence**, never at idle engagement.

**HOW:** twin = governed queries over KGtoPG evidence/mastery + feature store; map = read of mastery_cache + ontology; recommendations from
orchestrator. **Un-elevated tier:** map + honest twin still work (it's the learner's own data shown back); **no behavioural archetype shaping.**
**EVENTS:** `twin.query.asked.v1` (parent/learner), reads of `mastery.band.changed.v1`; `meter.peak.detected.v1` may originate here.
**AI CALLS:** `twin.query`, `mastery.getNextBestNode`.
**STATES:** map(lit/partly/dark) · twin-asking · twin-answer(ranges) · next-best · goal-gradient · cliffhanger.
**GUARDRAILS:** ranges not guarantees; next-best is one honest action, not an engagement feed; no FOMO.
