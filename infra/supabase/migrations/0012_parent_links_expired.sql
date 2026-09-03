-- 0012 — a third way a parent link ends: nobody answered (services/gateway parents.py).
--
-- 0011 lets a link be `revoked` by the learner (the You screen) or by the parent ("Not me"). An
-- invite nobody answers inside PARENT_INVITE_DAYS has a dead token but stayed `invited` forever:
-- the You screen kept saying "invite sent", and a fresh invite was a 409 until the learner found
-- DELETE. Now the gateway reads such a row as `expired`, and a fresh invite revokes it with
-- `revoked_by = 'expired'` before writing the new one. The check that names who ended a link
-- learns the third value; nothing else changes. The revoked-keeps-no-address rule applies to an
-- expired row exactly as to the other two.
--
-- Additive and idempotent. Applying it twice is a no-op.

alter table learner.parent_links
  drop constraint if exists parent_links_revoked_names_who;
alter table learner.parent_links
  add constraint parent_links_revoked_names_who
    check (revoked_by is null or revoked_by in ('learner', 'parent', 'expired'));

comment on column learner.parent_links.revoked_by is
  'learner: ended from the You screen. parent: the "Not me" link in the invite. '
  'expired: the invite ran out unanswered and a fresh one replaced it.';

notify pgrst, 'reload schema';
