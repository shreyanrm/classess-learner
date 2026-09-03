"""Re-flow a two-column pdftotext -layout page into single-column reading order."""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import load


def gutter(lines):
    """x with the most all-space columns near the middle."""
    width = max((len(l) for l in lines), default=0)
    if width < 60:
        return None
    lo, hi = int(width * 0.35), int(width * 0.65)
    best, bestscore = None, -1
    for x in range(lo, hi):
        score = sum(1 for l in lines if len(l) <= x or l[x] == " ")
        blanks = sum(1 for l in lines if l.strip())
        if score >= bestscore and blanks:
            best, bestscore = x, score
    ok = sum(1 for l in lines if l.strip() and (len(l) <= best or l[best] == " "))
    total = sum(1 for l in lines if l.strip())
    return best if total and ok / total > 0.97 else None


def reflow(key, min_lines=6):
    text = load(key)
    out, pages = [], text.split("\f")
    for n, p in enumerate(pages, 1):
        lines = p.split("\n")
        g = gutter([l for l in lines if l.strip()]) if len([l for l in lines if l.strip()]) >= min_lines else None
        if g is None:
            out.append((n, "\n".join(lines)))
            continue
        left = [l[:g].rstrip() for l in lines]
        right = [l[g:].rstrip() for l in lines]
        while left and not left[-1].strip():
            left.pop()
        while right and not right[-1].strip():
            right.pop()
        out.append((n, "\n".join(left) + "\n" + "\n".join(right)))
    return out


def flat(key, **kw):
    return "\n".join("\f[page %d]\n%s" % (n, t) for n, t in reflow(key, **kw))


if __name__ == "__main__":
    print(flat(sys.argv[1]))
