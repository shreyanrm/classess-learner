# Supabase — Learner operational plane

The Learner operational plane is the canonical Supabase project (`keepraxqagzgjrrweryt`),
in a dedicated **`learner`** schema. Migrations are applied through the **Supabase MCP**
(no local Postgres / CLI is required); the files in `migrations/` are the source of truth and
reproduce the same state on a fresh project.

## The two planes (never joined by SQL)

The **KGtoPG platform plane** lives in separate schemas — `platform` (append-only
`events`, purpose+age-tier `consents`, `audit_log`, `app_memberships`), `pii_vault` (the only
opaque-UUID → person map), and `operational` (the shared ontology, `prerequisite_edges`,
confidence-gated `content_versions`). The Learner app never reads those schemas from the client.
It writes **up** to `platform.events` via the outbox relay, and reads **down** through governed
functions (`platform.read_events`, `platform.satisfied_purposes`) — always server-side, never a raw
client query. There are no cross-schema foreign keys; canonical references are opaque UUIDs.

## Migrations

| File | What it does |
|---|---|
| `0001_extensions.sql` | pgvector, moddatetime, pgtap |
| `0002_learner_operational_plane.sql` | the `learner` schema: tables, RLS, the outbox + `outbox_append` / `op_start_session`, grants |
| `0003_realtime_and_storage.sql` | realtime publication (canvas/meter/mastery) + private storage buckets |
| `0004_seed_dev.sql` | deterministic dev seed (mock subject "Aanya") |
| `0005_learner_state_threads_relay.sql` | `learner_state` (XP/streak/topic progress/mind, device-merged) + `learner_threads` (Wobo conversation), RLS, `outbox_append_batch`, PostgREST exposure of `learner` |
| `0006_wobo_rename_and_profile_fields.sql` | applied 2026-09-02 via MCP: `canvas_state.last_seen_by_wobo_at` (renamed), thread default `'wobo'`, `profiles_cache.birthdate` / `interests` / `plan` |
| `0007_learner_state_streaks.sql` | streak columns on `learner_state` |
| `0008_curriculum.sql` | the `curriculum` schema (CURRICULUM.md §10): `frameworks`, `versions`, `nodes`, `provenance`, `concept_map`, `overlays`, `pins`, `discovery_jobs`, `review_queue`; published versions immutable by trigger; RLS read-only for learners, writes service-role; PostgREST exposure of `curriculum` |
| `0009_curriculum_review_offers.sql` | `review_queue` can hold an offered syllabus (`kind`, `framework_id`, `offered_by_hash`, `note`, `payload`); the normalised discovery key documented on `discovery_jobs.level` / `.subject` |

## RLS

Every per-subject table has `subject_id` and a policy `subject_id = auth.uid()`, enforced for the
`authenticated` role. In dev, `auth.uid()` is sourced from the dev mock subject; at Phase 4 it becomes
the real Supabase Auth `sub` with no policy changes. RLS is proven in-DB with pgtap against the mock
subject (isolation + cross-subject write denial). The transactional outbox is proven by
`op_start_session`, which writes a session row and its event atomically.

### The one exception

`learner.content_cache` is shared, verified, PII-free warm-path content (a read cache of
`operational.content_versions`). It is readable by any authenticated learner and written only by the
service role — the single deliberate departure from per-subject RLS. Flagged for confirmation.

## Deferred to later phases

- **PostgREST exposure of `learner`** — done in `0005` (Phase 1, the first client DB access). Clients
  select the schema per request with `Accept-Profile` / `Content-Profile: learner`. The SDK's live
  persistence (`PERSIST_MODE=live`) rides it with the publishable key + a dev JWT
  (`SUPABASE_DEV_JWT`, sub = the mock subject) so RLS attributes every row; at Phase 4 the real
  session token replaces the dev JWT with no schema change.
- **Real auth** — Phase 4. `DEV_AUTH=true` today; the identity boundary is wired so nothing else changes.
