"""Migration 0011 — ``learner.parent_links``, read as a contract.

No Postgres runs here (the repo's migrations are applied through the project, never locally),
so these follow ``test_hospitality_schema.py``: the guard against the failures that would be
invisible until production. A table without RLS, a policy that lets a learner read another
family's link, a client that can write ``linked`` without the parent's tap, a delete path left
open, a revoked row that keeps the parent's address. Each is one grep away from being caught.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

MIGRATIONS = Path(__file__).resolve().parents[3] / "infra/supabase/migrations"
MIGRATION = MIGRATIONS / "0011_parent_links.sql"
TABLE = "learner.parent_links"

COLUMNS = (
    "id uuid primary key default gen_random_uuid()",
    "learner_id uuid not null",
    "parent_email_hash text not null",
    "parent_email text",
    "learner_name text",
    "timezone text",
    "status text not null default 'invited'",
    "invited_at timestamptz not null default now()",
    "linked_at timestamptz",
    "revoked_at timestamptz",
    "revoked_by text",
    "invite_token_hash text",
    "unsubscribe_url text",
)


@pytest.fixture(scope="module")
def sql() -> str:
    return MIGRATION.read_text()


def test_the_migration_exists_and_follows_the_hospitality_one() -> None:
    assert MIGRATION.is_file()
    numbers = sorted(p.name[:4] for p in MIGRATIONS.glob("*.sql"))
    assert numbers.index("0011") == numbers.index("0010") + 1


def test_the_table_and_every_column_the_brief_names(sql: str) -> None:
    assert f"create table if not exists {TABLE}" in sql
    for column in COLUMNS:
        assert column in sql, column
    assert "check (status in ('invited', 'linked', 'revoked'))" in sql


def test_row_level_security_is_on(sql: str) -> None:
    assert re.search(rf"alter table {re.escape(TABLE)}\s+enable row level security", sql)


def test_a_learner_reads_and_writes_only_their_own_rows(sql: str) -> None:
    """The RLS proof, the way 0002 and 0010 write it: every policy handed to `authenticated`
    is pinned to `learner_id = auth.uid()` in both its `using` and its `with check`."""
    policies = list(
        re.finditer(
            rf"create policy (\w+) on {re.escape(TABLE)} for (\w+) to authenticated\s+([^;]+);",
            sql,
        )
    )
    verbs = {m.group(2) for m in policies}
    assert verbs == {"select", "insert", "update"}, verbs
    for match in policies:
        verb, clause = match.group(2), match.group(3)
        if verb != "insert":
            assert "using (learner_id = auth.uid())" in clause, match.group(1)
        if verb != "select":
            assert "with check (learner_id = auth.uid()" in clause, match.group(1)
        # nothing wider: no `or`, no `true`
        assert " or " not in clause and "true" not in clause, match.group(1)


def test_a_client_can_only_ever_insert_a_fresh_invite(sql: str) -> None:
    """A client-written row is an invite with no token: it can never be `linked`, and it can
    never carry a token digest the accept route would compare against."""
    insert = re.search(
        rf"create policy parent_links_insert on {re.escape(TABLE)} for insert to authenticated"
        r"\s+with check \(([^;]+)\);",
        sql,
    )
    assert insert, "no insert policy"
    clause = insert.group(1)
    assert "status = 'invited'" in clause and "invite_token_hash is null" in clause


def test_a_client_may_update_the_name_and_the_zone_and_nothing_else(sql: str) -> None:
    """Column-level grants: the status, the address, the token digest and the stop link are the
    gateway's alone. Without this the missing delete policy would be the only thing between a
    client and a row that says `linked` with no parent behind it."""
    assert f"revoke update on {TABLE} from authenticated" in sql
    assert f"grant update (learner_name, timezone) on {TABLE} to authenticated" in sql
    assert f"grant select, insert on {TABLE} to authenticated" in sql
    assert not re.search(rf"grant select, insert, update on {re.escape(TABLE)}", sql)


def test_no_policy_lets_a_learner_delete_and_the_grant_is_withdrawn(sql: str) -> None:
    assert not re.search(rf"create policy \w+ on {re.escape(TABLE)} for (all|delete)", sql)
    assert f"revoke delete on {TABLE} from authenticated" in sql
    assert f"grant all on {TABLE} to service_role" in sql


def test_one_active_link_per_learner(sql: str) -> None:
    assert re.search(
        r"create unique index if not exists parent_links_one_active_idx\s+on "
        rf"{re.escape(TABLE)} \(learner_id\)\s+where status in \('invited', 'linked'\)",
        sql,
    )


def test_a_revoked_row_keeps_no_address_and_no_token(sql: str) -> None:
    assert "parent_links_revoked_keeps_no_address" in sql
    assert "status <> 'revoked' or (parent_email is null and invite_token_hash is null)" in sql
    assert "status <> 'revoked' or revoked_at is not null" in sql
    assert "revoked_by is null or revoked_by in ('learner', 'parent')" in sql


def test_an_expired_invite_is_a_third_way_a_link_ends() -> None:
    """0012: the gateway writes ``revoked_by = 'expired'`` when a fresh invite replaces one nobody
    answered. The value the code writes and the value the check allows are one list."""
    from wobo_gateway import parents

    follow_up = MIGRATIONS / "0012_parent_links_expired.sql"
    assert follow_up.is_file()
    sql = follow_up.read_text()
    assert "drop constraint if exists parent_links_revoked_names_who" in sql
    assert "revoked_by is null or revoked_by in ('learner', 'parent', 'expired')" in sql
    assert "notify pgrst, 'reload schema'" in sql
    assert set(parents.ENDED_BY) == {"learner", "parent", "expired"}


def test_a_linked_row_has_a_time_and_no_outstanding_token(sql: str) -> None:
    assert "status <> 'linked' or linked_at is not null" in sql
    assert "status <> 'linked' or invite_token_hash is null" in sql


def test_digests_are_digests_and_the_zone_is_a_name(sql: str) -> None:
    assert "parent_email_hash ~ '^[0-9a-f]{64}$'" in sql
    assert "invite_token_hash is null or invite_token_hash ~ '^[0-9a-f]{64}$'" in sql
    assert "parent_links_timezone_is_a_name" in sql
    assert "char_length(learner_name) <= 40" in sql


def test_the_address_is_stored_in_the_clear_for_a_stated_reason(sql: str) -> None:
    """The decision is written down where the next reader looks: no ciphertext column, and the
    file says why (RLS plus the service-role erase, a revoked row keeps no address)."""
    assert "parent_email_ciphertext" not in sql
    assert "Why the address is stored in the clear" in sql
    assert "/v1/me/erase" in sql


def test_updated_at_is_kept_by_the_learner_schemas_trigger(sql: str) -> None:
    assert f"create trigger parent_links_set_updated_at before update on {TABLE}" in sql
    assert "execute function learner.set_updated_at()" in sql


def test_the_migration_is_idempotent(sql: str) -> None:
    for match in re.finditer(r"create trigger (\w+) ", sql):
        assert f"drop trigger if exists {match.group(1)} " in sql
    for match in re.finditer(r"create policy (\w+) ", sql):
        assert f"drop policy if exists {match.group(1)} " in sql
    assert "create table learner." not in sql
    for match in re.finditer(r"create (?:unique )?index (\w+)", sql):
        assert match.group(1) == "if", match.group(0)


def test_postgrest_is_told_to_reload(sql: str) -> None:
    assert "notify pgrst, 'reload schema'" in sql


def test_the_store_and_the_schema_agree(sql: str) -> None:
    """Every column the gateway writes exists in the migration, and the erase path names the
    same table and the same learner column."""
    from datetime import UTC, datetime

    from wobo_gateway import memory, parents

    assert parents._SCHEMA == "learner" and parents._TABLE == "parent_links"
    assert memory._PARENT_LINKS_TABLE == "parent_links"
    assert memory._PREFERENCES_TABLE == "mail_preferences"
    assert memory._LEARNER_COLUMN == "learner_id"
    link = parents.ParentLink(
        id="x",
        learner_id="l",
        parent_email_hash="0" * 64,
        parent_email="p@example.test",
        learner_name="A",
        timezone="Asia/Kolkata",
        status="invited",
        invited_at=datetime.now(UTC),
    )
    for column in parents.to_row(link):
        assert re.search(rf"^\s+{column} ", sql, re.M), column
    assert set(parents.STATUSES) == {"invited", "linked", "revoked"}
