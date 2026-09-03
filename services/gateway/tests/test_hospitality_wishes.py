"""The festival wishes, locked (WOBO-PLAN §14.1 rule 4, §19, §20).

The lines in ``content/hospitality/festivals.json`` under ``rule_engine.wishes`` are the copy the
engine sends. This file greps every one of them against the pronoun gate's own word list
(``scripts/gate_pronouns.py``) and the neutral-copy list in ``hospitality/copy.py``: no gendered
pronoun, no regional kinship word, no deity or worship word, no political or national-pride
framing, no transliterated greeting, no exclamation mark, no emoji. One line, plain English,
names the day, wishes well.
"""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any

import pytest
from wobo_gateway.hospitality import copy as copy_gate
from wobo_gateway.hospitality.festivals import load_calendar

REPO = Path(__file__).resolve().parents[3]
CALENDAR_FILE = REPO / "content/hospitality/festivals.json"

# The twelve the brief asked for. More may be added; these may not be removed.
REQUIRED = {
    "republic-day-india",
    "new-year-gregorian",
    "independence-day-india",
    "gandhi-jayanti",
    "diwali",
    "eid-al-fitr",
    "christmas",
    "pongal",
    "onam",
    "holi",
    "makar-sankranti",
    "lunar-new-year",
}

EMOJI = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]")


def _pronoun_gate() -> Any:
    """The real gate module, so the word list here can never drift from the one CI runs."""
    scripts = REPO / "scripts"
    if str(scripts) not in sys.path:
        sys.path.insert(0, str(scripts))
    spec = importlib.util.spec_from_file_location("gate_pronouns", scripts / "gate_pronouns.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def data() -> dict[str, Any]:
    return json.loads(CALENDAR_FILE.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def wishes(data: dict[str, Any]) -> list[dict[str, Any]]:
    return list(data["rule_engine"]["wishes"])


def test_there_are_at_least_twelve_and_the_named_twelve_are_among_them(
    wishes: list[dict[str, Any]],
) -> None:
    assert len(wishes) >= 12
    ids = {w["festival"] for w in wishes}
    assert ids >= REQUIRED, REQUIRED - ids
    assert len(ids) == len(wishes)  # one line per festival


def test_the_pronoun_gates_own_words_never_appear(wishes: list[dict[str, Any]]) -> None:
    gate = _pronoun_gate()
    for wish in wishes:
        text = wish["text"]
        hits = [m.group(0) for m in gate.GENDERED.finditer(text)]
        assert not hits, (wish["festival"], hits)
    # and the module's list is the gate's list, word for word
    assert frozenset(gate.GENDERED.pattern.strip(r"\b()").split("|")) == copy_gate.PRONOUNS


def test_every_wish_passes_the_neutral_copy_gate(wishes: list[dict[str, Any]]) -> None:
    for wish in wishes:
        assert copy_gate.wish_violations(wish["text"]) == [], wish["festival"]


def test_a_wish_is_one_plain_english_line_that_names_the_day(
    wishes: list[dict[str, Any]], data: dict[str, Any]
) -> None:
    by_id = {f["id"]: f for f in data["festivals"]}
    for wish in wishes:
        fid, day, text = wish["festival"], wish["day"], wish["text"]
        assert fid in by_id, fid
        festival = by_id[fid]
        names = [festival["name"], *festival.get("aliases", [])]
        assert any(day.lower() in n.lower() for n in names), (fid, day, names)
        assert day.lower() in text.lower(), (fid, day, text)
        assert "\n" not in text and "!" not in text and text.isascii()
        assert not EMOJI.search(text)
        assert text[0].isupper() and text.endswith(".")
        assert text.count("{name}") <= 1
        assert "wobo" not in text.lower()  # a wish is about the family's day, not about Wobo
        assert len(text) <= copy_gate.MAX_LENGTH


def test_the_engine_carries_every_wish_verbatim(wishes: list[dict[str, Any]]) -> None:
    calendar = load_calendar(CALENDAR_FILE)
    for wish in wishes:
        assert calendar.festivals[wish["festival"]].wish == wish["text"]


@pytest.mark.parametrize(
    ("line", "word"),
    [
        ("Happy Diwali, {name}. May the goddess bring light.", "goddess"),
        ("Happy Diwali. Tell Amma I said so.", "amma"),
        ("Happy Republic Day. Proud to be Indian.", "proud"),
        ("Eid Mubarak, {name}.", "mubarak"),
        ("Happy Holi. I hope she has fun.", "she"),
        ("Happy Holi. God's own day.", "god"),
    ],
)
def test_the_gate_refuses_the_lines_the_law_forbids(line: str, word: str) -> None:
    problems = copy_gate.wish_violations(line)
    assert f"forbidden word: {word}" in problems, problems


def test_the_gate_refuses_shape_problems_too() -> None:
    assert "exclamation mark" in copy_gate.wish_violations("Happy Holi!")
    assert "more than one line" in copy_gate.wish_violations("Happy Holi.\nSee you.")
    assert any("ASCII" in p for p in copy_gate.wish_violations("Happy Holi \U0001f389"))
    assert copy_gate.wish_violations("") == ["empty"]
    assert copy_gate.passes("Happy Holi, {name}. I hope the colours take a week to wash out.")


def test_every_line_the_file_offers_is_gated_before_the_engine_sees_it() -> None:
    """The file's own examples include chants and transliterated greetings. Every line the
    engine holds — the wish, the entry greeting, the example — has passed the gate."""
    calendar = load_calendar(CALENDAR_FILE)
    for festival in calendar.festivals.values():
        for text in (festival.wish, festival.example, *(o.greeting for o in festival.occasions)):
            if text is not None:
                assert copy_gate.wish_violations(text) == [], (festival.id, text)
