"""Unit headings per class from a CISCE subject syllabus (two-column pages)."""
import re, sys, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLASS = re.compile(r"^\s*CLASS\s+(XI{0,2}|IX|X)\s*$")
NUM = re.compile(r"(?:^|\s{2,})(\d{1,2})\.\s+([A-Z][A-Za-z0-9 ,&/'’()\-]{2,55}?)(?=\s{3,}|$)")
STOPWORDS = ("to ", "the candidate", "determine", "measure", "obtain", "place", "using",
             "trace", "calculate", "lever", "for a", "plot", "study of the effect")


def units(key, gutter=55):
    lines = open(os.path.join(HERE, "lay", key + ".txt"), encoding="utf-8",
                 errors="replace").read().split("\n")
    page, pages = 1, []
    for l in lines:
        pages.append(page)
        page += l.count("\f")
    sections, cur = [], None
    stop = False
    for i, l in enumerate(lines):
        raw = l.replace("\f", "")
        m = CLASS.match(raw)
        if m:
            cur = {"class": m.group(1), "page": pages[i], "cands": []}
            sections.append(cur)
            stop = False
            continue
        if cur is None:
            continue
        if re.search(r"^\s*(INTERNAL ASSESSMENT|LIST OF SUGGESTED|EVALUATION|PRACTICAL WORK"
                     r"|SI\s+UNITS|GUIDELINES FOR|Note:)", raw):
            stop = True
        if stop:
            continue
        for mm in NUM.finditer(raw):
            title = mm.group(2).strip().rstrip(".")
            if title.lower().startswith(STOPWORDS) or len(title) < 3:
                continue
            col = 0 if mm.start(1) < gutter else 1
            cur["cands"].append({"n": int(mm.group(1)), "title": title,
                                 "page": pages[i], "order": (pages[i], col, i)})
    out = []
    for s in sections:
        chosen, last = [], None
        want = 1
        for c in sorted(s["cands"], key=lambda x: x["order"]):
            if c["n"] != want:
                continue
            if last and c["order"] < last:
                continue
            chosen.append({"number": c["n"], "title": c["title"], "page": c["page"]})
            last = c["order"]
            want += 1
        out.append({"class": s["class"], "page": s["page"], "units": chosen})
    return out


if __name__ == "__main__":
    for c in units(sys.argv[1]):
        print("## CLASS", c["class"])
        for u in c["units"]:
            print("   %2d. %-52s p%s" % (u["number"], u["title"], u["page"]))
