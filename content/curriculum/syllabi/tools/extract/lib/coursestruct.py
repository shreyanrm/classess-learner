"""Parse a CBSE senior-secondary 'UNIT / CHAPTERS / MARKS' course-structure table."""
import re, sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import load

UNIT_RE = re.compile(r"^\s{0,8}Unit\s*[–\-—]?\s*([IVXLC]{1,5})\s+([A-Z].*?)\s*(\d{1,2})?\s*$")
CH_RE = re.compile(r"^\s*Chapter\s*[–\-—]\s*(\d+)\s*:\s*(.+?)\s{2,}(\d{1,2})\s*$|^\s*Chapter\s*[–\-—]\s*(\d+)\s*:\s*(.+?)\s*$")


def parse(key, start, end):
    lines = load(key).split("\n")
    page, pages = 1, []
    for l in lines:
        pages.append(page)
        page += l.count("\f")
    units, cur = [], None
    for i in range(start - 1, min(end, len(lines))):
        l = lines[i].replace("\f", "")
        m = UNIT_RE.match(l)
        if m:
            cur = {"roman": m.group(1), "title": re.sub(r"\s{2,}", " ", m.group(2)).strip(),
                   "page": pages[i], "chapters": [], "marks": int(m.group(3)) if m.group(3) else None}
            units.append(cur)
            continue
        m = CH_RE.match(l)
        if m and cur is not None:
            num = m.group(1) or m.group(4)
            title = (m.group(2) or m.group(5)).strip()
            marks = int(m.group(3)) if m.group(3) else None
            cur["chapters"].append({"number": int(num), "title": re.sub(r"\s{2,}", " ", title),
                                    "page": pages[i]})
            if marks and cur["marks"] is None:
                cur["marks"] = marks
            continue
        m2 = re.match(r"^\s*(\d{1,2})\s*$", l)
        if m2 and cur is not None and cur["marks"] is None:
            cur["marks"] = int(m2.group(1))
            continue
        # continuation of a wrapped chapter title
        if cur is not None and cur["chapters"] and l.strip() and not l.strip().isdigit():
            txt = l.strip()
            if re.match(r"^(and|of|the|in|to|for)\b", txt) or (txt[:1].islower() and len(txt) < 60):
                cur["chapters"][-1]["title"] += " " + re.sub(r"\s{2,}", " ", txt)
    return units


if __name__ == "__main__":
    for u in parse(sys.argv[1], int(sys.argv[2]), int(sys.argv[3])):
        print("== %-6s %-50s marks=%s p%s" % (u["roman"], u["title"], u["marks"], u["page"]))
        for c in u["chapters"]:
            print("     %2d. %s (p%s)" % (c["number"], c["title"], c["page"]))
