"""Unit blocks of prose-style CBSE senior-secondary syllabi."""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import load


def unit_blocks(
    key, start, end, unit_re=r"^\s*Unit[\s\-–]*(\d+|[IVXLC]+)\s*:?\s+(.+?)\s*$", sub_re=None
):
    lines = load(key).split("\n")
    page, pages = 1, []
    for line in lines:
        pages.append(page)
        page += line.count("\f")
    out, cur, sub = [], None, None
    for i in range(start - 1, min(end, len(lines))):
        line = lines[i].replace("\f", "").rstrip()
        if not line.strip() or re.fullmatch(r"\s*\d{1,3}\s*", line):
            continue
        m = re.match(unit_re, line)
        if m and not re.match(r"^\s*Unit\s*$", line):
            cur = {
                "key": m.group(1),
                "title": re.sub(r"\s{2,}", " ", m.group(2)).strip(),
                "page": pages[i],
                "text": [],
                "subs": [],
            }
            out.append(cur)
            sub = None
            continue
        if cur is None:
            continue
        if sub_re:
            m2 = re.match(sub_re, line)
            if m2:
                sub = {
                    "number": m2.group(1),
                    "title": re.sub(r"\s{2,}", " ", m2.group(2)).strip(),
                    "page": pages[i],
                    "text": [],
                }
                cur["subs"].append(sub)
                continue
        (sub or cur)["text"].append(line.strip())
    for u in out:
        u["text"] = re.sub(r"\s{2,}", " ", " ".join(u["text"])).strip()
        for s in u["subs"]:
            s["text"] = re.sub(r"\s{2,}", " ", " ".join(s["text"])).strip()
    return out


SPLIT = re.compile(r",(?![^(]*\))(?!\s*(?:[a-z]-|f-|d-|p-|s-))\s+(?=[A-Z(])|;\s+")


def items(text):
    text = re.sub(r"\.\s*$", "", text)
    parts = []
    for chunk in re.split(r"(?<=[a-z\)])\.\s+(?=[A-Z])", text):
        for p in SPLIT.split(chunk):
            p = p.strip(" .,;")
            if len(p) > 2:
                parts.append(p)
    merged = []
    for p in parts:
        if merged and len(merged[-1].split()) <= 1:
            merged[-1] = merged[-1] + ", " + p
        else:
            merged.append(p)
    return merged


if __name__ == "__main__":
    for u in unit_blocks(
        sys.argv[1],
        int(sys.argv[2]),
        int(sys.argv[3]),
        sub_re=(sys.argv[4] if len(sys.argv) > 4 else None),
    ):
        print("== Unit {}: {} (p{})".format(u["key"], u["title"], u["page"]))
        for it in items(u["text"]):
            print("     -", it)
        for s in u["subs"]:
            print("   ## Chapter {}: {} (p{})".format(s["number"], s["title"], s["page"]))
            for it in items(s["text"]):
                print("       -", it)
