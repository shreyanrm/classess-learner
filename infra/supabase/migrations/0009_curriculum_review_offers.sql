-- ================================================================================================
-- 0009 — the review queue holds an offered syllabus, and one syllabus is one discovery job
--
-- Two corrections to 0008, both of them things the code needed and the schema could not hold.
--
-- 1. `review_queue` was shaped for a flagged node: (version_id, node_id, reason). A learner
--    offering their own syllabus to the global registry (docs/CURRICULUM.md §6) is the other
--    thing that queue exists for, and it carries a whole framework — the offer's kind, the
--    framework it is about, the anonymous credit for whoever offered it, their note, and the
--    payload a moderator reads. Those columns are added here rather than stuffed into `reason`,
--    because a moderator's queue that cannot show what is being offered is not a queue.
--
--    `offered_by_hash` is deliberately not a subject id and deliberately not a plain digest of
--    one: an unsalted hash over the auth user table is reversible by exactly the person reading
--    this queue. The brain keys it with a server-side secret (curriculum/own.py).
--
-- 2. `discovery_jobs` deduped on the raw strings a learner typed, so "Class 9", "class 9" and
--    "CLASS 9" were three syllabi and three paid searches. The gateway now writes the normalised
--    key into `level` and `subject`; this migration says so on the columns and leaves the partial
--    unique index in 0008 doing exactly what it always did, now over values that agree.
--
-- Everything here is additive and re-runnable. RLS is unchanged: `review_queue` still has no
-- policy for `authenticated`, so it is the owner's and the service role's alone.
-- ================================================================================================

alter table curriculum.review_queue
  add column if not exists kind text not null default 'node_flag',
  add column if not exists framework_id text references curriculum.frameworks(id) on delete set null,
  add column if not exists offered_by_hash text,
  add column if not exists note text,
  add column if not exists payload jsonb;

-- `reason` was required and is still the one-line summary a moderator scans. An offer fills it in
-- ("framework_offer: <name>"), so nothing here relaxes it.
alter table curriculum.review_queue
  drop constraint if exists review_queue_kind_check;
alter table curriculum.review_queue
  add constraint review_queue_kind_check
  check (kind in ('node_flag', 'framework_offer', 'promotion_request'));

create index if not exists review_queue_kind_idx
  on curriculum.review_queue (kind, state, created_at desc);
-- One open offer per framework: a learner tapping "share this" twice is one thing to review.
create unique index if not exists review_queue_open_offer_idx
  on curriculum.review_queue (framework_id)
  where kind = 'framework_offer' and state = 'open';

comment on column curriculum.review_queue.kind is
  'node_flag: a learner restructured a stored syllabus. framework_offer: a learner offered their '
  'own syllabus to the registry as community (CURRICULUM.md §6). promotion_request: an entry '
  'waiting on the owner to promote it to verified (§4.5).';
comment on column curriculum.review_queue.offered_by_hash is
  'A one-way, server-keyed digest of the offerer. Not a subject id, and not recomputable from '
  'the auth user table by the moderator reading this row.';
comment on column curriculum.review_queue.payload is
  'The offered framework as the brain built it, with the owner stripped and no page of the '
  'learner''s own document — only its hash and shape.';

comment on column curriculum.discovery_jobs.level is
  'The NORMALISED level key (lowercased, unaccented, punctuation collapsed), not the learner''s '
  'keystrokes: "Class 9" and "class 9" are one syllabus and must be one job (§12).';
comment on column curriculum.discovery_jobs.subject is
  'The NORMALISED subject key, for the same reason as `level`.';

notify pgrst, 'reload schema';
