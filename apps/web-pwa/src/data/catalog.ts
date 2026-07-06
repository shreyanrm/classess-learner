/**
 * The seeded curriculum world: CBSE Class 8 for the dev learner, board doors for everyone else.
 * Chapter lists follow the rationalized NCERT syllabus. Topic lists are being generated per board
 * by the catalog pipeline into content/catalogs/ — this module carries the atom's chapter fully
 * (real ontology node) so the whole machine is provable end to end today.
 */

import { ATOM_TARGET_NODE_ID } from '@classess/sdk';
import type { Board, Chapter, LearnerProfile, Subject, Topic } from './model';

export const learner: LearnerProfile = {
  name: 'Aanya',
  grade: 'Class 8',
  board: 'CBSE',
  consentTier: 'un_elevated',
};

export const boards: Board[] = [
  { id: 'cbse', name: 'CBSE', region: 'India', seeded: true },
  { id: 'icse', name: 'ICSE', region: 'India', seeded: true },
  { id: 'telangana', name: 'Telangana State Board', region: 'India', seeded: true },
  { id: 'ap', name: 'Andhra Pradesh State Board', region: 'India', seeded: false },
  { id: 'maharashtra', name: 'Maharashtra State Board', region: 'India', seeded: false },
  { id: 'karnataka', name: 'Karnataka State Board', region: 'India', seeded: false },
  { id: 'tamilnadu', name: 'Tamil Nadu State Board', region: 'India', seeded: false },
  { id: 'kerala', name: 'Kerala State Board', region: 'India', seeded: false },
  { id: 'up', name: 'UP Board', region: 'India', seeded: false },
  { id: 'ib', name: 'IB', region: 'International', seeded: false },
  { id: 'cambridge', name: 'Cambridge (IGCSE)', region: 'International', seeded: false },
  { id: 'commoncore', name: 'Common Core', region: 'United States', seeded: false },
  { id: 'national-uk', name: 'National Curriculum', region: 'United Kingdom', seeded: false },
];

export const subjects: Subject[] = [
  { id: 'math', name: 'Mathematics', line: 'patterns, structure, and certainty' },
  { id: 'science', name: 'Science', line: 'how the world actually works' },
  { id: 'social', name: 'Social science', line: 'people, places, and power' },
];

const t = (
  chapterId: string,
  id: string,
  name: string,
  blurb: string,
  prereqTopicIds: string[] = [],
  extra?: Partial<Topic>,
): Topic => ({
  id,
  chapterId,
  name,
  blurb,
  prereqTopicIds,
  kind: 'syllabus',
  xp: 120,
  ...extra,
});

/** CBSE Class 8 — Mathematics (rationalized NCERT). Chapter 2 is the atom, fully wired. */
export const mathChapters: Chapter[] = [
  {
    id: 'm1',
    subjectId: 'math',
    index: 1,
    name: 'Rational numbers',
    topics: [
      t(
        'm1',
        'm1-1',
        'What makes a number rational',
        'Fractions, negatives, and the numbers between the numbers.',
      ),
      t(
        'm1',
        'm1-2',
        'Operations on rational numbers',
        'Add, subtract, multiply, divide — and keep the sign story straight.',
        ['m1-1'],
      ),
      t(
        'm1',
        'm1-3',
        'Rational numbers on the number line',
        'Every rational number has an exact home.',
        ['m1-1'],
      ),
    ],
  },
  {
    id: 'm2',
    subjectId: 'math',
    index: 2,
    name: 'Linear equations in one variable',
    topics: [
      t(
        'm2',
        'm2-1',
        'Solving equations with the variable on one side',
        'Undo operations in the right order and the unknown surrenders.',
        [],
        { nodeId: ATOM_TARGET_NODE_ID, xp: 150 },
      ),
      t(
        'm2',
        'm2-2',
        'Variables on both sides',
        'Gather the xs, gather the numbers, and the equation folds flat.',
        ['m2-1'],
      ),
      t(
        'm2',
        'm2-3',
        'Word problems that become equations',
        'Turn a sentence into an equation, then solve it cleanly.',
        ['m2-1', 'm2-2'],
      ),
    ],
  },
  {
    id: 'm3',
    subjectId: 'math',
    index: 3,
    name: 'Understanding quadrilaterals',
    topics: [
      t(
        'm3',
        'm3-1',
        'Polygons and their angle sums',
        'Curves, sides, and the angles that always add up the same way.',
      ),
      t(
        'm3',
        'm3-2',
        'Kinds of quadrilaterals',
        'Trapezium, kite, parallelogram — sorted by what makes each one special.',
        ['m3-1'],
      ),
      t(
        'm3',
        'm3-3',
        'Properties of a parallelogram',
        'Opposite sides, opposite angles, and diagonals that share a secret.',
        ['m3-2'],
      ),
      t(
        'm3',
        'm3-4',
        'Special parallelograms',
        'Rhombus, rectangle, and square, each earning its extra rule.',
        ['m3-3'],
      ),
    ],
  },
  {
    id: 'm4',
    subjectId: 'math',
    index: 4,
    name: 'Data handling',
    topics: [
      t(
        'm4',
        'm4-1',
        'Organising and grouping data',
        'Raw numbers become a frequency table you can actually read.',
      ),
      t(
        'm4',
        'm4-2',
        'Bar graphs and histograms',
        'Bars for categories, joined bars for continuous ranges.',
        ['m4-1'],
      ),
      t('m4', 'm4-3', 'Pie charts', 'A whole cut into slices that each carry their fair share.', [
        'm4-1',
      ]),
      t(
        'm4',
        'm4-4',
        'Chance and probability',
        'Counting outcomes to say how likely something really is.',
        ['m4-1'],
      ),
    ],
  },
  {
    id: 'm5',
    subjectId: 'math',
    index: 5,
    name: 'Squares and square roots',
    topics: [
      t(
        'm5',
        'm5-1',
        'Perfect squares and their patterns',
        'The numbers you get by squaring, and the habits they keep.',
      ),
      t(
        'm5',
        'm5-2',
        'Properties of square numbers',
        'Last digits, odd-number sums, and squares between squares.',
        ['m5-1'],
      ),
      t(
        'm5',
        'm5-3',
        'Finding square roots',
        'Undo a square by prime factors or by long division.',
        ['m5-1'],
      ),
      t(
        'm5',
        'm5-4',
        'Square roots of decimals',
        'The same method, holding the decimal point in place.',
        ['m5-3'],
      ),
    ],
  },
  {
    id: 'm6',
    subjectId: 'math',
    index: 6,
    name: 'Cubes and cube roots',
    topics: [
      t(
        'm6',
        'm6-1',
        'Cubes and their patterns',
        'Multiply a number by itself twice and watch the patterns appear.',
      ),
      t(
        'm6',
        'm6-2',
        'Perfect cubes',
        'Which numbers are cubes, and how to make one from what you have.',
        ['m6-1'],
      ),
      t(
        'm6',
        'm6-3',
        'Finding cube roots',
        'Prime factors in triples lead straight back to the root.',
        ['m6-2'],
      ),
    ],
  },
  {
    id: 'm7',
    subjectId: 'math',
    index: 7,
    name: 'Comparing quantities',
    topics: [
      t(
        'm7',
        'm7-1',
        'Ratios and percentages',
        'Two ways of comparing, and the bridge between them.',
      ),
      t(
        'm7',
        'm7-2',
        'Discount, profit and loss',
        'Marked price, selling price, and where the difference goes.',
        ['m7-1'],
      ),
      t(
        'm7',
        'm7-3',
        'Tax and everyday buying',
        'Sales tax and VAT added on top of what things cost.',
        ['m7-2'],
      ),
      t('m7', 'm7-4', 'Compound interest', 'Interest that earns interest, period after period.', [
        'm7-1',
      ]),
    ],
  },
  {
    id: 'm8',
    subjectId: 'math',
    index: 8,
    name: 'Algebraic expressions and identities',
    topics: [
      t(
        'm8',
        'm8-1',
        'Terms, factors and coefficients',
        'The parts an expression is built from, named clearly.',
      ),
      t(
        'm8',
        'm8-2',
        'Adding and subtracting expressions',
        'Like terms gather, unlike terms wait their turn.',
        ['m8-1'],
      ),
      t(
        'm8',
        'm8-3',
        'Multiplying expressions',
        'Every term meets every term, and nothing gets skipped.',
        ['m8-2'],
      ),
      t(
        'm8',
        'm8-4',
        'Standard identities',
        'Three patterns that turn long multiplication into one step.',
        ['m8-3'],
      ),
    ],
  },
  {
    id: 'm9',
    subjectId: 'math',
    index: 9,
    name: 'Mensuration',
    topics: [
      t(
        'm9',
        'm9-1',
        'Area of trapezium and polygons',
        'Split an awkward shape into pieces you already know.',
      ),
      t(
        'm9',
        'm9-2',
        'Surface area of solids',
        'Wrapping a cuboid, cube, or cylinder in flat rectangles.',
        ['m9-1'],
      ),
      t('m9', 'm9-3', 'Volume of solids', 'How much space a box or a can actually holds.', [
        'm9-2',
      ]),
      t(
        'm9',
        'm9-4',
        'Volume and capacity',
        'Turning cubic units into litres for the real world.',
        ['m9-3'],
      ),
    ],
  },
  {
    id: 'm10',
    subjectId: 'math',
    index: 10,
    name: 'Exponents and powers',
    topics: [
      t(
        'm10',
        'm10-1',
        'Powers with negative exponents',
        'A negative power just means one over the positive one.',
      ),
      t(
        'm10',
        'm10-2',
        'Laws of exponents',
        'Multiply, divide, and stack powers by adding or subtracting.',
        ['m10-1'],
      ),
      t(
        'm10',
        'm10-3',
        'Standard form for small numbers',
        'Writing very tiny quantities without a trail of zeros.',
        ['m10-2'],
      ),
    ],
  },
  {
    id: 'm11',
    subjectId: 'math',
    index: 11,
    name: 'Direct and inverse proportions',
    topics: [
      t('m11', 'm11-1', 'Direct proportion', 'When one quantity rises, the other rises in step.'),
      t(
        'm11',
        'm11-2',
        'Inverse proportion',
        'When one goes up, the other goes down to keep the product fixed.',
        ['m11-1'],
      ),
      t(
        'm11',
        'm11-3',
        'Proportions in daily life',
        'Recipes, speeds, and workers, all decided by one constant.',
        ['m11-2'],
      ),
    ],
  },
  {
    id: 'm12',
    subjectId: 'math',
    index: 12,
    name: 'Factorisation',
    topics: [
      t(
        'm12',
        'm12-1',
        'Common factors and grouping',
        'Pull out what every term shares, then group the rest.',
      ),
      t(
        'm12',
        'm12-2',
        'Factorising with identities',
        'Spotting a known identity and reading it backwards.',
        ['m12-1'],
      ),
      t(
        'm12',
        'm12-3',
        'Dividing algebraic expressions',
        'Factorise first, then cancel what both sides hold.',
        ['m12-2'],
      ),
    ],
  },
  {
    id: 'm13',
    subjectId: 'math',
    index: 13,
    name: 'Introduction to graphs',
    topics: [
      t(
        'm13',
        'm13-1',
        'Reading bar, pie and line graphs',
        'Every graph tells a story once you know where to look.',
      ),
      t(
        'm13',
        'm13-2',
        'Coordinates and the plane',
        'Two numbers pin any point exactly where it belongs.',
        ['m13-1'],
      ),
      t(
        'm13',
        'm13-3',
        'Plotting and reading line graphs',
        'Turning a table of values into a line that speaks.',
        ['m13-2'],
      ),
    ],
  },
];

/** CBSE Class 8 — Science (rationalized NCERT). */
export const scienceChapters: Chapter[] = [
  {
    id: 's1',
    subjectId: 'science',
    index: 1,
    name: 'Crop production and management',
    topics: [
      t(
        's1',
        's1-1',
        'Crops and agricultural practices',
        'The steps a field goes through from bare soil to harvest.',
      ),
      t(
        's1',
        's1-2',
        'Preparing soil and sowing',
        'Loosening the earth and giving each seed its right start.',
        ['s1-1'],
      ),
      t(
        's1',
        's1-3',
        'Irrigation and adding nutrients',
        'Watering wisely and returning what the soil gives up.',
        ['s1-2'],
      ),
      t(
        's1',
        's1-4',
        'Harvesting and storage',
        'Bringing the crop in and keeping it safe from spoiling.',
        ['s1-3'],
      ),
    ],
  },
  {
    id: 's2',
    subjectId: 'science',
    index: 2,
    name: 'Microorganisms: friend and foe',
    topics: [
      t(
        's2',
        's2-1',
        'The world of microorganisms',
        'Living things too small to see, yet everywhere around us.',
      ),
      t(
        's2',
        's2-2',
        'Friendly microbes',
        'The tiny helpers behind curd, bread, and healthy soil.',
        ['s2-1'],
      ),
      t(
        's2',
        's2-3',
        'Harmful microbes and disease',
        'How some microbes spread illness, and how we fight back.',
        ['s2-1'],
      ),
      t('s2', 's2-4', 'Food preservation', 'Slowing microbes down to keep food good for longer.', [
        's2-3',
      ]),
    ],
  },
  {
    id: 's3',
    subjectId: 'science',
    index: 3,
    name: 'Coal and petroleum',
    topics: [
      t(
        's3',
        's3-1',
        'Exhaustible and inexhaustible resources',
        'What nature can replace quickly, and what it cannot.',
      ),
      t(
        's3',
        's3-2',
        'Coal and its products',
        'A buried forest turned to fuel, coke, and coal tar.',
        ['s3-1'],
      ),
      t(
        's3',
        's3-3',
        'Petroleum and natural gas',
        'How crude oil is separated into the fuels we use.',
        ['s3-1'],
      ),
      t(
        's3',
        's3-4',
        'Conserving fossil fuels',
        'Using less today so there is some left tomorrow.',
        ['s3-2', 's3-3'],
      ),
    ],
  },
  {
    id: 's4',
    subjectId: 'science',
    index: 4,
    name: 'Combustion and flame',
    topics: [
      t(
        's4',
        's4-1',
        'What is combustion',
        'Burning is a reaction with oxygen that releases heat and light.',
      ),
      t(
        's4',
        's4-2',
        'Conditions and types of combustion',
        'Fuel, air, and heat, and how fast the burning goes.',
        ['s4-1'],
      ),
      t(
        's4',
        's4-3',
        'The structure of a flame',
        'Three zones of a candle flame, each a different heat.',
        ['s4-2'],
      ),
      t(
        's4',
        's4-4',
        'Fuels and their efficiency',
        'What makes one fuel better, cleaner, or safer than another.',
        ['s4-2'],
      ),
    ],
  },
  {
    id: 's5',
    subjectId: 'science',
    index: 5,
    name: 'Conservation of plants and animals',
    topics: [
      t(
        's5',
        's5-1',
        'Deforestation and its effects',
        'What we lose when the forests are cleared away.',
      ),
      t(
        's5',
        's5-2',
        'Biodiversity and ecosystems',
        'The web of species that keeps a place alive.',
        ['s5-1'],
      ),
      t(
        's5',
        's5-3',
        'Protected areas and reserves',
        'Sanctuaries and parks set aside for wildlife to thrive.',
        ['s5-2'],
      ),
      t(
        's5',
        's5-4',
        'Endangered species and recovery',
        'Species on the edge, and the work of bringing them back.',
        ['s5-3'],
      ),
    ],
  },
  {
    id: 's6',
    subjectId: 'science',
    index: 6,
    name: 'Reproduction in animals',
    topics: [
      t(
        's6',
        's6-1',
        'Sexual and asexual reproduction',
        'Two ways living things make more of their own kind.',
      ),
      t('s6', 's6-2', 'Fertilisation', 'Where two cells meet and a new life begins.', ['s6-1']),
      t('s6', 's6-3', 'Development of the young', 'From egg or womb to a fully formed animal.', [
        's6-2',
      ]),
    ],
  },
  {
    id: 's7',
    subjectId: 'science',
    index: 7,
    name: 'Reaching the age of adolescence',
    topics: [
      t('s7', 's7-1', 'Adolescence and puberty', 'The years when the body grows into an adult.'),
      t(
        's7',
        's7-2',
        'Hormones and their role',
        'Chemical messengers that guide the changes within.',
        ['s7-1'],
      ),
      t(
        's7',
        's7-3',
        'Health during adolescence',
        'Food, hygiene, and habits that support a changing body.',
        ['s7-1'],
      ),
    ],
  },
  {
    id: 's8',
    subjectId: 'science',
    index: 8,
    name: 'Force and pressure',
    topics: [
      t('s8', 's8-1', 'What a force does', 'A push or pull can start, stop, or turn any motion.'),
      t(
        's8',
        's8-2',
        'Contact and non-contact forces',
        'Some forces need a touch, others act across a gap.',
        ['s8-1'],
      ),
      t('s8', 's8-3', 'Pressure', 'The same force feels different spread over more or less area.', [
        's8-1',
      ]),
      t(
        's8',
        's8-4',
        'Atmospheric pressure',
        'The weight of the air we barely notice pressing on us.',
        ['s8-3'],
      ),
    ],
  },
  {
    id: 's9',
    subjectId: 'science',
    index: 9,
    name: 'Friction',
    topics: [
      t('s9', 's9-1', 'What is friction', 'The force that resists whenever two surfaces slide.'),
      t(
        's9',
        's9-2',
        'Factors that affect friction',
        'Smoothness and pressing force decide how strong it is.',
        ['s9-1'],
      ),
      t(
        's9',
        's9-3',
        'Friction as friend and foe',
        'Sometimes we need it, sometimes we want it gone.',
        ['s9-2'],
      ),
      t('s9', 's9-4', 'Reducing friction', 'Wheels, oil, and shapes that let things move freely.', [
        's9-3',
      ]),
    ],
  },
  {
    id: 's10',
    subjectId: 'science',
    index: 10,
    name: 'Sound',
    topics: [
      t(
        's10',
        's10-1',
        'How sound is produced',
        'Every sound begins with something that vibrates.',
      ),
      t(
        's10',
        's10-2',
        'Sound needs a medium',
        'Vibrations travel through air, water, and solids, but not through empty space.',
        ['s10-1'],
      ),
      t(
        's10',
        's10-3',
        'Loudness and pitch',
        'How big and how fast a vibration is decides what we hear.',
        ['s10-2'],
      ),
      t(
        's10',
        's10-4',
        'Noise and hearing',
        'When sound becomes harmful, and how to protect our ears.',
        ['s10-3'],
      ),
    ],
  },
  {
    id: 's11',
    subjectId: 'science',
    index: 11,
    name: 'Chemical effects of electric current',
    topics: [
      t(
        's11',
        's11-1',
        'Conduction of electricity in liquids',
        'Some liquids let current pass, and some refuse.',
      ),
      t(
        's11',
        's11-2',
        'Chemical effects of current',
        'Electricity passing through a liquid can change it.',
        ['s11-1'],
      ),
      t('s11', 's11-3', 'Electroplating', 'Using current to lay a thin metal coat on an object.', [
        's11-2',
      ]),
    ],
  },
  {
    id: 's12',
    subjectId: 'science',
    index: 12,
    name: 'Some natural phenomena',
    topics: [
      t(
        's12',
        's12-1',
        'Charging by friction',
        'Rubbing builds up a charge that can attract or repel.',
      ),
      t(
        's12',
        's12-2',
        'Lightning and how it forms',
        'Charge gathering in clouds until it leaps to the ground.',
        ['s12-1'],
      ),
      t(
        's12',
        's12-3',
        'Staying safe from lightning',
        'Conductors and shelters that lead the danger away.',
        ['s12-2'],
      ),
      t('s12', 's12-4', 'Earthquakes', 'The ground shaking as the plates beneath us shift.', [
        's12-1',
      ]),
    ],
  },
  {
    id: 's13',
    subjectId: 'science',
    index: 13,
    name: 'Light',
    topics: [
      t(
        's13',
        's13-1',
        'Reflection of light',
        'Light bounces off surfaces in a way we can predict.',
      ),
      t('s13', 's13-2', 'Laws of reflection', 'The angle in always matches the angle out.', [
        's13-1',
      ]),
      t(
        's13',
        's13-3',
        'Images in mirrors',
        'Plane and curved mirrors, and the images they make.',
        ['s13-2'],
      ),
      t('s13', 's13-4', 'The human eye', 'How the eye gathers light and lets us see.', ['s13-1']),
    ],
  },
];

/** CBSE Class 8 — Social science (History · Geography · Civics). */
export const socialChapters: Chapter[] = [
  {
    id: 'h1',
    subjectId: 'social',
    index: 1,
    name: 'How, when and where',
    topics: [
      t(
        'h1',
        'h1-1',
        'Why dates matter in history',
        'How historians choose which moments mark a change.',
      ),
      t(
        'h1',
        'h1-2',
        'Colonial records and surveys',
        'The paperwork the British left, and what it reveals.',
        ['h1-1'],
      ),
      t(
        'h1',
        'h1-3',
        'How the past was written',
        'Whose story gets told, and whose gets left out.',
        ['h1-2'],
      ),
    ],
  },
  {
    id: 'h2',
    subjectId: 'social',
    index: 2,
    name: 'From trade to territory',
    topics: [
      t(
        'h2',
        'h2-1',
        'The East India Company arrives',
        'A trading company that slowly reached for power.',
      ),
      t(
        'h2',
        'h2-2',
        'The Company gains Bengal',
        'From Plassey to Buxar, trade turned into rule.',
        ['h2-1'],
      ),
      t(
        'h2',
        'h2-3',
        'Expanding across India',
        'Alliances, wars, and annexations that widened the map.',
        ['h2-2'],
      ),
      t(
        'h2',
        'h2-4',
        'The Company as a state',
        'Building an army and an administration to govern.',
        ['h2-3'],
      ),
    ],
  },
  {
    id: 'h3',
    subjectId: 'social',
    index: 3,
    name: 'Ruling the countryside',
    topics: [
      t(
        'h3',
        'h3-1',
        'Revenue systems of the Company',
        'New rules that decided who paid, and how much.',
      ),
      t(
        'h3',
        'h3-2',
        'The Permanent Settlement',
        'Fixing land revenue, and the burden it placed on farmers.',
        ['h3-1'],
      ),
      t(
        'h3',
        'h3-3',
        'Indigo and the peasants',
        'A cash crop forced on villagers who grew it at a loss.',
        ['h3-2'],
      ),
      t('h3', 'h3-4', 'The Blue Rebellion', 'When indigo farmers finally refused to plant.', [
        'h3-3',
      ]),
    ],
  },
  {
    id: 'h4',
    subjectId: 'social',
    index: 4,
    name: 'When people rebel: 1857 and after',
    topics: [
      t(
        'h4',
        'h4-1',
        'Causes of the 1857 revolt',
        'The grievances that built up across soldiers and rulers.',
      ),
      t(
        'h4',
        'h4-2',
        'The rebellion spreads',
        'How the uprising moved from Meerut across the north.',
        ['h4-1'],
      ),
      t(
        'h4',
        'h4-3',
        'Suppression and aftermath',
        'How the revolt was crushed and the Crown took charge.',
        ['h4-2'],
      ),
    ],
  },
  {
    id: 'h5',
    subjectId: 'social',
    index: 5,
    name: 'Women, caste and reform',
    topics: [
      t('h5', 'h5-1', 'Reforming society', 'Voices that questioned old customs and cruelties.'),
      t(
        'h5',
        'h5-2',
        'Changing the lives of women',
        'Campaigns for widow remarriage, schooling, and dignity.',
        ['h5-1'],
      ),
      t('h5', 'h5-3', 'Challenging caste', 'Movements that demanded equality for the oppressed.', [
        'h5-1',
      ]),
    ],
  },
  {
    id: 'h6',
    subjectId: 'social',
    index: 6,
    name: 'The making of the national movement',
    topics: [
      t('h6', 'h6-1', 'Early nationalism', 'The first stirrings of a demand to be heard.'),
      t(
        'h6',
        'h6-2',
        'The Congress and its growth',
        'A platform that gathered many voices into one.',
        ['h6-1'],
      ),
      t(
        'h6',
        'h6-3',
        'Gandhi and mass movements',
        'How ordinary people joined the fight for freedom.',
        ['h6-2'],
      ),
      t('h6', 'h6-4', 'Towards independence', 'The final years, and the price of partition.', [
        'h6-3',
      ]),
    ],
  },
  {
    id: 'g1',
    subjectId: 'social',
    index: 7,
    name: 'Resources',
    topics: [
      t(
        'g1',
        'g1-1',
        'What makes something a resource',
        'Anything useful becomes a resource once we value it.',
      ),
      t(
        'g1',
        'g1-2',
        'Types of resources',
        'Natural, human, and human-made, and how they differ.',
        ['g1-1'],
      ),
      t('g1', 'g1-3', 'Conserving resources', 'Using carefully so there is enough to go around.', [
        'g1-2',
      ]),
    ],
  },
  {
    id: 'g2',
    subjectId: 'social',
    index: 8,
    name: 'Land, soil, water, natural vegetation',
    topics: [
      t('g2', 'g2-1', 'Land and land use', 'How the same land serves farms, forests, and cities.'),
      t(
        'g2',
        'g2-2',
        'Soil and its conservation',
        'How soil forms, and how it is lost and saved.',
        ['g2-1'],
      ),
      t(
        'g2',
        'g2-3',
        'Water as a resource',
        'Where fresh water comes from and why it runs short.',
        ['g2-1'],
      ),
      t(
        'g2',
        'g2-4',
        'Natural vegetation and wildlife',
        'The green cover that shelters life across the land.',
        ['g2-2'],
      ),
    ],
  },
  {
    id: 'g3',
    subjectId: 'social',
    index: 9,
    name: 'Agriculture',
    topics: [
      t('g3', 'g3-1', 'Farming and its types', 'From subsistence plots to vast commercial fields.'),
      t('g3', 'g3-2', 'Major crops', 'The staples and cash crops that feed and fund us.', ['g3-1']),
      t(
        'g3',
        'g3-3',
        'Agriculture around the world',
        'How farming looks in a developed and a developing land.',
        ['g3-2'],
      ),
    ],
  },
  {
    id: 'g4',
    subjectId: 'social',
    index: 10,
    name: 'Industries',
    topics: [
      t('g4', 'g4-1', 'What is an industry', 'Turning raw materials into things people use.'),
      t('g4', 'g4-2', 'Classifying industries', 'Sorted by size, ownership, and what they make.', [
        'g4-1',
      ]),
      t('g4', 'g4-3', 'Factors of industrial location', 'Why a factory settles where it does.', [
        'g4-2',
      ]),
      t('g4', 'g4-4', 'Major industries', 'Textiles, iron and steel, and information technology.', [
        'g4-3',
      ]),
    ],
  },
  {
    id: 'c1',
    subjectId: 'social',
    index: 11,
    name: 'The Indian constitution',
    topics: [
      t(
        'c1',
        'c1-1',
        'Why a country needs a constitution',
        'The shared rulebook that holds a nation together.',
      ),
      t(
        'c1',
        'c1-2',
        'Key features of our constitution',
        'Rights, federalism, and the ideals it protects.',
        ['c1-1'],
      ),
      t('c1', 'c1-3', 'Fundamental rights', 'The freedoms every citizen can claim.', ['c1-2']),
    ],
  },
  {
    id: 'c2',
    subjectId: 'social',
    index: 12,
    name: 'Understanding secularism',
    topics: [
      t('c2', 'c2-1', 'What secularism means', 'Keeping the state apart from any one religion.'),
      t('c2', 'c2-2', 'Indian secularism', 'How our constitution treats every faith equally.', [
        'c2-1',
      ]),
      t(
        'c2',
        'c2-3',
        'Secularism in everyday life',
        'Where these ideas show up in real situations.',
        ['c2-2'],
      ),
    ],
  },
  {
    id: 'c3',
    subjectId: 'social',
    index: 13,
    name: 'Why do we need a parliament',
    topics: [
      t(
        'c3',
        'c3-1',
        'The idea of representation',
        'Why we choose others to decide on our behalf.',
      ),
      t('c3', 'c3-2', 'How parliament is made', 'The two houses and the people who fill them.', [
        'c3-1',
      ]),
      t('c3', 'c3-3', 'How parliament works', 'Debating, questioning, and making the laws.', [
        'c3-2',
      ]),
    ],
  },
  {
    id: 'c4',
    subjectId: 'social',
    index: 14,
    name: 'Judiciary',
    topics: [
      t(
        'c4',
        'c4-1',
        'The role of the judiciary',
        'The branch that settles disputes and guards the law.',
      ),
      t('c4', 'c4-2', 'The structure of courts', 'From district courts up to the Supreme Court.', [
        'c4-1',
      ]),
      t(
        'c4',
        'c4-3',
        'Access to justice',
        'How the courts try to reach everyone, not just a few.',
        ['c4-2'],
      ),
    ],
  },
];

export const chaptersBySubject: Record<string, Chapter[]> = {
  math: mathChapters,
  science: scienceChapters,
  social: socialChapters,
};

const allTopics = new Map<string, Topic>();
for (const chapters of Object.values(chaptersBySubject))
  for (const ch of chapters) for (const topic of ch.topics) allTopics.set(topic.id, topic);

export function topicById(id: string): Topic | undefined {
  return allTopics.get(id);
}

export function chapterById(id: string): Chapter | undefined {
  for (const chapters of Object.values(chaptersBySubject))
    for (const ch of chapters) if (ch.id === id) return ch;
  return undefined;
}

export function subjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

/**
 * Prerequisite suggestion (never a wall): unmet prereqs of a topic, scoped to what exists in this
 * catalog — a learner who starts in Class 8 is never sent back a grade (CONTEXT.md §8).
 */
export function unmetPrereqs(topic: Topic, completed: ReadonlySet<string>): Topic[] {
  return topic.prereqTopicIds
    .map((id) => allTopics.get(id))
    .filter((p): p is Topic => Boolean(p) && !completed.has((p as Topic).id));
}
