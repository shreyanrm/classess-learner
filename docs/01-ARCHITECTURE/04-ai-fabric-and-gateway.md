# 04 · AI Fabric & Model Gateway (the intelligence — directed end to end)

This is the brain. Build it as a real, governed fabric, not scattered LLM calls. Everything AI goes through the **gateway**.

## Layers
```
 Surfaces ──► Capabilities ──► Orchestrator ──► Model Gateway ──► (Track 1 LLMs | Track 2 SLMs)
                                  │                   │
                             Verifier (correctness)   Cost/latency policy + cache tiers
```

## 1) Model Gateway (`/services/gateway`, LiteLLM-based)
- Single entry for all model calls. **Capability registry**: features call a *capability* (e.g. `tutor.turn`, `grade.attempt`,
  `generate.opener`, `verify.math`), never a raw model name.
- **Two tracks, never conflated:**
  - **Track 1** — external market LLMs (Claude / Gemini / OpenAI), chosen per capability for quality.
  - **Track 2** — proprietary fine-tuned models + **edge SLMs** (the margin and the moat). Most Vidya turns and routine
    grading aim here over time; frontier models reserved for hard moments.
- **Routing policy** per capability: model, fallback chain, max latency budget, cost ceiling, cache tier, consent-tier rules.
- **Cost economy (three-tier):** (1) exact/semantic **cache** → (2) **SLM personalization** → (3) **frontier bespoke** only when needed.
- Emits gateway telemetry events (latency, tokens, cache hit, track) — feeds the cost dashboard.

## 2) Orchestrator (the per-step policy)
- Decides, per learner per step: **which modality, which difficulty, repeat or advance**, until mastery crosses **independent**.
- **Three reactive rules (build these explicitly):**
  1. **Switch representation on failure** — repeated miss → change the representation, not just the next item.
  2. **Select forward, not just next** — choose the node that best advances mastery along the prereq graph, not the linear next.
  3. **Detect frustration before disengagement** — read fatigue/frustration signals and intervene (ease, encourage, switch) before drop-off.
- Heuristic/policy now (transparent rules + bandit where safe); a **learned model is Track 2 later**. Keep the interface stable so
  the policy can be swapped without touching surfaces.
- Reads governed mastery + next-best-node from KGtoPG; writes evidence via events.

## 3) Verifier (correctness substrate, `/services/verifier`, python)
**No generated content reaches a learner unverified.**
- **Deterministic checks:** symbolic CAS (SymPy) for math/algebra equivalence; numeric bounds; re-run pre-tested simulator templates.
- **Second-model cross-check** for non-deterministic content.
- **Confidence gate:** if verification fails or confidence < threshold, **refuse to serve** and fall back to cached verified content.
- Every served item carries a `verification_hash`; the content cache is keyed by it.

## 4) Vidya — the five capabilities (the signature; see `02-DESIGN/02-vidya.md` for form/behaviour)
Vidya is built as five composable capabilities behind the gateway:
1. **Perceive** *(keystone, riskiest — prove first)* — reads the learner's on-screen working via the **app event/state stream
   (NOT screen-share)**: canvas expressions, attempts, current node. Scope for the atom: on-canvas working + **spoken Hinglish**.
   (Photo-of-paper and written Hinglish are deferred.)
2. **Understand context** — a **context assembler** stitches four layers: this **turn**, this **session**, the learner's **lifetime**
   (twin/memory), and the **curriculum** position. This assembled context is the gateway input.
3. **Reason grounded in correctness** — never free-styles math; proposes steps, the verifier checks before Vidya commits to them.
4. **Respond naturally** — sub-second first token, interruptible, voice + text; graduated hints (ask-before-tell; never hands the answer).
5. **Remember** — persistent per-learner memory (the switching-cost moat); writes salient facts to the twin via events.

**Latency-vs-quality:** route most turns to fast Track-2 SLMs; escalate to frontier only at hard moments. This *is* the two-track
gateway in action. **Vidya is the one exception to "fully functional day one"** — she must be *transcendent on the atom first*,
then widen. Perception is proven narrow before it is widened.

## Consent-tier gating (DPDP, enforced in the fabric)
- Every gateway/orchestrator call carries `consent_tier`. **Un-elevated → no profiling, no archetype, no behavioural peak-cut;**
  teaching capabilities still fully work. **Elevated → full engine, pointed at teaching**, never at targeting the commercial ask to a minor.
