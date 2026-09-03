"""Modules and lessons of a NIOS course page (online course material)."""
import re, sys, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MOD = re.compile(r"^\s*MODULE\s*[-–:]?\s*([IVXLC]+|\d{1,2})\s*[:.\-]?\s*(.*?)\s*$", re.I)
LESSON = re.compile(r"^\s*(?:Chapter|Lesson)?\s*[-–]?\s*(\d{1,2})\s*[.:]\s*(.*?)\s*$", re.I)
SIZE = re.compile(r"\s*\(?\s*[\d.]+\s*(?:KB|MB)\s*\)?\s*$", re.I)
DEVA = re.compile(r"[ऀ-ॿ]")


def modules(key):
    t = open(os.path.join(HERE, "txt", key + ".txt"), encoding="utf-8", errors="replace").read()
    t = re.sub(r"[ \t]+", " ", t)
    lines = [l.strip() for l in t.split("\n") if l.strip()]
    out, cur, seen_mod = [], None, {}
    for i, l in enumerate(lines):
        if DEVA.search(l):
            continue
        m = MOD.match(l)
        if m and (m.group(2).strip() or (i + 1 < len(lines) and not MOD.match(lines[i + 1]))):
            title = SIZE.sub("", m.group(2)).strip(" :.-")
            if not title:
                nxt = lines[i + 1] if i + 1 < len(lines) else ""
                if nxt and not LESSON.match(nxt) and not DEVA.search(nxt):
                    title = SIZE.sub("", nxt).strip(" :.-")
            k = m.group(1).upper()
            if k in seen_mod and seen_mod[k]["title"].lower() == title.lower():
                cur = seen_mod[k]
                continue
            cur = {"number": k, "title": title, "lessons": [], "_seen": set()}
            seen_mod.setdefault(k, cur)
            out.append(cur)
            continue
        if cur is None:
            continue
        m = LESSON.match(l)
        if not m:
            continue
        n, body = int(m.group(1)), m.group(2)
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if not body.strip() and nxt and not LESSON.match(nxt) and not DEVA.search(nxt):
            body = nxt
        elif body.strip() and not SIZE.search(body) and nxt and re.search(r"(KB|MB)\s*\)?\s*$", nxt) \
                and not LESSON.match(nxt) and not DEVA.search(nxt):
            body = body + " " + nxt
        title = SIZE.sub("", body).strip(" :.-")
        title = re.sub(r"\s*\(\s*[\d.]*\s*$", "", title).strip()
        if not title or len(title) < 3 or n in cur["_seen"]:
            continue
        cur["_seen"].add(n)
        cur["lessons"].append({"number": n, "title": title})
    res = []
    for m in out:
        if m["lessons"]:
            m.pop("_seen", None)
            res.append(m)
    return res


if __name__ == "__main__":
    for m in modules(sys.argv[1]):
        print("== MODULE %s: %s" % (m["number"], m["title"]))
        for c in m["lessons"]:
            print("     %2d. %s" % (c["number"], c["title"]))
