-- 0010 — hospitality: the family's mail preferences (docs/WOBO-PLAN.md §14.1).
--
-- One row per learner, keyed by the verified subject. It carries the three dials a family can
-- set (the Sunday note, the win emails, the festival wishes), the festivals the family CHOSE to
-- be wished on, the locality the family told us (country, region, timezone — the base calendar
-- comes from these and from nothing inferred), and the one-click opt-out timestamp.
--
-- Laws this file enforces in the database rather than only in Python:
--   * a learner reads and updates only their own row — RLS on `learner_id = auth.uid()`, the
--     same shape as every per-subject table in 0002 and the own-row policies in 0008
--   * a learner never deletes the row from the client: no delete policy for `authenticated`
--     (the erase path removes it with the service role, alongside everything else)
--   * the chosen calendars are sensitive data (§14.1 rule 3): they are a bounded list of slugs,
--     never free text, so nothing personal can be written into them by accident
--   * locality is a code, never a name: ISO 3166-1 alpha-2 for the country, ISO 3166-2 for the
--     region, an IANA name for the timezone
--
-- Additive and idempotent. Applying it twice is a no-op.

create table if not exists learner.mail_preferences (
  learner_id uuid primary key,
  sunday_note boolean not null default true,
  wins boolean not null default true,
  festivals boolean not null default true,
  -- The calendars the family chose in "Festivals we can wish you on". Explicit opt-in, used for
  -- the wishes and for nothing else, cleared in one tap. Never inferred (§14.1 rule 2).
  festival_calendar text[] not null default '{}',
  -- The locality the family told us. Null means unknown, and unknown sends nothing (rule 5).
  country text,
  region text,
  timezone text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_preferences_country_is_a_code
    check (country is null or country ~ '^[A-Z]{2}$'),
  constraint mail_preferences_region_is_a_code
    check (region is null or region ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'),
  constraint mail_preferences_region_belongs_to_country
    check (region is null or (country is not null and left(region, 2) = country)),
  constraint mail_preferences_timezone_is_a_name
    check (timezone is null or timezone ~ '^[A-Za-z_+-]+(/[A-Za-z0-9_+-]+)*$'),
  constraint mail_preferences_calendars_are_slugs
    check (array_to_string(festival_calendar, ',') ~ '^([a-z][a-z0-9-]*(,[a-z][a-z0-9-]*)*)?$'),
  constraint mail_preferences_calendars_are_few
    check (cardinality(festival_calendar) <= 12)
);

drop trigger if exists mail_preferences_set_updated_at on learner.mail_preferences;
create trigger mail_preferences_set_updated_at before update on learner.mail_preferences
  for each row execute function learner.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- RLS: a learner reads and updates their own row and nobody else's. Insert is allowed for the
-- learner's own id so a client can create its first row; delete is the service role's alone.
-- ---------------------------------------------------------------------------------------------
alter table learner.mail_preferences enable row level security;

drop policy if exists mail_preferences_read on learner.mail_preferences;
create policy mail_preferences_read on learner.mail_preferences for select to authenticated
  using (learner_id = auth.uid());

drop policy if exists mail_preferences_insert on learner.mail_preferences;
create policy mail_preferences_insert on learner.mail_preferences for insert to authenticated
  with check (learner_id = auth.uid());

drop policy if exists mail_preferences_update on learner.mail_preferences;
create policy mail_preferences_update on learner.mail_preferences for update to authenticated
  using (learner_id = auth.uid()) with check (learner_id = auth.uid());

-- 0002's default privileges already grant the four verbs on new `learner` tables to
-- `authenticated`; the delete grant is withdrawn here so the missing delete policy is not the
-- only thing standing between a client and the row. Service role keeps everything.
revoke delete on learner.mail_preferences from authenticated;
grant select, insert, update on learner.mail_preferences to authenticated;
grant all on learner.mail_preferences to service_role;

notify pgrst, 'reload schema';
