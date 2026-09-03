"""Freshness: the syllabus that changed under us (docs/CURRICULUM.md §9).

The schedule, the hash compare, the new version with its supersedes pointer, and the line Wobo
says about what moved. The fixture documents and stubs come from ``test_discovery`` so the two
suites cannot drift apart on what a document or a job record looks like.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime, timedelta

import pytest
from test_discovery import (
    AGREES,
    CBSE_PAGES,
    CBSE_URL,
    DEFAULT_BODIES,
    cbse_document,
    cbse_extraction,
    cbse_request,
    minimal_pdf,
    opener_for,
    stub_completion,
)
from wobo_gateway.curriculum.discovery import freshness
from wobo_gateway.curriculum.discovery.fetch import FetchRefused, fetch_document
from wobo_gateway.curriculum.discovery.job import InMemoryJobStore, JobState, run_discovery
from wobo_gateway.curriculum.discovery.search import MockSearchProvider, SearchResult

NOW = datetime(2026, 9, 3, 12, tzinfo=UTC)

# The same board, one year on: trigonometry arrives as unit III and pushes two units down.
NEXT_YEAR_PAGES = [
    CBSE_PAGES[0].replace("2026-27", "2027-28"),
    "COURSE STRUCTURE CLASS X\n"
    "UNIT I: NUMBER SYSTEMS\n"
    "1. REAL NUMBERS\n"
    "UNIT II: ALGEBRA\n"
    "2. POLYNOMIALS\n"
    "UNIT III: TRIGONOMETRY\n"
    "3. INTRODUCTION TO TRIGONOMETRY\n"
    "UNIT IV: COORDINATE GEOMETRY\n"
    "4. COORDINATE GEOMETRY\n"
    "UNIT V: STATISTICS AND PROBABILITY\n"
    "5. STATISTICS",
]

NEXT_YEAR_BODIES = {CBSE_URL: ("application/pdf", minimal_pdf(NEXT_YEAR_PAGES))}


def fetch_next(url, **kwargs):
    """The same url, a year later: the board republished the file in place."""
    return fetch_document(url, opener=opener_for(NEXT_YEAR_BODIES))


def fetch_same(url, **kwargs):
    return fetch_document(url, opener=opener_for(DEFAULT_BODIES))


def next_year_extraction(document) -> dict:
    titles = [
        ("UNIT I: NUMBER SYSTEMS", "REAL NUMBERS"),
        ("UNIT II: ALGEBRA", "POLYNOMIALS"),
        ("UNIT III: TRIGONOMETRY", "INTRODUCTION TO TRIGONOMETRY"),
        ("UNIT IV: COORDINATE GEOMETRY", "COORDINATE GEOMETRY"),
        ("UNIT V: STATISTICS AND PROBABILITY", "STATISTICS"),
    ]
    return {
        "version": "2027-28",
        "units": [
            {
                "title": unit,
                "source_ref": {"document_id": document.id, "page": 2},
                "topics": [
                    {"title": topic, "source_ref": {"document_id": document.id, "page": 2}}
                ],
            }
            for unit, topic in titles
        ],
    }


def stored_record(store=None):
    """One provisional CBSE syllabus, discovered the ordinary way."""
    store = store or InMemoryJobStore()
    document = cbse_document()
    record = run_discovery(
        cbse_request(),
        store=store,
        search_provider=MockSearchProvider([SearchResult(url=CBSE_URL)]),
        fetch_fn=fetch_same,
        complete_generate=stub_completion(json.dumps(cbse_extraction(document))),
        complete_verify=stub_completion(AGREES),
    )
    return store, record


# --- the schedule -------------------------------------------------------------------------


def test_a_framework_never_checked_is_due_now():
    assert freshness.due(last_checked=None, now=NOW)


def test_monthly_is_the_floor():
    assert not freshness.due(last_checked=NOW - timedelta(days=10), now=NOW, country="US")
    assert freshness.due(last_checked=NOW - timedelta(days=31), now=NOW, country="US")


def test_a_release_window_pulls_the_check_forward():
    march = datetime(2027, 3, 5, tzinfo=UTC)
    # Checked in February, well inside the monthly cadence, but the Indian boards publish in March.
    assert freshness.due(last_checked=datetime(2027, 2, 20, tzinfo=UTC), now=march, country="IN")
    # Once inside the window, not again the next day.
    assert not freshness.due(last_checked=datetime(2027, 3, 2, tzinfo=UTC), now=march, country="IN")
    # A country with a different school year is not pulled forward by India's.
    february = datetime(2027, 2, 20, tzinfo=UTC)
    assert not freshness.due(last_checked=february, now=march, country="GB")


def test_next_check_takes_whichever_comes_first():
    january = datetime(2027, 1, 10, tzinfo=UTC)
    assert freshness.next_check(last_checked=january, country="IN") == datetime(
        2027, 2, 9, tzinfo=UTC
    )
    february = datetime(2027, 2, 20, tzinfo=UTC)
    assert freshness.next_check(last_checked=february, country="IN") == datetime(
        2027, 3, 1, tzinfo=UTC
    )


def test_a_provisional_syllabus_is_rechecked_when_a_second_learner_arrives():
    _, record = stored_record()
    assert not freshness.due_for_record(record, now=NOW, learners=1)
    assert freshness.due_for_record(record, now=NOW, learners=2)


def test_a_refused_record_is_never_scheduled():
    _, record = stored_record()
    record.status = "refused"
    assert not freshness.due_for_record(record, now=NOW, learners=9)
    assert freshness.due_records([record], now=NOW) == ()


# --- versions and hashes -------------------------------------------------------------------


def test_only_changed_bytes_are_a_new_version():
    document = cbse_document()
    assert not freshness.document_changed(document.document_sha256, document)
    assert freshness.document_changed("a" * 64, document)
    assert not freshness.document_changed(None, document), "nothing to compare is not a change"


def test_a_revision_label_never_repeats_itself():
    assert freshness.revision_version("2026-27") == "2026-27 rev 2"
    assert freshness.revision_version("2026-27 rev 2") == "2026-27 rev 3"
    assert freshness.revision_version("2026-27", ["2026-27 rev 2"]) == "2026-27 rev 3"


# --- the diff -----------------------------------------------------------------------------


def _syllabus(units: list[tuple[str, list[str]]]) -> dict:
    return {
        "version": "2027-28",
        "units": [
            {"title": title, "topics": [{"title": topic} for topic in topics]}
            for title, topics in units
        ],
    }


def test_a_new_chapter_and_a_dropped_one_are_both_named():
    old = _syllabus([("Number systems", ["Real numbers"]), ("Algebra", ["Polynomials"])])
    new = _syllabus([("Number systems", ["Real numbers"]), ("Trigonometry", ["Ratios"])])
    diff = freshness.diff_syllabi(old, new)
    assert diff.added_units == ("Trigonometry",)
    assert diff.removed_units == ("Algebra",)


def test_a_retitled_chapter_reads_as_a_rename_not_a_deletion():
    old = _syllabus([("Algebra", ["Polynomials", "Equations"])])
    new = _syllabus([("Algebra and functions", ["Polynomials", "Equations"])])
    diff = freshness.diff_syllabi(old, new)
    assert diff.renamed_units == (("Algebra", "Algebra and functions"),)
    assert not diff.added_units and not diff.removed_units


def test_a_reordered_chapter_reports_where_it_went():
    old = _syllabus([("A", ["a"]), ("B", ["b"]), ("C", ["c"])])
    new = _syllabus([("A", ["a"]), ("C", ["c"]), ("B", ["b"])])
    diff = freshness.diff_syllabi(old, new)
    assert set(diff.moved_units) == {("C", 3, 2), ("B", 2, 3)}


def test_topics_inside_a_kept_chapter_are_diffed_too():
    old = _syllabus([("Algebra", ["Polynomials"])])
    new = _syllabus([("Algebra", ["Polynomials", "Quadratic equations"])])
    diff = freshness.diff_syllabi(old, new)
    assert diff.added_topics == (("Algebra", "Quadratic equations"),)
    assert diff.removed_topics == ()


def test_an_identical_syllabus_has_nothing_to_say():
    old = _syllabus([("Algebra", ["Polynomials"])])
    assert freshness.diff_syllabi(old, old).empty
    assert freshness.summarise(freshness.diff_syllabi(old, old)) == ()


def test_the_summary_is_one_plain_line_per_change():
    old = _syllabus([("A", ["a"]), ("B", ["b"])])
    new = _syllabus([("A", ["a", "a2"]), ("C", ["c"])])
    lines = freshness.summarise(freshness.diff_syllabi(old, new), version="2027-28")
    assert "C is new in 2027-28." in lines
    assert "B is no longer in your syllabus." in lines
    assert "A has a new topic, a2." in lines
    for line in lines:
        assert "!" not in line and line.endswith(".")
        assert not re.search(r"[\U0001F300-\U0001FAFF☀-➿]", line)


def test_a_long_diff_is_capped_rather_than_becoming_a_changelog():
    old = _syllabus([(f"Unit {index}", ["x"]) for index in range(20)])
    new = _syllabus([(f"Chapter {index}", ["x"]) for index in range(20)])
    lines = freshness.summarise(freshness.diff_syllabi(old, new))
    assert len(lines) == freshness.MAX_SUMMARY_LINES + 1
    assert lines[-1].startswith("There are")


# --- the run ------------------------------------------------------------------------------


def test_an_unchanged_document_publishes_nothing():
    store, record = stored_record()
    outcome = freshness.run_freshness_check(
        record,
        store=store,
        fetch_fn=fetch_same,
    )
    assert not outcome.changed and outcome.reason == "unchanged"
    assert outcome.new_record is None
    assert len(store.all()) == 1


def test_a_document_that_has_gone_says_so_and_keeps_the_old_version():
    store, record = stored_record()

    def gone(url, **kwargs):
        raise FetchRefused("http_error", "404")

    outcome = freshness.run_freshness_check(record, store=store, fetch_fn=gone)
    assert not outcome.changed and outcome.reason.startswith("unreachable:")
    assert store.get(record.key).status == "provisional"


def test_a_changed_document_becomes_a_new_version_that_supersedes_the_old_one():
    store, record = stored_record()
    document = fetch_next(CBSE_URL)
    outcome = freshness.run_freshness_check(
        record,
        store=store,
        fetch_fn=fetch_next,
        complete_generate=stub_completion(json.dumps(next_year_extraction(document))),
        complete_verify=stub_completion(AGREES),
    )
    assert outcome.changed and outcome.reason == "new_version"
    new_record = outcome.new_record
    assert new_record is not None and new_record.state is JobState.PROVISIONAL
    assert new_record.key != record.key
    assert new_record.supersedes == record.key
    assert new_record.syllabus["supersedes"] == record.key
    assert new_record.syllabus["version"] == "2027-28"
    assert len(new_record.syllabus["units"]) == 5

    # The old version is untouched — the learners pinned to it keep reading it.
    old = store.get(record.key)
    assert old.status == "provisional" and len(old.syllabus["units"]) == 4
    assert old.syllabus["version"] == "2026-27"

    # And Wobo has something to say about what moved.
    assert outcome.summary and any("TRIGONOMETRY" in line for line in outcome.summary)
    assert all(line.endswith(".") and "!" not in line for line in outcome.summary)
    assert [state for state, _ in new_record.history][:2] == ["queued", "fetching"], (
        "a document we already know the url of is not searched for again"
    )


def test_a_new_document_we_cannot_read_does_not_replace_the_old_one():
    store, record = stored_record()
    outcome = freshness.run_freshness_check(
        record,
        store=store,
        fetch_fn=fetch_next,
        complete_generate=stub_completion(json.dumps({"units": []})),
        complete_verify=stub_completion(AGREES),
    )
    assert outcome.changed and outcome.reason.startswith("refused:")
    assert outcome.new_record.status == "refused"
    assert store.get(record.key).status == "provisional"


def test_housekeeping_is_metered_but_never_on_a_learners_day():
    from wobo_gateway import budget as budget_meter

    store, record = stored_record()
    before = budget_meter.snapshot("learner-a").generations_remaining
    document = fetch_next(CBSE_URL)
    freshness.run_freshness_check(
        record,
        store=store,
        fetch_fn=fetch_next,
        complete_generate=stub_completion(json.dumps(next_year_extraction(document))),
        complete_verify=stub_completion(AGREES),
    )
    assert budget_meter.snapshot("learner-a").generations_remaining == before
    system = budget_meter.snapshot(freshness.SYSTEM_SUBJECT).generations_remaining
    assert system == budget_meter.limits_for("free")[budget_meter.GENERATION] - 1


@pytest.mark.parametrize("country", ["IN", "GB", "US", "ZZ"])
def test_every_country_has_a_release_window_even_if_it_is_the_default(country: str):
    assert freshness.release_months(country)
