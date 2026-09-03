"""Right column (learning outcomes / competencies) per chapter block."""

import json
import re
import sys
from pathlib import Path

path = sys.argv[1]
head_re = sys.argv[2] if len(sys.argv) > 2 else r"No\. of [Pp]eriods"
lines = Path(path).read_text(encoding="utf-8").split("\n")
heads = [i for i, line in enumerate(lines) if re.search(head_re, line)]
heads.append(len(lines))
res = []
for a, b in zip(heads, heads[1:], strict=False):
    title = re.split(r"\s*No\. of [Pp]eriods", lines[a])[0].strip()
    block = lines[a + 1 : b]
    cand = [m.end() for line in block for m in re.finditer(r"\bC\s?-\s?\d\.\d\b", line)]
    cut = min(cand) if cand else 30
    items, cur = [], []
    for line in block:
        s = line[cut:].rstrip()
        s = re.sub(r"^\s*C\s?-\s?\d\.\d\s*", "", s).strip()
        if not s or re.fullmatch(r"[\d\s]+", s):
            continue
        if s.startswith("•"):
            if cur:
                items.append(" ".join(cur))
            cur = [s.lstrip("• ").strip()]
        elif cur:
            cur.append(s)
    if cur:
        items.append(" ".join(cur))
    out = []
    for it in items:
        it = re.sub(r"\s{2,}", " ", it).strip(" ;,.")
        for piece in re.split(r"\s+(?:C\s?-?\s?)?\d(?:\.\d)?\s*•\s*|\s+•\s+", it):
            piece = re.sub(r"^\s*[-–]?\s*\d?\.?\d?\s*", "", piece).strip(" ;,.")
            if len(piece) > 6:
                out.append(piece)
    res.append({"title": title, "cut": cut, "objectives": out})
if "--json" in sys.argv:
    print(json.dumps(res, ensure_ascii=False, indent=1))
else:
    for r in res:
        print(f"### {r['title']} [cut {r['cut']}]")
        for o in r["objectives"]:
            print("   -", o)
