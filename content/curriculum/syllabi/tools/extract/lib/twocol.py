"""Re-flow a two-column pdftotext -layout page into single-column reading order."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import load


def gutter(lines):
    """x with the most all-space columns near the middle."""
    width = max((len(line) for line in lines), default=0)
    if width < 60:
        return None
    lo, hi = int(width * 0.35), int(width * 0.65)
    best, bestscore = None, -1
    for x in range(lo, hi):
        score = sum(1 for line in lines if len(line) <= x or line[x] == " ")
        blanks = sum(1 for line in lines if line.strip())
        if score >= bestscore and blanks:
            best, bestscore = x, score
    ok = sum(1 for line in lines if line.strip() and (len(line) <= best or line[best] == " "))
    total = sum(1 for line in lines if line.strip())
    return best if total and ok / total > 0.97 else None


def reflow(key, min_lines=6):
    text = load(key)
    out, pages = [], text.split("\f")
    for n, p in enumerate(pages, 1):
        lines = p.split("\n")
        g = (
            gutter([line for line in lines if line.strip()])
            if len([line for line in lines if line.strip()]) >= min_lines
            else None
        )
        if g is None:
            out.append((n, "\n".join(lines)))
            continue
        left = [line[:g].rstrip() for line in lines]
        right = [line[g:].rstrip() for line in lines]
        while left and not left[-1].strip():
            left.pop()
        while right and not right[-1].strip():
            right.pop()
        out.append((n, "\n".join(left) + "\n" + "\n".join(right)))
    return out


def flat(key, **kw):
    return "\n".join(f"\f[page {n}]\n{t}" for n, t in reflow(key, **kw))


if __name__ == "__main__":
    print(flat(sys.argv[1]))
