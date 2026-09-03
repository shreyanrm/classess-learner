"""Print the Key Concepts column of each chapter block, auto-detecting the cut."""
import re, sys, collections
path = sys.argv[1]
end_re = sys.argv[2] if len(sys.argv) > 2 else r"No\. of [Pp]eriods"
lines = open(path, encoding="utf-8").read().split("\n")
heads = [i for i, l in enumerate(lines) if re.search(end_re, l)]
heads.append(len(lines))
for a, b in zip(heads, heads[1:]):
    title = re.split(r"\s*No\. of [Pp]eriods", lines[a])[0].strip()
    block = lines[a + 1:b]
    # cut = leftmost x of a competency code (C-1.1) or of a right-column bullet
    cand = []
    for l in block:
        for m in re.finditer(r"\bC\s?-\s?\d\.\d\b", l):
            cand.append(m.start())
    cut = min(cand) if cand else 30
    if cut < 18:
        cut = 30
    print("### %s   [cut %d]" % (title, cut))
    items, cur = [], []
    for l in block:
        s = l[:cut].rstrip().strip()
        if not s or re.fullmatch(r"[\d\s]+", s) or s.startswith("Key Concepts"):
            continue
        if s.startswith("•"):
            if cur:
                items.append(" ".join(cur))
            cur = [s.lstrip("• ").strip()]
        elif cur:
            cur.append(s)
    if cur:
        items.append(" ".join(cur))
    for it in items:
        it = re.sub(r"\s{2,}", " ", it).strip(" ;,.")
        it = re.sub(r"\s*C\s?-?\s?\d?\.?\d?\s*$", "", it).strip()
        if it:
            print("   *", it)
