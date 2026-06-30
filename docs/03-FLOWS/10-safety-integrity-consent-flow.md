# 10 · Safety, Integrity & Consent (crosscutting)

These run **under every flow**. They are not a screen; they are always-on subsystems. Build them as first-class.

## Child-safety subsystem
**WHEN:** any free-text or UGC surface (create-anything input, Vidya chat, any social/shared surface).
**WHAT:** moderation **before** any generated response acts on input and **before** any UGC reaches another learner; crisis/harm detection
with **escalation to a responsible adult**; no unmonitored channels. **WHY:** the base is children; safety is existential, not a feature.
**EVENTS:** `safety.flag.raised.v1`. **AI:** `safety.moderate`, `safety.crisis-detect`. **GUARDRAIL:** fail closed — when unsure, withhold.

## Integrity / anti-abuse layer
**WHEN:** evidence capture (Practice), meter, generation cost.
**WHAT:** detect gaming of mastery/meter (answer-copying, automation, abuse), cost-abuse on generation; record integrity signals; protect the
**trustworthiness of the mastery credential** (the 5-year endgame). **EVENTS:** `integrity.signal.recorded.v1`. **AI:** `integrity.score`.

## Consent tier (DPDP — the branch that gates all intelligence)
**WHEN:** every event carries `consent_tier`; set at the door (age branch), elevated via verified parental consent (parent flow / auth phase).
**WHAT:**
- **Un-elevated (default for under-18, or pre-consent):** behavioural engine OFF — **no archetype detection, no behavioural peak-cut, no
  profiling, no behavioural notifications**. Teaching, mastery, Vidya, the honest twin, the constellation map all fully work.
- **Elevated (verified parental consent, or 18+ on own consent):** deep engine on, **pointed at teaching**; archetype/peak-cut/optimal-timing
  active — **never** to target the commercial ask at a minor.
- **Age at the door is the branch:** 18+ → own consent → full engine; under-18 → consented path. Country is a policy dimension (India-under-18
  strictest; other jurisdictions added as policy rows, not rewrites). Safe-by-default: assume no institution exemption unless counsel confirms.
**WHY:** the compliant architecture and the right thing are the same architecture: read behavioural signals **ephemerally in-session, persist
only learning outcomes, never a behavioural dossier on a child, never point the engine at the sell for minors.** This travels globally unchanged.
**HOW:** the gateway/orchestrator hard-check `consent_tier` on every call; un-elevated routes skip all profiling capabilities by construction
(not by a flag that can be forgotten — the capability is simply not wired in that path).
**GUARDRAILS:** parental consent = real verification; no monitoring/profiling of un-elevated minors; immutable consent record; fail safe.
