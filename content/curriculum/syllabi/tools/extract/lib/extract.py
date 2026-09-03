"""Chapter blocks with page numbers and right-column objectives, from layout text."""
import re, json, os

BUL = "\u2022\uf0b7\u25aa\u2023\uf077\uf0a7"

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(key):
    return open(os.path.join(HERE, "lay", key + ".txt"), encoding="utf-8", errors="replace").read()


def blocks(key, head_re=r"No\. of [Pp]eriods", title_split=r"\s*No\. of [Pp]eriods"):
    text = load(key)
    lines = text.split("\n")
    page, pages = 1, []
    for l in lines:
        pages.append(page)
        page += l.count("\f")
    heads = [i for i, l in enumerate(lines) if re.search(head_re, l)]
    heads.append(len(lines))
    res = []
    for a, b in zip(heads, heads[1:]):
        title = re.split(title_split, lines[a])[0].strip().lstrip("\f").strip()
        block = lines[a + 1:b]
        cand = [m.end() for l in block for m in re.finditer(r"\bC\s?-\s?\d\.\d\b", l)]
        cut = min(cand) if cand else 30
        items, cur = [], []
        for l in block:
            s = re.sub(r"^\s*C\s?-\s?\d\.\d\s*", "", l[cut:].rstrip()).strip()
            if not s or re.fullmatch(r"[\d\s\f]+", s):
                continue
            if s[:1] in BUL:
                if cur:
                    items.append(" ".join(cur))
                cur = [s.lstrip("".join(BUL) + " ").strip()]
            elif cur:
                cur.append(s)
        if cur:
            items.append(" ".join(cur))
        out = []
        for it in items:
            it = re.sub(r"\s{2,}", " ", it).strip(" ;,.")
            for piece in re.split(r"\s+(?:C\s?-?\s?)?\d(?:\.\d)?\s*•\s*|\s+•\s+", it):
                piece = re.sub(r"^\s*[-–]?\s*\d?\.?\d?\s*", "", piece).strip(" ;,.")
                piece = re.sub(r"\s*\f\s*", " ", piece).strip()
                if len(piece) > 6:
                    out.append(piece)
        res.append({"title": title, "page": pages[a], "objectives": out})
    return res


def by_title(key, **kw):
    return {b["title"]: b for b in blocks(key, **kw)}


def right_column(key, cut=None, code_re=r"\b(?:CG|C)\s?-\s?\d"):
    """Whole right-hand column of a two/three column table, as bullet items with pages."""
    lines = load(key).split("\n")
    page, pages = 1, []
    for l in lines:
        pages.append(page)
        page += l.count("\f")
    if cut is None:
        cand = [m.end() for l in lines for m in re.finditer(code_re + r"(?:\.\d)?\b", l)]
        cut = min(cand) if cand else 48
    items, cur, curpage = [], [], 1
    for i, l in enumerate(lines):
        s = re.sub(r"^\s*(?:CG|C)\s?-\s?\d(?:\.\d)?\s*,?\s*", "", l[cut:].rstrip()).strip()
        s = re.sub(r"\f", "", s).strip()
        if not s or re.fullmatch(r"[\d\s]+", s):
            continue
        if s[:1] in BUL:
            if cur:
                items.append((curpage, " ".join(cur)))
            cur, curpage = [s.lstrip("• ").strip()], pages[i]
        elif cur:
            cur.append(s)
        else:
            cur, curpage = [s], pages[i]
    if cur:
        items.append((curpage, " ".join(cur)))
    out = []
    for p, it in items:
        it = re.sub(r"\s{2,}", " ", it).strip(" ;,.")
        out.append((p, it))
    return out


def right_column_pp(key, marker=r"The student will be able to", fallback=48):
    """Right column with a per-page cut, taken from the position of `marker` on
    that page (carried forward when a page has none)."""
    lines = load(key).split("\n")
    page, pages = 1, []
    for l in lines:
        pages.append(page)
        page += l.count("\f")
    cuts = {}
    for i, l in enumerate(lines):
        m = re.search(marker, l)
        if m:
            cuts.setdefault(pages[i], m.start())
    cut, items, cur, curpage = fallback, [], [], 1
    seen = {}
    for p in sorted(set(pages)):
        seen[p] = cuts.get(p, None)
    last = fallback
    for p in sorted(seen):
        if seen[p] is None:
            seen[p] = last
        else:
            last = seen[p]
    for i, l in enumerate(lines):
        c = seen[pages[i]]
        mk = re.search(marker, l)
        if mk:
            if cur:
                items.append((curpage, " ".join(cur)))
                cur = []
            items.append((pages[i], "@@MARK@@"))
            tail = l[mk.end():].lstrip(": ").rstrip()
            l = (" " * c) + tail if tail.strip() else ""
            if not l.strip():
                continue
        s = l[c:].rstrip()
        s = re.sub(r"^\s*(?:CG|C)\s?-\s?\d(?:\.\d)?\s*,?\s*", "", s).strip()
        s = re.sub(r"\f", "", s).strip()
        if not s or re.fullmatch(r"[\d\s]+", s):
            continue
        if s[:1] in BUL:
            if cur:
                items.append((curpage, " ".join(cur)))
            cur = [s.lstrip("".join(BUL) + " ").strip()]
            curpage = pages[i]
        elif cur or items:
            if cur:
                cur.append(s)
            else:
                cur = [s]
                curpage = pages[i]
    if cur:
        items.append((curpage, " ".join(cur)))
    out = []
    for p, it in items:
        it = re.sub(r"\s{2,}", " ", it).strip(" ;,.")
        if it:
            out.append((p, it))
    return out


def chapter_objectives(key, chapter_titles, **kw):
    """Split the right column at each 'student will be able to' marker and hand
    the resulting groups to the chapter titles, in order."""
    col = right_column_pp(key, **kw)
    groups, cur, pages = [], [], []
    for p, it in col:
        if it == "@@MARK@@":
            if cur:
                groups.append((pages[0], cur))
            cur, pages = [], [p]
        else:
            if not pages:
                pages = [p]
            cur.append(it)
    if cur:
        groups.append((pages[0], cur))
    return groups


def theme_table(key, start, end, theme_re=r"^\s{0,4}(\d{1,2})\.\s+(\S.*)$"):
    """CBSE 'S.No / Theme / Outline / Learning outcomes' table -> per-theme
    left-column (outline) and right-column (outcomes) bullet lists.

    Column cut is found per line: the first bullet or competency code that sits
    right of the widest left-column bullet on that page.
    """
    lines = load(key).split("\n")
    page, pages = 1, []
    for l in lines:
        pages.append(page)
        page += l.count("\f")
    sub = list(range(start - 1, min(end, len(lines))))
    # left bullet x = the modal small x; right column starts after it
    xs = [m.start() for i in sub for m in re.finditer("[" + BUL + "]", lines[i])]
    left = sorted(x for x in xs if x < 40)
    lx = max(left) if left else 22
    rows, cur = [], None
    for i in sub:
        l = lines[i]
        m = re.match(theme_re, l)
        if m and len(m.group(2).strip()) > 2 and not re.match(r"^\s*\d+\s*$", l):
            cur = {"no": int(m.group(1)), "title_parts": [], "page": pages[i],
                   "left": [], "right": []}
            rows.append(cur)
        if cur is None:
            continue
        head = l[:6].strip()
        title_zone = l[5:lx - 1] if lx > 8 else ""
        body_left = l[lx - 1:] if lx > 8 else l
        # split body into left (outline) and right (outcomes)
        cut = None
        for mm in re.finditer("[" + BUL + "]", body_left):
            if mm.start() > 6:
                cut = mm.start()
                break
        if cut is None:
            mm = re.search(r"\b(?:C|CG)\s?-?\s?\d(?:\.\d)?\b", body_left)
            cut = mm.start() if mm and mm.start() > 6 else None
        lft = body_left[:cut] if cut else body_left
        rgt = body_left[cut:] if cut else ""
        if title_zone.strip():
            cur["title_parts"].append(title_zone.strip())
        cur["left"].append(lft.rstrip())
        cur["right"].append(rgt.rstrip())
    out = []
    for r in rows:
        out.append({
            "no": r["no"], "page": r["page"],
            "title": re.sub(r"\s{2,}", " ", " ".join(r["title_parts"])).strip(),
            "outline": _bul(r["left"]), "objectives": _bul(r["right"]),
        })
    return out


def _bul(cells):
    items, cur = [], []
    for s in cells:
        s = re.sub(r"\f", "", s).strip()
        s = re.sub(r"^\s*(?:C|CG)\s?-?\s?\d(?:\.\d)?(?:\s*,\s*(?:C|CG)\s?-?\s?\d(?:\.\d)?)*\s*", "", s)
        if not s or re.fullmatch(r"[\d\s]+", s):
            continue
        if s[:1] in BUL:
            if cur:
                items.append(" ".join(cur))
            cur = [s.lstrip(BUL + " ").strip()]
        elif cur:
            cur.append(s)
    if cur:
        items.append(" ".join(cur))
    res = []
    for it in items:
        it = re.sub(r"\s{2,}", " ", it).strip(" ;,.")
        it = re.sub(r"(?<=[a-z])-\s+(?=[a-z])", "-", it)
        if len(it) > 4:
            res.append(it)
    return res
