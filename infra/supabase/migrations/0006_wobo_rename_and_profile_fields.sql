-- 0006 — follow the 2026-09-02 rebrand into the database (additive; no data existed).
-- canvas_state.last_seen_by_vidya_at -> last_seen_by_wobo_at; thread default 'vidya' -> 'wobo';
-- profiles_cache gains birthdate + interests (cross-device restore) and plan (free/plus for the budget meter).
alter table learner.canvas_state rename column last_seen_by_vidya_at to last_seen_by_wobo_at;
alter table learner.learner_threads alter column thread set default 'wobo';
update learner.learner_threads set thread = 'wobo' where thread = 'vidya';
alter table learner.profiles_cache
  add column if not exists birthdate date,
  add column if not exists interests jsonb not null default '[]'::jsonb,
  add column if not exists plan text not null default 'free' check (plan in ('free','plus'));
notify pgrst, 'reload schema';
