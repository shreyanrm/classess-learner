"""Migration 0008 — the `curriculum` schema, read as a contract.

No Postgres runs here, so these are not a substitute for pgtap. They are the guard against the
failures that would be invisible until production: a table without RLS, a write policy handed to
learners, a schema PostgREST cannot see, a published version that can be edited in place. Each of
those is a line in CURRICULUM.md §10 or §12, and each is one grep away from being caught.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

MIGRATION = (
    Path(__file__).resolve().parents[3] / "infra/supabase/migrations/0008_curriculum.sql"
)

TABLES = (
    "frameworks",
    "versions",
    "nodes",
    "provenance",
    "concept_map",
    "overlays",
    "pins",
    "discovery_jobs",
    "review_queue",
)


@pytest.fixture(scope="module")
def sql() -> str:
    return MIGRATION.read_text()


OFFERS = MIGRATION.parent / "0009_curriculum_review_offers.sql"


def test_the_migration_exists_and_is_the_last_of_the_curriculum_pair() -> None:
    assert MIGRATION.is_file() and OFFERS.is_file()
    numbers = sorted(p.name[:4] for p in MIGRATION.parent.glob("*.sql"))
    # 0009 follows 0008 directly; later migrations (0010 hospitality) belong to other schemas.
    assert numbers.index("0009") == numbers.index("0008") + 1


def test_the_review_queue_can_hold_an_offered_syllabus() -> None:
    """§6: an offer is moderated, so the queue has to be able to carry one. 0008 shaped the
    queue for a flagged node alone, which is why the offer row had nowhere to go."""
    sql = OFFERS.read_text()
    for column in ("kind", "framework_id", "offered_by_hash", "note", "payload"):
        assert f"add column if not exists {column}" in sql
    assert "framework_offer" in sql
    # Still nobody's but the owner's and the service role's: 0009 adds columns, not a policy.
    assert "create policy" not in sql


def test_every_table_in_the_document_is_created(sql: str) -> None:
    """§10 names them; a table that is not here is a capability that cannot be stored."""
    for table in TABLES:
        assert f"create table if not exists curriculum.{table}" in sql


def test_every_table_has_row_level_security(sql: str) -> None:
    for table in TABLES:
        assert f"alter table curriculum.{table}      enable row level security" in sql.replace(
            " ", " "
        ) or re.search(rf"alter table curriculum\.{table}\s+enable row level security", sql)


def test_learners_may_read_and_never_write(sql: str) -> None:
    """§10: writes only by the service role through the brain."""
    grants = re.finditer(r"create policy \w+ on curriculum\.\w+ for (\w+) to authenticated", sql)
    for match in grants:
        assert match.group(1) == "select"
    assert "grant select on all tables in schema curriculum to authenticated" in sql
    assert "grant all on all tables in schema curriculum to service_role" in sql
    # No blanket insert/update/delete grant to learners anywhere in the file.
    assert not re.search(r"grant [^;]*\b(insert|update|delete)\b[^;]*to authenticated", sql)


def test_personal_frameworks_and_overlays_are_per_subject(sql: str) -> None:
    assert "owner_subject_id is null or owner_subject_id = auth.uid()" in sql
    assert re.search(r"create policy overlays_own[^;]+subject_id = auth\.uid\(\)", sql, re.S)
    assert re.search(r"create policy pins_own[^;]+subject_id = auth\.uid\(\)", sql, re.S)


def test_the_review_queue_is_not_readable_by_learners(sql: str) -> None:
    assert "revoke select on curriculum.review_queue from authenticated" in sql
    assert "create policy review_queue" not in sql


def test_a_published_version_cannot_be_edited_in_place(sql: str) -> None:
    """§2 and §12: nothing edited in place after publication, enforced in the database too."""
    assert "curriculum.refuse_published_edit()" in sql
    assert "publish a new version with supersedes" in sql
    for table in ("versions", "nodes", "provenance"):
        trigger = f"create trigger {table}_refuse_published_edit"
        assert f"{trigger} before update on curriculum.{table}" in sql


def test_a_correction_points_at_what_it_supersedes(sql: str) -> None:
    assert "supersedes uuid references curriculum.versions(id)" in sql


def test_type_ahead_has_an_index_to_stand_on(sql: str) -> None:
    """§10: 'indexed for type-ahead'. An ILIKE without a trigram index is a sequential scan."""
    assert "create extension if not exists pg_trgm" in sql
    assert "using gin (search_text gin_trgm_ops)" in sql
    # array_to_string is STABLE, so the haystack is trigger-maintained rather than generated.
    assert "search_text text not null default ''" in sql
    assert (
        "create trigger frameworks_set_search_text before insert or update "
        "on curriculum.frameworks" in sql
    )


def test_the_tree_is_indexed_the_way_it_is_read(sql: str) -> None:
    assert "on curriculum.nodes (version_id, parent_id, order_index)" in sql
    assert "on curriculum.nodes (version_id, kind, order_index)" in sql


def test_one_discovery_per_syllabus_is_a_unique_index_not_a_convention(sql: str) -> None:
    """§12: 'a second discovery for a framework that is already stored' is what kills it."""
    assert "create unique index if not exists discovery_jobs_open_idx" in sql
    assert "where state in ('queued','searching','extracting','checking')" in sql


def test_the_four_statuses_are_constrained(sql: str) -> None:
    assert sql.count("check (status in ('verified','provisional','community','personal'))") >= 2


def test_the_five_node_kinds_are_constrained(sql: str) -> None:
    assert "check (kind in ('level','subject','unit','topic','objective'))" in sql


def test_a_personal_framework_always_has_an_owner(sql: str) -> None:
    assert "check ((kind = 'personal') = (owner_subject_id is not null))" in sql


def test_the_overlay_is_a_patch_not_a_mutation(sql: str) -> None:
    """§6: edits are keyed by canonical node id and stored beside the version, never inside it."""
    assert "patch jsonb not null default '[]'::jsonb" in sql
    assert "unique (subject_id, version_id)" in sql


def test_the_concept_map_does_not_reach_across_planes(sql: str) -> None:
    """The two-planes rule: canonical references are opaque uuids, never foreign keys."""
    assert "concept_id uuid not null," in sql
    assert "references operational." not in sql
    assert "references platform." not in sql


def test_postgrest_is_told_about_the_schema(sql: str) -> None:
    assert "pgrst.db_schemas = 'public, graphql_public, learner, curriculum'" in sql
    assert "notify pgrst, 'reload config'" in sql


def test_the_migration_is_idempotent(sql: str) -> None:
    """The orchestrator applies it; applying it twice must be a no-op, not an error."""
    assert "create schema if not exists curriculum" in sql
    assert sql.count("create table curriculum.") == 0  # all guarded by `if not exists`
    for match in re.finditer(r"create trigger (\w+) ", sql):
        assert f"drop trigger if exists {match.group(1)} " in sql
    for match in re.finditer(r"create policy (\w+) ", sql):
        assert f"drop policy if exists {match.group(1)} " in sql


def test_the_store_and_the_schema_agree_on_the_profile_header() -> None:
    from wobo_gateway.curriculum.store import SCHEMA

    assert SCHEMA == "curriculum"
