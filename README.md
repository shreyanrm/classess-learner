# Wobo

The flagship consumer product of the Classess ecosystem: the B2C, AI-native learning app of the
Dot eVentures education group, and the reference implementation that proves the KGtoPG plug-in
pattern. One name covers two things — Wobo the app, and Wobo the tutor who lives inside it.

North star: Brilliant.org, but AI-native, India-first, premium, with mechanics nobody in edtech
has shipped. Governing reframe: cognitive fitness, a gym for the mind.

## Which document wins

More than one file in this repo claims authority, and they disagree. The precedence order is:

1. **[`DECISIONS.md`](./DECISIONS.md)** — the decision log. A recorded decision overrides every
   other file, including this one. Where a taste call or an engineering call was made, it is here.
2. **The root law files** — [`CONTEXT.md`](./CONTEXT.md) (product and strategy),
   [`DESIGN.md`](./DESIGN.md) (the visual system), [`WOBO.md`](./WOBO.md) and
   [`WOBO-CAPABILITIES.md`](./WOBO-CAPABILITIES.md) (the tutor), [`MOTION.md`](./MOTION.md),
   [`SUBJECTS.md`](./SUBJECTS.md), [`CONTENT-VISUALS.md`](./CONTENT-VISUALS.md),
   [`VIDEO-QUALITY.md`](./VIDEO-QUALITY.md). These govern the build.
3. **[`docs/`](./docs)** — the original specification suite, kept as **history**. It is the
   reasoning the build came from, not a description of the build. Where `docs/` and a root law
   file disagree, the root law file wins.

Two live working documents sit outside that order because they track state rather than law:
[`docs/WOBO-PLAN.md`](./docs/WOBO-PLAN.md) (the current plan) and
[`docs/WOBO-TASKS.md`](./docs/WOBO-TASKS.md) (the open task ledger).

**Superseded:** every document that mandates a phase order —
[`docs/05-BUILD-PLAN/`](./docs/05-BUILD-PLAN) (phases 0–4),
[`docs/START-HERE.md`](./docs/START-HERE.md) and [`docs/KICKOFF-PROMPT.md`](./docs/KICKOFF-PROMPT.md).
`CONTEXT.md` §4 rules "no MVP, no phases, no versions"; the phased plan predates it. Read those
files for the reasoning behind a decision, never for what to build next.

## Architecture in one paragraph

Two physically separate data planes, connected only through services and an immutable event
contract, never through SQL. This repo is the **Learner Operational Plane** (Supabase, RLS-ready):
sessions, attempts, canvas state, content cache, the meter, the transactional outbox. The
**Platform Plane** (KGtoPG) holds canonical identity, the event store, the ontology graph, evidence
and mastery, and the platform intelligence layer; in this repo it is represented by a typed
**contract seed** plus a reference implementation. The app writes **up** to KGtoPG via the outbox
(at-least-once, ordered per aggregate, idempotent), reads **down** through governed views, and
computes **sideways** through the Model Gateway (external LLMs fronted by a correctness
verifier). Nothing reaches a learner unverified.

## Monorepo layout

```
/apps
  web-pwa                    React + Vite PWA — the product. The only app.
/packages
  contracts                  Zod schemas + generated JSON Schema / TS bundles (the event contract)
  config                     design tokens (the single source for every colour, space and type step)
  motion                     motion primitives
  wobo                       the tutor's client surface: actions, context bus, highlight overlay, board
  sdk                        typed client for the gateway, auth and persistence
/platform
  kgtopg-contract-seed       interfaces, mastery model, ontology types, reference impl
/services
  gateway                    FastAPI — the brain. Capability registry, model routing, budget meter,
                             safety screens, Plexus content engines, voice relay. (Python, uv)
  verifier                   SymPy CAS + confidence gate (Python, uv)
  contracts                  the Python mirror of /packages/contracts (Python, uv)
  render-worker              operator-run Remotion video renderer (Node + a stdlib Python queue
                             consumer). Deliberately outside the Bun workspace — heavy deps.
/content
  catalogs                   board catalogs (CBSE, ICSE, AP, Karnataka, Maharashtra, Telangana) +
                             the concept registry the gateway reads
  factbase                   NCERT-aligned verified facts + the builder that seeds them
  atom                       the linear-equations atom: grounded grading + the calibration spike
  cache                      generated-artifact cache (runtime-written, gitignored)
/infra
  supabase                   migrations + RLS
/scripts                     operator scripts (Vercel env, voice probes)
/docs                        the original specification suite — history, see "Which document wins"
```

## Build posture

- **No MVP.** Production-grade from line one. The architecture is never mocked.
- **Mock-first on data and providers.** Every external seam (`IdentityProvider`, `LLMProvider`,
  `ContentProvider`, `MessagingProvider`, `PaymentProvider`) sits behind a typed interface, so the
  whole app is walkable on deterministic seed data, then flips to live per seam. `VITE_LLM_MODE`
  and `VITE_PERSIST_MODE` are those switches; CI builds and tests run entirely in mock mode.
- **Auth is live.** Supabase identity ships: the gateway verifies the learner's JWT at the door
  (HS256 secret or JWKS), reads consent and plan from `learner.profiles_cache`, and meters every
  call against it. `DEV_AUTH` / `VITE_DEV_AUTH` are the dev-only mock identity and the gateway
  **refuses to boot** with `DEV_AUTH` set when `ENV=prod`. See [`DEPLOY.md`](./DEPLOY.md) §0.
- **Event contract from the first commit.** Every meaningful action emits a typed, attributed event.

## Toolchain

- **Bun** workspaces for TypeScript packages and apps. **uv** for the Python services.
- **Biome** for TS lint/format, **Ruff** for Python.
- Hosted Supabase (project ref `keepraxqagzgjrrweryt`); no local Postgres required.
- CI (`.github/workflows/ci.yml`) runs four jobs on every push: JS typecheck/lint/unit/build,
  the Playwright journey suite, Python ruff + pytest, and the render-worker suite.

## Getting started

```bash
bun install                 # install TS workspace deps
cp .env.example .env.local  # then fill secrets (never commit .env.local)
bun run typecheck           # typecheck all TS packages
bun run lint                # Biome
bun run test                # workspace tests
uv sync --all-packages      # Python services
uv run pytest -q            # Python tests (gateway, verifier, contracts, content)
bun run --cwd apps/web-pwa dev
```

Deploying — Vercel (web) and Railway (gateway) — is [`DEPLOY.md`](./DEPLOY.md).
