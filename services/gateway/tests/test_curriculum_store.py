"""The registry itself: the seed loader, type-ahead ranking, the in-memory store, and every
query string :class:`PostgrestStore` builds — driven against a fake instead of a network.

CURRICULUM.md §3 (registry and search), §4 (the discovery state machine), §10 (storage).
"""

from __future__ import annotations

import json
import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from wobo_gateway.curriculum import store as store_mod
from wobo_gateway.curriculum.models import (
    DiscoveryJob,
    Framework,
    FrameworkKind,
    JobState,
    Node,
    NodeKind,
    Overlay,
    Status,
    Version,
    in_scope,
    level_order,
)
from wobo_gateway.curriculum.store import (
    InMemoryStore,
    PostgrestStore,
    Seed,
    StoreUnavailable,
    load_seed,
    match_rank,
    rank,
    seed_id,
)

# --- fixture data ---------------------------------------------------------------------------


def framework(ident: str = "cbse", **kwargs: Any) -> Framework:
    defaults: dict[str, Any] = {
        "name": "Central Board of Secondary Education",
        "kind": FrameworkKind.NATIONAL,
        "status": Status.VERIFIED,
        "aliases": ("CBSE", "CBSE board"),
        "country": "IN",
        "levels": ("Class 9", "Class 10"),
    }
    defaults.update(kwargs)
    return Framework(id=ident, **defaults)


def tiny_seed() -> Seed:
    """One board, one version, one level, one subject, two units, two topics."""
    version = Version(
        id="v1",
        framework_id="cbse",
        label="2026-27",
        status=Status.VERIFIED,
        published_at="2026-01-01T00:00:00Z",
    )
    nodes = [
        Node(id="lvl", version_id="v1", kind=NodeKind.LEVEL, name="Class 9", order=9),
        Node(id="sub", version_id="v1", kind=NodeKind.SUBJECT, name="Science", parent_id="lvl"),
        Node(id="u1", version_id="v1", kind=NodeKind.UNIT, name="Matter", parent_id="sub", order=0),
        Node(id="u2", version_id="v1", kind=NodeKind.UNIT, name="Motion", parent_id="sub", order=1),
        Node(id="t1", version_id="v1", kind=NodeKind.TOPIC, name="Atoms", parent_id="u1", order=0),
        Node(
            id="o1",
            version_id="v1",
            kind=NodeKind.OBJECTIVE,
            name="Describe an atom",
            parent_id="t1",
        ),
    ]
    return Seed(frameworks=[framework()], versions=[version], nodes=nodes)


@pytest.fixture
def store() -> InMemoryStore:
    return InMemoryStore(tiny_seed())


# --- scope (§11: grades 4 to 13, school level only) -------------------------------------------
@pytest.mark.parametrize(
    "name,order",
    [
        ("Class 9", 9),
        ("Grade 10", 10),
        ("Year 11", 11),
        ("Class IX", 9),
        ("IGCSE", None),
        ("", None),
    ],
)
def test_level_order_reads_the_number(name: str, order: int | None) -> None:
    assert level_order(name) == order


def test_levels_outside_the_band_are_dropped_and_unnumbered_ones_kept() -> None:
    assert in_scope("Class 4") and in_scope("Class 13")
    assert not in_scope("Class 3") and not in_scope("Grade 14")
    assert in_scope("IGCSE")  # no number to judge, so we keep it rather than guess
    built = Framework.from_row(
        {"id": "x", "name": "X", "levels": ["Class 1", "Class 5", "IB DP", "Class 14"]}
    )
    assert built.levels == ("Class 5", "IB DP")


# --- the seed loader (tolerant, and loud about what it skipped) -------------------------------
def test_load_seed_tolerates_missing_extra_and_malformed_entries(tmp_path: Path) -> None:
    (tmp_path / "frameworks.seed.json").write_text(
        json.dumps(
            {
                "schema_version": "9.9.9",  # a field we do not know about
                "frameworks": [
                    {"id": "a", "name": "Board A", "unknown_field": 1, "levels": ["Class 9"]},
                    {"id": "b"},  # no name: skipped
                    {"name": "no id"},  # no id: skipped
                    "not a dict",  # skipped
                    {"id": "a", "name": "duplicate"},  # already seen: skipped
                    {"id": "c", "name": "Board C", "kind": "martian", "status": "gold"},
                ],
            }
        )
    )
    seed = load_seed(tmp_path)
    assert [f.id for f in seed.frameworks] == ["a", "c"]
    assert seed.skipped_frameworks == 4
    # An unrecognised kind and status fall to the values that claim the least, never to verified.
    assert seed.frameworks[1].kind is FrameworkKind.OPEN
    assert seed.frameworks[1].status is Status.PROVISIONAL


def test_load_seed_accepts_a_bare_list_and_a_missing_file(tmp_path: Path) -> None:
    assert load_seed(tmp_path).frameworks == []  # no file at all: empty, not an exception
    (tmp_path / "frameworks.seed.json").write_text(json.dumps([{"id": "a", "name": "A"}]))
    assert [f.id for f in load_seed(tmp_path).frameworks] == ["a"]


def test_load_seed_builds_nodes_from_a_stored_syllabus(tmp_path: Path) -> None:
    (tmp_path / "frameworks.seed.json").write_text(
        json.dumps({"frameworks": [{"id": "cisce", "name": "CISCE", "aliases": ["ICSE"]}]})
    )
    directory = tmp_path / "syllabi" / "icse"
    directory.mkdir(parents=True)
    (directory / "class-9-physics.json").write_text(
        json.dumps(
            {
                # The syllabus names the board by its common name; the registry knows it as CISCE.
                "framework_id": "icse",
                "version": "2026-27",
                "level": "Class 9",
                "subject": "Physics",
                "status": "verified",
                "documents": [
                    {
                        "url": "https://example.invalid/syllabus.pdf",
                        "fetched_at": "2026-01-01T00:00:00Z",
                        "document_sha256": "abc",
                    }
                ],
                "units": [
                    {
                        "title": "Force",
                        "source_ref": {"page": 4, "section": "Unit 1"},
                        "topics": [
                            {"title": "Turning forces", "objectives": ["Explain a moment"]},
                            {"title": ""},  # malformed: skipped, counted
                        ],
                    },
                    "not a unit",
                ],
            }
        )
    )
    seed = load_seed(tmp_path)
    assert [v.framework_id for v in seed.versions] == ["cisce"]
    names = {(n.kind.value, n.name) for n in seed.nodes}
    assert ("unit", "Force") in names
    assert ("topic", "Turning forces") in names
    assert ("objective", "Explain a moment") in names
    assert seed.skipped_nodes == 2
    # A seeded syllabus ships published, so §2's immutability applies to it from the first read.
    assert seed.versions[0].published


def _blocked_seed(tmp_path: Path, document: dict[str, Any]) -> Any:
    (tmp_path / "frameworks.seed.json").write_text(
        json.dumps({"frameworks": [{"id": "telangana", "name": "Telangana SCERT"}]})
    )
    directory = tmp_path / "syllabi" / "telangana"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "class-9-science.json").write_text(json.dumps(document))
    return load_seed(tmp_path)


BLOCKED_FILE = {
    "framework_id": "telangana",
    "version": "2026-27",
    "level": "Class 9",
    "subject": "Science",
    "status": "provisional",
    "discovery_state": "blocked",
    "blocker": "browser_required",
    "documents": [],
    "units": None,
    "note": "The board's portal will not serve a plain fetch, so no unit list is recorded here.",
}


def test_a_stored_negative_result_is_counted_as_blocked_and_never_as_skipped(
    tmp_path: Path,
) -> None:
    """§4.6: 'we looked and found nothing official' is an answer we store on purpose.

    Counting it as a skipped file would make the loader's own alarm fire on a healthy seed, and
    would hide a genuinely half-read file among 71 deliberate ones.
    """
    seed = _blocked_seed(tmp_path, BLOCKED_FILE)
    assert seed.blocked_syllabi == 1
    assert seed.skipped == 0


def test_a_blocked_file_mints_no_version_and_no_node(tmp_path: Path) -> None:
    """Nothing to pin a learner to, and no chapter to show. §12: never a plausible fabrication."""
    seed = _blocked_seed(tmp_path, BLOCKED_FILE)
    assert seed.versions == []
    assert seed.nodes == []


def test_no_chapters_and_no_reason_is_still_a_skipped_file(tmp_path: Path) -> None:
    """A truncated write must not hide behind the blocked path: the blocker code is the proof."""
    for missing in ("discovery_state", "blocker"):
        document = {k: v for k, v in BLOCKED_FILE.items() if k != missing}
        seed = _blocked_seed(tmp_path, document)
        assert seed.blocked_syllabi == 0, missing
        assert seed.skipped_syllabi == 1, missing


def test_a_file_with_real_chapters_is_never_read_as_blocked(tmp_path: Path) -> None:
    """`units: []` is not the same claim as `units: null`, and neither is a filled list."""
    document = {**BLOCKED_FILE, "units": [{"title": "Matter around us"}]}
    seed = _blocked_seed(tmp_path, document)
    assert seed.blocked_syllabi == 0
    assert {n.name for n in seed.nodes} >= {"Class 9", "Science", "Matter around us"}


def test_every_seeded_node_carries_a_source(tmp_path: Path) -> None:
    """§12: 'a syllabus with no source' is what kills this. Provenance is not optional."""
    seed = load_seed()
    if not seed.nodes:  # the seed is another worker's file; skip rather than fail on its absence
        pytest.skip("no curriculum seed in this checkout")
    provenance = {(p.version_id, p.node_id) for p in seed.provenance}
    assert all((node.version_id, node.id) in provenance for node in seed.nodes)


def test_the_real_seed_loads_without_skipping_anything() -> None:
    seed = load_seed()
    if not seed.frameworks:
        pytest.skip("no curriculum seed in this checkout")
    assert seed.skipped == 0
    assert len(seed.frameworks) > 100  # §3 asks for the world, not a shortlist


def test_seed_ids_are_stable_across_loads() -> None:
    assert seed_id("version", "cbse", "2026-27") == seed_id("version", "cbse", "2026-27")
    assert seed_id("version", "cbse", "2026-27") != seed_id("version", "cbse", "2027-28")


# --- type-ahead (§3) ---------------------------------------------------------------------------
def test_match_rank_prefers_exact_then_prefix_then_substring() -> None:
    board = framework()
    assert match_rank(board, "Central Board of Secondary Education") == 0
    assert match_rank(board, "cbse") == 0  # an exact alias is an exact match
    assert match_rank(board, "central") == 1
    assert match_rank(board, "secondary") == 3
    assert match_rank(board, "quantum chromodynamics") is None


def test_every_typed_word_can_match_across_the_haystack() -> None:
    # Not contiguous anywhere, but every word is in there: "central … education".
    assert match_rank(framework(), "central education") == 5


def test_country_hint_breaks_ties_but_never_filters() -> None:
    india = framework("a", name="Alpha board", aliases=(), country="IN")
    kenya = framework("b", name="Alpha board", aliases=(), country="KE")
    assert [f.id for f in rank([kenya, india], "alpha", country="IN")] == ["a", "b"]
    # The hint does not hide the other one — §3 asks for a hint, not a filter.
    assert len(rank([kenya, india], "alpha", country="IN")) == 2


def test_search_honours_the_limit(store: InMemoryStore) -> None:
    assert len(store.search_frameworks("board", limit=1)) <= 1


# --- visibility mirrors RLS --------------------------------------------------------------------
def test_a_personal_framework_is_visible_only_to_its_owner() -> None:
    mine = Framework(
        id="own-1",
        name="My school syllabus",
        kind=FrameworkKind.PERSONAL,
        status=Status.PERSONAL,
        owner_subject="learner-1",
    )
    store = InMemoryStore(Seed(frameworks=[framework(), mine]))
    assert store.get_framework("own-1", subject="learner-1") is not None
    assert store.get_framework("own-1", subject="learner-2") is None
    assert store.get_framework("own-1") is None
    assert [f.id for f in store.search_frameworks("my school", subject="learner-2")] == []
    assert [f.id for f in store.search_frameworks("my school", subject="learner-1")] == ["own-1"]


# --- the tree ------------------------------------------------------------------------------------
def test_children_are_returned_in_the_frameworks_own_order(store: InMemoryStore) -> None:
    units = store.children("v1", "sub", kind=NodeKind.UNIT)
    assert [u.name for u in units] == ["Matter", "Motion"]


def test_children_filters_by_kind(store: InMemoryStore) -> None:
    assert store.children("v1", "u1", kind=NodeKind.UNIT) == []
    assert [n.name for n in store.children("v1", "u1", kind=NodeKind.TOPIC)] == ["Atoms"]


# --- overlays and pins ----------------------------------------------------------------------------
def test_overlays_are_per_subject_and_per_version(store: InMemoryStore) -> None:
    store.put_overlay(Overlay(subject_id="s1", version_id="v1", patch=[{"op": "remove"}]))
    assert store.get_overlay("s1", "v1") is not None
    assert store.get_overlay("s2", "v1") is None
    assert store.get_overlay("s1", "v2") is None


def test_pins_are_per_subject_and_per_framework(store: InMemoryStore) -> None:
    store.put_pin("s1", "cbse", "v1")
    assert store.get_pin("s1", "cbse") == "v1"
    assert store.get_pin("s2", "cbse") is None


# --- discovery (§4, §12) --------------------------------------------------------------------------
def test_a_second_discovery_for_the_same_thing_returns_the_first(store: InMemoryStore) -> None:
    first = store.enqueue_discovery(
        query="cbse", framework_id="cbse", level="Class 9", subject="Science"
    )
    second = store.enqueue_discovery(
        query="cbse", framework_id="cbse", level="Class 9", subject="Science"
    )
    assert first.id == second.id  # §12: never a second discovery for one already running


def test_a_different_subject_gets_its_own_job(store: InMemoryStore) -> None:
    first = store.enqueue_discovery(query="cbse", framework_id="cbse", level="Class 9", subject="A")
    second = store.enqueue_discovery(
        query="cbse", framework_id="cbse", level="Class 9", subject="B"
    )
    assert first.id != second.id


def test_a_refusal_is_an_answer_and_stands_for_the_cooldown(store: InMemoryStore) -> None:
    """A finished job is an answer, not a gap. Re-asking inside the window would run the same
    paid search to reach the same refusal (§12, §4.4), so the answer is served instead."""
    first = store.enqueue_discovery(query="q", framework_id=None, level=None, subject=None)
    store.update_job(first.id, state=JobState.REFUSED, message="nothing official found")
    second = store.enqueue_discovery(query="q", framework_id=None, level=None, subject=None)
    assert second.id == first.id
    assert store.get_job(first.id).state is JobState.REFUSED


def test_a_refusal_older_than_the_cooldown_is_worth_asking_again(store: InMemoryStore) -> None:
    """Outside the window it is a new question: the board may have published since."""
    first = store.enqueue_discovery(query="q", framework_id=None, level=None, subject=None)
    store.update_job(first.id, state=JobState.REFUSED, message="nothing official found")
    stale = datetime.now(UTC) - timedelta(seconds=store_mod.DISCOVERY_COOLDOWN_S + 60)
    store.get_job(first.id).updated_at = stale.isoformat()
    store.get_job(first.id).created_at = stale.isoformat()
    second = store.enqueue_discovery(query="q", framework_id=None, level=None, subject=None)
    assert second.id != first.id


def test_one_syllabus_typed_four_ways_is_one_job(store: InMemoryStore) -> None:
    """§12: a second discovery for a syllabus already being looked for. Case and spacing are not
    four syllabi, and each job is a paid search, extraction and second reading."""
    ids = {
        store.enqueue_discovery(
            query="cbse", framework_id="cbse", level=level, subject=subject
        ).id
        for level, subject in [
            ("Class 9", "Mathematics"),
            ("class 9", "mathematics"),
            ("CLASS 9", " Mathematics "),
            ("Class  9", "Mathematics"),
        ]
    }
    assert len(ids) == 1


def test_eight_learners_at_once_start_one_job() -> None:
    """The find and the insert are one operation or they are not a dedupe."""
    fresh = InMemoryStore(Seed())
    original = fresh.find_open_job

    def slow(**kwargs):
        found = original(**kwargs)
        time.sleep(0.02)  # widens a window rather than creating one
        return found

    fresh.find_open_job = slow  # type: ignore[method-assign]
    seen: list[str] = []
    gate = threading.Barrier(8)

    def learner() -> None:
        gate.wait()
        seen.append(
            fresh.enqueue_discovery(
                query="tel", framework_id="tel", level="Class 9", subject="Mathematics"
            ).id
        )

    threads = [threading.Thread(target=learner) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(set(seen)) == 1


def test_job_open_states() -> None:
    for state in (JobState.QUEUED, JobState.SEARCHING, JobState.EXTRACTING, JobState.CHECKING):
        assert DiscoveryJob(id="1", query="q", state=state).open
    for state in (JobState.STORED, JobState.FAILED, JobState.REFUSED):
        assert not DiscoveryJob(id="1", query="q", state=state).open


# --- PostgREST ------------------------------------------------------------------------------------


class FakeRest:
    """A PostgREST that records what was asked of it and answers from a canned table map."""

    def __init__(self, tables: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.tables = tables or {}
        self.calls: list[tuple[str, str, dict[str, str], Any]] = []
        self.status = 200

    def __call__(
        self, method: str, url: str, headers: dict[str, str], body: bytes | None
    ) -> tuple[int, Any]:
        payload = json.loads(body.decode()) if body else None
        self.calls.append((method, url, headers, payload))
        if self.status >= 400:
            return self.status, None
        table = url.split("/rest/v1/")[1].split("?")[0]
        if method == "GET":
            return 200, self.tables.get(table, [])
        # A write echoes what it was sent, which is what `return=representation` does.
        rows = payload if isinstance(payload, list) else [payload]
        return 200, rows

    @property
    def last_url(self) -> str:
        return self.calls[-1][1]

    def urls(self) -> list[str]:
        return [call[1] for call in self.calls]


def pg(tables: dict[str, list[dict[str, Any]]] | None = None) -> tuple[PostgrestStore, FakeRest]:
    fake = FakeRest(tables)
    return PostgrestStore("https://project.invalid", "service-role-key", transport=fake), fake


def test_reads_carry_the_curriculum_schema_and_the_service_key() -> None:
    store, fake = pg({"frameworks": []})
    store.get_framework("cbse")
    _, _, headers, _ = fake.calls[-1]
    # Without Accept-Profile every read lands in `public` — an empty registry, silently.
    assert headers["Accept-Profile"] == "curriculum"
    assert headers["apikey"] == "service-role-key"
    assert headers["Authorization"] == "Bearer service-role-key"


def test_writes_carry_the_content_profile_and_upsert() -> None:
    store, fake = pg()
    store.put_overlay(Overlay(subject_id="s1", version_id="v1", patch=[{"op": "remove"}]))
    method, url, headers, payload = fake.calls[-1]
    assert method == "POST"
    assert headers["Content-Profile"] == "curriculum"
    assert "resolution=merge-duplicates" in headers["Prefer"]
    assert "on_conflict=subject_id%2Cversion_id" in url
    assert payload[0]["subject_id"] == "s1"


def test_search_filters_on_the_generated_column_and_hides_other_learners_rows() -> None:
    store, fake = pg({"frameworks": []})
    store.search_frameworks("cbse", subject="learner-1")
    url = fake.last_url
    assert "search_text=ilike." in url
    assert "owner_subject_id.is.null" in url
    assert "learner-1" in url


def test_search_flattens_wildcards_a_learner_types() -> None:
    store, fake = pg({"frameworks": []})
    store.search_frameworks("c%b*s_e")
    assert "%25" not in fake.last_url.split("search_text=")[1].split("&")[0].replace("*", "")


def test_search_without_a_subject_reads_public_rows_only() -> None:
    store, fake = pg({"frameworks": []})
    store.search_frameworks("cbse")
    assert "owner_subject_id=is.null" in fake.last_url


def test_children_asks_for_a_null_parent_correctly() -> None:
    store, fake = pg({"nodes": []})
    store.children("v1", None, kind=NodeKind.LEVEL)
    assert "parent_id=is.null" in fake.last_url
    assert "kind=eq.level" in fake.last_url
    store.children("v1", "lvl")
    assert "parent_id=eq.lvl" in fake.last_url


def test_a_malformed_row_is_skipped_rather_than_crashing_the_read() -> None:
    store, _ = pg(
        {
            "frameworks": [
                {"id": "a", "name": "Board A"},
                {"id": "b"},  # no name
                {"nonsense": True},
            ]
        }
    )
    assert [f.id for f in store.search_frameworks("board")] == ["a"]


def test_a_failed_read_is_empty_not_a_crash() -> None:
    store, fake = pg({"frameworks": []})
    fake.status = 500
    assert store.search_frameworks("cbse") == []


def test_a_failed_write_is_reported_not_swallowed() -> None:
    store, fake = pg()
    fake.status = 500
    with pytest.raises(StoreUnavailable):
        store.put_pin("s1", "cbse", "v1")


def test_a_lost_enqueue_race_returns_the_job_that_won() -> None:
    """The partial unique index in 0008 refuses the second insert. That is the law working."""
    running = {
        "id": "job-1",
        "query": "cbse",
        "state": "queued",
        "framework_id": "cbse",
        "level": "Class 9",
        "subject": "Science",
    }

    class Racy(FakeRest):
        def __init__(self) -> None:
            super().__init__({"discovery_jobs": []})
            self.wrote = False

        def __call__(self, method, url, headers, body):  # type: ignore[no-untyped-def]
            if method == "POST":
                self.wrote = True
                self.tables["discovery_jobs"] = [running]
                return 409, None
            return super().__call__(method, url, headers, body)

    fake = Racy()
    store = PostgrestStore("https://project.invalid", "key", transport=fake)
    job = store.enqueue_discovery(
        query="cbse", framework_id="cbse", level="Class 9", subject="Science"
    )
    assert fake.wrote and job.id == "job-1"


def test_build_store_falls_back_to_the_seed_without_a_project(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("CURRICULUM_STORE", raising=False)
    assert isinstance(store_mod.build_store(), InMemoryStore)


def test_build_store_uses_postgrest_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "key")
    monkeypatch.delenv("CURRICULUM_STORE", raising=False)
    assert isinstance(store_mod.build_store(), PostgrestStore)


def test_memory_is_forced_even_with_a_project(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "key")
    monkeypatch.setenv("CURRICULUM_STORE", "memory")
    assert isinstance(store_mod.build_store(), InMemoryStore)


# --- a learner's own syllabus between the paste and the tap (§6) --------------------------------
def _personal(owner: str, framework_id: str = "p1") -> dict[str, Any]:
    return {
        "framework": {"id": framework_id, "name": "My scheme", "owner": owner},
        "units": [{"id": "u1", "name": "Number systems", "confirmed": False}],
    }


def test_a_draft_is_only_visible_to_the_learner_who_pasted_it() -> None:
    store = InMemoryStore(Seed())
    store.put_personal("learner-a", _personal("learner-a"))
    assert store.get_personal("learner-a", "p1") is not None
    assert store.get_personal("learner-b", "p1") is None, "an id is not a capability"
    assert store.list_personal("learner-b") == []


def test_a_draft_is_copied_in_and_out_so_a_caller_cannot_reach_into_the_store() -> None:
    """§2's immutability, enforced at the boundary: confirm and publish return NEW frameworks."""
    store = InMemoryStore(Seed())
    original = _personal("learner-a")
    store.put_personal("learner-a", original)
    original["units"][0]["confirmed"] = True  # mutating what we handed in must change nothing
    handed = store.get_personal("learner-a", "p1")
    assert handed is not None
    assert handed["units"][0]["confirmed"] is False
    handed["units"][0]["name"] = "Rewritten"  # nor must mutating what we were handed
    assert store.get_personal("learner-a", "p1")["units"][0]["name"] == "Number systems"


def test_a_learner_who_keeps_pasting_cannot_fill_the_process() -> None:
    store = InMemoryStore(Seed())
    for i in range(30):
        store.put_personal("learner-a", _personal("learner-a", f"p{i}"))
    assert len(store.list_personal("learner-a")) <= InMemoryStore._MAX_PER_LEARNER
    assert store.get_personal("learner-a", "p29") is not None, "the newest draft is never dropped"


def test_a_draft_with_no_owner_or_no_id_is_refused() -> None:
    store = InMemoryStore(Seed())
    with pytest.raises(ValueError):
        store.put_personal("", _personal("learner-a"))
    with pytest.raises(ValueError):
        store.put_personal("learner-a", {"framework": {}})
