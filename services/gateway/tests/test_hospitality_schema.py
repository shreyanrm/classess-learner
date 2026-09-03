"""Migration 0010 — ``learner.mail_preferences``, read as a contract.

No Postgres runs here (the repo's migrations are applied through the project, never locally),
so these follow ``test_curriculum_schema.py``: the guard against the failures that would be
invisible until production. A table without RLS, a policy that lets a learner read another
family's chosen festivals, a delete path left open to the client, a locality stored as a name
instead of a code. Each is one grep away from being caught.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

MIGRATIONS = Path(__file__).resolve().parents[3] / "infra/supabase/migrations"
MIGRATION = MIGRATIONS / "0010_hospitality.sql"
TABLE = "learner.mail_preferences"

COLUMNS = (
    "learner_id uuid primary key",
    "sunday_note boolean not null default true",
    "wins boolean not null default true",
    "festivals boolean not null default true",
    "festival_calendar text[] not null default '{}'",
    "country text",
    "region text",
    "timezone text",
    "unsubscribed_at timestamptz",
)


@pytest.fixture(scope="module")
def sql() -> str:
    return MIGRATION.read_text()


def test_the_migration_exists_and_follows_the_curriculum_pair() -> None:
    assert MIGRATION.is_file()
    numbers = sorted(p.name[:4] for p in MIGRATIONS.glob("*.sql"))
    assert numbers.index("0010") == numbers.index("0009") + 1


def test_the_table_and_every_column_the_brief_names(sql: str) -> None:
    assert f"create table if not exists {TABLE}" in sql
    for column in COLUMNS:
        assert column in sql, column


def test_row_level_security_is_on(sql: str) -> None:
    assert re.search(rf"alter table {re.escape(TABLE)}\s+enable row level security", sql)


def test_a_learner_reads_and_updates_only_their_own_row(sql: str) -> None:
    """The RLS proof, the way 0002 and 0008 write it: every policy handed to `authenticated`
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
            assert "with check (learner_id = auth.uid())" in clause, match.group(1)
        # nothing wider: no `true`, no `or`, no second predicate
        assert " or " not in clause and "true" not in clause, match.group(1)


def test_no_policy_lets_a_learner_delete_and_the_grant_is_withdrawn(sql: str) -> None:
    assert not re.search(rf"create policy \w+ on {re.escape(TABLE)} for (all|delete)", sql)
    assert f"revoke delete on {TABLE} from authenticated" in sql
    assert f"grant select, insert, update on {TABLE} to authenticated" in sql
    assert f"grant all on {TABLE} to service_role" in sql


def test_the_chosen_calendars_are_bounded_slugs_never_free_text(sql: str) -> None:
    """§14.1 rule 3: the chosen list is sensitive data. A slug list cannot carry a name."""
    assert "mail_preferences_calendars_are_slugs" in sql
    assert "cardinality(festival_calendar) <= 12" in sql


def test_locality_is_stored_as_codes(sql: str) -> None:
    assert "country ~ '^[A-Z]{2}$'" in sql
    assert "region ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'" in sql
    assert "left(region, 2) = country" in sql
    assert "mail_preferences_timezone_is_a_name" in sql


def test_updated_at_is_kept_by_the_learner_schemas_trigger(sql: str) -> None:
    assert f"create trigger mail_preferences_set_updated_at before update on {TABLE}" in sql
    assert "execute function learner.set_updated_at()" in sql


def test_the_migration_is_idempotent(sql: str) -> None:
    for match in re.finditer(r"create trigger (\w+) ", sql):
        assert f"drop trigger if exists {match.group(1)} " in sql
    for match in re.finditer(r"create policy (\w+) ", sql):
        assert f"drop policy if exists {match.group(1)} " in sql
    assert "create table learner." not in sql


def test_postgrest_is_told_to_reload(sql: str) -> None:
    assert "notify pgrst, 'reload schema'" in sql


def test_the_store_and_the_schema_agree() -> None:
    from wobo_gateway.hospitality import preferences

    assert preferences._SCHEMA == "learner"
    assert preferences._TABLE == "mail_preferences"
    assert preferences._ID_COLUMN == "learner_id"
    assert preferences.MAX_CALENDARS == 12
