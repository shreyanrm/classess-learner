"""The preferences model and both stores — the PostgREST one driven against a fake transport,
so every URL, header and body it builds is proven without a database or a network.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest
from wobo_gateway.hospitality import preferences as prefs_mod
from wobo_gateway.hospitality.preferences import (
    DEFAULT_PREFERENCES,
    InMemoryPreferencesStore,
    MailPreferences,
    PostgrestPreferencesStore,
    PreferenceError,
    StoreUnavailable,
    from_row,
    normalise,
    to_row,
)

CALENDARS = ("hindu", "muslim", "christian", "malayali")


@pytest.fixture(autouse=True)
def _reset() -> None:
    prefs_mod.set_store(None)
    yield
    prefs_mod.set_store(None)


# --- the model ------------------------------------------------------------------------------------


def test_allows_reads_the_dials_and_the_stop_overrides_them() -> None:
    prefs = MailPreferences(wins=False)
    assert prefs.allows("sunday_note") and not prefs.allows("wins") and prefs.allows("festivals")
    assert not prefs.allows("marketing")  # not a kind we send
    stopped = MailPreferences(unsubscribed_at=datetime(2026, 1, 1, tzinfo=UTC))
    assert not any(stopped.allows(k) for k in ("sunday_note", "wins", "festivals"))


def test_normalise_applies_only_what_was_sent_and_validates_each_field() -> None:
    base = MailPreferences(country="IN", region="IN-KL", festival_calendar=("hindu",))
    out = normalise({"wins": False}, calendars=CALENDARS, base=base)
    assert out.wins is False and out.country == "IN" and out.festival_calendar == ("hindu",)
    with pytest.raises(PreferenceError) as err:
        normalise({"wins": "no"}, calendars=CALENDARS, base=base)
    assert err.value.field == "wins"
    with pytest.raises(PreferenceError):
        normalise({"festival_calendar": "hindu"}, calendars=CALENDARS)
    many = tuple(f"calendar-{i}" for i in range(14))
    with pytest.raises(PreferenceError):
        normalise({"festival_calendar": list(many[:13])}, calendars=many)
    assert (
        len(normalise({"festival_calendar": list(many[:12])}, calendars=many).festival_calendar)
        == 12
    )


def test_normalise_reads_codes_and_aliases() -> None:
    out = normalise(
        {"country": " in ", "region": "in-ts"},
        calendars=CALENDARS,
        region_aliases={"IN-TS": "IN-TG"},
    )
    assert out.country == "IN" and out.region == "IN-TG"
    cleared = normalise({"country": None}, calendars=CALENDARS, base=out)
    assert cleared.country is None and cleared.region is None
    assert normalise({"region": ""}, calendars=CALENDARS, base=out).region is None
    assert normalise({"timezone": "Europe/London"}, calendars=CALENDARS).timezone == "Europe/London"
    assert normalise({"timezone": None}, calendars=CALENDARS, base=out).timezone is None


def test_unsubscribed_true_stamps_once_and_false_clears() -> None:
    stopped = normalise({"unsubscribed": True}, calendars=CALENDARS)
    assert stopped.unsubscribed_at is not None
    again = normalise({"unsubscribed": True}, calendars=CALENDARS, base=stopped)
    assert again.unsubscribed_at == stopped.unsubscribed_at
    back = normalise({"unsubscribed": False}, calendars=CALENDARS, base=stopped)
    assert back.unsubscribed_at is None


def test_rows_round_trip_and_read_tolerantly() -> None:
    prefs = MailPreferences(
        sunday_note=False,
        festival_calendar=("hindu", "malayali"),
        country="IN",
        region="IN-KL",
        timezone="Asia/Kolkata",
        unsubscribed_at=datetime(2026, 2, 3, 4, 5, tzinfo=UTC),
    )
    row = to_row("learner-1", prefs)
    assert row["learner_id"] == "learner-1" and row["festival_calendar"] == ["hindu", "malayali"]
    assert from_row(row) == prefs
    # a raw Postgres array literal, lower-case codes, a Z timestamp, a column we do not know
    odd = {
        "festival_calendar": "{hindu,malayali}",
        "country": "in",
        "region": "in-kl",
        "unsubscribed_at": "2026-02-03T04:05:00Z",
        "wins": None,
        "colour": "blue",
    }
    read = from_row(odd)
    assert read.festival_calendar == ("hindu", "malayali") and read.country == "IN"
    assert read.region == "IN-KL" and read.wins is True
    assert read.unsubscribed_at == datetime(2026, 2, 3, 4, 5, tzinfo=UTC)
    assert from_row({}) == DEFAULT_PREFERENCES


# --- the in-memory store --------------------------------------------------------------------------


def test_the_memory_store_keeps_one_row_per_learner() -> None:
    store = InMemoryPreferencesStore()
    assert store.get("a") is None
    put = store.put("a", MailPreferences(wins=False))
    assert put.updated_at is not None and store.get("a") == put
    # the one-click stop flips only the dials the link names; the rest of the row is kept
    stopped = store.stop("a", ("sunday_note",))
    assert stopped.sunday_note is False and stopped.wins is False and stopped.festivals is True
    assert stopped.unsubscribed_at is None
    # a second stop is harmless; a row is made for a learner never seen, with the other dials on
    assert store.stop("a", ("sunday_note",)).sunday_note is False
    fresh = store.stop("b", ("wins", "festivals"))
    assert fresh.sunday_note is True and not fresh.wins and not fresh.festivals
    # a kind that is not a dial is ignored, never written
    assert store.stop("c", ("marketing",)) == DEFAULT_PREFERENCES


def test_build_store_picks_memory_without_a_project(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MAIL_PREFERENCES_STORE", raising=False)
    assert isinstance(prefs_mod.build_store(), InMemoryPreferencesStore)
    monkeypatch.setenv("SUPABASE_URL", "https://project.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-not-a-real-one")
    assert isinstance(prefs_mod.build_store(), PostgrestPreferencesStore)
    monkeypatch.setenv("MAIL_PREFERENCES_STORE", "memory")
    assert isinstance(prefs_mod.build_store(), InMemoryPreferencesStore)
    assert prefs_mod.get_store() is prefs_mod.get_store()


# --- the PostgREST store, against a fake ----------------------------------------------------------


class FakeRequest:
    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.rows = rows or []
        self.calls: list[dict[str, Any]] = []
        self.fail = False

    def __call__(
        self, url: str, key: str, method: str, *, body: Any = None, want_rows: bool
    ) -> Any:
        self.calls.append(
            {"url": url, "key": key, "method": method, "body": body, "rows": want_rows}
        )
        if self.fail:
            raise OSError("no route to host")
        if method == "POST":
            merged = dict(self.rows[0]) if self.rows else {}
            merged.update(body[0])
            self.rows = [merged]
        return list(self.rows) if want_rows else []


def test_the_read_selects_the_learners_row_in_the_learner_schema() -> None:
    fake = FakeRequest([{"learner_id": "L", "wins": False, "festival_calendar": ["hindu"]}])
    store = PostgrestPreferencesStore("https://project.example/", "svc-key", request=fake)
    got = store.get("L")
    assert got == MailPreferences(wins=False, festival_calendar=("hindu",))
    call = fake.calls[0]
    parsed = urlparse(call["url"])
    assert parsed.path == "/rest/v1/mail_preferences"
    assert parse_qs(parsed.query) == {"select": ["*"], "learner_id": ["eq.L"], "limit": ["1"]}
    assert call["method"] == "GET" and call["key"] == "svc-key" and call["rows"] is True
    assert PostgrestPreferencesStore("https://p", "k", request=FakeRequest()).get("L") is None


def test_the_write_is_an_upsert_on_learner_id() -> None:
    fake = FakeRequest()
    store = PostgrestPreferencesStore("https://project.example", "svc-key", request=fake)
    stored = store.put("L", MailPreferences(country="IN", festival_calendar=("hindu",)))
    assert stored.country == "IN" and stored.festival_calendar == ("hindu",)
    call = fake.calls[0]
    assert call["method"] == "POST"
    assert parse_qs(urlparse(call["url"]).query) == {"on_conflict": ["learner_id"]}
    assert call["body"] == [
        to_row("L", MailPreferences(country="IN", festival_calendar=("hindu",)))
    ]


def test_the_stop_writes_only_the_named_dials() -> None:
    """Merge-duplicates: the columns sent are the columns changed, so the chosen calendars and
    the other dials on an existing row survive a one-click stop."""
    fake = FakeRequest([{"learner_id": "L", "wins": False, "festival_calendar": ["hindu"]}])
    store = PostgrestPreferencesStore("https://project.example", "svc-key", request=fake)
    stopped = store.stop("L", ("sunday_note",))
    assert stopped.sunday_note is False and stopped.festival_calendar == ("hindu",)
    write = [c for c in fake.calls if c["method"] == "POST"][0]
    assert write["body"] == [{"learner_id": "L", "sunday_note": False}]
    assert parse_qs(urlparse(write["url"]).query) == {"on_conflict": ["learner_id"]}
    store.stop("L", ("wins", "festivals"))
    second = [c for c in fake.calls if c["method"] == "POST"][1]
    assert second["body"] == [{"learner_id": "L", "wins": False, "festivals": False}]


def test_the_real_transport_sends_the_schema_headers(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    class Response:
        def __init__(self, request: Any) -> None:
            seen["headers"] = dict(request.header_items())
            seen["method"] = request.get_method()
            seen["data"] = request.data

        def __enter__(self) -> Response:
            return self

        def __exit__(self, *exc: Any) -> None:
            return None

        def read(self) -> bytes:
            return b'[{"learner_id":"L"}]'

    monkeypatch.setattr(
        prefs_mod.urllib.request, "urlopen", lambda request, timeout: Response(request)
    )
    rows = prefs_mod._request(
        "https://p/rest/v1/mail_preferences", "k", "POST", body=[{"a": 1}], want_rows=True
    )
    assert rows == [{"learner_id": "L"}]
    headers = {k.lower(): v for k, v in seen["headers"].items()}
    assert headers["accept-profile"] == "learner" and headers["content-profile"] == "learner"
    assert headers["authorization"] == "Bearer k" and headers["apikey"] == "k"
    assert "merge-duplicates" in headers["prefer"] and "return=representation" in headers["prefer"]
    assert seen["method"] == "POST" and seen["data"] == b'[{"a": 1}]'


def test_an_unreachable_project_is_store_unavailable_never_a_default() -> None:
    fake = FakeRequest()
    fake.fail = True
    store = PostgrestPreferencesStore("https://project.example", "svc-key", request=fake)
    with pytest.raises(StoreUnavailable):
        store.get("L")
    with pytest.raises(StoreUnavailable):
        store.put("L", MailPreferences())
    with pytest.raises(StoreUnavailable):
        store.stop("L", ("wins",))
    with pytest.raises(ValueError):
        PostgrestPreferencesStore("", "k")


def test_preferences_for_is_the_jobs_seam() -> None:
    store = InMemoryPreferencesStore()
    prefs_mod.set_store(store)
    assert prefs_mod.preferences_for("L") is None
    store.put("L", MailPreferences(festivals=False))
    assert prefs_mod.preferences_for("L").festivals is False  # type: ignore[union-attr]
