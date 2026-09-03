"""CBSE classes 9 and 10, 2026-27, from the board's own curriculum PDFs."""

import re
import sys

sys.path.insert(0, "lib")
from build import doc, ref, syllabus, topic, unit, write
from extract import blocks, chapter_objectives

FW = {
    "framework_id": "cbse",
    "framework_name": "Central Board of Secondary Education",
    "framework_kind": "national",
    "country": "IN",
    "version": "2026-27",
    "aliases": ["CBSE", "Central Board of Secondary Education, New Delhi"],
}
PUB = "Central Board of Secondary Education"


def tidy(s):
    s = re.sub(r"\s{2,}", " ", s).strip(" ;,.")
    s = re.sub(r"(?<=[a-z])-\s+(?=[a-z])", "-", s)
    return s


# ================================================================ class 9 maths
D9M = doc("cbse_9_maths", "Mathematics, Class IX, Secondary Curriculum Part 1, 2026-27", PUB)
g = chapter_objectives("cbse_9_maths", None)
CH9M = [
    "Number System",
    "Introduction to Polynomials",
    "Sequences and Progressions",
    "Exploring Algebraic Identities",
    "Linear Equations in Two Variables",
    "Coordinate Geometry",
    "Introduction to Euclid's Geometry: Axioms and Postulates",
    "Lines and Angles",
    "Triangles - Congruence Theorems",
    "4-gons (Quadrilaterals)",
    "Circles",
    "Area and Perimeter",
    "Surface Area and Volume",
    "Statistics",
    "Introduction to Probability",
]
assert len(g) == len(CH9M), (len(g), len(CH9M))
OBJ9M = {
    name: (page, [tidy(x) for x in items]) for name, (page, items) in zip(CH9M, g, strict=False)
}

U9M = [
    ("Number System", 7, 12, ["Number System"]),
    (
        "Algebra",
        20,
        66,
        [
            "Introduction to Polynomials",
            "Sequences and Progressions",
            "Exploring Algebraic Identities",
            "Linear Equations in Two Variables",
        ],
    ),
    ("Coordinate Geometry", 4, 6, ["Coordinate Geometry"]),
    (
        "Geometry",
        25,
        69,
        [
            "Introduction to Euclid's Geometry: Axioms and Postulates",
            "Lines and Angles",
            "Triangles - Congruence Theorems",
            "4-gons (Quadrilaterals)",
            "Circles",
        ],
    ),
    ("Mensuration", 14, 27, ["Area and Perimeter", "Surface Area and Volume"]),
    ("Statistics and Probability", 10, 24, ["Statistics", "Introduction to Probability"]),
]

units = []
for i, (name, marks, periods, chs) in enumerate(U9M, 1):
    tops = []
    for ch in chs:
        p, obj = OBJ9M[ch]
        tops.append(
            topic(
                ch,
                objectives=obj,
                source_ref=ref("cbse-9-maths", page=p, section=f"Unit {i}, chapter {ch}"),
            )
        )
    units.append(
        unit(
            name,
            ref("cbse-9-maths", page=4, section=f"Course structure Class IX, unit {i}"),
            topics=tops,
            marks=marks,
            periods=periods,
        )
    )
write(
    "cbse/class-9-mathematics.json",
    syllabus(
        **FW,
        level="Class 9",
        level_order=9,
        subject="Mathematics",
        status="verified",
        documents=[D9M],
        units=units,
        note="Units, chapters and marks are the course structure on page 4; the objectives under "
        "each chapter are that chapter's 'the student will be able to' list, verbatim.",
    ),
)

# ================================================================ class 9 science
D9S = doc("cbse_9_science", "Science, Class IX, Secondary Curriculum Part 1, 2026-27", PUB)
B9S = {b["title"]: b for b in blocks("cbse_9_science")}
U9S = [
    ("World of Living", 27, [(2, "Cell"), (3, "Tissues"), (11, "Reproduction"), (12, "Diversity")]),
    (
        "Matter - Its Nature and Behaviour",
        25,
        [
            (5, "Exploring Mixtures and their Separation"),
            (8, "Structure of an Atom"),
            (9, "Atoms and Molecules"),
        ],
    ),
    (
        "Motion, Force, Work and Sound",
        23,
        [
            (4, "Motion"),
            (6, "Force and Laws of Motion"),
            (7, "Work, Energy and Simple Machines"),
            (10, "Sound"),
        ],
    ),
    ("Earth as a system", 5, [(13, "Earth as a System: Energy, Matter & Life")]),
]
units = []
for i, (name, marks, chs) in enumerate(U9S, 1):
    tops = []
    for num, ch in chs:
        b = B9S[ch]
        tops.append(
            topic(
                ch,
                objectives=[tidy(o) for o in b["objectives"]],
                chapter_number=num,
                source_ref=ref("cbse-9-science", page=b["page"], section=ch),
            )
        )
    units.append(
        unit(
            name,
            ref("cbse-9-science", page=4, section=f"Course structure Class IX, unit {i}"),
            topics=tops,
            marks=marks,
        )
    )
write(
    "cbse/class-9-science.json",
    syllabus(
        **FW,
        level="Class 9",
        level_order=9,
        subject="Science",
        status="verified",
        documents=[D9S],
        units=units,
        note="The course structure on page 4 names four units and lists the chapters in each by "
        "NCERT chapter number only. Those numbers are resolved to chapter titles by the "
        "document's own list of experiments (pages 19 and 20), which labels every experiment "
        "with both its chapter number and its subject matter; chapters 8 and 13 follow by "
        "elimination inside their stated units. Objectives are each chapter's stated learning "
        "outcomes, verbatim.",
    ),
)
