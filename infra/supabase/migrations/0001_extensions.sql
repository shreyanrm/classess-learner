-- Wobo — Supabase extensions.
-- pgvector: Plexus retrieval cache + semantic dedupe. moddatetime: updated_at. pgtap: in-DB RLS tests.
create extension if not exists vector;
create extension if not exists moddatetime schema extensions;
create extension if not exists pgtap;
