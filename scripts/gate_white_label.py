#!/usr/bin/env python3
"""Gate 2 — white-label.

WOBO-PLAN §17: "White-label means nobody using or inspecting the product can tell which models or
vendors are underneath … no provider or model name in any response, error, header, log the client
can see, bundle string, email, or legal page." §1 says the same from the other end: provider
errors are rewritten in Wobo's voice, and model ids never leave the brain.

Three scans, because "user-visible" means three different things in three places:

  1. THE BUILT BUNDLE — apps/web-pwa/dist. Everything here ships to a browser and can be read by
     anyone who opens devtools, so the whole bundle is in scope, minified strings included.
     Requires a build first; a missing dist is a hard failure, never a silent skip.

  2. THE GATEWAY'S USER-FACING STRINGS — parsed, not grepped. A gateway module is allowed to name
     a provider (routing.py and providers.py exist to do exactly that); what it may never do is
     put that name in something a client receives. So this walks the AST and reads only the
     strings that reach a client: `detail=` on an HTTPException, `JSONResponse(content=…)`,
     everything in the email modules, and any constant whose name marks it as copy
     (…_COPY, …_MESSAGE, …_FALLBACK, …_REFUSAL, …_SAY).

  3. PACKAGE AND APP SOURCE — packages/*/src, apps/web-pwa/src, platform/*/src. Source, so that a
     leak is caught at review time rather than after the next build.

  4. PUBLISHED COPY — docs/legal/** and docs/copy/**. §17 names "email, or legal page" explicitly,
     and the only thing standing between a draft privacy policy and a published one is a paste.
     The escape hatch §17 grants is the generic phrase "third-party AI and infrastructure
     providers", which names nobody and so trips nothing here.

Internal ARCHITECTURE prose (WOBO.md, DESIGN.md, the rest of docs/) is deliberately out of scope:
those files have to be able to say "voice via Gemini" to be useful to the people building it.
Nothing in them ships.

Every exception is in scripts/gate_allowlist.py with its reason.

Run: python3 scripts/gate_white_label.py
"""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

from gate_allowlist import (
    REPO,
    WHITE_LABEL,
    Finding,
    excused_at,
    read_lines,
    report,
)

# Providers, model families, and the two platform vendors whose names would otherwise leak
# through hostnames. Word-anchored throughout, so a syllabus topic ("railways", "gemini" as the
# constellation in an astronomy chapter would still trip and needs an allowlist line) does not
# quietly become a vendor.
TOKENS = re.compile(
    r"\b(gemini|openai|anthropic|claude|litellm|supabase|railway|vercel|gpt-?\d[\w.-]*)\b",
    re.IGNORECASE,
)

# Context kept around a hit in a minified bundle, where "the line" is the whole file.
WINDOW = 90

# Constant names that mark a string as copy a learner can read.
COPY_NAME = re.compile(r"(COPY|MESSAGE|FALLBACK|REFUSAL|_SAY|SAY_|SUBJECT|BODY|GREETING)")

USER_FACING_MODULES = ("email.py", "email_templates.py")


def scan_bundle() -> tuple[list[Finding], int, int]:
    """Scan 1 — every string that ships to a browser."""
    dist = REPO / "apps/web-pwa/dist"
    if not dist.is_dir():
        print(
            "✗ white-label: apps/web-pwa/dist is missing. Build the web app first "
            "(cd apps/web-pwa && bun run build) — this gate reads the real bundle, and a "
            "skipped scan is worse than no gate.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    findings: list[Finding] = []
    allowed = 0
    files = [p for p in sorted(dist.rglob("*")) if p.is_file()]
    for p in files:
        rel = str(p.relative_to(REPO))
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for m in TOKENS.finditer(text):
            if excused_at(WHITE_LABEL, rel, text, m.start(), m.end()):
                allowed += 1
                continue
            context = text[max(0, m.start() - WINDOW) : m.end() + WINDOW]
            line_no = text.count("\n", 0, m.start()) + 1
            findings.append(
                Finding(rel, line_no, context, f'"{m.group(0)}" ships in the bundle')
            )
    return findings, allowed, len(files)


def _user_facing_strings(path: Path) -> list[tuple[int, str]]:
    """Every string literal in this module that a client can receive."""
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (SyntaxError, UnicodeDecodeError, OSError):
        return []

    out: list[tuple[int, str]] = []

    def strings_under(node: ast.AST) -> list[tuple[int, str]]:
        return [
            (n.lineno, n.value)
            for n in ast.walk(node)
            if isinstance(n, ast.Constant) and isinstance(n.value, str)
        ]

    if path.name in USER_FACING_MODULES:
        return strings_under(tree)

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            for kw in node.keywords:
                if kw.arg in ("detail", "content"):
                    out.extend(strings_under(kw.value))
        elif isinstance(node, ast.Assign):
            names = [t.id for t in node.targets if isinstance(t, ast.Name)]
            if any(COPY_NAME.search(n) for n in names):
                out.extend(strings_under(node.value))
        elif (
            isinstance(node, ast.AnnAssign)
            and isinstance(node.target, ast.Name)
            and COPY_NAME.search(node.target.id)
            and node.value is not None
        ):
            out.extend(strings_under(node.value))
    return out


def scan_gateway() -> tuple[list[Finding], int, int]:
    """Scan 2 — the gateway strings a client can see."""
    findings: list[Finding] = []
    allowed = 0
    roots = [
        REPO / "services/gateway/src",
        REPO / "services/verifier/src",
        REPO / "services/contracts/src",
    ]
    files = [p for root in roots if root.is_dir() for p in sorted(root.rglob("*.py"))]
    for p in files:
        rel = str(p.relative_to(REPO))
        for line_no, value in _user_facing_strings(p):
            for m in TOKENS.finditer(value):
                if excused_at(WHITE_LABEL, rel, value, m.start(), m.end()):
                    allowed += 1
                    continue
                findings.append(
                    Finding(rel, line_no, value, f'"{m.group(0)}" in a string the client receives')
                )
    return findings, allowed, len(files)


def strip_comments(text: str) -> str:
    """Blank out `//` and `/* */` comments, preserving line numbers and every string literal.

    Comments never reach a browser — the minifier drops them — and an engineer explaining which
    account layer a seam talks to is writing the same internal prose WOBO.md is allowed to write.
    What must stay in scope is everything that survives a build: string and template literals,
    JSX text, CSS values. So this walks the file character by character rather than reaching for
    a regex, because `https://…` inside a string is not a comment and a naive pattern eats it.
    """
    out: list[str] = []
    i, n = 0, len(text)
    quote: str | None = None
    while i < n:
        ch = text[i]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'`":
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                out.append(" ")
                i += 1
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "*":
            while i < n and not (text[i] == "*" and i + 1 < n and text[i + 1] == "/"):
                out.append("\n" if text[i] == "\n" else " ")
                i += 1
            out.append("  ")
            i += 2
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def scan_source() -> tuple[list[Finding], int, int]:
    """Scan 3 — package and app source, comments excluded (see strip_comments)."""
    findings: list[Finding] = []
    allowed = 0
    roots = [
        *(REPO / "packages").glob("*/src"),
        *(REPO / "packages").glob("*/test"),
        REPO / "apps/web-pwa/src",
        *(REPO / "platform").glob("*/src"),
    ]
    exts = {".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"}
    files = [
        p
        for root in roots
        if root.is_dir()
        for p in sorted(root.rglob("*"))
        if p.is_file() and p.suffix in exts
    ]
    for p in files:
        rel = str(p.relative_to(REPO))
        source = "\n".join(read_lines(rel))
        code = source if p.suffix == ".json" else strip_comments(source)
        for i, line in enumerate(code.splitlines(), 1):
            for m in TOKENS.finditer(line):
                if excused_at(WHITE_LABEL, rel, line, m.start(), m.end()):
                    allowed += 1
                    continue
                findings.append(Finding(rel, i, line, f'"{m.group(0)}" in shipped source'))
    return findings, allowed, len(files)


def scan_published_copy() -> tuple[list[Finding], int, int]:
    """Scan 4 — the legal pages and the marketing/help copy a learner reads."""
    findings: list[Finding] = []
    allowed = 0
    roots = [REPO / "docs/legal", REPO / "docs/copy"]
    files = [
        p
        for root in roots
        if root.is_dir()
        for p in sorted(root.rglob("*"))
        if p.is_file() and p.suffix in {".md", ".mdx", ".txt", ".html"}
    ]
    for p in files:
        rel = str(p.relative_to(REPO))
        for i, line in enumerate(read_lines(rel), 1):
            for m in TOKENS.finditer(line):
                if excused_at(WHITE_LABEL, rel, line, m.start(), m.end()):
                    allowed += 1
                    continue
                findings.append(Finding(rel, i, line, f'"{m.group(0)}" in published copy'))
    return findings, allowed, len(files)


def main() -> int:
    findings: list[Finding] = []
    allowed = 0
    scanned = 0
    for scan in (scan_bundle, scan_gateway, scan_source, scan_published_copy):
        f, a, n = scan()
        findings += f
        allowed += a
        scanned += n
    return report("white-label", findings, allowed, scanned)


if __name__ == "__main__":
    sys.exit(main())
