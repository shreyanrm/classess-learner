"""CBSE Class IX Social Science, 2026-27."""

import sys

sys.path.insert(0, "lib")
from build import doc, ref, syllabus, topic, unit, write

FW = {
    "framework_id": "cbse",
    "framework_name": "Central Board of Secondary Education",
    "framework_kind": "national",
    "country": "IN",
    "version": "2026-27",
    "aliases": ["CBSE", "Central Board of Secondary Education, New Delhi"],
}
D = doc(
    "cbse_9_social",
    "Social Science, Class IX, Secondary Curriculum Part 1, 2026-27",
    "Central Board of Secondary Education",
)
DID = "cbse-9-social"

# (theme number, title, instructional hours, page, [outline/concept items])
P1 = [
    (
        1,
        "Understanding Social Science",
        4,
        8,
        [
            "Meaning, scope and relevance of Social Science",
            "Understanding Social Science from an Indian perspective",
        ],
    ),
    (
        2,
        "Shaping of the Earth's Surface",
        8,
        8,
        [
            "Theory of plate tectonics",
            "Interior of the Earth",
            "Role of weathering and erosion; agents of gradation - river, waves and currents, wind, glaciers, and underground water",
            "Landforms and disasters: earthquakes, landslides, avalanches, Glacial Lake Outburst Flood (GLOF) and duststroms",
        ],
    ),
    (
        3,
        "Atmosphere and Climate",
        7,
        8,
        [
            "Structure and composition; elements of weather and climate",
            "Seasons of India and monsoons",
            "Climate change",
            "Floods",
            "Carbon footprint",
        ],
    ),
    (
        4,
        "Early Humans and Beginning of Civilisation",
        9,
        9,
        [
            "Cultural development from 2 million years ago",
            "Early human history, periodisation: Archaeological ages",
            "Who are human ancestors?",
            "Palaeolithic hunter-gatherers and use of stone tools",
            "Mesolithic transition to food production: Mesolithic sites and tools",
            "Neolithic and the beginning of farming: Neolithic revolution, domestication of plants and animals",
            "Harappan and contemporary cultures",
            "Mesopotamian, egyptian, and chinese civilisation",
        ],
    ),
    (
        5,
        "State and Society (upto 1000 CE)",
        9,
        9,
        [
            "Vedic Age - geography; texts; rituals; political institutions, and social order",
            "Administrative structure of early empires",
            "Quest for knowledge - educational heritage, institutions, knowledge traditions, and cultural practices",
            "Traders and trade routes, guilds and merchants, crafts and industries",
        ],
    ),
    (
        6,
        "Democracy",
        9,
        10,
        [
            "Meaning features and types of democracy",
            "Roots of democracy in India",
            "Challenges to democracy in India",
            "Democratic systems in the world",
        ],
    ),
    (
        7,
        "Elections",
        9,
        10,
        [
            "Factors of importance of elections",
            "Electoral systems",
            "Delimitation Commission",
            "Election Commission of India and its role",
            "Constituency, electoral rolls, enumerators",
            "Party system in India",
        ],
    ),
    (
        8,
        "Building Blocks in Economics",
        7,
        10,
        [
            "Scarcity of resources, opportunity cost and the need for making choice. What do economists do?",
            "What to produce, how to produce, and for whom to produce?",
            "Difference between market, centrally planned, and mixed economic systems",
            "Welfare economy",
        ],
    ),
    (
        9,
        "The Price Puzzle: What Drives the Market",
        8,
        11,
        [
            "Laws of demand and supply",
            "Real-world deviations from textbook theory, such as in case of necessities, luxury goods, perishable items, and expectations",
            "Some related concepts - price ceilings and market failures (externalities, information asymmetry, public goods)",
        ],
    ),
]
P2 = [
    (
        1,
        "Oceans and Life",
        7,
        11,
        [
            "Introduction to ocean relief, movement of ocean water - waves, tides and currents",
            "Marine resources and their significance; open seas, navigation, fishing, and livelihood concerns and challenges",
            "Cyclones and Tsunamis - early warning systems",
            "International maritime rules and regulations",
        ],
    ),
    (
        2,
        "Life on Earth",
        7,
        12,
        [
            "Biomes: Distribution and characteristics; biosphere reserves in India",
            "Forest and ecotourism; forest dwellers, their livelihoods, and challenges",
            "Forest and wildlife conservation",
            "Government efforts to support forest dwellers",
        ],
    ),
    (
        3,
        "Resistance and Resilience (1000 CE - 1700 CE)",
        9,
        12,
        [
            "Safeguarding sovereignty: resistance, alliances and confederacies",
            "Development of art and architecture, languages and literature",
            "The Bhakti tradition",
            "Forts and fortifications",
            "Expansion of Indian economy and state",
        ],
    ),
    (
        4,
        "India and the World-I (1900 BCE - 1200 CE)",
        8,
        12,
        [
            "Trade and commerce - trade with Mesopotamia, Greece, Roman Empire, China and Southeast Asia",
            "Cultural Connections - Interactions with Greece and Rome, Central Asia, China, and Influence on South East Asia",
            "Indian Knowledge Systems - Medicine, Mathematics and Astronomy, Medicine, Religion",
        ],
    ),
    (
        5,
        "Authority",
        10,
        13,
        [
            "The Roots of Authority: in Kautilya and shukraniti - danda and relationship with nyaya and bala; the types of nyaya and bala",
            "Constitutional status of justice and security since ancient times",
            "Links the role of citizens with the elections and the democratic institutions",
            "Types of authority - functional, sensitive, and welfare-oriented",
        ],
    ),
    (
        6,
        "From Ideas to Startups",
        8,
        13,
        [
            "What is entrepreneurship and explain the resources required to start a business",
            "Case studies of successful entrepreneurs",
            "Creative destruction with examples",
            "Start-up ecosystem in India",
            "Make in India initiative, role of MSMEs and the unorganised sector in India's economic growth",
            "Stages of starting and executing a business idea through a business plan",
            "Some basic accounting concepts",
        ],
    ),
    (
        7,
        "Smart Ways to Manage Your Finances",
        6,
        13,
        [
            "Relevance of personal financial management in daily life",
            "Inflation and its impact on purchasing power",
            "Simple vs. compound interest rate",
            "Budgeting",
            "Various savings and investment options like fixed deposit, stocks, bonds, mutual funds, etc.",
            "Risk and insurance",
            "Personal income tax",
        ],
    ),
]

units = []
for part, rows in (("Part 1", P1), ("Part 2", P2)):
    for no, title, hours, page, outline in rows:
        units.append(
            unit(
                title,
                ref(DID, page=page, section=f"Course outline, {part}, theme {no}"),
                topics=[
                    topic(
                        o,
                        source_ref=ref(
                            DID,
                            page=page,
                            section=f"Course outline, {part}, theme {no}, outline and concepts",
                        ),
                    )
                    for o in outline
                ],
                part=part,
                theme_number=no,
                instructional_hours=hours,
            )
        )

write(
    "cbse/class-9-social-science.json",
    syllabus(
        **FW,
        level="Class 9",
        level_order=9,
        subject="Social Science",
        status="verified",
        documents=[D],
        units=units,
        note="Units are the course-outline themes with the document's own instructional-hour "
        "allocation; topics are each theme's 'outline and concepts' entries. The document also "
        "states learning outcomes and competencies for every theme, in a parallel column of the "
        "same table (pages 8 to 14); they are not transcribed here because the two columns "
        "interleave in the extracted text and could not be separated without loss. The document "
        "notes on page 14 that the course structure will be provided later.",
    ),
)
