-- 0007 — the streak-freeze budget and a pending broken streak become the learner's, not the device's.
-- Family P (WOBO-CAPABILITIES.md): illness, exams and travel break a hard-won chain, and a freeze
-- repairs it against a monthly allowance. Both lived only in localStorage, so a reinstall or a
-- second device handed the learner a fresh budget (or silently lost a repairable break). They ride
-- learner_state like every other counter now.
--
-- Additive and idempotent. The client tolerates a database that has not applied this yet: the write
-- degrades to the pre-0007 row shape and the read falls back to the local defaults (packages/sdk/src/state.ts).
alter table learner.learner_state
  -- { month: 'YYYY-MM', used: n } — the allowance spent this month; a new month resets it client-side.
  add column if not exists streak_freezes jsonb not null default '{}'::jsonb,
  -- { days: n, brokenOn: 'YYYY-MM-DD' } or null — a break still inside the repair window.
  add column if not exists broken_streak jsonb;

notify pgrst, 'reload schema';
