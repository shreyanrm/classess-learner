#!/usr/bin/env python3
"""Gate 1 — no-classess.

WOBO-PLAN §17: "Wobo is the name in every account and every artefact, not only in the product …
'Classess' survives nowhere." This fails the build on the old brand name, or on the `clss-`
identifier prefix that carried it through the CSS custom properties, storage keys and DOM event
names, anywhere in the working tree.

What it does not look at, and why, is written out in scripts/gate_allowlist.py: git history and
docs/history/ (the record of what the project was called), the WOBO-TASKS ledger, and the QA
artifact directories. Every other survivor needs a line in the exception table with a reason.

Run: python3 scripts/gate_no_classess.py
"""

from __future__ import annotations

import re
import sys

from gate_allowlist import (
    NO_CLASSESS,
    Finding,
    excused_at,
    read_lines,
    report,
    working_tree_text_files,
)

# `clss-` is anchored on the hyphen: it was only ever an identifier prefix (--clss-ink-900,
# clss-wobo-archive-v1, clss-open-palette), so the hyphen keeps ordinary prose out of the way.
PATTERN = re.compile(r"classess|clss-", re.IGNORECASE)


def main() -> int:
    findings: list[Finding] = []
    allowed = 0
    files = working_tree_text_files()

    for path in files:
        for i, line in enumerate(read_lines(path), 1):
            # Every occurrence, not just the first: an allowlisted phrase on a line must never
            # excuse a second, different survivor that happens to share it.
            for match in PATTERN.finditer(line):
                if excused_at(NO_CLASSESS, path, line, match.start(), match.end()):
                    allowed += 1
                    continue
                findings.append(
                    Finding(
                        path,
                        i,
                        line,
                        f'"{match.group(0)}" — the old brand, or its `clss-` prefix',
                    )
                )

    return report("no-classess", findings, allowed, len(files))


if __name__ == "__main__":
    sys.exit(main())
