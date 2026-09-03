"""Pull the 'student will be able to' / learning-outcome bullets out of a CBSE
2026-27 curriculum PDF's extracted text, one block per chapter section."""

import re
import sys

BULLET = "•▪–‐-"


def load(key):
    return open(f"txt/{key}.txt", encoding="utf-8").read()


def pagemap(t):
    p = re.split(r"\f\[page (\d+)\]\n", t)[1:]
    return list(zip([int(x) for x in p[0::2]], p[1::2], strict=False))


def flat(t):
    """text with page markers -> (chars, page_of_char)"""
    out, pages = [], []
    for n, body in pagemap(t):
        out.append(body)
        pages.append((sum(len(x) for x in out[:-1]), n))
    return "".join(out), pages


def page_at(pages, idx):
    cur = pages[0][1]
    for start, n in pages:
        if start <= idx:
            cur = n
        else:
            break
    return cur


DEHYPH = [
    (re.compile(r"([A-Za-z])\s*\n\s*-\s*\n\s*([A-Za-z])"), r"\1-\2"),
]


def clean(s):
    s = s.replace("’", "'").replace("‘", "'")
    s = re.sub(r"\s*\n\s*", " ", s)
    s = re.sub(r"(?<=\w)\s-\s(?=\w)", "-", s)
    s = re.sub(r"(?<=[a-z])\s+(?=[a-z]{1,3}\b)", " ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    s = re.sub(r"\s+([,.;:)])", r"\1", s)
    s = re.sub(r"\(\s+", "(", s)
    return s.strip(" .;")


def fix_split_words(s):
    # the extractor sometimes splits a word across a line: "commu nication"
    return s


def blocks(key, header_re, outcome_re=r"(?:The student will be able to|Learning Outcomes?)"):
    t = load(key)
    text, pages = flat(t)
    heads = [(m.start(), m.group(0)) for m in re.finditer(header_re, text)]
    res = []
    for i, (pos, raw) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(text)
        seg = text[pos:end]
        m = re.search(outcome_re, seg)
        body = seg[m.end() :] if m else ""
        items = split_bullets(body)
        res.append(
            {"header": clean(raw), "page": page_at(pages, pos), "objectives": items, "raw": seg}
        )
    return res


def split_bullets(body):
    body = re.sub(r"C\s*-?\s*\n?\s*\d+\.\d+\s*\n", "\n• ", body)
    parts = re.split(rf"\n\s*[{re.escape(BULLET)}]\s*\n?", "\n" + body)
    out = []
    for p in parts[1:]:
        c = clean(p)
        if 8 < len(c) < 400:
            out.append(c)
    return out


if __name__ == "__main__":
    key, hdr = sys.argv[1], sys.argv[2]
    for b in blocks(key, hdr):
        print("### p{}  {}".format(b["page"], b["header"]))
        for o in b["objectives"]:
            print("   -", o)
