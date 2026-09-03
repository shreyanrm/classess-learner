"""The concept map: two boards teaching the same thing must land on one concept, and two boards
teaching different things must not.

The second half is the one with teeth. A false mapping serves a Class 6 lesson to a Class 10
learner from the shared cache, and it looks like a cache hit rather than a bug — so the structural
checks are tested against near-misses (right words, wrong year; right words, wrong subject) as
hard as they are against true matches.
"""

from __future__ import annotations

import json

import pytest
from wobo_gateway.curriculum import concepts
from wobo_gateway.plexus import store

FIXTURE = {
    "version": 1,
    "overrides": {},
    "concepts": {
        "solving-linear-equations-in-one-variable": {
            "canonicalName": "Solving linear equations in one variable",
            "subjects": ["math"],
            "boards": ["CBSE", "ICSE", "Telangana State Board"],
            "grades": ["Class 8", "Class 9"],
            "occurrences": 4,
        },
        "linear-equations-in-two-variables": {
            "canonicalName": "Linear equations in two variables",
            "subjects": ["math"],
            "boards": ["CBSE"],
            "grades": ["Class 9"],
            "occurrences": 2,
        },
        "the-water-cycle": {
            "canonicalName": "The water cycle",
            "subjects": ["science"],
            "boards": ["CBSE"],
            "grades": ["Class 6"],
            "occurrences": 3,
        },
        "the-rock-cycle": {
            "canonicalName": "The rock cycle",
            "subjects": ["geography"],
            "boards": ["ICSE"],
            "grades": ["Class 7"],
            "occurrences": 1,
        },
        "photosynthesis": {
            "canonicalName": "Photosynthesis",
            "subjects": ["science", "biology"],
            "boards": ["CBSE", "ICSE"],
            "grades": ["Class 7", "Class 10"],
            "occurrences": 5,
        },
        "cell-structure-and-function": {
            "canonicalName": "Cell structure and function",
            "subjects": ["biology"],
            "boards": ["ICSE"],
            "grades": ["Class 9"],
            "occurrences": 2,
        },
    },
}


@pytest.fixture(autouse=True)
def _fixture_registry(tmp_path, monkeypatch):
    """Point the concept registry at a small, known graph — through the same env var
    ``plexus.store`` honours, which is the contract between the two modules."""
    path = tmp_path / "concepts.json"
    path.write_text(json.dumps(FIXTURE))
    monkeypatch.setenv("PLEXUS_CONCEPTS_PATH", str(path))
    concepts.reload_registry()
    yield
    concepts.reload_registry()


def topic(name: str, **kw) -> concepts.Topic:
    kw.setdefault("id", "topic-" + name.lower().replace(" ", "-"))
    kw.setdefault("subject", "Mathematics")
    kw.setdefault("level", "Class 9")
    return concepts.Topic(name=name, **kw)


class Picker:
    """A proposer that returns whatever we hand it — including an id it was never offered."""

    model_id = "test/generate"

    def __init__(self, answer: str | Exception = "") -> None:
        self.answer = answer
        self.seen: list[list[concepts.ConceptEntry]] = []

    def choose(self, *, topic, candidates):  # noqa: ANN001 - protocol shape
        self.seen.append(candidates)
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


# --- the registry ---------------------------------------------------------------------------------


def test_the_registry_loads_the_canonical_graph():
    reg = concepts.registry()
    assert len(reg) == len(FIXTURE["concepts"])
    entry = reg["photosynthesis"]
    assert entry.canonical_name == "Photosynthesis"
    assert entry.levels == (7, 10)


def test_a_missing_registry_is_survivable(monkeypatch, tmp_path):
    monkeypatch.setenv("PLEXUS_CONCEPTS_PATH", str(tmp_path / "nope.json"))
    concepts.reload_registry()
    assert concepts.registry() == {}
    mapping = concepts.propose(topic("Solving linear equations in one variable"))
    assert mapping.method == "minted"


# --- exact: the cheap path, and the one that has to agree with the cache --------------------------


def test_an_exact_topic_maps_with_no_model_call():
    model = Picker("should-not-be-consulted")
    mapping = concepts.propose(topic("Solving linear equations in one variable"), model=model)
    assert mapping.method == "exact"
    assert mapping.confidence == 1.0
    assert mapping.concept_id == "solving-linear-equations-in-one-variable"
    assert model.seen == []


def test_two_boards_naming_a_topic_the_same_way_share_one_concept():
    cbse = concepts.propose(topic("Solving linear equations in one variable", id="a"))
    icse = concepts.propose(
        concepts.Topic(
            id="b",
            name="solving   Linear Equations in One Variable",
            subject="Maths",
            level="Class 8",
        )
    )
    assert cbse.concept_id == icse.concept_id


def test_the_concept_id_is_the_one_the_content_cache_keys_on():
    """The whole economy: a concept id computed any other way is a cache key that never hits."""
    mapping = concepts.propose(topic("Photosynthesis", subject="Science", level="Class 7"))
    assert mapping.concept_id == store.concept_id("Photosynthesis")


# --- proposal: a shortlist, one pick from it, and the checks that decide --------------------------


def test_candidates_are_ranked_and_shortlisted():
    shortlist = concepts.candidates(topic("Linear equations in one variable"))
    ids = [c.concept_id for c in shortlist]
    assert ids[0] == "solving-linear-equations-in-one-variable"
    assert "linear-equations-in-two-variables" in ids
    assert len(shortlist) <= concepts.MAX_CANDIDATES


def test_a_confirmed_proposal_is_stored_with_its_checks():
    model = Picker("solving-linear-equations-in-one-variable")
    mapping = concepts.propose(topic("Linear equations in one variable"), model=model)
    assert mapping.method == "proposed"
    assert mapping.concept_id == "solving-linear-equations-in-one-variable"
    assert mapping.confidence >= concepts.CONFIDENCE_FLOOR
    assert "name_overlap" in mapping.checks_passed
    assert "level_band" in mapping.checks_passed
    assert mapping.proposed_by == "test/generate"


def test_the_model_can_only_choose_from_the_shortlist():
    """Refuse rather than invent, one layer down: an id we never offered is not a mapping."""
    model = Picker("a-concept-we-never-offered")
    mapping = concepts.propose(topic("Linear equations in one variable"), model=model)
    assert mapping.method == "minted"
    assert mapping.concept_id == store.concept_id("Linear equations in one variable")


def test_no_pick_mints_rather_than_forcing_a_near_neighbour():
    mapping = concepts.propose(topic("Linear equations in one variable"), model=Picker(""))
    assert mapping.method == "minted"


def test_a_proposer_that_fails_costs_a_cache_hit_not_a_lesson():
    mapping = concepts.propose(
        topic("Linear equations in one variable"), model=Picker(RuntimeError("upstream"))
    )
    assert mapping.method == "minted"


def test_without_a_proposer_nothing_is_proposed():
    mapping = concepts.propose(topic("Linear equations in one variable"))
    assert mapping.method == "minted"


def test_a_topic_with_no_name_is_an_error_not_a_concept():
    with pytest.raises(concepts.ConceptMappingError):
        concepts.propose(topic("   "))


# --- the structural checks: the near-misses -------------------------------------------------------


def test_the_level_band_rejects_the_same_words_five_years_apart():
    entry = concepts.registry()["the-water-cycle"]  # Class 6
    confidence, checks = concepts.structural_checks(
        concepts.Topic(id="t", name="The water cycle", subject="Science", level="Class 10"), entry
    )
    assert confidence == 0.0
    assert "level_band" not in checks


def test_the_level_band_forgives_one_year():
    entry = concepts.registry()["the-water-cycle"]  # Class 6
    confidence, checks = concepts.structural_checks(
        concepts.Topic(id="t", name="The water cycle", subject="Science", level="Class 7"), entry
    )
    assert "level_band" in checks
    assert confidence >= concepts.CONFIDENCE_FLOOR


def test_the_subject_check_rejects_a_namesake_from_another_subject():
    entry = concepts.registry()["the-rock-cycle"]  # geography, Class 7
    confidence, _ = concepts.structural_checks(
        concepts.Topic(id="t", name="The rock cycle", subject="Chemistry", level="Class 7"), entry
    )
    assert confidence == 0.0


def test_a_coincidental_word_overlap_is_not_a_match():
    entry = concepts.registry()["the-water-cycle"]
    confidence, checks = concepts.structural_checks(
        concepts.Topic(id="t", name="The rock cycle", subject="Science", level="Class 6"), entry
    )
    assert "name_overlap" not in checks
    assert confidence < concepts.CONFIDENCE_FLOOR


def test_objectives_earn_confidence_and_never_cost_it():
    entry = concepts.registry()["photosynthesis"]
    bare = concepts.Topic(id="t", name="How plants make food", subject="Science", level="Class 7")
    with_objectives = concepts.Topic(
        id="t",
        name="How plants make food",
        objectives=["Explain photosynthesis in green leaves"],
        subject="Science",
        level="Class 7",
    )
    bare_score, _ = concepts.structural_checks(bare, entry)
    rich_score, rich_checks = concepts.structural_checks(with_objectives, entry)
    assert "objective_overlap" in rich_checks
    assert rich_score > bare_score


def test_a_registry_entry_with_no_grades_neither_earns_nor_contradicts():
    entry = concepts.ConceptEntry(concept_id="x", canonical_name="Photosynthesis", subjects=())
    confidence, checks = concepts.structural_checks(
        concepts.Topic(id="t", name="Photosynthesis", subject="Science", level="Class 7"), entry
    )
    assert "level_band_unknown" in checks
    assert "subject_unknown" in checks
    assert 0.0 < confidence < 1.0


def test_a_weak_proposal_below_the_floor_is_minted_instead():
    """The model picked a plausible neighbour; the checks did not agree, so nothing is stored."""
    model = Picker("the-water-cycle")
    mapping = concepts.propose(
        concepts.Topic(id="t", name="The cycle of rocks", subject="Science", level="Class 6"),
        model=model,
    )
    assert mapping.method == "minted"
    assert mapping.concept_id == store.concept_id("The cycle of rocks")


@pytest.mark.parametrize(
    ("subject", "expected"),
    [
        ("Mathematics", "math"),
        ("maths", "math"),
        ("Social Science", "social"),
        ("History and Civics", "history_civics"),
        ("Environmental Studies", "evs"),
        ("", ""),
    ],
)
def test_subject_names_normalise_onto_the_registrys_keys(subject: str, expected: str):
    assert concepts._subject_key(subject) == expected


# --- attaching to a syllabus ----------------------------------------------------------------------


def units() -> list[dict]:
    return [
        {
            "id": "unit-1",
            "name": "Linear equations",
            "topics": [
                {"id": "t1", "name": "Solving linear equations in one variable", "objectives": []},
                {"id": "t2", "name": "Linear equations in two variables", "objectives": []},
            ],
        },
        {
            "id": "unit-2",
            "name": "Life processes",
            "topics": [{"id": "t3", "name": "A topic no registry has ever seen", "objectives": []}],
        },
    ]


def test_attach_concepts_annotates_topics_without_editing_them_in_place():
    original = units()
    annotated, mappings = concepts.attach_concepts(
        original, level="Class 9", subject="Mathematics"
    )
    assert "concept_ids" not in original[0]["topics"][0]
    assert annotated[0]["topics"][0]["concept_ids"] == ["solving-linear-equations-in-one-variable"]
    assert annotated[0]["topics"][1]["concept_ids"] == ["linear-equations-in-two-variables"]
    assert len(mappings) == 3


def test_an_unseen_topic_mints_its_own_concept_and_says_so():
    _, mappings = concepts.attach_concepts(units(), level="Class 9", subject="Mathematics")
    minted = [m for m in mappings if m.minted]
    assert [m.topic_name for m in minted] == ["A topic no registry has ever seen"]
    assert concepts.reuse_rate(mappings) == pytest.approx(2 / 3)


def test_reuse_rate_of_nothing_is_zero():
    assert concepts.reuse_rate([]) == 0.0


def test_a_topic_with_no_name_is_left_alone_rather_than_breaking_the_subject():
    annotated, mappings = concepts.attach_concepts(
        [{"id": "u", "name": "U", "topics": [{"id": "t", "name": "  "}]}], level="Class 9"
    )
    assert annotated[0]["topics"][0].get("concept_ids") is None
    assert mappings == []


# --- storage -------------------------------------------------------------------------------------


def test_rows_carry_the_mapping_and_its_provenance():
    _, mappings = concepts.attach_concepts(units(), level="Class 9", subject="Mathematics")
    memory = concepts.InMemoryConceptMap()
    written = concepts.store_mappings(mappings, store=memory, version_id="v1")
    assert written == 3
    row = memory.for_node("t1")[0]
    assert row["concept_id"] == "solving-linear-equations-in-one-variable"
    assert row["version_id"] == "v1"
    assert row["method"] == "exact"
    assert row["confidence"] == 1.0
    assert row["mapped_at"].endswith("Z")


def test_remapping_a_node_replaces_its_own_row_only():
    memory = concepts.InMemoryConceptMap()
    first = concepts.propose(topic("Solving linear equations in one variable", id="t1"))
    other = concepts.propose(topic("Photosynthesis", id="t2", subject="Science", level="Class 7"))
    concepts.store_mappings([first, other], store=memory, version_id="v1")
    concepts.store_mappings([first], store=memory, version_id="v1")
    assert len(memory.rows) == 2
    assert len(memory.for_node("t1")) == 1


def test_a_new_version_keeps_the_old_versions_row():
    memory = concepts.InMemoryConceptMap()
    mapping = concepts.propose(topic("Photosynthesis", id="t1", subject="Science", level="Class 7"))
    concepts.store_mappings([mapping], store=memory, version_id="v1")
    concepts.store_mappings([mapping], store=memory, version_id="v2")
    assert len(memory.for_node("t1")) == 2


def test_the_postgrest_store_refuses_to_write_without_the_service_role(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    with pytest.raises(concepts.ConceptMappingError):
        concepts.PostgrestConceptMap().write([{"node_id": "t1"}])


def test_the_postgrest_store_writes_nothing_for_nothing():
    assert concepts.PostgrestConceptMap().write([]) == 0


# --- against the real graph, and against the syllabus intake next door ---------------------


def test_the_real_registry_is_readable_and_shares_a_concept_across_boards(monkeypatch):
    """No fixture: the file that actually ships in the gateway image, read the way the
    content cache reads it. This is the wiring test — a broken path here is a cold cache."""
    monkeypatch.delenv("PLEXUS_CONCEPTS_PATH", raising=False)
    concepts.reload_registry()
    reg = concepts.registry()
    if not reg:
        pytest.skip("content/catalogs/concepts.json is not present in this checkout")
    assert len(reg) > 1000
    mapping = concepts.propose(
        concepts.Topic(id="t", name="Photosynthesis", subject="Science", level="Class 7")
    )
    assert mapping.method == "exact"
    assert mapping.concept_id == store.concept_id("Photosynthesis")
    # The point of the whole module: several boards already sit on this one concept.
    assert len(reg[mapping.concept_id].boards) > 1


def test_a_personal_syllabus_comes_out_of_intake_ready_to_be_mapped():
    """The two halves of this worker's surface meet here: `own` builds the units with an empty
    `concept_ids` on every topic, and `concepts` fills them without touching anything else."""
    from wobo_gateway.curriculum import own

    class Model:
        model_id = "test/generate"

        def structure(self, *, text, hint):
            return {
                "units": [
                    {
                        "title": "Linear equations",
                        "quote": "Unit 1: Linear equations",
                        "page": 1,
                        "topics": [
                            {"title": "Solving linear equations in one variable", "objectives": []}
                        ],
                    }
                ]
            }

    document = own.read_paste(
        "Mathematics, Class 9\n\nUnit 1: Linear equations\n  Solving linear equations in one "
        "variable\n"
    )
    built = own.structure(
        document,
        owner="learner-1",
        framework_name="Riverbank",
        level="Class 9",
        subject="Mathematics",
        model=Model(),
    )
    assert built["units"][0]["topics"][0]["concept_ids"] == []

    annotated, mappings = concepts.attach_concepts(
        built["units"], level="Class 9", subject="Mathematics"
    )
    assert mappings[0].concept_id == "solving-linear-equations-in-one-variable"
    assert annotated[0]["topics"][0]["concept_ids"] == [mappings[0].concept_id]
    # The topic node keeps its id, its name and its source_ref — mapping annotates, never edits.
    original = built["units"][0]["topics"][0]
    mapped = annotated[0]["topics"][0]
    assert (mapped["id"], mapped["name"], mapped["source_ref"]) == (
        original["id"],
        original["name"],
        original["source_ref"],
    )
