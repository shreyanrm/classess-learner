"""NIOS secondary (class 10) and senior secondary (class 12) core courses."""

import sys

sys.path.insert(0, "lib")
from build import doc, ref, syllabus, topic, unit, write
from niosbif import parse

# The bifurcation tables are set in narrow table cells; a few titles come out of the
# PDF with a space missing or a cell fragment attached. Each correction below was read
# back off the fetched document and is the title exactly as the document prints it.
REPAIRS = {
    "Political Partiesand Pressure Groups tion": "Political Parties and Pressure Groups",
    "People\u2019s Participa in the Democratic Process": "People\u2019s Participation in the Democratic Process",
    "Popular Resistanceto the British Rule": "Popular Resistance to the British Rule",
    "Dispersion and Scatteringof Light": "Dispersion and Scattering of Light",
    "Dual Nature of Radiationand Matter": "Dual Nature of Radiation and Matter",
    "Electric Charge and Electric Field": "Electric Charge and Electric Field",
}

FW = {
    "framework_id": "nios",
    "framework_name": "National Institute of Open Schooling",
    "framework_kind": "open",
    "country": "IN",
    "aliases": ["NIOS", "Open school"],
}
PUB = "National Institute of Open Schooling"
VERSION = "2026-27"
NOTE = (
    "NIOS states its syllabus as a bifurcation table: one row per module, with that module's "
    "lessons split between the tutor-marked assignment (40 per cent) and the public "
    "examination (60 per cent). Units here are the modules and topics are the lessons, "
    "merged back into lesson order. NIOS runs a course, not a class-by-class syllabus; the "
    "secondary course is equivalent to class 10 and the senior secondary course to class 12."
)

SPEC = [
    ("nios_bif_211", "Mathematics (211)", "Class 10", 10, "secondary"),
    ("nios_bif_212", "Science and Technology (212)", "Class 10", 10, "secondary"),
    ("nios_bif_213", "Social Science (213)", "Class 10", 10, "secondary"),
    ("nios_bif_311", "Mathematics (311)", "Class 12", 12, "senior secondary"),
    ("nios_bif_312", "Physics (312)", "Class 12", 12, "senior secondary"),
    ("nios_bif_313", "Chemistry (313)", "Class 12", 12, "senior secondary"),
    ("nios_bif_314", "Biology (314)", "Class 12", 12, "senior secondary"),
]

for key, course, level, order, stage in SPEC:
    subject = course.split(" (")[0]
    code = course.split("(")[1].rstrip(")")
    d = doc(key, f"Bifurcation of syllabus, {course}, NIOS {stage} course", PUB)
    did = key.replace("_", "-")
    mods = parse(key)
    units = []
    for m in mods:
        tops = [
            topic(
                REPAIRS.get(line["title"], line["title"]),
                lesson_number=line["number"],
                source_ref=ref(
                    did, page=m["page"], section="Module {}: {}".format(m["number"], m["title"])
                ),
            )
            for line in m["lessons"]
        ]
        units.append(
            unit(
                REPAIRS.get(m["title"], m["title"]),
                ref(did, page=m["page"], section="Module {}".format(m["number"])),
                topics=tops,
                unit_number=m["number"],
            )
        )
    write(
        "nios/{}-{}.json".format(
            level.lower().replace(" ", "-"), subject.lower().replace(" ", "-")
        ),
        syllabus(
            **FW,
            version=VERSION,
            level=level,
            level_order=order,
            subject=subject,
            status="verified",
            documents=[d],
            units=units,
            note=NOTE,
            extra={"course_code": code, "stage": stage},
        ),
    )

# English: fetched, but the bifurcation table is not module-numbered.
ENG_NOTE = (
    "The NIOS English bifurcation table was fetched (see the document below) but it is "
    "organised by named sections - prescribed texts, reading, writing, grammar - rather "
    "than by numbered modules with lessons, so no unit list could be read off it without "
    "guessing. No units are recorded rather than invented. The per-lesson course material "
    "on the NIOS site is the place to look next."
)
for key, course, level, order, stage in [
    ("nios_bif_202", "English (202)", "Class 10", 10, "secondary"),
    ("nios_bif_302", "English (302)", "Class 12", 12, "senior secondary"),
]:
    d = doc(key, f"Bifurcation of syllabus, {course}, NIOS {stage} course", PUB)
    write(
        "nios/{}-english.json".format(level.lower().replace(" ", "-")),
        syllabus(
            **FW,
            version=VERSION,
            level=level,
            level_order=order,
            subject="English",
            status="provisional",
            documents=[d],
            units=[],
            note=ENG_NOTE,
            extra={"course_code": course.split("(")[1].rstrip(")"), "stage": stage},
        ),
    )
