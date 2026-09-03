#!/usr/bin/env python3
"""Gate 3 — pronouns.

WOBO-PLAN §19: Wobo is a wobot, not a boy or a girl. The name comes first; they/them only where
a pronoun is unavoidable; never she/her or he/him, in product copy, prompts, docs, code comments,
tests, marketing or legal. §19 commissions this gate by name — "a repo-wide pass with a grep gate
in CI for 'she '/'her ' near 'Wobo'".

Proximity is the whole trick: `she` is a perfectly good word when it refers to a learner, a
parent, or a chapter title, so a hit only fails when it sits within 60 characters of "Wobo" on
the same line. Human referents further away are left alone, and the handful that do land inside
the window are excused by name in scripts/gate_allowlist.py.

Run: python3 scripts/gate_pronouns.py
"""

from __future__ import annotations

import re
import sys

from gate_allowlist import (
    PRONOUNS,
    Finding,
    excused_at,
    read_lines,
    report,
    working_tree_text_files,
)

WINDOW = 60
GENDERED = re.compile(r"\b(she|her|hers|herself|he|him|his|himself)\b", re.IGNORECASE)
WOBO = re.compile(r"wobo", re.IGNORECASE)

# "He" is also the symbol for helium, and the case-insensitive pattern above cannot tell the two
# apart. Rather than allowlist every chemistry fixture by name, a capitalised bare "He" sitting in
# a line that reads like chemistry is treated as the element.
CHEMISTRY = re.compile(r"periodic|element|symbol|noble gas|atomic number|\bZ\s*=")


def is_helium_symbol(word: str, line: str) -> bool:
    return word == "He" and bool(CHEMISTRY.search(line.lower()))


def main() -> int:
    findings: list[Finding] = []
    allowed = 0
    files = working_tree_text_files()

    for path in files:
        for i, line in enumerate(read_lines(path), 1):
            if not WOBO.search(line):
                continue
            for m in GENDERED.finditer(line):
                word = m.group(0)
                if is_helium_symbol(word, line):
                    continue
                near = line[max(0, m.start() - WINDOW) : m.end() + WINDOW]
                if not WOBO.search(near):
                    continue
                if excused_at(PRONOUNS, path, line, m.start(), m.end()):
                    allowed += 1
                    continue
                findings.append(
                    Finding(
                        path,
                        i,
                        line,
                        f'"{word}" within {WINDOW} characters of "Wobo" — §19 wants the name, '
                        f"or they/them",
                    )
                )

    return report("pronouns", findings, allowed, len(files))


if __name__ == "__main__":
    sys.exit(main())
