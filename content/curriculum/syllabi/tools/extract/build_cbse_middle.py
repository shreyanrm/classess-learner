# -*- coding: utf-8 -*-
"""CBSE classes 6-8, 2026-27, from the prescribed NCERT textbooks' own Contents pages."""
import sys
sys.path.insert(0, "lib")
from build import doc, ref, unit, topic, syllabus, write

FW = dict(framework_id="cbse", framework_name="Central Board of Secondary Education",
          framework_kind="national", country="IN", version="2026-27",
          aliases=["CBSE", "Central Board of Secondary Education, New Delhi"])

NOTE = ("CBSE publishes a curriculum document only for the secondary stage (classes IX to XII). "
        "For the middle stage it prescribes the NCERT textbooks, so the structure below is the "
        "structure of the prescribed NCERT book: units are the book's own parts or themes and "
        "topics are its chapters, read off the Contents page of the book's official prelims PDF "
        "on ncert.nic.in. A Contents page states no learning objectives, so none are recorded.")

D = {
 "ncert_6_ganita":   ("Ganita Prakash, textbook of Mathematics for Grade 6 (prelims)", 19),
 "ncert_6_curiosity":("Curiosity, textbook of Science for Grade 6 (prelims)", 17),
 "ncert_6_society":  ("Exploring Society: India and Beyond, Social Science for Grade 6 (prelims)", 19),
 "ncert_7_ganita1":  ("Ganita Prakash, textbook of Mathematics for Grade 7, Part 1 (prelims)", 17),
 "ncert_7_ganita2":  ("Ganita Prakash, textbook of Mathematics for Grade 7, Part 2 (prelims)", 17),
 "ncert_7_curiosity":("Curiosity, textbook of Science for Grade 7 (prelims)", 19),
 "ncert_7_society1": ("Exploring Society: India and Beyond, Social Science for Grade 7, Part 1 (prelims)", 21),
 "ncert_7_society2": ("Exploring Society: India and Beyond, Social Science for Grade 7, Part 2 (prelims)", 15),
 "ncert_8_ganita1":  ("Ganita Prakash, textbook of Mathematics for Grade 8, Part 1 (prelims)", 15),
 "ncert_8_ganita2":  ("Ganita Prakash, textbook of Mathematics for Grade 8, Part 2 (prelims)", 15),
 "ncert_8_curiosity":("Curiosity, textbook of Science for Grade 8 (prelims)", 19),
 "ncert_8_society1": ("Exploring Society: India and Beyond, Social Science for Grade 8, Part 1 (prelims)", 21),
 "ncert_8_society2": ("Exploring Society: India and Beyond, Social Science for Grade 8, Part 2 (prelims)", 17),
}
PUB = "National Council of Educational Research and Training"


def D_(k):
    return doc(k, D[k][0], PUB, layout=False)


def book_unit(key, book_title, names):
    """One unit for the book (or book part); its chapters are the topics."""
    page = D[key][1]
    did = key.replace("_", "-")
    tops = [topic(n, source_ref=ref(did, page=page, section="Contents, chapter %d" % i),
                  chapter_number=i) for i, n in enumerate(names, 1)]
    return unit(book_title, ref(did, page=page, section="Contents"), topics=tops,
                prescribed_book=book_title)


def theme_units(key, book_title, themes):
    """themes: [(theme title, [(chapter number, chapter title), ...]), ...]"""
    page = D[key][1]
    did = key.replace("_", "-")
    out = []
    for tt, chs in themes:
        tops = [topic(n, source_ref=ref(did, page=page, section="Contents, chapter %d" % c),
                      chapter_number=c) for c, n in chs]
        out.append(unit(tt, ref(did, page=page, section="Contents, theme heading"),
                        topics=tops, prescribed_book=book_title))
    return out


def renumber(units):
    for i, u in enumerate(units, 1):
        u["order"] = i
    return units


# ---------------------------------------------------------------- class 6
write("cbse/class-6-mathematics.json", syllabus(**FW, level="Class 6", level_order=6,
    subject="Mathematics", status="verified", note=NOTE, documents=[D_("ncert_6_ganita")],
    units=[book_unit("ncert_6_ganita", "Ganita Prakash, Grade 6", [
        "Patterns in Mathematics", "Lines and Angles", "Number Play",
        "Data Handling and Presentation", "Prime Time", "Perimeter and Area", "Fractions",
        "Playing with Constructions", "Symmetry", "The Other Side of Zero"])]))

write("cbse/class-6-science.json", syllabus(**FW, level="Class 6", level_order=6,
    subject="Science", status="verified", note=NOTE, documents=[D_("ncert_6_curiosity")],
    units=[book_unit("ncert_6_curiosity", "Curiosity, Grade 6", [
        "The Wonderful World of Science", "Diversity in the Living World",
        "Mindful Eating: A Path to a Healthy Body", "Exploring Magnets",
        "Measurement of Length and Motion", "Materials Around Us",
        "Temperature and its Measurement", "A Journey through States of Water",
        "Methods of Separation in Everyday Life",
        "Living Creatures: Exploring their Characteristics", "Nature's Treasures",
        "Beyond Earth"])]))

write("cbse/class-6-social-science.json", syllabus(**FW, level="Class 6", level_order=6,
    subject="Social Science", status="verified", note=NOTE, documents=[D_("ncert_6_society")],
    units=theme_units("ncert_6_society", "Exploring Society: India and Beyond, Grade 6", [
        ("Theme A - India and the World: Land and the People",
         [(1, "Locating Places on the Earth"), (2, "Oceans and Continents"), (3, "Landforms and Life")]),
        ("Theme B - Tapestry of the Past",
         [(4, "Timeline and Sources of History"), (5, "India, That Is Bharat"),
          (6, "The Beginnings of Indian Civilisation")]),
        ("Theme C - Our Cultural Heritage and Knowledge Traditions",
         [(7, "India's Cultural Roots"), (8, "Unity in Diversity, or 'Many in the One'")]),
        ("Theme D - Governance and Democracy",
         [(9, "Family and Community"), (10, "Grassroots Democracy - Part 1: Governance"),
          (11, "Grassroots Democracy - Part 2: Local Government in Rural Areas"),
          (12, "Grassroots Democracy - Part 3: Local Government in Urban Areas")]),
        ("Theme E - Economic Life Around Us",
         [(13, "The Value of Work"), (14, "Economic Activities Around Us")]),
    ])))

# ---------------------------------------------------------------- class 7
write("cbse/class-7-mathematics.json", syllabus(**FW, level="Class 7", level_order=7,
    subject="Mathematics", status="verified", note=NOTE,
    documents=[D_("ncert_7_ganita1"), D_("ncert_7_ganita2")],
    units=renumber([
        book_unit("ncert_7_ganita1", "Ganita Prakash, Grade 7, Part 1", [
            "Large Numbers Around Us", "Arithmetic Expressions", "A Peek Beyond the Point",
            "Expressions using Letter-Numbers", "Parallel and Intersecting Lines", "Number Play",
            "A Tale of Three Intersecting Lines", "Working with Fractions"]),
        book_unit("ncert_7_ganita2", "Ganita Prakash, Grade 7, Part 2", [
            "Geometric Twins", "Operations with Integers", "Finding Common Ground",
            "Another Peek Beyond the Point", "Connecting the Dots...",
            "Constructions and Tilings", "Finding the Unknown"])])))

write("cbse/class-7-science.json", syllabus(**FW, level="Class 7", level_order=7,
    subject="Science", status="verified", note=NOTE, documents=[D_("ncert_7_curiosity")],
    units=[book_unit("ncert_7_curiosity", "Curiosity, Grade 7", [
        "The Ever-Evolving World of Science", "Exploring Substances: Acidic, Basic, and Neutral",
        "Electricity: Circuits and their Components", "The World of Metals and Non-metals",
        "Changes Around Us: Physical and Chemical", "Adolescence: A Stage of Growth and Change",
        "Heat Transfer in Nature", "Measurement of Time and Motion", "Life Processes in Animals",
        "Life Processes in Plants", "Light: Shadows and Reflections", "Earth, Moon, and the Sun"])]))

write("cbse/class-7-social-science.json", syllabus(**FW, level="Class 7", level_order=7,
    subject="Social Science", status="verified", note=NOTE,
    documents=[D_("ncert_7_society1"), D_("ncert_7_society2")],
    units=renumber(
        theme_units("ncert_7_society1", "Exploring Society: India and Beyond, Grade 7, Part 1", [
            ("Theme A - India and the World: Land and the People",
             [(1, "Geographical Diversity of India"), (2, "Understanding the Weather"), (3, "Climates of India")]),
            ("Theme B - Tapestry of the Past",
             [(4, "New Beginnings: Cities and States"), (5, "The Rise of Empires"),
              (6, "The Age of Reorganisation"), (7, "The Gupta Era: An Age of Tireless Creativity")]),
            ("Theme C - Our Cultural Heritage and Knowledge Traditions",
             [(8, "How the Land Becomes Sacred")]),
            ("Theme D - Governance and Democracy",
             [(9, "From the Rulers to the Ruled: Types of Governments"),
              (10, "The Constitution of India - An Introduction")]),
            ("Theme E - Economic Life Around Us",
             [(11, "From Barter to Money"), (12, "Understanding Markets")]),
        ]) +
        theme_units("ncert_7_society2", "Exploring Society: India and Beyond, Grade 7, Part 2", [
            ("Theme A - India and the World: Land and the People (Part 2)",
             [(1, "The Story of Indian Farming"), (2, "India and Her Neighbours")]),
            ("Theme B - Tapestry of the Past (Part 2)",
             [(3, "Empires and Kingdoms: 6th to 10th Centuries"),
              (4, "Turning Tides: 11th and 12th Centuries")]),
            ("Theme C - Our Cultural Heritage and Knowledge Traditions (Part 2)",
             [(5, "India, a Home to Many")]),
            ("Theme D - Governance and Democracy (Part 2)",
             [(6, "The State, the Government, and You")]),
            ("Theme E - Economic Life Around Us (Part 2)",
             [(7, "Infrastructure: Engine of India's Development"),
              (8, "Banks and the Magic of Finance")]),
        ]))))

# ---------------------------------------------------------------- class 8
write("cbse/class-8-mathematics.json", syllabus(**FW, level="Class 8", level_order=8,
    subject="Mathematics", status="verified", note=NOTE,
    documents=[D_("ncert_8_ganita1"), D_("ncert_8_ganita2")],
    units=renumber([
        book_unit("ncert_8_ganita1", "Ganita Prakash, Grade 8, Part 1", [
            "A Square and A Cube", "Power Play", "A Story of Numbers", "Quadrilaterals",
            "Number Play", "We Distribute, Yet Things Multiply", "Proportional Reasoning-1"]),
        book_unit("ncert_8_ganita2", "Ganita Prakash, Grade 8, Part 2", [
            "Fractions in Disguise", "The Baudhayana-Pythagoras Theorem",
            "Proportional Reasoning-2", "Exploring Some Geometric Themes",
            "Tales by Dots and Lines", "Algebra Play", "Area"])])))

write("cbse/class-8-science.json", syllabus(**FW, level="Class 8", level_order=8,
    subject="Science", status="verified", note=NOTE, documents=[D_("ncert_8_curiosity")],
    units=[book_unit("ncert_8_curiosity", "Curiosity, Grade 8", [
        "Exploring the Investigative World of Science",
        "The Invisible Living World: Beyond Our Naked Eye", "Health: The Ultimate Treasure",
        "Electricity: Magnetic and Heating Effects", "Exploring Forces",
        "Pressure, Winds, Storms, and Cyclones", "Particulate Nature of Matter",
        "Nature of Matter: Elements, Compounds, and Mixtures",
        "The Amazing World of Solutes, Solvents, and Solutions", "Light: Mirrors and Lenses",
        "Keeping Time with the Skies", "How Nature Works in Harmony",
        "Our Home: Earth, a Unique Life Sustaining Planet"])]))

write("cbse/class-8-social-science.json", syllabus(**FW, level="Class 8", level_order=8,
    subject="Social Science", status="verified",
    note=NOTE + " Part 2 of the Grade 8 book sets its chapter titles in small capitals, which "
    "the extractor renders with inconsistent case; the titles here follow the book's title case.",
    documents=[D_("ncert_8_society1"), D_("ncert_8_society2")],
    units=renumber(
        theme_units("ncert_8_society1", "Exploring Society: India and Beyond, Grade 8, Part 1", [
            ("Theme A - India and the World: Land and the People",
             [(1, "Natural Resources and Their Use")]),
            ("Theme B - Tapestry of the Past",
             [(2, "Reshaping India's Political Map"), (3, "The Rise of the Marathas"),
              (4, "The Colonial Era in India")]),
            ("Theme D - Governance and Democracy",
             [(5, "Universal Franchise and India's Electoral System"),
              (6, "The Parliamentary System: Legislature and Executive")]),
            ("Theme E - Economic Life Around Us", [(7, "Factors of Production")]),
        ]) +
        theme_units("ncert_8_society2", "Exploring Society: India and Beyond, Grade 8, Part 2", [
            ("Theme A - India and the World: Land and the People (Part 2)",
             [(1, "World Geography: Some Glimpses")]),
            ("Theme B - Tapestry of the Past (Part 2)",
             [(2, "India's Long Road to Independence")]),
            ("Theme C - Our Cultural Heritage and Knowledge Traditions (Part 2)",
             [(3, "A Journey Through Indian Architecture")]),
            ("Theme D - Governance and Democracy (Part 2)",
             [(4, "The Role of the Judiciary in Our Society"),
              (5, "Citizenship: Rights and Duties")]),
            ("Theme E - Economic Life Around Us (Part 2)",
             [(6, "Dynamics of Population"), (7, "India's Urban Landscape"),
              (8, "Cultural Currents: 13th to 17th Centuries")]),
        ]))))
