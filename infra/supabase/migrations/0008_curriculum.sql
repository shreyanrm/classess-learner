-- 0008 — the `curriculum` schema: every board on earth, on demand (docs/CURRICULUM.md §2, §5, §10).
--
-- This is the registry the static catalog file and the client "frame" system are replaced by.
-- It is a THIRD plane alongside `learner` (per-subject working state) and the KGtoPG platform
-- schemas: mostly-public reference data, written by the brain with the service role and read by
-- every authenticated learner. There are no cross-schema foreign keys; the canonical concept a
-- topic maps to is an opaque uuid on the operational plane (`concept_map.concept_id`).
--
-- The laws this file enforces in the database rather than only in Python:
--   * nothing is edited in place after publication — `refuse_published_edit` (§2)
--   * a correction is a NEW version with `supersedes` (§2)
--   * the learner's overlay never mutates a canonical node — it is a patch in its own table (§6)
--   * personal frameworks and overlays are per-subject; everything else is public-read (§10)
--   * writes are service-role only: `authenticated` gets SELECT and nothing else (§10)
--   * one discovery per framework/level/subject — a partial unique index, not a code convention (§4)
--
-- Additive and idempotent. Applying it twice is a no-op.

create extension if not exists pg_trgm;

create schema if not exists curriculum;

create or replace function curriculum.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;


-- ---------------------------------------------------------------------------------------------
-- frameworks — one board, programme, or curriculum. `owner_subject_id` is null for every public
-- row; a learner's own syllabus carries their subject id and is visible to nobody else. Offering
-- a personal framework to the registry (status `community`) clears the owner, which is what
-- "credited anonymously" means in the schema.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.frameworks (
  id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  kind text not null check (kind in
    ('national','state','international','open','homeschool','online','personal')),
  country text,                       -- ISO 3166-1 alpha-2, null for a framework with no country
  region text,
  languages text[] not null default '{en}',
  levels text[] not null default '{}',
  official_site text,
  status text not null default 'provisional'
    check (status in ('verified','provisional','community','personal')),
  owner_subject_id uuid,
  -- One lowered haystack for type-ahead: name, every alias, the country and the region. Kept by
  -- the `frameworks_set_search_text` trigger below (array_to_string is STABLE, so Postgres refuses
  -- it in a generated column), so the trigram index has something to sit on.
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- kind and ownership move together: a personal framework has an owner, a public one never does.
  constraint frameworks_personal_has_owner
    check ((kind = 'personal') = (owner_subject_id is not null))
);

create or replace function curriculum.set_search_text()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_text = lower(
    new.name || ' ' || coalesce(array_to_string(new.aliases, ' '), '')
             || ' ' || coalesce(new.country, '') || ' ' || coalesce(new.region, '')
  );
  return new;
end $$;

drop trigger if exists frameworks_set_search_text on curriculum.frameworks;
create trigger frameworks_set_search_text before insert or update on curriculum.frameworks
  for each row execute function curriculum.set_search_text();

create index if not exists frameworks_search_trgm_idx
  on curriculum.frameworks using gin (search_text gin_trgm_ops);
create index if not exists frameworks_aliases_idx
  on curriculum.frameworks using gin (aliases);
create index if not exists frameworks_country_idx
  on curriculum.frameworks (country) where owner_subject_id is null;
create index if not exists frameworks_owner_idx
  on curriculum.frameworks (owner_subject_id) where owner_subject_id is not null;


-- ---------------------------------------------------------------------------------------------
-- versions — one academic year or edition. Immutable once `published_at` is set; a correction is
-- a new row pointing at the old one through `supersedes`.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.versions (
  id uuid primary key default gen_random_uuid(),
  framework_id text not null references curriculum.frameworks(id) on delete cascade,
  label text not null,                -- '2026-27', '2025 edition'
  status text not null default 'provisional'
    check (status in ('verified','provisional','community','personal')),
  supersedes uuid references curriculum.versions(id),
  published_at timestamptz,
  document_hash text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, label)
);

create index if not exists versions_framework_idx
  on curriculum.versions (framework_id, published_at desc nulls last);
create index if not exists versions_supersedes_idx
  on curriculum.versions (supersedes) where supersedes is not null;


-- ---------------------------------------------------------------------------------------------
-- nodes — level, subject, unit, topic and objective in one table, keyed by `kind` and `parent_id`
-- so the shape of a framework is data rather than five tables (CURRICULUM.md §2, §10).
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.nodes (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum.versions(id) on delete cascade,
  kind text not null check (kind in ('level','subject','unit','topic','objective')),
  parent_id uuid references curriculum.nodes(id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  order_index integer not null default 0,
  source_ref jsonb,                   -- { document_id, url, page, section }
  created_at timestamptz not null default now()
);

create index if not exists nodes_version_parent_idx
  on curriculum.nodes (version_id, parent_id, order_index);
create index if not exists nodes_version_kind_idx
  on curriculum.nodes (version_id, kind, order_index);
create index if not exists nodes_name_trgm_idx
  on curriculum.nodes using gin (lower(name) gin_trgm_ops);


-- ---------------------------------------------------------------------------------------------
-- provenance — where a node came from and who checked it (§5). One row per node; a version-level
-- row (node_id null) records the document the whole extraction came from.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.provenance (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum.versions(id) on delete cascade,
  node_id uuid references curriculum.nodes(id) on delete cascade,
  source_url text,
  source_page_or_section text,
  document_hash text,
  fetched_at timestamptz,
  extractor_model text,
  verifier_model text,
  checks_passed text[] not null default '{}',
  verified_at timestamptz,
  verified_by text check (verified_by in ('system','owner','community')),
  created_at timestamptz not null default now()
);

create unique index if not exists provenance_node_idx
  on curriculum.provenance (node_id) where node_id is not null;
create index if not exists provenance_version_idx on curriculum.provenance (version_id);


-- ---------------------------------------------------------------------------------------------
-- concept_map — a topic on one board and the same topic on another share a canonical concept, so
-- a lesson generated once is reused (§7). `concept_id` is an opaque uuid on the operational
-- plane: no cross-schema foreign key, by the two-planes rule.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.concept_map (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references curriculum.nodes(id) on delete cascade,
  concept_id uuid not null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  proposed_by text,                   -- 'generate' | 'structural' | 'usage' | 'owner'
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (node_id, concept_id)
);

create index if not exists concept_map_concept_idx on curriculum.concept_map (concept_id);


-- ---------------------------------------------------------------------------------------------
-- overlays — the learner's edits, keyed by (subject, version) and stored as a JSON patch against
-- canonical node ids (§6). Never a mutation of a canonical node, so an upgrade re-applies them.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.overlays (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  version_id uuid not null references curriculum.versions(id) on delete cascade,
  patch jsonb not null default '[]'::jsonb,
  -- What the last upgrade could not carry across, in one line per change. The learner reads it.
  last_report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, version_id)
);

create index if not exists overlays_subject_idx on curriculum.overlays (subject_id);


-- ---------------------------------------------------------------------------------------------
-- pins — the version a learner is studying (§2: "learners are pinned to a version and offered the
-- upgrade with a diff"). One pin per framework per learner.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.pins (
  subject_id uuid not null,
  framework_id text not null references curriculum.frameworks(id) on delete cascade,
  version_id uuid not null references curriculum.versions(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (subject_id, framework_id)
);

create index if not exists pins_version_idx on curriculum.pins (version_id);


-- ---------------------------------------------------------------------------------------------
-- discovery_jobs — the state machine of §4. The partial unique index is the "never a second
-- discovery for a framework that is already stored" law: while a job is open for one
-- framework/level/subject, a second enqueue cannot be inserted.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  framework_id text references curriculum.frameworks(id) on delete set null,
  query text not null,                -- what the learner typed, or the framework's own name
  level text,
  subject text,
  state text not null default 'queued'
    check (state in ('queued','searching','extracting','checking','stored','failed','refused')),
  budget jsonb not null default '{}'::jsonb,   -- { queries, deadline_s } — set by the runner
  result jsonb,                                -- { version_id, units, checks_passed }
  message text,                                -- the one honest line the learner is shown
  requested_by uuid,
  attempts integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists discovery_jobs_open_idx
  on curriculum.discovery_jobs (
    coalesce(framework_id, lower(query)), coalesce(level, ''), coalesce(subject, '')
  )
  where state in ('queued','searching','extracting','checking');
create index if not exists discovery_jobs_state_idx
  on curriculum.discovery_jobs (state, created_at);
create index if not exists discovery_jobs_requester_idx
  on curriculum.discovery_jobs (requested_by, created_at desc);


-- ---------------------------------------------------------------------------------------------
-- review_queue — anything the checks flagged, plus the owner's promotion path (§4.5).
-- Not readable by learners at all: RLS is enabled with no `authenticated` policy.
-- ---------------------------------------------------------------------------------------------
create table if not exists curriculum.review_queue (
  id uuid primary key default gen_random_uuid(),
  version_id uuid references curriculum.versions(id) on delete cascade,
  node_id uuid references curriculum.nodes(id) on delete cascade,
  reason text not null,
  state text not null default 'open' check (state in ('open','resolved','rejected')),
  flagged_by uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists review_queue_state_idx on curriculum.review_queue (state, created_at);


-- ---------------------------------------------------------------------------------------------
-- Immutability (§2). A published version's shape cannot be edited: not its label, not its source,
-- not one of its nodes, not the provenance that vouches for it. A correction is a new version
-- with `supersedes`. `status` stays writable because promotion (provisional -> verified) is a
-- judgement ABOUT the version, not a change to what it says.
--
-- UPDATE only, deliberately. DELETE stays open so the DPDP deletion path can remove a learner's
-- personal framework and so `on delete cascade` works; deletion of a public framework is a
-- service-role action that RLS already forbids to every learner.
-- ---------------------------------------------------------------------------------------------
create or replace function curriculum.refuse_published_edit()
returns trigger language plpgsql set search_path = '' as $$
declare v_published timestamptz;
begin
  if tg_table_name = 'versions' then
    if old.published_at is not null and (
         new.framework_id  is distinct from old.framework_id
      or new.label         is distinct from old.label
      or new.published_at  is distinct from old.published_at
      or new.supersedes    is distinct from old.supersedes
      or new.document_hash is distinct from old.document_hash
      or new.source_url    is distinct from old.source_url
    ) then
      raise exception
        'curriculum.versions: a published version is immutable — publish a new version with supersedes';
    end if;
  else
    select v.published_at into v_published
      from curriculum.versions v where v.id = old.version_id;
    if v_published is not null then
      raise exception
        'curriculum.%: a published version is immutable — publish a new version with supersedes',
        tg_table_name;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists versions_refuse_published_edit on curriculum.versions;
create trigger versions_refuse_published_edit before update on curriculum.versions
  for each row execute function curriculum.refuse_published_edit();

drop trigger if exists nodes_refuse_published_edit on curriculum.nodes;
create trigger nodes_refuse_published_edit before update on curriculum.nodes
  for each row execute function curriculum.refuse_published_edit();

drop trigger if exists provenance_refuse_published_edit on curriculum.provenance;
create trigger provenance_refuse_published_edit before update on curriculum.provenance
  for each row execute function curriculum.refuse_published_edit();

drop trigger if exists frameworks_set_updated_at on curriculum.frameworks;
create trigger frameworks_set_updated_at before update on curriculum.frameworks
  for each row execute function curriculum.set_updated_at();
drop trigger if exists versions_set_updated_at on curriculum.versions;
create trigger versions_set_updated_at before update on curriculum.versions
  for each row execute function curriculum.set_updated_at();
drop trigger if exists overlays_set_updated_at on curriculum.overlays;
create trigger overlays_set_updated_at before update on curriculum.overlays
  for each row execute function curriculum.set_updated_at();
drop trigger if exists discovery_jobs_set_updated_at on curriculum.discovery_jobs;
create trigger discovery_jobs_set_updated_at before update on curriculum.discovery_jobs
  for each row execute function curriculum.set_updated_at();


-- ---------------------------------------------------------------------------------------------
-- RLS. Read for every authenticated learner on public rows; personal frameworks and overlays per
-- subject; writes only by the service role through the brain (§10).
--
-- `version_visible` answers "may this learner see this version's framework" once, as a stable
-- security-definer function, so the node and provenance policies are an index lookup rather than
-- a two-table join re-planned per row.
-- ---------------------------------------------------------------------------------------------
create or replace function curriculum.version_visible(p_version uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from curriculum.versions v
      join curriculum.frameworks f on f.id = v.framework_id
     where v.id = p_version
       and (f.owner_subject_id is null or f.owner_subject_id = auth.uid())
  )
$$;

alter table curriculum.frameworks      enable row level security;
alter table curriculum.versions        enable row level security;
alter table curriculum.nodes           enable row level security;
alter table curriculum.provenance      enable row level security;
alter table curriculum.concept_map     enable row level security;
alter table curriculum.overlays        enable row level security;
alter table curriculum.pins            enable row level security;
alter table curriculum.discovery_jobs  enable row level security;
alter table curriculum.review_queue    enable row level security;

drop policy if exists frameworks_read on curriculum.frameworks;
create policy frameworks_read on curriculum.frameworks for select to authenticated
  using (owner_subject_id is null or owner_subject_id = auth.uid());

drop policy if exists versions_read on curriculum.versions;
create policy versions_read on curriculum.versions for select to authenticated
  using (curriculum.version_visible(id));

drop policy if exists nodes_read on curriculum.nodes;
create policy nodes_read on curriculum.nodes for select to authenticated
  using (curriculum.version_visible(version_id));

drop policy if exists provenance_read on curriculum.provenance;
create policy provenance_read on curriculum.provenance for select to authenticated
  using (curriculum.version_visible(version_id));

drop policy if exists concept_map_read on curriculum.concept_map;
create policy concept_map_read on curriculum.concept_map for select to authenticated
  using (exists (
    select 1 from curriculum.nodes n
     where n.id = concept_map.node_id and curriculum.version_visible(n.version_id)
  ));

-- The learner's own edits and their own pin. Read only from the client: an overlay is written
-- through the brain (curriculum.overlay.apply), which validates the patch before it is stored.
drop policy if exists overlays_own on curriculum.overlays;
create policy overlays_own on curriculum.overlays for select to authenticated
  using (subject_id = auth.uid());

drop policy if exists pins_own on curriculum.pins;
create policy pins_own on curriculum.pins for select to authenticated
  using (subject_id = auth.uid());

drop policy if exists discovery_jobs_own on curriculum.discovery_jobs;
create policy discovery_jobs_own on curriculum.discovery_jobs for select to authenticated
  using (requested_by = auth.uid());

-- review_queue: RLS on, no policy for `authenticated`. Owner and service role only.

grant usage on schema curriculum to authenticated, service_role;
grant select on all tables in schema curriculum to authenticated;
revoke select on curriculum.review_queue from authenticated;
grant all on all tables in schema curriculum to service_role;
grant execute on function curriculum.version_visible(uuid) to authenticated, service_role;

alter default privileges in schema curriculum grant select on tables to authenticated;
alter default privileges in schema curriculum grant all on tables to service_role;

-- Expose the schema to PostgREST. The brain reads and writes it with `Accept-Profile: curriculum`
-- / `Content-Profile: curriculum`; the client caches its pinned version and never queries here
-- directly today, but the read policies above mean it safely could.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, learner, curriculum';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
