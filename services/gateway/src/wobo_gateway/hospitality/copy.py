"""The gate every festival wish passes before it is sent.

WOBO-PLAN §14.1 rule 4 (plain English everywhere, no regional kinship words), §19 (Wobo has no
gender; the pronoun gate in ``scripts/gate_pronouns.py`` lists the words), and §20 (neutral by
default: no religious framing, no political or national-pride framing, "when in doubt, leave it
out"). A wish is one line that names the day and wishes well, and nothing more.

The word lists live here, next to the code that enforces them, so the calendar's lock test and
the engine's runtime check read one source. A line that trips the gate is never sent: the engine
drops it and logs which word did it, rather than shipping a line the law forbids.
"""

from __future__ import annotations

import re

# scripts/gate_pronouns.py, GENDERED — the same eight words. There the rule is "never within 60
# characters of Wobo"; in a wish there is no Wobo and no learner referent that needs one, so the
# words are simply out.
PRONOUNS: frozenset[str] = frozenset(
    {"she", "her", "hers", "herself", "he", "him", "his", "himself"}
)

# §14.1 rule 4: "your parent", "your family", or the name the family gave us — never regional
# kinship words, because language and religion are entangled in our first market.
KINSHIP: frozenset[str] = frozenset(
    {
        "amma",
        "ammi",
        "mummy",
        "mum",
        "mom",
        "mommy",
        "mama",
        "papa",
        "appa",
        "abba",
        "abbu",
        "baba",
        "nana",
        "nani",
        "dada",
        "dadi",
    }
)

# §20 and the brief: no imagery of deities, no religious framing. Generic words that describe or
# invoke, not the proper names a day is called by — "Ram Navami" names a day; "lord" frames it.
RELIGIOUS_FRAMING: frozenset[str] = frozenset(
    {
        "god",
        "gods",
        "goddess",
        "goddesses",
        "lord",
        "deity",
        "deities",
        "divine",
        "bless",
        "blessed",
        "blessing",
        "blessings",
        "pray",
        "prayer",
        "prayers",
        "worship",
        "temple",
        "mosque",
        "church",
        "gurdwara",
        "idol",
        "idols",
        "holy",
        "sacred",
        "mantra",
        "scripture",
        "heaven",
        "sin",
        "faith",
        "bappa",
        "morya",
    }
)

# §20: no political or national-pride framing. A civic wish names the day and wishes well; it
# does not salute anything. "national" is deliberately absent — "National Day" is the name of a
# day in Singapore and the Gulf, and the name of the day is exactly what a wish may say.
POLITICAL_FRAMING: frozenset[str] = frozenset(
    {
        "nation",
        "nations",
        "patriot",
        "patriots",
        "patriotic",
        "patriotism",
        "motherland",
        "fatherland",
        "proud",
        "pride",
        "flag",
        "flags",
        "anthem",
        "salute",
        "soldier",
        "soldiers",
        "army",
        "martyr",
        "martyrs",
        "victory",
        "zindabad",
        "vande",
        "mataram",
        "jai",
        "hind",
        "bharat",
        "party",
        "vote",
        "election",
        "government",
        "border",
        "borders",
    }
)

# §14.1 rule 4: plain English. The transliterated greeting words the calendar's own examples
# reach for; a wish uses the English greeting instead ("Happy Eid", not "Eid Mubarak").
NOT_ENGLISH: frozenset[str] = frozenset(
    {
        "mubarak",
        "shubho",
        "shubhakamana",
        "sameach",
        "tovah",
        "suba",
        "wewa",
        "tika",
        "sadya",
        "nayaa",
        "barsha",
        "ko",
    }
)

FORBIDDEN: frozenset[str] = PRONOUNS | KINSHIP | RELIGIOUS_FRAMING | POLITICAL_FRAMING | NOT_ENGLISH

_WORD = re.compile(r"[a-z]+(?:'[a-z]+)?")
MAX_LENGTH = 160


def words(text: str) -> list[str]:
    """Lower-cased words, apostrophes kept inside a word ("else's")."""
    return _WORD.findall(text.lower())


def wish_violations(text: str) -> list[str]:
    """Every reason this line may not be sent. Empty means it passes."""
    problems: list[str] = []
    if not text or not text.strip():
        return ["empty"]
    if "\n" in text or "\r" in text:
        problems.append("more than one line")
    if "!" in text:
        problems.append("exclamation mark")
    if not text.isascii():
        problems.append("not plain ASCII (emoji or a non-English script)")
    if len(text) > MAX_LENGTH:
        problems.append(f"longer than {MAX_LENGTH} characters")
    found = sorted({w for w in words(text) if w in FORBIDDEN} | _apostrophe_stems(text))
    problems.extend(f"forbidden word: {w}" for w in found)
    return problems


def _apostrophe_stems(text: str) -> set[str]:
    """``her's`` or ``god's`` — the stem before an apostrophe is checked too."""
    return {w.split("'", 1)[0] for w in words(text) if "'" in w and w.split("'", 1)[0] in FORBIDDEN}


def passes(text: str) -> bool:
    return not wish_violations(text)


# --- the digest gate ---------------------------------------------------------------------------
# The Sunday note's words come from the weekly-summary capability, a model's output placed in
# Wobo's hand. It is gated more loosely than a wish — a parent's own child may be "she" in a line
# about the week, and a curly quote is not a foreign script — but the laws that are about US hold:
# no kinship word (§14.1 rule 4), no pronoun for Wobo (§19, the CI gate's own 60-character rule),
# no exclamation mark, no emoji, one line.
_WOBO = re.compile(r"wobo", re.IGNORECASE)
_PRONOUN = re.compile(r"\b(" + "|".join(sorted(PRONOUNS)) + r")\b", re.IGNORECASE)
_EMOJI = re.compile("[\U0001f300-\U0001faff\u2600-\u27bf]")
_PRONOUN_WINDOW = 60


def digest_violations(text: str) -> list[str]:
    """Every reason a digest line may not be placed in Wobo's hand. Empty means it may."""
    problems: list[str] = []
    if not text or not text.strip():
        return ["empty"]
    if "\n" in text or "\r" in text:
        problems.append("more than one line")
    if "!" in text:
        problems.append("exclamation mark")
    if _EMOJI.search(text):
        problems.append("emoji")
    problems.extend(
        f"forbidden word: {w}" for w in sorted({w for w in words(text) if w in KINSHIP})
    )
    for match in _PRONOUN.finditer(text):
        near = text[max(0, match.start() - _PRONOUN_WINDOW) : match.end() + _PRONOUN_WINDOW]
        if _WOBO.search(near):
            problems.append(f"pronoun near Wobo: {match.group(0)}")
            break
    return problems
