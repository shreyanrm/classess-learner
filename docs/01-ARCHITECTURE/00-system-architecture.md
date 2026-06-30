# 00 · System Architecture

## The shape (one picture in words)
Two physically separate data planes, connected only through services and an event contract — never through SQL.

```
            ┌──────────────────────────── CLASSESS LEARNER (this repo) ─────────────────────────────┐
            │                                                                                        │
  Clients   │   Expo RN app  ·  React PWA   ──►  BFF / API (FastAPI)  ──►  Domain services           │
            │        │                                   │                      │                    │
            │        │  realtime (Supabase)              │                      │  emit events       │
            │        ▼                                   ▼                      ▼                    │
            │   Learner Operational DB (Supabase Postgres, RLS-ready)     Transactional Outbox        │
            │   - sessions, attempts, UI state, content cache, meter        (append-only)             │
            │                                                                     │                    │
            └─────────────────────────────────────────────────────────────────────┼────────────────────┘
                                                                                  │ governed publish
                                                       ┌──────────────────────────▼──────────────────────────┐
                                                       │   KGtoPG  (platform citizen — SEPARATE plane)         │
                                                       │   canonical identity · immutable event store ·         │
                                                       │   ontology / prerequisite graph · evidence & mastery · │
                                                       │   feature store · platform intelligence layer          │
                                                       └────────────────────────────────────────────────────────┘
                                                                     ▲  governed views (read-down)
                                                                     │
                                          AI Fabric / Model Gateway (Track 1 external LLMs · Track 2 SLMs)
```

## Planes
1. **Learner Operational Plane (this repo, Supabase):** everything operational — sessions, attempts, canvas state,
   content cache, the meter, UI state, notifications. RLS-ready, multi-tenant-shaped even though Learner is single-tenant per user.
2. **Platform Plane (KGtoPG, separate):** canonical identity, the immutable event store, the ontology/prerequisite graph,
   profile, evidence & mastery, the feature store, the platform intelligence layer. **This repo never connects to it via DB.**

## The three communication directions (only these)
- **Up (write):** app appends to a **transactional outbox** in the same DB transaction as the state change; a publisher relays
  outbox rows to KGtoPG's event store. Guarantees: at-least-once, ordered per aggregate, idempotent consumers.
- **Down (read):** app reads **governed views** exposed by KGtoPG services (mastery bands, next-best-node, twin queries) through
  typed service calls — never raw platform tables.
- **Sideways (compute):** app calls the **AI Fabric / Model Gateway** for generation, tutoring, grading, verification.

## Hard invariants
- **No cross-DB foreign keys.** Canonical references are **opaque UUIDs** validated through services.
- **Event contract is immutable from commit 1.** Adding fields is allowed; changing meaning is not.
- **Track 1 vs Track 2 never conflated** at the gateway (see `04-ai-fabric-and-gateway.md`).
- **API key convention:** `clss.<app>.<env>.<purpose>` (e.g. `clss.learner.dev.gateway`).
- The app is a **consumer of platform capability**, never an implementer of it.

## Repo is a monorepo
```
/apps        expo-app, web-pwa
/services    api (FastAPI BFF), gateway (LiteLLM router + capability registry), verifier (python sidecar)
/packages    contracts (TS event + DTO types, generated), ui (design-system components), motion (motion library),
             vidya (Vidya component + behaviors), config (tokens), sdk (typed client to api/gateway)
/platform    kgtopg-contract-seed (interfaces, event schemas, governed-view DTOs, migrations lifted from School)
/content     plexus pipeline scaffolding, ontology seed for the atom
/infra       supabase (migrations, RLS policies), env, ci
/docs        (this suite, copied in)
```
