"""The learner's own syllabus: it is built from their document or it is not built at all.

The tests that matter here are the refusals. A syllabus intake that returns something plausible
when it should have returned nothing is the failure `CURRICULUM.md` §12 names first, so most of
this file is about units that cannot quote the source, levels outside the school band, and
documents that are not syllabi.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from wobo_gateway.curriculum import own

FIXED = datetime(2026, 9, 3, 12, 0, tzinfo=UTC)

SYLLABUS = """
Mathematics, Class 9
Riverbank Public School, 2026-27

Unit 1: Number systems
  Real numbers on the number line
  Laws of exponents for real numbers

Unit 2: Polynomials
  Zeroes of a polynomial
  The factor theorem

Unit 3: Coordinate geometry
  The cartesian plane
"""


class FakeStructure:
    """A structuring model under our control: it returns exactly what we tell it to."""

    model_id = "test/generate"

    def __init__(self, payload: dict | Exception) -> None:
        self.payload = payload
        self.calls: list[dict] = []

    def structure(self, *, text: str, hint: dict) -> dict:
        self.calls.append({"text": text, "hint": hint})
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


def good_payload() -> dict:
    return {
        "units": [
            {
                "title": "Number systems",
                "quote": "Unit 1: Number systems",
                "page": 1,
                "topics": [
                    {
                        "title": "Real numbers on the number line",
                        "objectives": ["Place a real number on the number line"],
                    },
                    {"title": "Laws of exponents for real numbers", "objectives": []},
                ],
            },
            {
                "title": "Polynomials",
                "quote": "Unit 2: Polynomials",
                "page": 1,
                "topics": [{"title": "Zeroes of a polynomial", "objectives": []}],
            },
        ]
    }


def build(payload: dict | None = None, *, text: str = SYLLABUS, **kw) -> dict:
    document = own.read_paste(text, title="My syllabus", now=FIXED)
    model = FakeStructure(payload if payload is not None else good_payload())
    return own.structure(
        document,
        owner="learner-1",
        framework_name="Riverbank Public School",
        level="Class 9",
        subject="Mathematics",
        model=model,
        now=FIXED,
        **kw,
    )


# --- intake -------------------------------------------------------------------------------------


def test_paste_normalises_and_hashes():
    doc = own.read_paste(SYLLABUS, now=FIXED)
    assert doc.kind == "text"
    assert doc.page_count == 1
    assert doc.sha256 == own.read_paste(SYLLABUS + "\n\n\n", now=FIXED).sha256
    assert doc.as_dict()["id"].startswith("own-")


def test_paste_refuses_a_scrap():
    with pytest.raises(own.IntakeRefused) as exc:
        own.read_paste("class 9 maths")
    assert exc.value.reason == "too_little_text"


def test_paste_refuses_a_book():
    with pytest.raises(own.IntakeRefused) as exc:
        own.read_paste("chapter one. " * 20_000)
    assert exc.value.reason == "too_much_text"


def test_photo_reads_through_the_injected_reader():
    class Reader:
        model_id = "test/vision"

        def read(self, *, image: bytes, media_type: str) -> str:
            assert media_type == "image/jpeg"
            return SYLLABUS

    doc = own.read_photo(b"\xff\xd8jpeg", media_type="image/jpeg", reader=Reader(), now=FIXED)
    assert doc.kind == "image"
    assert doc.reader_model == "test/vision"


def test_photo_refuses_an_unsupported_type():
    with pytest.raises(own.IntakeRefused) as exc:
        own.read_photo(b"x", media_type="application/pdf", reader=None)
    assert exc.value.reason == "unsupported_image"


def test_photo_refuses_when_the_reader_fails():
    class Broken:
        def read(self, *, image: bytes, media_type: str) -> str:
            raise RuntimeError("provider down")

    with pytest.raises(own.IntakeRefused) as exc:
        own.read_photo(b"x" * 10, media_type="image/png", reader=Broken())
    assert exc.value.reason == "reader_failed"


def test_photo_refuses_when_nothing_readable_came_back():
    class Blank:
        def read(self, *, image: bytes, media_type: str) -> str:
            return "   "

    with pytest.raises(own.IntakeRefused) as exc:
        own.read_photo(b"x" * 10, media_type="image/png", reader=Blank())
    assert exc.value.reason == "too_little_text"


def test_pdf_keeps_page_anchors():
    class TwoPages:
        def extract(self, data: bytes) -> list[str]:
            return ["Mathematics, Class 9\n\nUnit 1: Number systems\n", "Unit 2: Polynomials\n", ""]

    doc = own.read_pdf(b"%PDF-1.7 ...", extractor=TwoPages(), now=FIXED)
    assert doc.kind == "pdf"
    assert doc.page_count == 2
    assert "Polynomials" in doc.pages[1]


def test_pdf_refuses_a_scan_with_no_text_layer():
    class Empty:
        def extract(self, data: bytes) -> list[str]:
            return ["", ""]

    with pytest.raises(own.IntakeRefused) as exc:
        own.read_pdf(b"%PDF", extractor=Empty())
    assert exc.value.reason == "too_little_text"
    assert "photo" in exc.value.say


# --- the school band ------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("level", "expected"),
    [("Class 9", 9), ("class9", 9), ("Grade 10", 10), ("Year 11", 11), ("Class IX", 9), ("7", 7)],
)
def test_level_order_reads_the_common_spellings(level: str, expected: int):
    assert own.level_order(level) == expected


@pytest.mark.parametrize("level", ["Class 3", "Class 14", "Nursery", ""])
def test_level_order_refuses_outside_the_school_band(level: str):
    with pytest.raises(own.IntakeRefused):
        own.level_order(level)


# --- structuring: the model proposes, the checks dispose ------------------------------------------


def test_structure_builds_a_personal_framework():
    built = build()
    assert built["framework"]["kind"] == "personal"
    assert built["framework"]["status"] == "personal"
    assert built["framework"]["owner"] == "learner-1"
    assert built["framework"]["shared"] is False
    assert built["version"]["label"] == "1"
    assert built["version"]["published_at"] is None
    assert [u["name"] for u in built["units"]] == ["Number systems", "Polynomials"]
    assert [u["order"] for u in built["units"]] == [1, 2]


def test_every_unit_carries_a_source_ref_into_the_learners_document():
    built = build()
    document_id = built["documents"][0]["id"]
    for unit in built["units"]:
        assert unit["source_ref"]["document_id"] == document_id
        assert unit["source_ref"]["page"] == 1
        assert unit["source_ref"]["section"]


def test_a_unit_that_cannot_quote_the_document_is_dropped():
    payload = good_payload()
    payload["units"].append(
        {
            "title": "Trigonometry",  # not in the syllabus, and a model's favourite guess
            "quote": "Unit 4: Trigonometry",
            "page": 1,
            "topics": [{"title": "Trigonometric ratios", "objectives": []}],
        }
    )
    built = build(payload)
    assert [u["name"] for u in built["units"]] == ["Number systems", "Polynomials"]
    assert built["intake"]["units_dropped"] == 1


def test_a_unit_whose_quote_is_wrong_but_whose_title_is_in_the_source_still_stands():
    payload = good_payload()
    payload["units"][0]["quote"] = "reflowed by the extractor"
    built = build(payload)
    assert built["units"][0]["name"] == "Number systems"


def test_a_quote_too_short_to_mean_anything_does_not_count():
    payload = {"units": [{"title": "Unit", "quote": "Unit", "page": 1, "topics": []}]}
    with pytest.raises(own.IntakeRefused) as exc:
        build(payload)
    assert exc.value.reason == "no_units_found"


def test_duplicate_units_collapse():
    payload = good_payload()
    payload["units"].append(dict(payload["units"][0]))
    built = build(payload)
    assert len(built["units"]) == 2
    assert built["intake"]["units_dropped"] == 1


def test_units_are_capped():
    # Every chapter is genuinely in the document: the cap is what is being tested, and a unit
    # whose title is nowhere in the source is dropped by the source check long before the cap.
    long_syllabus = "Mathematics, Class 9\n" + "".join(
        f"Unit {i}: Chapter number {i}\n" for i in range(own.MAX_UNITS + 5)
    )
    payload = {
        "units": [
            {
                "title": f"Chapter number {i}",
                "quote": f"Unit {i}: Chapter number {i}",
                "page": 1,
                "topics": [],
            }
            for i in range(own.MAX_UNITS + 5)
        ]
    }
    built = build(payload, text=long_syllabus)
    assert len(built["units"]) == own.MAX_UNITS
    assert built["intake"]["units_dropped"] == 5


def test_topics_and_objectives_are_capped_and_deduplicated():
    payload = {
        "units": [
            {
                "title": "Number systems",
                "quote": "Unit 1: Number systems",
                "page": 1,
                "topics": [{"title": "Same topic", "objectives": ["o"] * 50}]
                * (own.MAX_TOPICS_PER_UNIT + 10),
            }
        ]
    }
    built = build(payload)
    topics = built["units"][0]["topics"]
    assert len(topics) == 1
    assert len(topics[0]["objectives"]) == own.MAX_OBJECTIVES_PER_TOPIC


def test_structure_refuses_when_the_model_finds_nothing():
    with pytest.raises(own.IntakeRefused) as exc:
        build({"units": []})
    assert exc.value.reason == "no_units_found"


def test_structure_refuses_when_the_model_fails():
    document = own.read_paste(SYLLABUS, now=FIXED)
    with pytest.raises(own.IntakeRefused) as exc:
        own.structure(
            document,
            owner="learner-1",
            framework_name="School",
            level="Class 9",
            subject="Mathematics",
            model=FakeStructure(RuntimeError("upstream")),
        )
    assert exc.value.reason == "structuring_failed"


def test_structure_refuses_without_an_owner_or_a_subject():
    document = own.read_paste(SYLLABUS, now=FIXED)
    with pytest.raises(own.IntakeRefused) as exc:
        own.structure(
            document, owner="", framework_name="S", level="Class 9", subject="Maths",
            model=FakeStructure(good_payload()),
        )
    assert exc.value.reason == "no_owner"
    with pytest.raises(own.IntakeRefused) as exc:
        own.structure(
            document, owner="l", framework_name="S", level="Class 9", subject="  ",
            model=FakeStructure(good_payload()),
        )
    assert exc.value.reason == "no_subject"


def test_the_learners_text_reaches_the_model_as_data_and_the_hint_carries_the_scope():
    document = own.read_paste(SYLLABUS, now=FIXED)
    model = FakeStructure(good_payload())
    own.structure(
        document,
        owner="learner-1",
        framework_name="Riverbank",
        level="Class 9",
        subject="Mathematics",
        model=model,
    )
    call = model.calls[0]
    assert call["text"] == document.text
    assert call["hint"] == {
        "framework_name": "Riverbank",
        "level": "Class 9",
        "subject": "Mathematics",
    }


def test_ids_are_stable_across_two_identical_intakes():
    first, second = build(), build()
    assert first["framework"]["id"] == second["framework"]["id"]
    assert [u["id"] for u in first["units"]] == [u["id"] for u in second["units"]]
    assert first["framework"]["id"] != own.framework_id_for("learner-2", "Riverbank Public School")


def test_provenance_records_the_document_and_the_extractor():
    built = build()
    provenance = built["provenance"]
    assert provenance["document_hash"] == built["documents"][0]["document_sha256"]
    assert provenance["extractor_model"] == "test/generate"
    assert provenance["verified_by"] is None
    assert "source_quoted" in provenance["checks_passed"]


def test_topics_declare_an_empty_concept_ids_list_for_the_concept_map():
    built = build()
    assert built["units"][0]["topics"][0]["concept_ids"] == []


# --- confirmation, publication, revision ----------------------------------------------------------


def test_confirmation_is_per_unit_and_never_mutates_the_input():
    built = build()
    unit_id = built["units"][0]["id"]
    after = own.confirm_unit(built, unit_id, now=FIXED)
    assert built["units"][0]["confirmed"] is False
    assert after["units"][0]["confirmed"] is True
    assert after["units"][0]["confirmed_at"] == "2026-09-03T12:00:00Z"
    assert own.unconfirmed(after) == [built["units"][1]["id"]]


def test_confirmation_can_be_taken_back():
    built = build()
    unit_id = built["units"][0]["id"]
    after = own.confirm_unit(own.confirm_unit(built, unit_id), unit_id, confirmed=False)
    assert after["units"][0]["confirmed"] is False
    assert after["units"][0]["confirmed_at"] is None


def test_confirming_an_unknown_unit_is_refused():
    with pytest.raises(own.IntakeRefused) as exc:
        own.confirm_unit(build(), "not-a-unit")
    assert exc.value.reason == "unknown_unit"


def confirm_all(framework: dict) -> dict:
    for unit_id in own.unconfirmed(framework):
        framework = own.confirm_unit(framework, unit_id, now=FIXED)
    return framework


def test_publish_requires_every_unit_confirmed():
    built = build()
    with pytest.raises(own.IntakeRefused) as exc:
        own.publish(built)
    assert exc.value.reason == "unconfirmed_units"
    published = own.publish(confirm_all(built), now=FIXED)
    assert published["version"]["published_at"] == "2026-09-03T12:00:00Z"


def test_a_published_version_is_never_edited_in_place():
    published = own.publish(confirm_all(build()), now=FIXED)
    with pytest.raises(own.IntakeRefused) as exc:
        own.confirm_unit(published, published["units"][0]["id"])
    assert exc.value.reason == "already_published"
    with pytest.raises(own.IntakeRefused):
        own.publish(published)


def test_revise_mints_a_new_version_that_supersedes_the_old_one_and_keeps_node_ids():
    published = own.publish(confirm_all(build()), now=FIXED)
    revised = own.revise(published, now=FIXED)
    assert revised["version"]["label"] == "2"
    assert revised["version"]["supersedes"] == published["version"]["id"]
    assert revised["version"]["published_at"] is None
    # The overlay is keyed by node id, so the ids must survive the upgrade.
    assert [u["id"] for u in revised["units"]] == [u["id"] for u in published["units"]]
    assert own.unconfirmed(revised) == [u["id"] for u in published["units"]]
    assert published["version"]["published_at"] == "2026-09-03T12:00:00Z"


def test_revise_refuses_a_draft():
    with pytest.raises(own.IntakeRefused) as exc:
        own.revise(build())
    assert exc.value.reason == "not_published"


# --- the offer to the registry --------------------------------------------------------------------


def test_offer_requires_a_published_confirmed_framework():
    built = build()
    with pytest.raises(own.IntakeRefused) as exc:
        own.offer_to_registry(built)
    assert exc.value.reason == "not_published"


def test_offer_goes_to_the_review_queue_as_community_and_anonymously():
    published = own.publish(confirm_all(build()), now=FIXED)
    row = own.offer_to_registry(published, note="My school's syllabus", now=FIXED)
    assert row["kind"] == "framework_offer"
    assert row["status"] == "pending"
    assert row["unit_count"] == 2
    assert row["payload"]["framework"]["status"] == "community"
    assert row["payload"]["framework"]["shared"] is True
    assert row["payload"]["framework"]["owner"] is None
    assert "learner-1" not in str(row)
    assert row["offered_by_hash"] and row["offered_by_hash"] != "learner-1"
    # The offer never promotes anything by itself.
    assert published["framework"]["status"] == "personal"
    assert published["framework"]["shared"] is False


def test_two_learners_offering_the_same_framework_are_told_apart_without_naming_them():
    def offer(owner: str) -> dict:
        document = own.read_paste(SYLLABUS, now=FIXED)
        built = own.structure(
            document,
            owner=owner,
            framework_name="Riverbank Public School",
            level="Class 9",
            subject="Mathematics",
            model=FakeStructure(good_payload()),
            now=FIXED,
        )
        return own.offer_to_registry(own.publish(confirm_all(built), now=FIXED), now=FIXED)

    assert offer("learner-1")["offered_by_hash"] != offer("learner-2")["offered_by_hash"]


# --- the client's view ----------------------------------------------------------------------------


def test_public_view_carries_no_model_id_and_no_owner():
    built = build()
    view = own.public_view(built)
    serialised = str(view)
    assert "test/generate" not in serialised
    assert "learner-1" not in serialised
    assert "owner" not in view["framework"]
    for private in ("extractor_model", "reader_model", "verifier_model"):
        assert private not in view["provenance"]


def test_public_view_carries_the_honest_label_and_the_confirmation_state():
    view = own.public_view(build())
    assert view["label"] == "Drafted from your syllabus, check it"
    assert len(view["unconfirmed"]) == 2
    assert view["units"][0]["confirmed"] is False
    assert view["provenance"]["document_hash"]


def test_public_view_never_carries_the_document_text():
    view = own.public_view(build())
    assert "Riverbank Public School, 2026-27" not in str(view)


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("verified", "Official CBSE 2026-27, verified"),
        ("provisional", "Found on the board's site, still checking"),
        ("community", "Shared by another learner, not yet checked"),
        ("personal", "Drafted from your syllabus, check it"),
    ],
)
def test_labels_match_the_law(status: str, expected: str):
    assert own.label_for(status, name="CBSE 2026-27") == expected


def test_no_product_copy_shouts():
    lines = [own.label_for(s) for s in own.LABELS] + [
        own.IntakeRefused(reason, say).say
        for reason, say in [("x", own.LABELS["personal"])]
    ]
    for line in lines:
        assert "!" not in line


def test_every_refusal_line_is_calm_and_says_what_happens_next():
    cases = [
        lambda: own.read_paste("short"),
        lambda: own.read_photo(b"x", media_type="image/gif"),
        lambda: own.level_order("Class 2"),
        lambda: build({"units": []}),
    ]
    for case in cases:
        with pytest.raises(own.IntakeRefused) as exc:
            case()
        say = exc.value.say
        assert say and say[0].isupper() and "!" not in say
        assert not any(ch in say for ch in "😀🙂")


# --- the convenience wrapper ----------------------------------------------------------------------


def test_the_intake_object_wires_the_readers_once():
    class Reader:
        model_id = "test/vision"

        def read(self, *, image: bytes, media_type: str) -> str:
            return SYLLABUS

    intake = own.OwnSyllabusIntake(model=FakeStructure(good_payload()), reader=Reader())
    document = intake.from_photo(b"jpeg-bytes", media_type="image/jpeg", now=FIXED)
    built = intake.build(
        document,
        owner="learner-1",
        framework_name="Riverbank",
        level="Class 9",
        subject="Mathematics",
        now=FIXED,
    )
    assert built["intake"]["kind"] == "image"
    assert built["provenance"]["reader_model"] == "test/vision"


# --- the offline structurer ---------------------------------------------------------------------
#
# `LLM_MODE=mock` is how the suite, a keyless laptop and the proof run all work, and §6's door is
# the one that must never be shut. The rule that stands in for the generate tier there is held to
# exactly the same law as the tier: it may only copy what the learner wrote down.


def test_the_offline_structurer_reads_the_chapters_a_syllabus_writes_down() -> None:
    built = own.OfflineStructureModel().structure(text=SYLLABUS, hint={})
    names = [unit["title"] for unit in built["units"]]
    assert "Number systems" in names
    assert all(unit["quote"] for unit in built["units"])


def test_the_offline_structurer_reads_no_chapter_out_of_prose() -> None:
    """The failure §12 names first: something plausible where there was nothing."""
    prose = (
        "Dear parents, this year we will cover a lot of ground and we hope every child enjoys "
        "themselves. Please contact the school office with any questions."
    )
    assert own.OfflineStructureModel().structure(text=prose, hint={})["units"] == []


def test_every_offline_unit_quotes_the_document_it_came_from() -> None:
    """The quote is what `_units_from` checks against the source, so it must be a real line."""
    lines = set(SYLLABUS.splitlines())
    for unit in own.OfflineStructureModel().structure(text=SYLLABUS, hint={})["units"]:
        assert unit["quote"] in lines


def test_the_offline_structurer_keeps_the_page_a_chapter_was_found_on() -> None:
    paged = "[page 1]\n1. Number systems\n[page 7]\n2. Algebraic identities"
    units = own.OfflineStructureModel().structure(text=paged, hint={})["units"]
    assert [(u["title"], u["page"]) for u in units] == [
        ("Number systems", 1),
        ("Algebraic identities", 7),
    ]


def test_the_offline_structurer_is_capped_like_the_tier_is() -> None:
    many = "\n".join(f"{i}. Chapter {i}" for i in range(1, 200))
    assert len(own.OfflineStructureModel().structure(text=many, hint={})["units"]) <= own.MAX_UNITS


def test_a_document_structured_offline_still_passes_every_check() -> None:
    """End to end on the offline path: the checks in `structure` are not relaxed for it."""
    document = own.read_paste(SYLLABUS, now=FIXED)
    built = own.structure(
        document,
        owner="learner-a",
        framework_name="Riverbank scheme of work",
        level="Class 9",
        subject="Mathematics",
        model=own.OfflineStructureModel(),
        now=FIXED,
    )
    assert built["framework"]["kind"] == "personal"
    assert built["units"], "a real syllabus produced no units offline"
    assert own.unconfirmed(built) == [u["id"] for u in built["units"]]
