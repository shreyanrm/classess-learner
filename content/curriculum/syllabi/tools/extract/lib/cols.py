"""Split a pdftotext -layout table region into columns by bullet x-positions."""
import re, sys, collections


def bullet_cols(lines):
    c = collections.Counter()
    for l in lines:
        for m in re.finditer(r"•", l):
            c[m.start()] += 1
    return c


def slice_col(lines, lo, hi):
    out = []
    for l in lines:
        seg = l[lo:hi] if hi else l[lo:]
        out.append(seg.rstrip())
    return out


def bullets(lines, lo, hi=None):
    """Join wrapped bullet items inside one column slice."""
    items, cur = [], []
    for seg in slice_col(lines, lo, hi):
        s = seg.strip()
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
    return [re.sub(r"\s{2,}", " ", i).strip(" .;") for i in items if i.strip()]


if __name__ == "__main__":
    f, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    lines = open(f, encoding="utf-8").read().split("\n")[a - 1:b]
    print(bullet_cols(lines).most_common(12))
