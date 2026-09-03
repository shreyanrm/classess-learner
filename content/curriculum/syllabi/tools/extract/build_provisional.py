"""Provisional rows: framework + level + subject combinations whose official syllabus
document could not be fetched in this pass. No units are invented; each file records
the official portal that was actually reached and what blocks verification."""

import sys

sys.path.insert(0, "lib")
from build import doc, syllabus, write

VERSION = "2026-27"
SUBJECTS = ["Mathematics", "Science", "Social Science"]

STATES = [
    {
        "framework_id": "telangana",
        "framework_name": "Board of Secondary Education, Telangana",
        "region": "Telangana",
        "aliases": ["Telangana State Board", "TS SSC", "BSE Telangana"],
        "docs": [
            (
                "ts_scert_home",
                "State Council of Educational Research and Training, Telangana - site index",
                "State Council of Educational Research and Training, Telangana",
            ),
            (
                "ts_bse_home",
                "Board of Secondary Education, Telangana - site index",
                "Board of Secondary Education, Telangana",
            ),
        ],
        "blocker": "The SCERT Telangana syllabus and e-textbook pages are served from an ASP.NET "
        "form whose links carry an encrypted query parameter and require a live session, "
        "so the syllabus documents behind them cannot be fetched with a plain request. "
        "The site index was fetched and is recorded below as evidence of the attempt.",
    },
    {
        "framework_id": "andhra-pradesh",
        "framework_name": "Board of Secondary Education, Andhra Pradesh",
        "region": "Andhra Pradesh",
        "aliases": ["Andhra Pradesh State Board", "AP SSC", "BSE AP"],
        "docs": [
            (
                "ap_bse_home",
                "Board of Secondary Education, Andhra Pradesh - site index",
                "Board of Secondary Education, Andhra Pradesh",
            )
        ],
        "blocker": "The board's site index carries no syllabus or textbook link, and the SCERT Andhra "
        "Pradesh host (apscert.gov.in) did not resolve from here, so no official syllabus "
        "document could be reached. The board site index was fetched and is recorded below.",
    },
    {
        "framework_id": "maharashtra",
        "framework_name": "Maharashtra State Board of Secondary and Higher Secondary Education",
        "region": "Maharashtra",
        "aliases": ["Maharashtra State Board", "MSBSHSE", "SSC Maharashtra", "Balbharati"],
        "docs": [
            (
                "mh_balbharati_home",
                "Maharashtra State Bureau of Textbook Production and "
                "Curriculum Research (Balbharati) - site index",
                "Maharashtra State Bureau of Textbook Production and Curriculum Research",
            )
        ],
        "blocker": "Balbharati's e-book library (books.ebalbharati.in) is an ASP.NET application that "
        "serves every book through a postback rather than a link, so no textbook or "
        "syllabus document could be fetched with a plain request. The Balbharati site index "
        "was fetched and is recorded below.",
    },
    {
        "framework_id": "karnataka",
        "framework_name": "Karnataka School Examination and Assessment Board",
        "region": "Karnataka",
        "aliases": ["Karnataka State Board", "KSEAB", "SSLC Karnataka", "KTBS"],
        "docs": [
            (
                "ka_textbooks",
                "Karnataka Textbook Society textbook portal - index",
                "Karnataka Textbook Society",
            )
        ],
        "blocker": "The Karnataka Textbook Society portal serves textbook PDFs, but its index labels "
        "the English-medium core books without the class they belong to, and the class "
        "grouping lives in an accordion the plain page text does not preserve; the "
        "ktbs.kar.nic.in host also timed out. Rather than guess a class-to-book mapping, "
        "no units are recorded. The portal index was fetched and is recorded below.",
    },
]

NEXT = (
    "Next step: run the discovery job (docs/CURRICULUM.md section 4) with a browser-capable "
    "fetcher against the portal recorded below, then extract the chapter list from the "
    "prescribed textbook's own contents page, the way the CBSE middle-stage files here do."
)

for st in STATES:
    docs = [doc(k, t, p, layout=False) for k, t, p in st["docs"]]
    for cls in range(6, 11):
        for subject in SUBJECTS:
            write(
                f"{st['framework_id']}/class-{cls}-{subject.lower().replace(' ', '-')}.json",
                syllabus(
                    framework_id=st["framework_id"],
                    framework_name=st["framework_name"],
                    framework_kind="state",
                    country="IN",
                    region=st["region"],
                    aliases=st["aliases"],
                    version=VERSION,
                    level=f"Class {cls}",
                    level_order=cls,
                    subject=subject,
                    status="provisional",
                    documents=docs,
                    units=[],
                    note=st["blocker"] + " " + NEXT,
                ),
            )

# ---------------------------------------------------------------- ICSE 6-8
ICSE_NOTE = (
    "CISCE publishes a syllabus only for the ICSE examination (classes IX and X) and the "
    "ISC examination (classes XI and XII); its Publications and Resources page lists no "
    "curriculum document for classes I to VIII, and the ICSE subject booklet fetched "
    "below opens directly at Class IX. Schools affiliated to CISCE set their own middle "
    "school scheme of study within the council's framework, so there is no single "
    "official unit list to record here and none is invented. " + NEXT
)
for cls in range(6, 9):
    for subject in ["Mathematics", "Science", "Social Studies"]:
        write(
            f"icse/class-{cls}-{subject.lower().replace(' ', '-')}.json",
            syllabus(
                framework_id="icse",
                framework_name="Indian Certificate of Secondary Education (CISCE)",
                framework_kind="national",
                country="IN",
                aliases=["ICSE", "CISCE", "Council for the Indian School Certificate Examinations"],
                version=VERSION,
                level=f"Class {cls}",
                level_order=cls,
                subject=subject,
                status="provisional",
                documents=[
                    doc(
                        "icse_maths",
                        "Mathematics (51), ICSE examination year 2027",
                        "Council for the Indian School Certificate Examinations",
                    )
                ],
                units=[],
                note=ICSE_NOTE,
            ),
        )
