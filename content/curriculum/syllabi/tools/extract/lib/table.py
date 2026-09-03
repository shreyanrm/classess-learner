"""Split a CBSE 'theme / outline / outcomes' table into per-theme column text.

Boundaries are found per line: the outcomes column is the last long run of
spaces before a bullet that sits right of `cut_min`.
"""

import re
import sys
from pathlib import Path


def rows(path, a, b, cut_min=36, drop=r"^\s*\d+\s*$|^\s*Page|indd"):
    lines = Path(path).read_text(encoding="utf-8").split("\n")[a - 1 : b]
    out = []
    for ln in lines:
        if re.search(drop, ln):
            continue
        # find the split point: first bullet at or right of cut_min, else a wide gap
        cut = None
        for m in re.finditer(r"•", ln):
            if m.start() >= cut_min:
                cut = m.start()
                break
        if cut is None:
            m = re.search(r"\S\s{4,}(?=\S)", ln[cut_min - 8 :] if len(ln) > cut_min else "")
            cut = (cut_min - 8) + m.end() if m else None
        left = ln[:cut] if cut else ln
        right = ln[cut:] if cut else ""
        out.append((left.rstrip(), right.rstrip()))
    return out


def join_bullets(cells):
    items, cur = [], []
    for s in cells:
        s = s.strip()
        if not s:
            continue
        if s.startswith("•"):
            if cur:
                items.append(" ".join(cur))
            cur = [s.lstrip("• ").strip()]
        elif cur:
            cur.append(s)
        else:
            cur = [s]
    if cur:
        items.append(" ".join(cur))
    return [re.sub(r"\s{2,}", " ", i).strip(" .;,") for i in items if i.strip()]


if __name__ == "__main__":
    path, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    cut_min = int(sys.argv[4]) if len(sys.argv) > 4 else 36
    r = rows(path, a, b, cut_min)
    print("---- LEFT (theme + outline)")
    for i in join_bullets([x[0] for x in r]):
        print("  *", i)
    print("---- RIGHT (outcomes)")
    for i in join_bullets([x[1] for x in r]):
        print("  -", i)
