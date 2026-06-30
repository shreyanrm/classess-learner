# 03 · Supabase (operational plane) — and the AUTH-DEFERRED-BUT-WIRED rule

Supabase is the Learner operational plane: Postgres, Realtime, Storage, pgvector, and (later) Auth.

## AUTH: build the structure now, the real thing LAST
**Do NOT implement real authentication, login, signup, or consent flows yet.** Build everything else against a clean identity
boundary so auth drops in at the end with zero refactor. Specifically, build now:
- A typed **`Identity`/`Session` abstraction** (`/packages/sdk/identity.ts`) that the whole app consumes. Today it returns a
  **dev-mock user** (a fixed opaque `subject_id`, consent_tier configurable); later it returns the real Supabase session.
- A `DEV_AUTH=true` env switch. With it on: a mock session, no login screen, deep links straight into any surface.
- **RLS-ready schema**: every operational table has `subject_id` and an RLS policy written and enabled, tested against the
  mock subject. (Policies are correct now; only the *source* of `auth.uid()` changes when real auth lands.)
- The **opaque-UUID identity boundary**: app code only ever sees `subject_id`. No email/phone/PII flows through domain logic.
- Stubbed-but-typed seams for: phone-OTP signup, parental-consent (DigiLocker-grade) record, account linking. Interfaces exist,
  implementations are the final phase.

When auth is approved (final phase): wire Supabase Auth (phone OTP), flip `DEV_AUTH=false`, point the identity abstraction at the
real session, implement the consent-tier elevation flow, and verify RLS with real `auth.uid()`. Nothing else should need to change.

## Operational schema (initial migrations)
Write migrations in `/infra/supabase/migrations`. Every table: `id uuid pk default gen_random_uuid()`, `subject_id uuid not null`,
`created_at timestamptz default now()`, RLS enabled, policy `subject_id = auth.uid()` (auth.uid() sourced from mock in dev).
- `profiles_cache` — cached governed identity/profile view (display name, grade, board, archetype slot [elevated only]).
- `sessions` — session_id, started_at, ended_at, surface.
- `attempts` — node_id, item_id, response jsonb, correct bool, independence_signal, latency_ms.
- `canvas_state` — node_id, strokes/expression jsonb, last_seen_by_vidya_at (Vidya perception cache).
- `content_cache` — generated+verified content keyed by (node_id, modality, difficulty, verification_hash).
- `mastery_cache` — node_id, band, updated_from_event_id (read cache of KGtoPG governed view).
- `meter_state` — date, budget_total, budget_consumed, peak_detected bool, day_had_real_win bool.
- `notifications` — type, scheduled_for, sent_at, archetype_variant [elevated only].
- `outbox` — the event outbox (see contract doc).

## Realtime, Storage, pgvector
- **Realtime**: Vidya turn streaming + canvas co-presence + meter updates.
- **Storage**: cached media nuggets, generated illustration assets, Remotion renders.
- **pgvector**: Plexus retrieval cache + content dedupe by semantic hash.

## Supabase MCP
Use the **Supabase MCP** for schema, migrations, RLS policies, and inspection directly. See `06-TOOLING/`.
