-- 0005 — the live persistence seams (additive only).
-- learner_state: the device-merged working state (XP, streak, topic progress, the mind snapshot).
-- learner_threads: Vidya's conversation, one row per (subject, thread).
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
  thread text not null default 'vidya',
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
