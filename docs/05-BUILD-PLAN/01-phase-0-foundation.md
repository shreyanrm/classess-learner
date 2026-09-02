# Phase 0 · Foundation (the spine)

**Goal:** a production-grade skeleton with the contract, the data planes, the gateway, and the design packages — no features yet.

## Build
1. **Monorepo** per `01-ARCHITECTURE/00-system-architecture.md` (`/apps /services /packages /platform /content /infra /docs`). TS + python toolchains, lint, format, typecheck, CI.
2. **Event contract** (`/packages/contracts`): the `ClassessEvent` envelope + initial typed payloads + the event taxonomy. Mirror types into python services. **This is the first real code.**
3. **Outbox + publisher**: outbox table, transactional append helper, relay worker (at-least-once, ordered, idempotent), stubbed KGtoPG consumer in the contract seed.
4. **KGtoPG contract seed** (`/platform/kgtopg-contract-seed`): lift event schemas, mastery model, ontology types, evaluation contracts, AI-fabric interfaces, consent primitives, migrations from the School repo; trim institutional surfaces. Provide a **reference implementation** good enough to build/prove the atom (in-repo + Supabase-local).
5. **Supabase** (`/infra/supabase`): initial operational migrations (`03-supabase.md`), RLS enabled + policies written against the **mock subject**, Realtime + Storage + pgvector configured. **Auth deferred-but-wired**: identity abstraction with `DEV_AUTH=true` mock user; stubbed typed seams for phone-OTP / parental-consent / linking.
6. **Model gateway + verifier skeleton** (`/services/gateway`, `/services/verifier`): LiteLLM router, capability registry, two-track routing policy config, cache-tier scaffolding, telemetry events; verifier with SymPy deterministic-check harness + confidence gate (even before content exists).
7. **Design/motion/Wobo packages** scaffolded (`/packages/config ui motion wobo`): tokens, motion primitives stubs, Wobo presence component (identity locked) — not yet wired to a screen.
8. **SDK** (`/packages/sdk`): typed client to api + gateway + the KGtoPG governed-view interface + the identity abstraction.

## Gate (stop here)
Phase report + run the Phase 0 checklist. Do not build the atom until approved.
