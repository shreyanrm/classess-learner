-- Wobo — Supabase extensions.
-- pgvector: Plexus retrieval cache + semantic dedupe. moddatetime: updated_at. pgtap: in-DB RLS tests.
create extension if not exists vector;
create extension if not exists moddatetime schema extensions;
create extension if not exists pgtap;
-- The Learner operational plane lives in its own `learner` schema, isolated from the
-- platform/pii_vault/operational schemas (the KGtoPG plane). Working state only; canonical truth
-- (identity, mastery, evidence) lives on the platform plane and is read via governed service calls.
-- Every table is RLS-ready: subject_id + policy subject_id = auth.uid() (sourced from the dev mock
-- subject today, real Supabase Auth at Phase 4 — only the SOURCE of auth.uid() changes).

create schema if not exists learner;

create or replace function learner.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- profiles_cache: cache of the governed identity/profile view. Canonical identity (the PII map)
-- lives in pii_vault on the platform plane; the app only ever sees the opaque subject_id.
create table learner.profiles_cache (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null unique,
  display_name text,
  grade text,
  board text,
  archetype_slot text,
  consent_tier text not null default 'un_elevated'
    check (consent_tier in ('un_elevated','elevated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table learner.sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  surface text not null check (surface in ('expo','pwa')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index sessions_subject_started_idx on learner.sessions (subject_id, started_at desc);

create table learner.attempts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  node_id uuid not null,
  item_id uuid,
  response jsonb not null,
  correct boolean not null,
  aided boolean not null default false,
  independence_signal numeric(4,3) check (independence_signal between 0 and 1),
  latency_ms integer check (latency_ms >= 0),
  created_at timestamptz not null default now()
);
create index attempts_subject_node_idx on learner.attempts (subject_id, node_id, created_at desc);

create table learner.canvas_state (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  node_id uuid not null,
  expression jsonb,
  strokes jsonb,
  last_seen_by_wobo_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, node_id)
);

-- Shared, verified, tier-1 warm-path content cache (a read cache of the canonical verified content
-- in operational.content_versions). No PII, no subject — readable by any authenticated learner,
-- written only by the service role. The one intentional exception to per-subject RLS.
create table learner.content_cache (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null,
  modality text not null,
  difficulty numeric(4,3),
  verification_hash text not null,
  content jsonb not null,
  embedding vector,
  created_at timestamptz not null default now(),
  unique (node_id, modality, verification_hash)
);

create table learner.mastery_cache (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  node_id uuid not null,
  band text not null
    check (band in ('not_started','emerging','developing','secure','independent')),
  scope text not null default 'node' check (scope in ('node','chapter','subject')),
  updated_from_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, node_id, scope)
);

create table learner.meter_state (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  date date not null,
  budget_total integer not null,
  budget_consumed integer not null default 0,
  peak_detected boolean not null default false,
  day_had_real_win boolean not null default false,
  created_at timestamptz not null default now(),
  unique (subject_id, date)
);

create table learner.notifications (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  type text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  archetype_variant text,
  created_at timestamptz not null default now()
);
create index notifications_subject_idx on learner.notifications (subject_id, scheduled_for);

-- The transactional outbox. Domain writes append here in the same transaction as the state change;
-- the relay publishes unpublished rows UP to platform.events (the KGtoPG event store).
create table learner.outbox (
  event_id uuid primary key,
  event_type text not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  subject_id uuid not null,
  published_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create index outbox_unpublished_idx on learner.outbox (occurred_at) where published_at is null;
create index outbox_subject_idx on learner.outbox (subject_id, occurred_at);

create trigger profiles_cache_set_updated_at before update on learner.profiles_cache
  for each row execute function learner.set_updated_at();
create trigger canvas_state_set_updated_at before update on learner.canvas_state
  for each row execute function learner.set_updated_at();
create trigger mastery_cache_set_updated_at before update on learner.mastery_cache
  for each row execute function learner.set_updated_at();

alter table learner.profiles_cache enable row level security;
alter table learner.sessions       enable row level security;
alter table learner.attempts       enable row level security;
alter table learner.canvas_state   enable row level security;
alter table learner.content_cache  enable row level security;
alter table learner.mastery_cache  enable row level security;
alter table learner.meter_state    enable row level security;
alter table learner.notifications  enable row level security;
alter table learner.outbox         enable row level security;

create policy profiles_cache_own on learner.profiles_cache for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy sessions_own on learner.sessions for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy attempts_own on learner.attempts for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy canvas_state_own on learner.canvas_state for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy mastery_cache_own on learner.mastery_cache for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy meter_state_own on learner.meter_state for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy notifications_own on learner.notifications for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy outbox_own_read on learner.outbox for select to authenticated
  using (subject_id = auth.uid());
create policy content_cache_read on learner.content_cache for select to authenticated
  using (true);

-- Transactional outbox append (identity-boundary enforced; search_path hardened).
create or replace function learner.outbox_append(p_event jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_subject uuid := (p_event->'actor'->>'subject_id')::uuid;
begin
  if v_subject is null then
    raise exception 'outbox_append: event missing actor.subject_id';
  end if;
  if auth.uid() is not null and auth.uid() <> v_subject then
    raise exception 'outbox_append: subject mismatch (cannot emit for another subject)';
  end if;
  insert into learner.outbox (event_id, event_type, payload, occurred_at, subject_id)
  values (
    (p_event->>'event_id')::uuid, p_event->>'event_type', p_event,
    (p_event->>'occurred_at')::timestamptz, v_subject
  )
  on conflict (event_id) do nothing;
end $$;

-- Reference domain function: a state change + its event append, atomically (the pattern every
-- future domain write follows).
create or replace function learner.op_start_session(p_event jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_subject uuid := (p_event->'actor'->>'subject_id')::uuid;
  v_session_id uuid;
begin
  if auth.uid() is not null and auth.uid() <> v_subject then
    raise exception 'op_start_session: subject mismatch';
  end if;
  insert into learner.sessions (subject_id, surface)
  values (v_subject, p_event->'payload'->>'surface')
  returning id into v_session_id;
  perform learner.outbox_append(p_event);
  return v_session_id;
end $$;

grant usage on schema learner to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema learner to authenticated;
grant all on all tables in schema learner to service_role;
alter default privileges in schema learner
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema learner grant all on tables to service_role;

revoke all on function learner.outbox_append(jsonb) from public;
revoke all on function learner.op_start_session(jsonb) from public;
grant execute on function learner.outbox_append(jsonb) to authenticated, service_role;
grant execute on function learner.op_start_session(jsonb) to authenticated, service_role;
-- Realtime: Wobo canvas co-presence, meter updates, mastery/ignite echoes.
alter publication supabase_realtime add table learner.canvas_state;
alter publication supabase_realtime add table learner.meter_state;
alter publication supabase_realtime add table learner.mastery_cache;

-- Storage buckets (private; access mediated server-side): media nuggets, generated illustration
-- assets, Remotion renders.
insert into storage.buckets (id, name, public)
values
  ('media-nuggets', 'media-nuggets', false),
  ('generated-assets', 'generated-assets', false),
  ('remotion-renders', 'remotion-renders', false)
on conflict (id) do nothing;
-- 0005 — the live persistence seams (additive only).
-- learner_state: the device-merged working state (XP, streak, topic progress, the mind snapshot).
-- learner_threads: Wobo's conversation, one row per (subject, thread).
-- outbox_append_batch: batch entry into the transactional outbox (the relay publishes UP).
-- Plus the deferred Phase-1 step from the README: expose `learner` to PostgREST for client access.

create table learner.learner_state (
  subject_id uuid primary key,
  xp integer not null default 0 check (xp >= 0),
  streak_days integer not null default 1 check (streak_days >= 0),
  last_active_day date,
  completed_topics jsonb not null default '[]'::jsonb,
  topic_progress jsonb not null default '{}'::jsonb,
  awarded_once jsonb not null default '[]'::jsonb,
  -- The per-learner mind snapshot (preferences, profile touches, twin marks) — free-form, no PII.
  mind jsonb not null default '{}'::jsonb,
  -- The client's own last-mutation stamp; drives latest-wins reconciliation across devices.
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table learner.learner_threads (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  thread text not null default 'wobo',
  turns jsonb not null default '[]'::jsonb,
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, thread)
);

create trigger learner_state_set_updated_at before update on learner.learner_state
  for each row execute function learner.set_updated_at();
create trigger learner_threads_set_updated_at before update on learner.learner_threads
  for each row execute function learner.set_updated_at();

alter table learner.learner_state   enable row level security;
alter table learner.learner_threads enable row level security;

create policy learner_state_own on learner.learner_state for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());
create policy learner_threads_own on learner.learner_threads for all to authenticated
  using (subject_id = auth.uid()) with check (subject_id = auth.uid());

-- Explicit (0002's default privileges may not cover tables created by a different role).
grant select, insert, update, delete on learner.learner_state, learner.learner_threads to authenticated;
grant all on learner.learner_state, learner.learner_threads to service_role;

-- Batch append into the transactional outbox. Each element goes through learner.outbox_append,
-- which enforces the identity boundary (auth.uid() must match actor.subject_id when present) and
-- dedupes on event_id — so at-least-once client retries are no-ops.
create or replace function learner.outbox_append_batch(p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_event jsonb; v_count integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'outbox_append_batch: expected a jsonb array of events';
  end if;
  for v_event in select * from jsonb_array_elements(p_events) loop
    perform learner.outbox_append(v_event);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function learner.outbox_append_batch(jsonb) from public;
grant execute on function learner.outbox_append_batch(jsonb) to authenticated, service_role;

-- The Phase-1 client DB access step the 0002 README deferred: expose `learner` to PostgREST.
-- Clients select the schema per request via Accept-Profile / Content-Profile headers.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, learner';
notify pgrst, 'reload config';
