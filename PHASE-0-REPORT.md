# Phase 0 — Foundation · Phase Report

**Status: complete, green, ready for your verification.** The spine is built production-grade; data and
external providers are mock-first behind typed seams; no product features yet (those are Phase 1).

Branch: `phase-0-foundation` (6 commits ahead of `main`). PR opened for review.

---

## Evidence (run these to reproduce)

```bash
bun install
bun run lint         # Biome — clean (97 files)
bun run typecheck    # 8/8 TS packages clean
bun run test         # 62 TS tests pass
uv sync --all-packages
uv run ruff check services   # clean
uv run pytest services       # 34 Python tests pass
bun run --filter @classess/web-pwa build   # Vite build: 435 modules, PWA + service worker
```

Total: **96 tests green.** The learner walkable shell builds to a real PWA bundle.

To walk the app: `bun run --filter @classess/web-pwa dev` → a monochrome shell that greets Aanya,
shows the next-best node + its mastery band from the KGtoPG reference, and docks Vidya (tap her to
open the frosted panel; her replies come through the LLM seam in mock mode).

---

## What was built, and where it lives

| Area | Location | What |
|---|---|---|
| Monorepo | root | Bun workspaces (TS) + uv workspace (Python), Biome + Ruff, strict TS, GitHub Actions CI, gitignored secrets |
| **Event contract** | `packages/contracts` | `ClassessEvent` envelope + 36 typed event payloads + registry + `makeEvent`/`validateEvent`; emits a JSON Schema bundle |
| Contract (Python mirror) | `services/contracts` | validates the same events against the emitted bundle — zero hand-maintained drift |
| **Learner operational plane** | `infra/supabase` + MSR Build `learner` schema | 9 RLS-ready tables, the transactional outbox, `outbox_append`/`op_start_session`, realtime + storage |
| **KGtoPG contract seed** | `platform/kgtopg-contract-seed` | governed-view interface, DTOs, event→`platform.events` mapping, atom ontology seed, outbox relay, in-repo reference impl |
| Identity + SDK | `packages/sdk` | dev-mock identity (opaque subject, typed auth seams stubbed for Phase 4), provider seams (LLM/content/messaging/payment), KGtoPG binding, `createSdk()` |
| Design tokens | `packages/config` | the locked tokens (Molten reserved for Vidya, no shadows, frost, 2px radius) + derived CSS variables |
| Motion | `packages/motion` | ignite + constellation-ignite signatures, full primitive set, annotation kit, reduced-motion parity |
| **Vidya** | `packages/vidya` | identity locked in code (round matte molten jelly, two eyes, ever-present flickering flame) + frosted panel with gooey-metaball listening |
| UI | `packages/ui` | token-driven primitives + signature ConceptTile (monochrome→ignite) and MasteryBand |
| Model gateway | `services/gateway` | FastAPI + LiteLLM, capability registry, Track 1/2 separated, consent-tier gating, mock mode, telemetry |
| Verifier | `services/verifier` | FastAPI + SymPy, CAS equivalence for linear equations, confidence gate that refuses to serve, verification hash |
| Web PWA shell | `apps/web-pwa` | Vite + React 19 PWA, walks the spine on mock data |

## What it emits

Every meaningful action emits one `ClassessEvent` (uuid v7, `consent_tier` on every event). Domain
writes append to `learner.outbox` inside the same transaction as the state change (`op_start_session`
proves this atomically). The relay publishes outbox rows UP to `platform.events` (the KGtoPG event
store) — at-least-once, ordered per aggregate, idempotent on `event_id` — mapping the envelope onto
the platform's columns (`canonical_uuid`, `app`, `type`, `purpose`, `consent_ref`, `schema_version`).

---

## Phase 0 verification checklist

- [x] **Monorepo builds; typecheck/lint/CI green across TS + Python.** Biome clean, 8/8 typecheck, 62 TS tests, ruff clean, 34 Python tests. CI workflow present (`.github/workflows/ci.yml`).
- [x] **`ClassessEvent` envelope + typed payloads; taxonomy documented; example events validate.** 36 event types, all payloads typed (no untyped blobs), tests validate real events and reject malformed ones (e.g. Vidya `handed_answer: true` is refused).
- [x] **Outbox append transactional; relay at-least-once, ordered, idempotent; consumer dedupes on `event_id`.** Proven in-DB (`op_start_session` writes session + event atomically) and in tests (relay: publish-all, dedup replay, ordered fetch, failure-then-replay).
- [x] **KGtoPG contract seed present; institutional surfaces excluded.** Interface (identity/ontology/mastery/twin/consent), DTOs, mastery model (6 factors / 5 bands / 10 gap types via the contract), ontology types, event mapping, consent primitives, reference impl. No school app code reused.
- [x] **Supabase migrations apply; RLS enabled + policies pass against the mock subject; Realtime/Storage/pgvector configured.** All applied via the MCP; pgtap proves isolation + cross-subject write denial against the mock subject; realtime on canvas/meter/mastery; 3 storage buckets; pgvector enabled.
- [x] **Auth deferred-but-wired: identity abstraction returns mock user with `DEV_AUTH=true`; phone-OTP/consent/linking seams typed & stubbed; no auth logic.** `DevMockIdentity` returns the opaque subject; `AuthSeams` throw `AuthNotEnabledError` (Phase 4). No real auth anywhere.
- [x] **Gateway routes via capability registry; Track 1/Track 2 separated; verifier confidence-gate + SymPy harness; gateway telemetry emits.** 11 capabilities, two disjoint track configs, profiling capabilities refused under un_elevated; verifier gate + CAS tested; telemetry sink present.
- [x] **Design/motion/Vidya packages scaffolded; tokens defined; Vidya identity locked in code.** Tokens locked, motion library complete, Vidya identity frozen and asserted by tests (molten only, round jelly, two eyes, flame always).

---

## Decisions made this phase (please confirm)

1. **KGtoPG plane = MSR Build's existing `platform` / `pii_vault` / `operational` schemas.** They are a
   well-designed, doc-aligned platform (append-only event store, PII vault, purpose+age-tier consent,
   confidence-gated content, expert-validated prereqs). Per your steer, I integrate with them as a base
   via a clean client and use **zero** classess-school app code.
2. **Learner operational plane = a dedicated `learner` schema** in MSR Build (isolated from the platform
   schemas; no cross-schema FK). The earlier `public.*` tables were a misplacement and were dropped.
3. **`learner.content_cache` is shared-read** (verified, PII-free warm-path content) — the one deliberate
   exception to per-subject RLS. Confirm this is acceptable.
4. **Toolchain adaptation:** Bun workspaces (no pnpm present) + uv; hosted Supabase via the MCP (no local
   docker/psql). The relay is TypeScript. PostgREST exposure of the `learner` schema is deferred to Phase 1
   (first client DB read); Phase 0's relay uses a server-side connection.
5. **`twin.query.asked.v1`** added as an additive taxonomy extension (flows 07/09 reference learner/parent
   twin queries).
6. **`expo-app` deferred to Phase 1** — the design packages are React DOM today; the RN client wires in once
   they gain React Native variants (the SDK/contracts are already cross-platform). `web-pwa` is the Phase 0
   walkable surface.

## Security notes

- **Rotate the keys you pasted in chat** (OpenAI/Anthropic/Gemini + the `keepraxqagzgjrrweryt` service-role
  key) before production. They are stored only in a gitignored `.env.local`, never committed.
- Pre-existing, not ours to change: several tables in the **School** project and 3 `platform.events`
  partitions in MSR Build have RLS disabled. Flagged for your awareness; I did not touch them.

## Deliberately NOT in Phase 0

Product features (Phase 1), real auth + consent + payments (Phase 4), live LLM/content/WhatsApp/push
(flip per seam), the Expo RN client, and live platform DB writes (the relay runs against the in-memory
reference until the service-role key connects).

---

**Next:** I stop here for your verification. On your go, Phase 1 is **The Atom** — linear equations taught
end to end, Vidya transcendent on the topic, the perception + grading spikes, practice/evidence, mastery
and ignite. I will not start it until you approve.
