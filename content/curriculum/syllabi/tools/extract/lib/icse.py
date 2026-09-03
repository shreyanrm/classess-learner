"""Parse a CISCE (ICSE / ISC) subject syllabus into class -> numbered unit -> topic."""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNIT = re.compile(r"^\s{0,4}(\d{1,2})\.\s+([A-Z][^.]{2,70})\s*$")
SUB = re.compile(r"^\s{0,8}\((i{1,3}|iv|v|vi{0,3}|ix|x{1,2}i{0,3})\)\s+(\S.*?)\s*$")
CLASS = re.compile(r"^\s*CLASS\s+(XI{0,2}|IX|X)\s*$")
FOOT = re.compile(r"^\s*(ICSE|ISC)\s+Examination\s+Year|^\s*\d{1,3}\s*$")


def parse(key):
    path = os.path.join(HERE, "lay2", key + ".txt")
    text = open(path, encoding="utf-8", errors="replace").read()
    lines, page, pages = [], 1, []
    for l in text.split("\n"):
        m = re.match(r"\f\[page (\d+)\]", l)
        if m:
            page = int(m.group(1))
            continue
        lines.append(l)
        pages.append(page)
    classes, cur_class, cur_unit, cur_sub = [], None, None, None
    for i, l in enumerate(lines):
        if FOOT.match(l):
            continue
        m = CLASS.match(l)
        if m:
            cur_class = {"class": m.group(1), "page": pages[i], "units": []}
            classes.append(cur_class)
            cur_unit = cur_sub = None
            continue
        if cur_class is None:
            continue
        m = UNIT.match(l)
        if m and not re.match(r"^\s*\d+\.\s+To\b", l):
            cur_unit = {"number": int(m.group(1)),
                        "title": re.sub(r"\s{2,}", " ", m.group(2)).strip(),
                        "page": pages[i], "topics": [], "text": []}
            cur_class["units"].append(cur_unit)
            cur_sub = None
            continue
        # a unit heading whose number was split across the column gutter
        m = re.match(r"^\s{0,2}([A-Z][A-Za-z ,&/'()-]{3,44})\s*$", l)
        if m and cur_unit is not None:
            tail = " ".join((cur_sub or cur_unit)["text"][-3:]).rstrip()
            mm = re.search(r"(?:^|\s)(\d{1,2})\.$", tail)
            if mm and int(mm.group(1)) == cur_unit["number"] + 1:
                (cur_sub or cur_unit)["text"][-1] = re.sub(r"(?:^|\s)\d{1,2}\.$", "",
                                                           (cur_sub or cur_unit)["text"][-1])
                cur_unit = {"number": int(mm.group(1)),
                            "title": re.sub(r"\s{2,}", " ", m.group(1)).strip(),
                            "page": pages[i], "topics": [], "text": []}
                cur_class["units"].append(cur_unit)
                cur_sub = None
                continue
        if cur_unit is None:
            continue
        m = SUB.match(l)
        if m:
            cur_sub = {"key": m.group(1), "title": re.sub(r"\s{2,}", " ", m.group(2)).strip(),
                       "page": pages[i], "text": []}
            cur_unit["topics"].append(cur_sub)
            continue
        (cur_sub or cur_unit)["text"].append(l.strip())
    for c in classes:
        for u in c["units"]:
            u["text"] = re.sub(r"\s{2,}", " ", " ".join(x for x in u["text"] if x)).strip()
            for t in u["topics"]:
                t["text"] = re.sub(r"\s{2,}", " ", " ".join(x for x in t["text"] if x)).strip()
    return classes


if __name__ == "__main__":
    for c in parse(sys.argv[1]):
        print("######## CLASS", c["class"], "p", c["page"])
        for u in c["units"]:
            print("  %2d. %-45s p%s  %s" % (u["number"], u["title"], u["page"], u["text"][:60]))
            for t in u["topics"]:
                print("       (%s) %s" % (t["key"], t["title"][:70]))
