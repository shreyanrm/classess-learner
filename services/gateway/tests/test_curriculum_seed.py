"""The seed registry: the file, the loader, and the coverage the product promises.

``content/curriculum/frameworks.seed.json`` is the top of the ontology (CURRICULUM.md §2)
and the thing a learner searches on the first screen (§3). It is data, not code, which is
exactly why it needs a test: nothing else fails when a hand edit collides two aliases,
drops Manipur, or quietly marks an entry verified that was never checked.

Four things are held here.

1. **The file is structurally valid.** Run against ``build.py``'s own validator, so the
   test and the builder cannot drift into disagreeing about what valid means.
2. **Search cannot become ambiguous.** Ids unique, and every name and alias unique across
   the whole registry, because type-ahead resolves a typed string to exactly one board.
3. **The coverage the mandate names is actually there.** Every Indian state and union
   territory, every US state, every Canadian province, every Australian state, and the
   international programmes by id.
4. **``verified`` means what §5 says.** A confirmed site check on the recorded date, and
   nothing more. Reaching the network here would make the suite depend on 268 third-party
   sites, so the resolvability check is driven against a stub; ``build.py`` is what does
   it for real.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTENT = REPO_ROOT / "content" / "curriculum"
SEED_FILE = CONTENT / "frameworks.seed.json"


def _module(name: str, path: Path) -> Any:
    """Import a standalone file from ``content/curriculum``.

    That directory is data plus two standalone scripts, deliberately not a package (see the
    workspace note in the root ``pyproject.toml``), so there is no import path to it. Loading
    by file keeps it that way rather than making it a package just to be testable.
    """
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:  # pragma: no cover - a missing file is the real error
        pytest.fail(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


loader = _module("wobo_curriculum_loader", CONTENT / "loader.py")
build = _module("wobo_curriculum_build", CONTENT / "build.py")


@pytest.fixture(scope="module")
def raw() -> dict[str, Any]:
    return json.loads(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def rows(raw: dict[str, Any]) -> list[dict[str, Any]]:
    return raw["frameworks"]


@pytest.fixture(scope="module")
def frameworks() -> list[Any]:
    return loader.load_seed()


def fold(text: str) -> str:
    return " ".join(text.split()).casefold()


def ids(frameworks: list[Any]) -> set[str]:
    return {f.id for f in frameworks}


def regions(frameworks: list[Any], country: str) -> set[str]:
    return {f.region for f in frameworks if f.country == country and f.region}


# --------------------------------------------------------------------------- the file


def test_seed_file_exists_and_is_a_document(raw: dict[str, Any]) -> None:
    assert raw["schema_version"]
    assert isinstance(raw["frameworks"], list)


def test_build_validator_finds_no_errors(rows: list[dict[str, Any]]) -> None:
    """The builder's own validator, so this test and the build agree on what valid means."""
    errors, _warnings = build.validate(rows)
    assert errors == [], "\n".join(errors)


def test_the_only_warnings_are_entries_with_no_site(rows: list[dict[str, Any]]) -> None:
    """A warning is allowed, but only the honest one: an entry we deliberately gave no site.

    §12 — an entry pointing at a domain that lapsed into someone else's hands is worse than
    an entry pointing nowhere. Any *other* warning appearing here is a regression.
    """
    _errors, warnings = build.validate(rows)
    unexpected = [w for w in warnings if "no official site on record" not in w]
    assert unexpected == [], "\n".join(unexpected)


def test_every_entry_without_a_site_says_why(rows: list[dict[str, Any]]) -> None:
    for row in rows:
        if not row.get("official_site"):
            assert row.get("note"), f"{row['id']} has no site and no note explaining it"


# ------------------------------------------------------------------------ uniqueness


def test_ids_are_unique(rows: list[dict[str, Any]]) -> None:
    seen: dict[str, int] = {}
    for index, row in enumerate(rows):
        assert row["id"] not in seen, (
            f"duplicate id {row['id']!r} at entries {seen.get(row['id'])} and {index}"
        )
        seen[row["id"]] = index


def test_ids_are_slugs(frameworks: list[Any]) -> None:
    for framework in frameworks:
        assert build.ID_RE.match(framework.id), f"{framework.id!r} is not a slug"


def test_aliases_are_unique_across_the_whole_registry(rows: list[dict[str, Any]]) -> None:
    """Type-ahead resolves a typed string to one board. Two boards claiming "State Board"
    would make that impossible, so the collision is caught here rather than in a learner's
    onboarding."""
    owner: dict[str, str] = {}
    collisions = []
    for row in rows:
        for alias in row["aliases"]:
            key = fold(alias)
            if key in owner and owner[key] != row["id"]:
                collisions.append(f"{alias!r} claimed by both {owner[key]} and {row['id']}")
            owner[key] = row["id"]
    assert collisions == [], "\n".join(collisions)


def test_a_name_never_collides_with_another_entrys_alias(rows: list[dict[str, Any]]) -> None:
    """Names are searched alongside aliases, so a name colliding with an alias is the same
    ambiguity by another route."""
    alias_owner = {fold(a): row["id"] for row in rows for a in row["aliases"]}
    collisions = [
        f"{row['name']!r} (name of {row['id']}) is an alias of {alias_owner[fold(row['name'])]}"
        for row in rows
        if fold(row["name"]) in alias_owner and alias_owner[fold(row["name"])] != row["id"]
    ]
    assert collisions == [], "\n".join(collisions)


def test_every_entry_has_at_least_one_alias(frameworks: list[Any]) -> None:
    """A learner types "CBSE", never "Central Board of Secondary Education"."""
    for framework in frameworks:
        assert framework.aliases, f"{framework.id} is unreachable by anything but its full name"


# ------------------------------------------------------------------------- coverage

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
]
INDIAN_UNION_TERRITORIES = [
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry",
]
US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
    "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington", "West Virginia", "Wisconsin", "Wyoming",
]
CANADIAN_PROVINCES = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut",
    "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
]
AUSTRALIAN_STATES = [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
    "South Australia", "Tasmania", "Victoria", "Western Australia",
]


@pytest.mark.parametrize("state", INDIAN_STATES)
def test_every_indian_state_has_a_board(frameworks: list[Any], state: str) -> None:
    assert state in regions(frameworks, "IN"), f"no board for {state}"


@pytest.mark.parametrize("territory", INDIAN_UNION_TERRITORIES)
def test_every_indian_union_territory_has_an_entry(frameworks: list[Any], territory: str) -> None:
    """A territory with no board of its own still gets an entry, with a note saying whose
    syllabus its schools follow. Searchable beats absent (§12: refusing beats inventing,
    but so does saying "these schools sit with CBSE")."""
    assert territory in regions(frameworks, "IN"), f"no entry for {territory}"


@pytest.mark.parametrize("board", ["cbse", "icse", "isc", "nios", "ncert-ncf"])
def test_the_indian_national_boards_are_present(frameworks: list[Any], board: str) -> None:
    assert board in ids(frameworks)


@pytest.mark.parametrize("state", US_STATES)
def test_every_us_state_has_a_standards_body(frameworks: list[Any], state: str) -> None:
    assert state in regions(frameworks, "US"), f"no standards body for {state}"


def test_the_district_of_columbia_and_the_us_territories_are_present(
    frameworks: list[Any],
) -> None:
    present = regions(frameworks, "US")
    for region in [
        "District of Columbia", "American Samoa", "Guam", "Northern Mariana Islands",
        "Puerto Rico", "US Virgin Islands",
    ]:
        assert region in present, f"no entry for {region}"


@pytest.mark.parametrize("province", CANADIAN_PROVINCES)
def test_every_canadian_province_and_territory_is_present(
    frameworks: list[Any], province: str
) -> None:
    assert province in regions(frameworks, "CA")


@pytest.mark.parametrize("state", AUSTRALIAN_STATES)
def test_every_australian_state_and_territory_is_present(
    frameworks: list[Any], state: str
) -> None:
    assert state in regions(frameworks, "AU")


def test_acara_sits_above_the_australian_states(frameworks: list[Any]) -> None:
    assert "acara-australian-curriculum" in ids(frameworks)


@pytest.mark.parametrize(
    "programme",
    [
        "ib-pyp", "ib-myp", "ib-dp",
        "cambridge-primary", "cambridge-lower-secondary", "cambridge-igcse",
        "cambridge-o-level", "cambridge-international-as-a-level",
        "pearson-edexcel-international-gcse", "pearson-edexcel-international-a-level",
        "college-board-ap",
    ],
)
def test_the_international_programmes_are_present(frameworks: list[Any], programme: str) -> None:
    assert programme in ids(frameworks)


@pytest.mark.parametrize(
    "curriculum",
    ["england-national-curriculum", "curriculum-for-excellence", "curriculum-for-wales", "ccea"],
)
def test_the_four_uk_curricula_are_present(frameworks: list[Any], curriculum: str) -> None:
    assert curriculum in ids(frameworks)


@pytest.mark.parametrize(
    "framework",
    ["singapore-moe", "hong-kong-edb", "south-africa-caps", "south-africa-ieb", "uae-moe"],
)
def test_the_named_national_frameworks_are_present(frameworks: list[Any], framework: str) -> None:
    assert framework in ids(frameworks)


@pytest.mark.parametrize("country", ["AE", "SA", "KW", "QA", "BH", "OM"])
def test_every_gcc_ministry_is_present(frameworks: list[Any], country: str) -> None:
    """The six the mandate names, because Indian families abroad live under them."""
    assert any(f.country == country and f.kind == "national" for f in frameworks)


def test_homeschool_and_online_programmes_are_carried(frameworks: list[Any]) -> None:
    homeschool = [f for f in frameworks if f.kind == "homeschool"]
    online = [f for f in frameworks if f.kind == "online"]
    assert len(homeschool) >= 10, "the homeschool programmes families name are thin"
    assert len(online) >= 5


def test_the_registry_is_the_size_the_mandate_asks_for(frameworks: list[Any]) -> None:
    assert len(frameworks) >= 250


def test_the_counts_header_matches_the_entries(raw: dict[str, Any]) -> None:
    """The header is written by ``build.py``. If it disagrees with the list, someone hand
    edited an entry and did not re-run the build."""
    assert raw["counts"] == build.summarise(raw["frameworks"])


# ------------------------------------------------------------------------ the levels


def test_every_entry_names_levels_inside_grades_4_to_13(frameworks: list[Any]) -> None:
    """§11. The loader filters, so anything surviving into a ``Framework`` is in scope."""
    for framework in frameworks:
        assert framework.levels, f"{framework.id} names no level in scope"
        for level in framework.levels:
            assert loader.in_scope(level), f"{framework.id}: {level!r} is out of scope"


def test_levels_keep_the_frameworks_own_vocabulary(frameworks: list[Any]) -> None:
    """A learner in Scotland picks "S3" and one in India picks "Class 9". We do not translate
    a board's own words into grade numbers."""
    by_id = {f.id: f for f in frameworks}
    assert "Class 9" in by_id["cbse"].levels
    assert any(level.startswith("Year") for level in by_id["england-national-curriculum"].levels)


def test_the_loader_drops_an_out_of_scope_grade_and_keeps_an_unnumbered_level() -> None:
    framework = loader.Framework.from_row(
        {
            "id": "x", "name": "X", "kind": "national",
            "levels": ["Grade 1", "Grade 4", "IGCSE", "Grade 15"],
        }
    )
    assert framework.levels == ("Grade 4", "IGCSE")


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Class 9", 9), ("Grade 10", 10), ("Year 11", 11), ("Class IX", 9),
        ("Standard 8", 8), ("Form 4", 4),
        # Not grade names. The digit counts from the start of a stage, not of school.
        ("IGCSE", None), ("S1", None), ("Secondary 1", None), ("MYP 1", None),
        ("JC2", None), ("DP Year 1", None), ("CP Year 2", None), ("P4", None),
        ("PYP Grade 4", None), ("A Level", None),
    ],
)
def test_level_order_reads_a_grade_only_out_of_a_grade_name(
    name: str, expected: int | None
) -> None:
    assert loader.level_order(name) == expected


@pytest.mark.parametrize(
    "level",
    ["S1", "Secondary 1", "MYP 1", "JC1", "DP Year 1", "CP Year 1", "P4", "IGCSE"],
)
def test_a_stage_numbered_level_is_never_mistaken_for_grade_one(level: str) -> None:
    """The regression this whole rule exists for.

    Reading the leading digit as a grade put Singapore's Secondary 1, Scotland's S1, Hong
    Kong's S1, Quebec's Secondary 1, IB MYP 1 and both years of IB DP outside grades 4 to 13
    and dropped them — leaving a learner who picked IB DP with no level to choose at all.
    """
    assert loader.in_scope(level) is True


@pytest.mark.parametrize(
    "framework_id",
    [
        "ib-dp", "ib-cp", "ib-myp", "singapore-moe", "curriculum-for-excellence",
        "hong-kong-edb", "quebec-programme-de-formation", "ccea",
    ],
)
def test_the_stage_named_frameworks_keep_every_level_the_file_gives_them(
    frameworks: list[Any], rows: list[dict[str, Any]], framework_id: str
) -> None:
    """No level is silently lost between the file and the loader for these eight."""
    written = next(r for r in rows if r["id"] == framework_id)["levels"]
    loaded = next(f for f in frameworks if f.id == framework_id).levels
    assert list(loaded) == written


def test_northern_ireland_keeps_its_year_14(frameworks: list[Any]) -> None:
    """Northern Ireland numbers school years 1 to 14, one ahead of England, so its Year 14 is
    the same last year of school as England's Year 13 and is in scope."""
    ccea = next(f for f in frameworks if f.id == "ccea")
    assert "Year 14" in ccea.levels


def test_the_loader_and_the_builder_agree_on_the_grade_range() -> None:
    """Two range checks over one file. If they drift, the builder passes a file the loader
    then quietly strips."""
    assert (loader.LEVEL_MIN, loader.LEVEL_MAX) == (build.MIN_GRADE, build.MAX_GRADE)


# ------------------------------------------------------------------------ the loader


def test_load_seed_returns_frameworks(frameworks: list[Any]) -> None:
    assert isinstance(frameworks, list)
    assert all(isinstance(f, loader.Framework) for f in frameworks)


def test_load_seed_returns_every_row_in_file_order(
    frameworks: list[Any], rows: list[dict[str, Any]]
) -> None:
    assert [f.id for f in frameworks] == [r["id"] for r in rows]


def test_every_kind_is_one_the_ontology_names(frameworks: list[Any]) -> None:
    for framework in frameworks:
        assert framework.kind in loader.KINDS


def test_no_personal_framework_is_ever_seeded(frameworks: list[Any]) -> None:
    """§6 — a learner's own syllabus belongs to that learner and is stored per learner. One
    appearing in the shared seed would mean a learner's private syllabus went global."""
    assert [f.id for f in frameworks if f.kind == "personal"] == []


def test_a_country_is_an_iso_code_or_nothing(frameworks: list[Any]) -> None:
    for framework in frameworks:
        if framework.country is not None:
            assert len(framework.country) == 2 and framework.country.isupper()


def test_an_official_site_is_an_absolute_https_url(frameworks: list[Any]) -> None:
    for framework in frameworks:
        if framework.official_site:
            assert framework.official_site.startswith(("http://", "https://"))


def test_search_terms_lead_with_the_name_then_the_aliases(frameworks: list[Any]) -> None:
    cbse = next(f for f in frameworks if f.id == "cbse")
    assert cbse.search_terms[0] == cbse.name
    assert "CBSE" in cbse.search_terms


def test_the_alias_index_resolves_a_typed_string_to_one_board(frameworks: list[Any]) -> None:
    index = loader.alias_index(frameworks)
    assert index["cbse"] == "cbse"
    assert index["icse"] == "icse"
    # Every term in the file is unique, so the index never lost one to a collision.
    assert len(index) == sum(len(f.search_terms) for f in frameworks)


def test_as_dict_does_not_leak_the_site_check_into_the_product(frameworks: list[Any]) -> None:
    """``check`` is review material for whoever reads the file in a pull request. A learner
    is shown a label (§5), never a transport and an HTTP status."""
    payload = frameworks[0].as_dict()
    assert "check" not in payload
    assert "verified_site" not in payload


def test_a_row_with_no_id_or_no_name_is_refused() -> None:
    with pytest.raises(loader.SeedError):
        loader.Framework.from_row({"id": "", "name": "X", "kind": "national"})
    with pytest.raises(loader.SeedError):
        loader.Framework.from_row({"id": "x", "name": "", "kind": "national"})


def test_an_unknown_kind_is_refused() -> None:
    with pytest.raises(loader.SeedError):
        loader.Framework.from_row({"id": "x", "name": "X", "kind": "invented"})


def test_a_duplicate_id_is_fatal_not_skipped(tmp_path: Path) -> None:
    """Ids are written into learner records. Skipping the second one silently would make one
    learner's board become another's."""
    row = {
        "id": "dup", "name": "Dup", "kind": "national", "aliases": ["D"],
        "languages": ["en"], "levels": ["Class 9"],
    }
    (tmp_path / "frameworks.seed.json").write_text(
        json.dumps({"frameworks": [row, dict(row, name="Dup two")]}), encoding="utf-8"
    )
    with pytest.raises(loader.SeedError, match="duplicate framework id"):
        loader.load_seed(tmp_path)


def test_a_missing_seed_raises_rather_than_returning_nothing(tmp_path: Path) -> None:
    """A caller seeding a database from an empty list writes nothing and reports success."""
    with pytest.raises(loader.SeedError):
        loader.load_seed(tmp_path)


def test_a_seed_that_is_not_json_raises(tmp_path: Path) -> None:
    (tmp_path / "frameworks.seed.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(loader.SeedError):
        loader.load_seed(tmp_path)


def test_the_content_root_can_be_pointed_elsewhere(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "frameworks.seed.json").write_text(
        json.dumps(
            {
                "frameworks": [
                    {
                        "id": "only", "name": "Only", "kind": "national", "aliases": ["O"],
                        "languages": ["en"], "levels": ["Class 9"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("WOBO_CURRICULUM_CONTENT", str(tmp_path))
    assert [f.id for f in loader.load_seed()] == ["only"]


# ---------------------------------------------------------------- what verified means


def test_verified_is_never_inferred_from_a_status_string_alone() -> None:
    """§5. A row claiming verified without the check that says so is read down to
    provisional, which is the weaker of the two claims the row makes about itself."""
    framework = loader.Framework.from_row(
        {
            "id": "x", "name": "X", "kind": "national", "levels": ["Class 9"],
            "status": "verified", "verified_site": True, "check": {"ok": False},
        }
    )
    assert framework.status == "provisional"
    assert framework.verified_site is False


def test_a_verified_row_needs_both_the_flag_and_a_passing_check() -> None:
    framework = loader.Framework.from_row(
        {
            "id": "x", "name": "X", "kind": "national", "levels": ["Class 9"],
            "status": "verified", "verified_site": True, "check": {"ok": True},
        }
    )
    assert framework.verified is True


def test_every_verified_entry_in_the_file_carries_its_evidence(frameworks: list[Any]) -> None:
    for framework in frameworks:
        if framework.verified:
            assert framework.official_site, f"{framework.id} is verified with no site"
            assert framework.checked_at, f"{framework.id} is verified with no check date"
            assert framework.check.get("ok") is True, f"{framework.id}: check did not pass"


def test_every_verified_entry_resolves(
    frameworks: list[Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    """The mandate's "every verified entry has a resolvable site", driven against a stub.

    Reaching the real network would make this suite depend on 268 third-party sites and fail
    on any one of them having a bad morning. ``build.py`` is what checks them for real; what
    is proved here is that the builder marks verified if and only if its probe confirmed the
    site, so the file's own record can be trusted.
    """
    reachable = {f.official_site for f in frameworks if f.verified}
    calls: list[str] = []

    def stub_probe(url: str, timeout: float, retries: int) -> dict[str, Any]:
        calls.append(url)
        record = build.blank_check()
        if url in reachable:
            record.update(ok=True, transport="direct", method="GET", http_status=200,
                          final_url=url, page_title="stub")
        else:
            record["error"] = "stub: not reachable"
        return record

    monkeypatch.setattr(build, "probe", stub_probe)

    class Args:
        timeout = 5.0
        retries = 0

    for framework in frameworks:
        if not framework.verified:
            continue
        row = {"id": framework.id, "official_site": framework.official_site}
        _entry, ok, record = build.check_entry(row, Args())
        assert ok is True, f"{framework.id} is verified but did not resolve"
        assert record["ok"] is True

    # Every verified entry was probed. Counted as entries, not as distinct URLs: two entries
    # legitimately share one site (icse and isc are both awarded by CISCE, and are separate
    # entries because a stored syllabus points at one framework id, not at a council).
    assert len(calls) == sum(1 for f in frameworks if f.verified)


def test_an_entry_with_no_site_is_never_reported_as_resolving() -> None:
    class Args:
        timeout = 5.0
        retries = 0

    _entry, ok, record = build.check_entry({"id": "x", "official_site": None}, Args())
    assert ok is None
    assert record["ok"] is False
    assert record["error"] == "no official site on record"


def test_a_status_is_one_the_labels_table_knows(frameworks: list[Any]) -> None:
    """§5's table is the whole vocabulary. A status outside it has no label to show."""
    for framework in frameworks:
        assert framework.status in loader.STATUSES


# ------------------------------------------------------- the gateway reads the same file


def test_the_gateway_store_loads_the_same_frameworks(frameworks: list[Any]) -> None:
    """The seed has two readers: this loader and ``wobo_gateway.curriculum.store.load_seed``,
    which also pulls the stored syllabi. They must see the same registry, or the boards a
    learner can search and the boards the store can serve would drift apart."""
    from wobo_gateway.curriculum.store import load_seed as store_load_seed

    seeded = store_load_seed(CONTENT)
    assert [f.id for f in seeded.frameworks] == [f.id for f in frameworks]
    assert seeded.skipped_frameworks == 0


def test_the_gateway_agrees_on_names_and_kinds(frameworks: list[Any]) -> None:
    from wobo_gateway.curriculum.store import load_seed as store_load_seed

    theirs = {f.id: f for f in store_load_seed(CONTENT).frameworks}
    for mine in frameworks:
        assert theirs[mine.id].name == mine.name
        assert theirs[mine.id].kind.value == mine.kind
