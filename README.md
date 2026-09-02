# Wobo

The flagship consumer product of the Classess ecosystem: the B2C, AI-native learning app of the
Dot eVentures education group, and the reference implementation that proves the KGtoPG plug-in
pattern. One name covers two things — Wobo the app, and Wobo the tutor who lives inside it.

North star: Brilliant.org, but AI-native, India-first, premium, with mechanics nobody in edtech
has shipped. Governing reframe: cognitive fitness, a gym for the mind.

> The authoritative build specification lives in [`/docs`](./docs). It is the single source of
> truth and overrides defaults on every product, brand, and architecture decision. Read
> [`docs/START-HERE.md`](./docs/START-HERE.md) first.

## Architecture in one paragraph

Two physically separate data planes, connected only through services and an immutable event
contract, never through SQL. This repo is the **Learner Operational Plane** (Supabase, RLS-ready):
sessions, attempts, canvas state, content cache, the meter, the transactional outbox. The
**Platform Plane** (KGtoPG) holds canonical identity, the event store, the ontology graph, evidence
and mastery, and the platform intelligence layer; in this repo it is represented by a typed
**contract seed** plus a reference implementation. The app writes **up** to KGtoPG via the outbox
(at-least-once, ordered per aggregate, idempotent), reads **down** through governed views, and
computes **sideways** through the AI Fabric / Model Gateway (Track 1 external LLMs, Track 2 SLMs,
fronted by a correctness verifier). Nothing reaches a learner unverified.

## Monorepo layout

```
/apps        web-pwa (React PWA), expo-app (React Native)
/services    api (FastAPI BFF), gateway (LiteLLM + capability registry), verifier (SymPy + confidence gate)
/packages    contracts, config (design tokens), ui, motion, wobo, sdk
/platform    kgtopg-contract-seed (interfaces, mastery model, ontology types, reference impl)
/content     plexus (pipeline), ontology-seed (the atom: linear equations)
/infra       supabase (migrations, RLS), ci, env
/docs        the build specification suite
```

## Build posture

- **No MVP.** Production-grade from line one. The architecture is never mocked.
- **Mock-first on data and providers.** Every external seam (`IdentityProvider`, `LLMProvider`,
  `ContentProvider`, `MessagingProvider`, `PaymentProvider`) sits behind a typed interface and starts
  mocked, so the whole app is walkable on deterministic seed data, then flips to live per seam.
- **Auth is built last, on explicit approval.** The identity boundary is wired now with a dev-mock
  user (`DEV_AUTH=true`); no real auth until Phase 4.
- **Event contract from the first commit.** Every meaningful action emits a typed, attributed event.

## Toolchain

- **Bun** workspaces for TypeScript packages and apps. **uv** for the Python services.
- **Biome** for TS lint/format, **Ruff** for Python.
- Hosted Supabase (project `MSR Build`) managed via the Supabase MCP; no local Postgres required.

## Getting started

```bash
bun install                 # install TS workspace deps
cp .env.example .env.local  # then fill secrets (never commit .env.local)
bun run typecheck           # typecheck all TS packages
bun run lint                # Biome
bun run test                # workspace tests
```

See [`docs/05-BUILD-PLAN`](./docs/05-BUILD-PLAN) for the phased plan. Current phase: **Phase 0 — Foundation**.
