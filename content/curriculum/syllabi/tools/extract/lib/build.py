"""Emit one syllabus JSON per framework+level+subject into content/curriculum/syllabi/."""
import hashlib, json, os, re


def tidy_text(s):
    """Normalise a string lifted out of a column-set PDF table.

    Removes the single stray letters that bleed in from the neighbouring column
    ('their f charge' -> 'their charge'), rejoins words split across a line
    ('real- life' -> 'real-life') and collapses runs of whitespace. Only lone
    letters that are not English words ('a', 'i') are touched.
    """
    if not isinstance(s, str):
        return s
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"(?<=[a-z])-\s+(?=[a-z])", "-", s)
    s = re.sub(r"(?<=[a-z]) [b-df-hj-mo-rt-z] (?=[a-z])", " ", s)
    s = re.sub(r"(?<=[a-z]) [b-df-hj-mo-rt-z]$", "", s)
    return s.strip(" ;,.")

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.dirname(os.path.dirname(HERE))  # content/curriculum/syllabi

_meta_cache = {}


def doc(key, title, publisher, *, layout=True):
    """Build a document record from the fetch metadata plus the extracted text hash."""
    if key in _meta_cache:
        m = dict(_meta_cache[key])
    else:
        m = json.load(open(os.path.join(HERE, "meta", key + ".json")))
        _meta_cache[key] = m
    lay = os.path.join(HERE, "lay", key + ".txt")
    if layout and os.path.exists(lay):
        text = open(lay, encoding="utf-8", errors="replace").read()
        extraction = "pdftotext -layout (poppler 25.x), cross-checked against a python-standard-library extractor"
    else:
        text = open(os.path.join(HERE, "txt", key + ".txt"), encoding="utf-8").read()
        extraction = "python standard library extractor (zlib inflate over PDF content streams)" if m["kind"] == "pdf" else "python standard library tag strip"
    return {
        "id": key.replace("_", "-"),
        "title": title,
        "publisher": publisher,
        "url": m["url"],
        "media_type": "application/pdf" if m["kind"] == "pdf" else "text/html",
        "pages": m["pages"] or None,
        "bytes": m["bytes"],
        "fetched_at": m["fetched_at"],
        "document_sha256": m["document_sha256"],
        "extracted_text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "extraction": extraction,
    }


def ref(document_id, page=None, section=None):
    r = {"document_id": document_id}
    if page is not None:
        r["page"] = page
    if section is not None:
        r["section"] = section
    return r


def write(path, payload):
    # These builders emit the first-cut shape (title, not name; no node ids; status
    # verified). Running one over the current fixtures would undo the repair pass in
    # tools/migrate_2026_09_03.py, so writing is off unless it is asked for and the
    # migration is re-run afterwards.
    if os.environ.get("SYLLABI_WRITE") != "1":
        raise SystemExit(
            "refusing to overwrite the fixtures: set SYLLABI_WRITE=1, and re-run "
            "tools/migrate_2026_09_03.py afterwards"
        )
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n_units = len(payload.get("units", []))
    n_topics = sum(len(u.get("topics", [])) for u in payload.get("units", []))
    print("%-58s %-12s units=%-3d topics=%-4d" % (path, payload["status"], n_units, n_topics))
    return path


def syllabus(*, framework_id, framework_name, framework_kind, country, region=None,
             version, level, level_order, subject, status, documents, units,
             note=None, aliases=None, region_scope=None, extra=None):
    p = {
        "framework_id": framework_id,
        "framework_name": framework_name,
        "framework_kind": framework_kind,
        "country": country,
        "version": version,
        "level": level,
        "level_order": level_order,
        "subject": subject,
        "language": "en",
        "status": status,
        "documents": documents,
        "units": units,
    }
    if region:
        p["region"] = region
    if aliases:
        p["aliases"] = aliases
    if note:
        p["note"] = note
    if extra:
        p.update(extra)
    # order sanity
    for i, u in enumerate(p["units"], 1):
        u.setdefault("order", i)
        for j, t in enumerate(u.get("topics", []), 1):
            t.setdefault("order", j)
    return p


def unit(title, source_ref, topics=None, **kw):
    u = {"title": tidy_text(title), "source_ref": source_ref, "topics": topics or []}
    u.update(kw)
    return u


def topic(title, objectives=None, source_ref=None, **kw):
    t = {"title": tidy_text(title)}
    if objectives:
        t["objectives"] = [tidy_text(o) for o in objectives]
    if source_ref:
        t["source_ref"] = source_ref
    t.update(kw)
    return t
