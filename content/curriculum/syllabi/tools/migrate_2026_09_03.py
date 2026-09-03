"""One-shot repair pass over the syllabus fixtures in this directory.

Run from the repository root:  python3 content/curriculum/syllabi/tools/migrate_2026_09_03.py

What it does, in order, per file:
  1. bounds every CBSE learning objective at the page-tail tokens that bled the
     rest of the PDF into it, and trims back to the last whole sentence;
  2. lifts the non-syllabus tail out of the CBSE chemistry prose split
     (Note: / PRACTICAL / Relevant NCERT textual material) into the unit;
  3. withdraws the CISCE two-column topic layer, which mis-parented and
     truncated its topics, leaving the hand-checked unit list and prose;
  4. turns the empty `units: []` placeholders into `units: null` plus a
     discovery_state and a blocker code, so a loader can tell a stored negative
     result from a stored syllabus;
  5. mints stable node ids, renames title to name, adds aliases and concept_ids,
     promotes language to languages, adds levels and official_site;
  6. runs the structural checks in code and records what passed and what failed;
  7. sets every file to provisional and records read_off_source separately.

Deterministic: running it twice over its own output changes nothing.
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- framework facts

OFFICIAL_SITE = {
    "cbse": "https://cbseacademic.nic.in/",
    "icse": "https://cisce.org/",
    "isc": "https://cisce.org/",
    "nios": "https://nios.ac.in/",
    "andhra-pradesh": "https://bse.ap.gov.in/",
    "telangana": "https://bse.telangana.gov.in/",
    "karnataka": "https://textbooks.karnataka.gov.in/",
    "maharashtra": "https://ebalbharati.in/",
}

# The levels each framework publishes a syllabus or a prescribed book list for,
# as far as this pass established from the board's own site.
LEVELS = {
    "cbse": list(range(1, 13)),
    "icse": [9, 10],
    "isc": [11, 12],
    "nios": [10, 12],
    "andhra-pradesh": list(range(1, 11)),
    "telangana": list(range(1, 11)),
    "karnataka": list(range(1, 11)),
    "maharashtra": list(range(1, 11)),
}

CISCE = ("icse", "isc")

# ---------------------------------------------------------------- 1. objective bleed

TAIL = re.compile(
    r"(?:\bPRACTICALS?\b"
    r"|\bNo\. of periods\b"
    r"|PER DESIGN"
    r"|Question Paper Design"
    r"|Max\. Marks"
    r"|Prescribed Books"
    r"|\bCh\. \d)"
)
TRAILING_JUNK = re.compile(r"(?:\s+[A-Z][A-Z)(.,\d]*)+[\s.,;:]*$")


def bound(text):
    """Cut a run of objective text at the next page-tail token and trim back."""
    m = TAIL.search(text)
    if not m:
        return text
    head = text[: m.start()]
    head = TRAILING_JUNK.sub("", head).strip(" ,;:-")
    return head


# ---------------------------------------------------------------- 2. prose tail

TAIL_TOPIC = re.compile(
    r"(Note: The following topics|PRACTICAL Evaluation Scheme"
    r"|Relevant NCERT textual material)"
)


def lift_non_syllabus_tail(unit):
    """Move the assessment table and the editorial note out of topics[]."""
    topics = unit.get("topics") or []
    cut, prefix = None, None
    for i, t in enumerate(topics):
        m = TAIL_TOPIC.search(t["title"])
        if m:
            cut = i
            if m.start() > 0:
                prefix = t["title"][: m.start()].strip(" .,;:")
            break
    if cut is None:
        return
    moved = topics[cut:]
    kept = topics[:cut]
    notes = []
    for j, t in enumerate(moved):
        s = t["title"]
        if j == 0 and prefix:
            s = s[len(prefix):].lstrip(" .,;:")
            kept.append({k: v for k, v in t.items()})
            kept[-1]["title"] = prefix
        notes.append(s)
    unit["topics"] = kept
    unit["notes_from_document"] = notes


# ---------------------------------------------------------------- 5. names and ids


def node_id(*parts):
    return "n_" + hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:16]


ACRONYM = re.compile(r"^[A-Z][A-Z&/.'\-:;,()]*$")
KEEP_UPPER = {
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
    "DNA", "RNA", "ATP", "AC", "DC", "ICT", "GDP", "UN", "II)", "I)", "A", "B",
    "C", "D", "E", "F", "P", "S", "N", "O", "H", "PH", "AIDS", "HIV", "TB",
}


def sentence_case(s):
    """Lower a shouted heading without touching an already mixed-case one."""
    words = s.split()
    shouted = [w for w in words if ACRONYM.match(w) and len(w) > 1 and w.strip(":,.()") not in KEEP_UPPER]
    all_upper = not any(c.islower() for c in s) and any(c.isalpha() for c in s)
    if not shouted or (len(shouted) < 2 and not all_upper):
        return s
    out = []
    for w in words:
        if ACRONYM.match(w) and len(w) > 1 and w.strip(":,.()") not in KEEP_UPPER:
            out.append(w.lower())
        else:
            out.append(w)
    t = " ".join(out)
    t = re.sub(r"(^|[.:]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)
    return t


# ---------------------------------------------------------------- 6. checks


def run_checks(doc):
    passed, failed = [], []

    def check(name, ok):
        (passed if ok else failed).append(name)

    units = doc.get("units")
    doc_ids = {d["id"] for d in doc.get("documents") or []}
    if units is None:
        check("stored_negative_result_has_a_blocker_code", bool(doc.get("blocker")))
        return passed, failed
    check("unit_order_is_1_to_n", [u["order"] for u in units] == list(range(1, len(units) + 1)))
    check("no_empty_unit_name", all((u.get("name") or "").strip() for u in units))
    names = [u["name"] for u in units]
    check("no_duplicate_unit_name", len(set(names)) == len(names))
    check("every_unit_has_a_source_ref", all(u.get("source_ref") for u in units))
    check(
        "every_source_ref_resolves_to_a_document",
        all((u.get("source_ref") or {}).get("document_id") in doc_ids for u in units),
    )
    check("every_document_carries_a_hash", all(d.get("document_sha256") for d in doc.get("documents") or []))
    has_topics = [u for u in units if u.get("topics") is not None]
    if has_topics:
        check(
            "topic_order_is_1_to_n_within_every_unit",
            all([t["order"] for t in u["topics"]] == list(range(1, len(u["topics"]) + 1)) for u in has_topics),
        )
        check("no_unit_left_without_topics", all(u["topics"] for u in has_topics))
        check(
            "no_duplicate_topic_name_within_a_unit",
            all(len({t["name"] for t in u["topics"]}) == len(u["topics"]) for u in has_topics),
        )
        blobs = []
        for u in has_topics:
            for t in u["topics"]:
                c = t.get("contents")
                blobs.extend(c if isinstance(c, list) else [c or ""])
                blobs.extend(t.get("objectives") or [])
        check("no_page_tail_bled_into_a_node", not any(TAIL.search(b) for b in blobs))
    return passed, failed


# ---------------------------------------------------------------- notes

CISCE_NOTE = (
    "The unit list and the unit order below are read off the CISCE booklet for this "
    "subject and were checked by hand against it. The topic layer that an earlier pass "
    "derived from the booklet's two-column layout has been withdrawn: the re-flow keyed "
    "off line position rather than the booklet's own bracketed sub-headings, which "
    "truncated topic titles mid-phrase and filed topics under the wrong unit. Nothing "
    "from that layer is kept, and no topic list is asserted here. Next step: re-derive "
    "the topics from the booklet's bracket structure, then have a second reader confirm "
    "the unit to topic mapping before anything is promoted."
)

ICSE_MIDDLE_NOTE = (
    "CISCE publishes a syllabus only for the ICSE examination (classes IX and X) and the "
    "ISC examination (classes XI and XII); its Publications and Resources listing at "
    "https://cisce.org/ carries no curriculum document for classes I to VIII, and the ICSE "
    "subject booklets open directly at Class IX. Schools affiliated to CISCE set their own "
    "middle school scheme of study within the council's framework, so there is no official "
    "unit list to record here and none is invented. No document is recorded on this file, "
    "because no document was extracted for it. Next step: run the discovery job "
    "(docs/CURRICULUM.md section 4) against the council's listing with a browser-capable "
    "fetcher, and if nothing is published, take the learner's own school scheme through the "
    "own-syllabus path in section 6."
)

NIOS_VINTAGE = (
    " Version note: the bifurcation document NIOS publishes is the 2023 edition, which is "
    "the edition still in force; this file is stamped version 2023 and applies_to 2026-27 "
    "rather than claiming a 2026-27 document that does not exist."
)


def main():
    files = []
    for d in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, d)
        if os.path.isdir(p) and d != "tools":
            for f in sorted(os.listdir(p)):
                if f.endswith(".json"):
                    files.append(os.path.join(p, f))

    stats = {"page_tails_bounded": 0, "chemistry_tail_lifted": 0,
             "cisce_topics_withdrawn": 0, "blocked": 0, "shouted_names": 0}

    for path in files:
        with open(path) as fh:
            doc = json.load(fh)
        if "read_off_source" in doc:
            print("already migrated, skipping:", os.path.relpath(path, ROOT))
            continue
        fid = doc["framework_id"]
        units = doc.get("units")
        had_units = bool(units)

        # 1. page-tail bleed, in objectives and in prose alike
        def debleed(node):
            objs = node.get("objectives")
            if objs:
                kept = []
                for o in objs:
                    b = bound(o)
                    if b != o:
                        stats["page_tails_bounded"] += 1
                    if b:
                        kept.append(b)
                node["objectives"] = kept
            c = node.get("contents")
            if isinstance(c, str):
                b = bound(c)
                if b != c:
                    stats["page_tails_bounded"] += 1
                node["contents"] = b
            elif isinstance(c, list):
                node["contents"] = [bound(x) if isinstance(x, str) else x for x in c]

        for u in units or []:
            debleed(u)
            for t in u.get("topics") or []:
                debleed(t)

        # 2. non-syllabus prose tail
        for u in units or []:
            before = len(u.get("topics") or [])
            lift_non_syllabus_tail(u)
            if len(u.get("topics") or []) != before:
                stats["chemistry_tail_lifted"] += 1

        # 3. withdraw the CISCE topic layer
        if fid in CISCE and had_units:
            for u in units:
                if u.get("topics"):
                    stats["cisce_topics_withdrawn"] += len(u["topics"])
                u["topics"] = None
                u["topic_discovery_state"] = "blocked"
                u["topic_blocker"] = "extraction_unreliable"
            doc["note"] = CISCE_NOTE

        # 5a. names, ids, aliases, concept_ids
        for u in units or []:
            raw = u.pop("title")
            name = sentence_case(raw)
            u["name"] = name
            if name != raw:
                u["source_title"] = raw
                stats["shouted_names"] += 1
            u["id"] = node_id(fid, doc["version"], doc["level"], doc["subject"], "u", u["order"])
            u.setdefault("aliases", [])
            for t in u.get("topics") or []:
                traw = t.pop("title")
                tname = sentence_case(traw)
                t["name"] = tname
                if tname != traw:
                    t["source_title"] = traw
                    stats["shouted_names"] += 1
                t["id"] = node_id(fid, doc["version"], doc["level"], doc["subject"], "u", u["order"], "t", t["order"])
                t.setdefault("aliases", [])
                t.setdefault("concept_ids", [])

        # 4. stored negative results
        blocker = None
        if not had_units:
            note = doc["note"]
            if fid == "icse":
                blocker = "no_official_document"
                doc["note"] = ICSE_MIDDLE_NOTE
                doc["documents"] = []
            elif "organised by named sections" in note:
                blocker = "document_not_machine_readable"
            elif "did not resolve" in note or "carries no syllabus" in note:
                blocker = "no_official_document"
            else:
                blocker = "browser_required"
            doc["units"] = None
            doc["discovery_state"] = "blocked"
            doc["blocker"] = blocker
            stats["blocked"] += 1

        # 6. version and examination year
        if fid == "nios":
            doc["version"] = "2023"
            doc["applies_to"] = "2026-27"
            if NIOS_VINTAGE.strip() not in doc["note"]:
                doc["note"] = doc["note"].rstrip() + NIOS_VINTAGE
        if fid in CISCE:
            doc["exam_year"] = 2027 if doc["level_order"] in (10, 12) else 2028

        # 7. status, read_off_source, provenance
        read_off = doc["status"] == "verified" or bool(doc.get("units"))
        doc["status"] = "provisional"
        doc["read_off_source"] = bool(read_off)
        passed, failed = run_checks(doc)
        doc["provenance"] = {
            "extractor": (
                "deterministic text extraction from the fetched document; no model in the loop"
                if doc.get("units") else None
            ),
            "verifier": None,
            "checks_passed": passed,
            "checks_failed": failed,
            "verified_at": None,
            "verified_by": None,
        }

        order = [
            "framework_id", "framework_name", "framework_kind", "country", "region",
            "official_site", "aliases", "languages", "levels",
            "version", "applies_to", "exam_year", "level", "level_order", "stage",
            "subject", "course_code", "status", "read_off_source",
            "discovery_state", "blocker",
            "provenance", "documents", "units", "note",
        ]
        doc["languages"] = [doc.pop("language")] if "language" in doc else doc.get("languages", ["en"])
        doc["levels"] = LEVELS[fid]
        doc["official_site"] = OFFICIAL_SITE[fid]
        out = {k: doc[k] for k in order if k in doc}
        for k in doc:
            if k not in out:
                out[k] = doc[k]

        with open(path, "w") as fh:
            json.dump(out, fh, indent=2, ensure_ascii=False)
            fh.write("\n")

    print(json.dumps(stats, indent=2))
    print("files:", len(files))


if __name__ == "__main__":
    sys.exit(main())
