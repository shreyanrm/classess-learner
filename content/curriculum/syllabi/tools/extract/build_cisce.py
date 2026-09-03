# -*- coding: utf-8 -*-
"""ICSE (classes 9 and 10) and ISC (classes 11 and 12) from the CISCE year-2027 syllabuses."""
import re, sys
sys.path.insert(0, "lib")
from build import doc, ref, unit, topic, syllabus, write
from icse import parse

ICSE = dict(framework_id="icse", framework_name="Indian Certificate of Secondary Education (CISCE)",
            framework_kind="national", country="IN",
            aliases=["ICSE", "CISCE", "Council for the Indian School Certificate Examinations"])
ISC = dict(framework_id="isc", framework_name="Indian School Certificate (CISCE)",
           framework_kind="national", country="IN",
           aliases=["ISC", "CISCE", "Council for the Indian School Certificate Examinations"])
PUB = "Council for the Indian School Certificate Examinations"
VERSION = "2026-27"

NOTE = ("CISCE publishes one syllabus booklet per subject for the whole examination year; this "
        "file is the part of that booklet for this class. The unit list is the booklet's own "
        "numbered sections. Topics, where present, are the booklet's own bracketed sub-headings, "
        "recovered by re-flowing the two-column page into reading order; a unit with no bracketed "
        "sub-headings carries the booklet's prose in `contents` instead. Wherever the re-flow "
        "could not be trusted the unit is left without topics rather than guessed at.")

DOCS = {}
def D(key, title):
    if key not in DOCS:
        DOCS[key] = doc(key, title, PUB)
    return DOCS[key]


def build(key, board, subject, doctitle, spec, level_map, note=NOTE):
    """spec: {class_roman: [(n, title, page), ...]}"""
    parsed = {c["class"]: c for c in parse(key)}
    d = D(key, doctitle)
    did = key.replace("_", "-")
    for roman, rows in spec.items():
        level, order = level_map[roman]
        p = parsed.get(roman)
        by_title = {}
        if p:
            for u in p["units"]:
                by_title.setdefault(re.sub(r"[^a-z]", "", u["title"].lower()), u)

        def norm(x):
            return re.sub(r"[^a-z]", "", re.sub(r"^(civics|history):\s*", "", x.lower()))
        units = []
        for n, title, page in rows:
            src = by_title.get(norm(title))
            if src and abs(src["page"] - page) > 1:
                src = None
            tops, kw = [], {}
            if src:
                for t in src["topics"]:
                    kwt = {"contents": t["text"]} if t["text"] else {}
                    tops.append(topic(t["title"].rstrip(":"),
                                source_ref=ref(did, page=t["page"],
                                               section="Class %s, %d. %s" % (roman, n, title)), **kwt))
                if not tops and src["text"]:
                    kw["contents"] = src["text"]
            units.append(unit(title, ref(did, page=page,
                         section="Class %s, section %d" % (roman, n)),
                         topics=tops, unit_number=n, **kw))
        write("%s/%s-%s.json" % (board["framework_id"], level.lower().replace(" ", "-"),
                                 subject.lower().replace(" ", "-").replace("&", "and")),
              syllabus(**board, version=VERSION, level=level, level_order=order,
                       subject=subject, status="verified", documents=[d], units=units, note=note))


ICSE_LEVELS = {"IX": ("Class 9", 9), "X": ("Class 10", 10)}
ISC_LEVELS = {"XI": ("Class 11", 11), "XII": ("Class 12", 12)}

build("icse_maths", ICSE, "Mathematics", "Mathematics (51), ICSE examination year 2027", {
  "IX": [(1, "Pure Arithmetic", 4), (2, "Commercial Mathematics", 4), (3, "Algebra", 4),
         (4, "Geometry", 5), (5, "Statistics", 6), (6, "Mensuration", 5),
         (7, "Trigonometry", 6), (8, "Coordinate Geometry", 6)],
  "X": [(1, "Commercial Mathematics", 8), (2, "Algebra", 8), (3, "Geometry", 9),
        (4, "Mensuration", 10), (5, "Trigonometry", 9), (6, "Statistics", 10),
        (7, "Probability", 10)]}, ICSE_LEVELS)

build("icse_physics", ICSE, "Physics", "Physics (52), ICSE examination year 2027", {
  "IX": [(1, "Measurements and Experimentation", 4), (2, "Motion in One Dimension", 4),
         (3, "Laws of Motion", 4), (4, "Fluids", 5), (5, "Heat and Energy", 5),
         (6, "Light", 6), (7, "Sound", 6), (8, "Electricity and Magnetism", 6)],
  "X": [(1, "Force, Work, Power and Energy", 9), (2, "Light", 9), (3, "Sound", 10),
        (4, "Electricity and Magnetism", 11), (5, "Heat", 11), (6, "Modern Physics", 11)]},
  ICSE_LEVELS)

build("icse_chemistry", ICSE, "Chemistry", "Chemistry (52), ICSE examination year 2027", {
  "IX": [(1, "The Language of Chemistry", 4), (2, "Chemical changes and reactions", 4),
         (3, "Water", 4), (4, "Atomic Structure and Chemical bonding", 5),
         (5, "The Periodic Table", 5), (6, "Study of the First Element - Hydrogen", 5),
         (7, "Study of Gas Laws", 6), (8, "Atmospheric pollution", 6)],
  "X": [(1, "Periodic Properties and variations of Properties", 8), (2, "Chemical Bonding", 8),
        (3, "Study of Acids, Bases and Salts", 8), (4, "Analytical Chemistry", 9),
        (5, "Mole Concept and Stoichiometry", 9), (6, "Electrolysis", 10),
        (7, "Metallurgy", 10), (8, "Study of Compounds", 11), (9, "Organic Chemistry", 12)]},
  ICSE_LEVELS)

build("icse_biology", ICSE, "Biology", "Biology (52), ICSE examination year 2027", {
  "IX": [(1, "Basic Biology", 4), (2, "Flowering Plants", 4), (3, "Plant Physiology", 5),
         (4, "Diversity in living organisms", 5), (5, "Human Anatomy and Physiology", 5),
         (6, "Health and Hygiene", 5), (7, "Waste generation and management", 6)],
  "X": [(1, "Basic Biology", 8), (2, "Plant Physiology", 8),
        (3, "Human Anatomy and Physiology", 8), (4, "Population", 10),
        (5, "Human Evolution", 11), (6, "Pollution", 10)]}, ICSE_LEVELS)

build("icse_geography", ICSE, "Geography", "Geography (53), ICSE examination year 2027", {
  "IX": [(1, "Our World", 4), (2, "Structure of the Earth", 4), (3, "Hydrosphere", 5),
         (4, "Atmosphere", 5), (5, "Pollution", 5)],
  "X": [(1, "Interpretation of Topographical Maps", 8), (2, "Map of India", 8),
        (3, "Climate", 9), (4, "Soil Resources", 9), (5, "Natural Vegetation", 9),
        (6, "Water Resources", 9), (7, "Mineral and Energy Resources", 8),
        (8, "Agriculture", 9), (9, "Manufacturing Industries", 9), (10, "Transport", 9),
        (11, "Waste Management", 10)]}, ICSE_LEVELS)

HC_NOTE = NOTE + (" History & Civics is one subject with two independently numbered parts, "
                  "Civics and History; each part's sections are kept in their own units here.")
build("icse_history_civics", ICSE, "History and Civics",
      "History & Civics (53), ICSE examination year 2027", {
  "IX": [(1, "Civics: Our Constitution", 4), (2, "Civics: Elections", 4),
         (3, "Civics: The State Legislatures", 4), (4, "History: The Harappan Civilisation", 4),
         (5, "History: The Vedic Period", 4), (6, "History: Jainism and Buddhism", 4),
         (7, "History: The Mauryan Empire", 5), (8, "History: The Sangam Age", 5),
         (9, "History: The Age of the Guptas", 5), (10, "History: Medieval India", 5),
         (11, "History: The Modern Age in Europe", 5)],
  "X": [(1, "Civics: The Union Legislature", 6), (2, "Civics: The Union Executive", 6),
        (3, "Civics: The Judiciary", 6),
        (4, "History: The Indian National Movement (1857 - 1917)", 6),
        (5, "History: Mass Phase of the National Movement (1915-1947)", 7),
        (6, "History: The Contemporary World", 7)]}, ICSE_LEVELS, note=HC_NOTE)

# ------------------------------------------------------------------ ISC
build("isc_maths", ISC, "Mathematics", "Mathematics, ISC examination year 2027", {
  "XI": [(1, "Sets and Functions", 4), (2, "Algebra", 6), (3, "Coordinate Geometry", 7),
         (4, "Calculus", 9), (5, "Statistics and Probability", 9)],
  "XII": [(1, "Relations and Functions", 11), (2, "Algebra", 12), (3, "Calculus", 13),
          (4, "Vector Algebra", 15), (5, "Three - dimensional Geometry", 15),
          (6, "Linear Programming", 16), (7, "Probability", 16)]}, ISC_LEVELS)

build("isc_physics", ISC, "Physics", "Physics, ISC examination year 2027", {
  "XI": [(1, "Physical World and Measurement", 5), (2, "Kinematics", 5), (3, "Laws of Motion", 6),
         (4, "Work, Power and Energy", 7), (5, "Motion of System of Particles and Rigid Body", 8),
         (6, "Gravitation", 8), (7, "Properties of Bulk Matter", 9),
         (8, "Heat and Thermodynamics", 10),
         (9, "Behaviour of Perfect Gases and Kinetic Theory of Gases", 10),
         (10, "Oscillations and Waves", 12)],
  "XII": [(1, "Electrostatics", 16), (2, "Current Electricity", 17),
          (3, "Magnetic Effects of Current and Magnetism", 18),
          (4, "Electromagnetic Induction and Alternating Currents", 20),
          (5, "Electromagnetic Waves", 20), (6, "Optics", 21),
          (7, "Dual Nature of Radiation and Matter", 23), (8, "Atoms and Nuclei", 23),
          (9, "Electronic Devices", 24)]}, ISC_LEVELS)

build("isc_chemistry", ISC, "Chemistry", "Chemistry, ISC examination year 2027", {
  "XI": [(1, "Some Basic Concepts of Chemistry", 5), (2, "Structure of Atom", 5),
         (3, "Classification of Elements and Periodicity in Properties", 6),
         (4, "Chemical Bonding and Molecular structure", 7),
         (5, "Chemical Thermodynamics", 8), (6, "Equilibrium", 9), (7, "Redox Reactions", 10),
         (8, "Organic Chemistry - Some Basic Principles and Techniques", 9),
         (9, "Hydrocarbons", 11)],
  "XII": [(1, "Solutions", 15), (2, "Electrochemistry", 15), (3, "Chemical Kinetics", 16),
          (4, "d- and f- Block Elements", 17), (5, "Coordination Compounds", 17),
          (6, "Haloalkanes and Haloarenes", 18), (7, "Alcohols, Phenols and Ethers", 19),
          (8, "Aldehydes, Ketones and Carboxylic Acids", 20),
          (9, "Organic compounds containing Nitrogen", 21), (10, "Biomolecules", 21)]},
  ISC_LEVELS)

build("isc_biology", ISC, "Biology", "Biology, ISC examination year 2027", {
  "XI": [(1, "Diversity of Living Organisms", 5),
         (2, "Structural Organisation in Animals and Plants", 6),
         (3, "Cell: Structure and Function", 7), (4, "Plant Physiology", 7),
         (5, "Human Physiology", 8)],
  "XII": [(1, "Reproduction", 14), (2, "Genetics and Evolution", 15),
          (3, "Biology and Human Welfare", 16), (4, "Biotechnology and its Applications", 16),
          (5, "Ecology and Environment", 18)]}, ISC_LEVELS)
