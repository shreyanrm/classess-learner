# 05 · Tech Stack & Conventions

## Stack (locked)
- **Data/auth/realtime:** Supabase (Postgres + Auth [phone OTP, LAST] + Realtime + Storage + pgvector).
- **API/BFF:** FastAPI (python) as the BFF; **LiteLLM** in the gateway service for model routing.
- **Content:** Plexus RAG pipeline grounded on NCERT (~3,500 items); pgvector retrieval cache.
- **Mastery/scheduling:** FSRS for spaced retrieval; Bayesian/IRT for ability/difficulty estimation.
- **Cache/queue:** Redis (gateway cache tiers, meter, rate, ephemeral session signals).
- **Clients:** Expo React Native (mobile) + React PWA (web). Shared design-system/motion/Vidya packages.
- **Interactive content:** JSXGraph + Mafs (2D math), Three.js / React-Three-Fiber (3D). (GeoGebra eliminated.)
- **Video pipeline:** Remotion 4 for cached nugget rendering.
- **Payments:** Razorpay + native IAP (subscription; final phase alongside auth).

## Language split
- **TypeScript-unified** across contracts, gateway client/SDK, modules, surfaces.
- **Python sidecar** scoped to verification + the intelligence core (verifier, orchestrator policy, Plexus pipeline).

## Conventions
- **API keys:** `clss.<app>.<env>.<purpose>` (e.g. `clss.learner.dev.gateway`, `clss.learner.prod.razorpay`).
- **Event types:** dot-namespaced + versioned (`learn.attempt.submitted.v1`).
- **IDs:** uuid v7 for events; opaque uuid for `subject_id`. No PII in domain code.
- **Env:** `DEV_AUTH`, `ENV` (dev/stg/prod), `CONSENT_TIER_DEFAULT` (dev), gateway routing config per env.
- **Naming:** name things by what the user controls, never by system internals. No emoji, no exclamation marks in product copy.
- **Quality bar:** typed end to end; tests on the contract layer, verifier, orchestrator policy, and the gateway routing; a11y
  (WCAG AA) and responsive on every surface; observable (structured logs + gateway telemetry + event stream).

## Fonts (bundled locally, no CDN)
Google Sans Flex (display/system; web stand-in Plus Jakarta Sans until licensed), Caveat (handwritten — Vidya's annotations),
Fraunces / Inter / JetBrains Mono available but **mono is NOT used in product UI** (it was a vibe-coded tell). Bundle from fontsource.

## Definition of done (every unit)
Typed · tested where it matters · accessible · responsive · emits its events · honours consent tier · matches design+motion systems ·
no unverified content served · no auth assumptions baked in (uses the identity abstraction).
