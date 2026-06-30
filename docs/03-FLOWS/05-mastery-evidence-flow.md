# 05 · Mastery & Evidence Flow

**WHEN:** continuously, as attempts/practice produce evidence.
**WHERE:** beneath every surface; surfaced to learners as bands, ignite, and the constellation map.
**WHY:** mastery is the product's truth and its termination condition. It must be **earned, evidence-linked, and honest**.

**WHAT (steps):**
1. **Attempt → evidence** — each attempt (aided or unaided) is attributed and linked into the **Evidence Graph**. No permanent conclusion
   from a single interaction.
2. **Factor update** — evidence updates the six factors: `Performance × Reliability × Independence × Difficulty × Recency × Consistency`
   and the relevant of the **ten gap types**.
3. **Band computation** — KGtoPG computes the plain-language **band** (not-started/emerging/developing/secure/independent). The app reads it
   via governed view into `mastery_cache`.
4. **Ignite** — crossing into a higher band (esp. into independent) triggers the **ignite** motion on that concept (monochrome→its color).
5. **Constellation-ignite** — light propagates along the prereq graph to nodes this unlocks.
6. **Efficacy instrumentation** — pre→post deltas recorded so "this works" is evidence-backed; predicted outcomes expressed as **honest
   conditional ranges**, never guarantees.

**HOW:** mastery computed in KGtoPG (governed), the app never recomputes canonical mastery; ignite/constellation are UI reactions to
`mastery.band.changed.v1`. Independence is read from unaided Practice evidence.
**EVENTS:** `evidence.recorded.v1`, `mastery.band.changed.v1`, (efficacy) pre/post markers on the relevant events.
**AI CALLS:** `mastery.getBands`, `mastery.getNextBestNode`, `calibration.check`.
**STATES:** evidence-pending · factor-updated · band-changed · ignite · constellation · (no-change).
**GUARDRAILS:** no single-interaction conclusions; bands shown not formulas; ranges not guarantees; color only ever marks *real* mastery.
