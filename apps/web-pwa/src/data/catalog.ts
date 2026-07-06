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

/** CBSE Class 10 — Mathematics. */
export const mathChapters10: Chapter[] = [
  {
    id: 'x10-m1',
    subjectId: 'math',
    index: 1,
    name: 'Real Numbers',
    topics: [
      t('x10-m1', 'x10-m1-1', "Euclid's division lemma", 'A basis for finding common factors.'),
      t(
        'x10-m1',
        'x10-m1-2',
        'The fundamental theorem of arithmetic',
        'Every number as a product of primes.',
        ['x10-m1-1'],
      ),
      t(
        'x10-m1',
        'x10-m1-3',
        'Rational and irrational numbers',
        'Proving numbers irrational and decimal expansions.',
        ['x10-m1-2'],
      ),
    ],
  },
  {
    id: 'x10-m2',
    subjectId: 'math',
    index: 2,
    name: 'Polynomials',
    topics: [
      t('x10-m2', 'x10-m2-1', 'Zeroes of a polynomial', 'Where a polynomial equals zero.'),
      t(
        'x10-m2',
        'x10-m2-2',
        'Relationship between zeroes and coefficients',
        'How roots and coefficients connect.',
        ['x10-m2-1'],
      ),
      t(
        'x10-m2',
        'x10-m2-3',
        'Division of polynomials',
        'Dividing one polynomial by another.',
        ['x10-m2-2'],
      ),
    ],
  },
  {
    id: 'x10-m3',
    subjectId: 'math',
    index: 3,
    name: 'Pair of Linear Equations in Two Variables',
    topics: [
      t('x10-m3', 'x10-m3-1', 'Graphical solution', 'Finding solutions where lines meet.'),
      t(
        'x10-m3',
        'x10-m3-2',
        'Algebraic methods',
        'Substitution, elimination and cross-multiplication.',
        ['x10-m3-1'],
      ),
      t(
        'x10-m3',
        'x10-m3-3',
        'Consistency of equations',
        'When a pair has one, none or many solutions.',
        ['x10-m3-2'],
      ),
    ],
  },
  {
    id: 'x10-m4',
    subjectId: 'math',
    index: 4,
    name: 'Quadratic Equations',
    topics: [
      t('x10-m4', 'x10-m4-1', 'Standard form', 'Recognising a quadratic equation.'),
      t(
        'x10-m4',
        'x10-m4-2',
        'Solving quadratics',
        'By factorisation and the quadratic formula.',
        ['x10-m4-1'],
      ),
      t('x10-m4', 'x10-m4-3', 'Nature of roots', 'What the discriminant reveals.', ['x10-m4-2']),
    ],
  },
  {
    id: 'x10-m5',
    subjectId: 'math',
    index: 5,
    name: 'Arithmetic Progressions',
    topics: [
      t('x10-m5', 'x10-m5-1', 'The nth term', 'Finding any term of a sequence.'),
      t('x10-m5', 'x10-m5-2', 'Sum of n terms', 'Adding the terms of a progression.', [
        'x10-m5-1',
      ]),
      t('x10-m5', 'x10-m5-3', 'Applications of AP', 'Using patterns to solve problems.', [
        'x10-m5-2',
      ]),
    ],
  },
  {
    id: 'x10-m6',
    subjectId: 'math',
    index: 6,
    name: 'Triangles',
    topics: [
      t('x10-m6', 'x10-m6-1', 'Similarity of triangles', 'When triangles have the same shape.'),
      t('x10-m6', 'x10-m6-2', 'Criteria for similarity', 'AA, SAS and SSS similarity.', [
        'x10-m6-1',
      ]),
      t(
        'x10-m6',
        'x10-m6-3',
        'Areas of similar triangles',
        "How area relates to the ratio of sides.",
        ['x10-m6-2'],
      ),
    ],
  },
  {
    id: 'x10-m7',
    subjectId: 'math',
    index: 7,
    name: 'Coordinate Geometry',
    topics: [
      t('x10-m7', 'x10-m7-1', 'Distance formula', 'Length between two points.'),
      t('x10-m7', 'x10-m7-2', 'Section formula', 'Dividing a segment in a ratio.', ['x10-m7-1']),
      t(
        'x10-m7',
        'x10-m7-3',
        'Area of a triangle',
        'From the coordinates of its vertices.',
        ['x10-m7-2'],
      ),
    ],
  },
  {
    id: 'x10-m8',
    subjectId: 'math',
    index: 8,
    name: 'Introduction to Trigonometry',
    topics: [
      t('x10-m8', 'x10-m8-1', 'Trigonometric ratios', 'Sine, cosine and tangent of an angle.'),
      t(
        'x10-m8',
        'x10-m8-2',
        'Ratios of specific angles',
        'Values at 0, 30, 45, 60 and 90 degrees.',
        ['x10-m8-1'],
      ),
      t(
        'x10-m8',
        'x10-m8-3',
        'Trigonometric identities',
        'Relationships that always hold.',
        ['x10-m8-2'],
      ),
    ],
  },
  {
    id: 'x10-m9',
    subjectId: 'math',
    index: 9,
    name: 'Some Applications of Trigonometry',
    topics: [
      t('x10-m9', 'x10-m9-1', 'Heights and distances', 'Measuring the unreachable with angles.'),
      t('x10-m9', 'x10-m9-2', 'Angle of elevation', 'Looking up to a distant point.', [
        'x10-m9-1',
      ]),
      t('x10-m9', 'x10-m9-3', 'Angle of depression', 'Looking down from a height.', [
        'x10-m9-2',
      ]),
    ],
  },
  {
    id: 'x10-m10',
    subjectId: 'math',
    index: 10,
    name: 'Circles',
    topics: [
      t('x10-m10', 'x10-m10-1', 'Tangent to a circle', 'A line touching the circle at one point.'),
      t(
        'x10-m10',
        'x10-m10-2',
        'Number of tangents from a point',
        'How many tangents can be drawn.',
        ['x10-m10-1'],
      ),
      t(
        'x10-m10',
        'x10-m10-3',
        'Tangent properties',
        'The tangent and the radius at the point of contact.',
        ['x10-m10-2'],
      ),
    ],
  },
  {
    id: 'x10-m11',
    subjectId: 'math',
    index: 11,
    name: 'Areas Related to Circles',
    topics: [
      t(
        'x10-m11',
        'x10-m11-1',
        'Perimeter and area of a circle',
        'The circumference and area recalled.',
      ),
      t(
        'x10-m11',
        'x10-m11-2',
        'Areas of sectors and segments',
        "Parts of a circle's area.",
        ['x10-m11-1'],
      ),
      t('x10-m11', 'x10-m11-3', 'Combined figures', 'Areas of shapes made with circles.', [
        'x10-m11-2',
      ]),
    ],
  },
  {
    id: 'x10-m12',
    subjectId: 'math',
    index: 12,
    name: 'Surface Areas and Volumes',
    topics: [
      t(
        'x10-m12',
        'x10-m12-1',
        'Surface area of combined solids',
        'Adding up the faces of joined solids.',
      ),
      t('x10-m12', 'x10-m12-2', 'Volume of combined solids', 'Space held by combined shapes.', [
        'x10-m12-1',
      ]),
      t('x10-m12', 'x10-m12-3', 'Conversion of solids', 'Reshaping one solid into another.', [
        'x10-m12-2',
      ]),
    ],
  },
  {
    id: 'x10-m13',
    subjectId: 'math',
    index: 13,
    name: 'Statistics',
    topics: [
      t('x10-m13', 'x10-m13-1', 'Mean of grouped data', 'The average of data in intervals.'),
      t(
        'x10-m13',
        'x10-m13-2',
        'Mode and median of grouped data',
        'Central values for grouped data.',
        ['x10-m13-1'],
      ),
      t('x10-m13', 'x10-m13-3', 'Cumulative frequency', 'Building towards the ogive.', [
        'x10-m13-2',
      ]),
    ],
  },
  {
    id: 'x10-m14',
    subjectId: 'math',
    index: 14,
    name: 'Probability',
    topics: [
      t(
        'x10-m14',
        'x10-m14-1',
        'Theoretical probability',
        'Measuring chance from equally likely outcomes.',
      ),
      t('x10-m14', 'x10-m14-2', 'Simple events', 'Finding the probability of one event.', [
        'x10-m14-1',
      ]),
      t(
        'x10-m14',
        'x10-m14-3',
        'Complementary events',
        'The chance of an event not happening.',
        ['x10-m14-2'],
      ),
    ],
  },
];

/** CBSE Class 10 — Science. */
export const scienceChapters10: Chapter[] = [
  {
    id: 'x10-s1',
    subjectId: 'science',
    index: 1,
    name: 'Chemical Reactions and Equations',
    topics: [
      t('x10-s1', 'x10-s1-1', 'Chemical equations', 'Writing and balancing reactions.'),
      t('x10-s1', 'x10-s1-2', 'Types of reactions', 'Combination, decomposition and displacement.', [
        'x10-s1-1',
      ]),
      t('x10-s1', 'x10-s1-3', 'Oxidation and reduction', 'Gain and loss of oxygen or electrons.', [
        'x10-s1-2',
      ]),
    ],
  },
  {
    id: 'x10-s2',
    subjectId: 'science',
    index: 2,
    name: 'Acids, Bases and Salts',
    topics: [
      t('x10-s2', 'x10-s2-1', 'Properties of acids and bases', 'How they react and behave.'),
      t('x10-s2', 'x10-s2-2', 'The pH scale', 'Measuring how acidic or basic a solution is.', [
        'x10-s2-1',
      ]),
      t('x10-s2', 'x10-s2-3', 'Salts and their uses', 'Common salts and their everyday roles.', [
        'x10-s2-2',
      ]),
    ],
  },
  {
    id: 'x10-s3',
    subjectId: 'science',
    index: 3,
    name: 'Metals and Non-metals',
    topics: [
      t('x10-s3', 'x10-s3-1', 'Physical and chemical properties', 'How metals and non-metals differ.'),
      t('x10-s3', 'x10-s3-2', 'The reactivity series', 'Ranking metals by how they react.', [
        'x10-s3-1',
      ]),
      t('x10-s3', 'x10-s3-3', 'Extraction and corrosion', 'Getting metals and protecting them.', [
        'x10-s3-2',
      ]),
    ],
  },
  {
    id: 'x10-s4',
    subjectId: 'science',
    index: 4,
    name: 'Carbon and its Compounds',
    topics: [
      t('x10-s4', 'x10-s4-1', 'Covalent bonding in carbon', 'How carbon shares electrons.'),
      t(
        'x10-s4',
        'x10-s4-2',
        'Hydrocarbons and functional groups',
        'Chains, rings and reactive groups.',
        ['x10-s4-1'],
      ),
      t('x10-s4', 'x10-s4-3', 'Important carbon compounds', 'Ethanol, ethanoic acid and soaps.', [
        'x10-s4-2',
      ]),
    ],
  },
  {
    id: 'x10-s5',
    subjectId: 'science',
    index: 5,
    name: 'Life Processes',
    topics: [
      t('x10-s5', 'x10-s5-1', 'Nutrition', 'How organisms obtain and use food.'),
      t('x10-s5', 'x10-s5-2', 'Respiration and transport', 'Releasing energy and moving materials.', [
        'x10-s5-1',
      ]),
      t('x10-s5', 'x10-s5-3', 'Excretion', 'Removing waste from the body.', ['x10-s5-2']),
    ],
  },
  {
    id: 'x10-s6',
    subjectId: 'science',
    index: 6,
    name: 'Control and Coordination',
    topics: [
      t('x10-s6', 'x10-s6-1', 'The nervous system', 'How the body senses and responds.'),
      t('x10-s6', 'x10-s6-2', 'Reflex action', 'Fast, automatic responses.', ['x10-s6-1']),
      t('x10-s6', 'x10-s6-3', 'Hormones in animals and plants', 'Chemical control of the body.', [
        'x10-s6-2',
      ]),
    ],
  },
  {
    id: 'x10-s7',
    subjectId: 'science',
    index: 7,
    name: 'How do Organisms Reproduce?',
    topics: [
      t('x10-s7', 'x10-s7-1', 'Asexual reproduction', 'Making offspring from a single parent.'),
      t('x10-s7', 'x10-s7-2', 'Sexual reproduction in plants', 'The flower and its role.', [
        'x10-s7-1',
      ]),
      t('x10-s7', 'x10-s7-3', 'Reproduction in humans', 'The reproductive system and its work.', [
        'x10-s7-2',
      ]),
    ],
  },
  {
    id: 'x10-s8',
    subjectId: 'science',
    index: 8,
    name: 'Heredity',
    topics: [
      t('x10-s8', 'x10-s8-1', 'Inheritance of traits', 'How features pass to offspring.'),
      t('x10-s8', 'x10-s8-2', "Mendel's experiments", 'The rules of inheritance from pea plants.', [
        'x10-s8-1',
      ]),
      t('x10-s8', 'x10-s8-3', 'Sex determination', 'How the sex of a child is decided.', [
        'x10-s8-2',
      ]),
    ],
  },
  {
    id: 'x10-s9',
    subjectId: 'science',
    index: 9,
    name: 'Light: Reflection and Refraction',
    topics: [
      t(
        'x10-s9',
        'x10-s9-1',
        'Reflection by spherical mirrors',
        'Images formed by concave and convex mirrors.',
      ),
      t('x10-s9', 'x10-s9-2', 'Refraction of light', 'How light bends between media.', [
        'x10-s9-1',
      ]),
      t('x10-s9', 'x10-s9-3', 'Lenses and their formulae', 'Image formation and the lens equation.', [
        'x10-s9-2',
      ]),
    ],
  },
  {
    id: 'x10-s10',
    subjectId: 'science',
    index: 10,
    name: 'The Human Eye and the Colourful World',
    topics: [
      t('x10-s10', 'x10-s10-1', 'The human eye', 'How the eye forms an image.'),
      t('x10-s10', 'x10-s10-2', 'Defects of vision', 'Common eye problems and their correction.', [
        'x10-s10-1',
      ]),
      t(
        'x10-s10',
        'x10-s10-3',
        'Refraction through a prism',
        'Dispersion, the rainbow and scattering.',
        ['x10-s10-2'],
      ),
    ],
  },
  {
    id: 'x10-s11',
    subjectId: 'science',
    index: 11,
    name: 'Electricity',
    topics: [
      t(
        'x10-s11',
        'x10-s11-1',
        'Electric current and potential difference',
        'What drives charge through a circuit.',
      ),
      t('x10-s11', 'x10-s11-2', "Ohm's law and resistance", 'Relating current, voltage and resistance.', [
        'x10-s11-1',
      ]),
      t('x10-s11', 'x10-s11-3', 'Heating effect of current', 'Power and heat in electrical circuits.', [
        'x10-s11-2',
      ]),
    ],
  },
  {
    id: 'x10-s12',
    subjectId: 'science',
    index: 12,
    name: 'Magnetic Effects of Electric Current',
    topics: [
      t('x10-s12', 'x10-s12-1', 'Magnetic field of a current', 'How current creates magnetism.'),
      t(
        'x10-s12',
        'x10-s12-2',
        'Force on a conductor and the motor',
        'Turning electricity into motion.',
        ['x10-s12-1'],
      ),
      t(
        'x10-s12',
        'x10-s12-3',
        'Electromagnetic induction',
        'Generating current from a moving magnet.',
        ['x10-s12-2'],
      ),
    ],
  },
  {
    id: 'x10-s13',
    subjectId: 'science',
    index: 13,
    name: 'Our Environment',
    topics: [
      t('x10-s13', 'x10-s13-1', 'Ecosystems', 'The web of living and non-living things.'),
      t('x10-s13', 'x10-s13-2', 'Food chains and food webs', 'How energy flows through an ecosystem.', [
        'x10-s13-1',
      ]),
      t('x10-s13', 'x10-s13-3', 'Waste and its management', 'Handling waste to protect the environment.', [
        'x10-s13-2',
      ]),
    ],
  },
];

/** CBSE Class 10 — Social science (History · Geography · Civics · Economics). */
export const socialChapters10: Chapter[] = [
  {
    id: 'x10-h1',
    subjectId: 'social',
    index: 1,
    name: 'The Rise of Nationalism in Europe',
    topics: [
      t('x10-h1', 'x10-h1-1', 'The making of nationalism', 'How the idea of the nation grew.'),
      t('x10-h1', 'x10-h1-2', 'Unification of Germany and Italy', 'Nations forged from many states.', [
        'x10-h1-1',
      ]),
      t('x10-h1', 'x10-h1-3', 'Nationalism and imperialism', 'How nationalism turned outward.', [
        'x10-h1-2',
      ]),
    ],
  },
  {
    id: 'x10-h2',
    subjectId: 'social',
    index: 2,
    name: 'Nationalism in India',
    topics: [
      t('x10-h2', 'x10-h2-1', 'The First World War and Khilafat', 'The stir of mass nationalism.'),
      t('x10-h2', 'x10-h2-2', 'Movements led by Gandhi', 'Non-cooperation and civil disobedience.', [
        'x10-h2-1',
      ]),
      t('x10-h2', 'x10-h2-3', 'Towards a collective identity', 'Symbols that united the nation.', [
        'x10-h2-2',
      ]),
    ],
  },
  {
    id: 'x10-h3',
    subjectId: 'social',
    index: 3,
    name: 'The Making of a Global World',
    topics: [
      t('x10-h3', 'x10-h3-1', 'The pre-modern world', 'Early trade and travel across regions.'),
      t(
        'x10-h3',
        'x10-h3-2',
        'The nineteenth-century world economy',
        'Trade, labour and capital flows.',
        ['x10-h3-1'],
      ),
      t('x10-h3', 'x10-h3-3', 'The interwar economy', 'Depression and its worldwide reach.', [
        'x10-h3-2',
      ]),
    ],
  },
  {
    id: 'x10-h4',
    subjectId: 'social',
    index: 4,
    name: 'The Age of Industrialisation',
    topics: [
      t('x10-h4', 'x10-h4-1', 'Before the factory', 'Proto-industrial production.'),
      t('x10-h4', 'x10-h4-2', 'The coming of the factory', 'Machines and the industrial city.', [
        'x10-h4-1',
      ]),
      t('x10-h4', 'x10-h4-3', 'Industrialisation in India', 'Factories and workers in the colony.', [
        'x10-h4-2',
      ]),
    ],
  },
  {
    id: 'x10-h5',
    subjectId: 'social',
    index: 5,
    name: 'Print Culture and the Modern World',
    topics: [
      t('x10-h5', 'x10-h5-1', 'The coming of print', 'From manuscripts to the printing press.'),
      t('x10-h5', 'x10-h5-2', 'Print and society', 'How reading changed the world.', [
        'x10-h5-1',
      ]),
      t('x10-h5', 'x10-h5-3', 'Print in colonial India', 'The press and Indian society.', [
        'x10-h5-2',
      ]),
    ],
  },
  {
    id: 'x10-g1',
    subjectId: 'social',
    index: 6,
    name: 'Resources and Development',
    topics: [
      t('x10-g1', 'x10-g1-1', 'Types of resources', "Classifying the world's resources."),
      t('x10-g1', 'x10-g1-2', 'Resource planning', 'Using resources wisely and fairly.', [
        'x10-g1-1',
      ]),
      t('x10-g1', 'x10-g1-3', 'Land and soil resources', 'Caring for land and preventing degradation.', [
        'x10-g1-2',
      ]),
    ],
  },
  {
    id: 'x10-g2',
    subjectId: 'social',
    index: 7,
    name: 'Forest and Wildlife Resources',
    topics: [
      t('x10-g2', 'x10-g2-1', 'Biodiversity', 'The rich variety of life.'),
      t('x10-g2', 'x10-g2-2', 'Threats to flora and fauna', 'Why species are in danger.', [
        'x10-g2-1',
      ]),
      t('x10-g2', 'x10-g2-3', 'Conservation efforts', 'Protecting forests and wildlife.', [
        'x10-g2-2',
      ]),
    ],
  },
  {
    id: 'x10-g3',
    subjectId: 'social',
    index: 8,
    name: 'Water Resources',
    topics: [
      t('x10-g3', 'x10-g3-1', 'Water scarcity', 'Why fresh water is under strain.'),
      t('x10-g3', 'x10-g3-2', 'Dams and irrigation', 'Storing and sharing water.', ['x10-g3-1']),
      t('x10-g3', 'x10-g3-3', 'Rainwater harvesting', 'Traditional and modern ways to save water.', [
        'x10-g3-2',
      ]),
    ],
  },
  {
    id: 'x10-g4',
    subjectId: 'social',
    index: 9,
    name: 'Agriculture',
    topics: [
      t('x10-g4', 'x10-g4-1', 'Types of farming', 'Subsistence and commercial agriculture.'),
      t('x10-g4', 'x10-g4-2', 'Cropping patterns and major crops', 'The seasons and staples of India.', [
        'x10-g4-1',
      ]),
      t('x10-g4', 'x10-g4-3', 'Agriculture and the economy', "Farming's place in national life.", [
        'x10-g4-2',
      ]),
    ],
  },
  {
    id: 'x10-g5',
    subjectId: 'social',
    index: 10,
    name: 'Minerals and Energy Resources',
    topics: [
      t('x10-g5', 'x10-g5-1', 'Types of minerals', 'Metallic and non-metallic minerals.'),
      t('x10-g5', 'x10-g5-2', 'Conservation of minerals', 'Using a finite resource carefully.', [
        'x10-g5-1',
      ]),
      t(
        'x10-g5',
        'x10-g5-3',
        'Conventional and non-conventional energy',
        'Sources of power for the future.',
        ['x10-g5-2'],
      ),
    ],
  },
  {
    id: 'x10-g6',
    subjectId: 'social',
    index: 11,
    name: 'Manufacturing Industries',
    topics: [
      t('x10-g6', 'x10-g6-1', 'Importance of manufacturing', 'Turning raw materials into goods.'),
      t('x10-g6', 'x10-g6-2', 'Classification of industries', 'By source, role and ownership.', [
        'x10-g6-1',
      ]),
      t('x10-g6', 'x10-g6-3', 'Industry and the environment', 'Managing pollution from industry.', [
        'x10-g6-2',
      ]),
    ],
  },
  {
    id: 'x10-g7',
    subjectId: 'social',
    index: 12,
    name: 'Lifelines of National Economy',
    topics: [
      t('x10-g7', 'x10-g7-1', 'Transport', 'Roads, railways, waterways and air routes.'),
      t('x10-g7', 'x10-g7-2', 'Communication', 'Networks that link the nation.', ['x10-g7-1']),
      t('x10-g7', 'x10-g7-3', 'Trade', 'The exchange of goods within and beyond India.', [
        'x10-g7-2',
      ]),
    ],
  },
  {
    id: 'x10-c1',
    subjectId: 'social',
    index: 13,
    name: 'Power-sharing',
    topics: [
      t('x10-c1', 'x10-c1-1', 'Why power-sharing', 'Spreading power for a stable society.'),
      t('x10-c1', 'x10-c1-2', 'Forms of power-sharing', 'Across levels, organs and groups.', [
        'x10-c1-1',
      ]),
      t('x10-c1', 'x10-c1-3', 'Case studies', 'Belgium and Sri Lanka compared.', ['x10-c1-2']),
    ],
  },
  {
    id: 'x10-c2',
    subjectId: 'social',
    index: 14,
    name: 'Federalism',
    topics: [
      t('x10-c2', 'x10-c2-1', 'What is federalism', 'Dividing power between centre and states.'),
      t('x10-c2', 'x10-c2-2', 'Federalism in India', 'How power is shared in India.', [
        'x10-c2-1',
      ]),
      t('x10-c2', 'x10-c2-3', 'Decentralisation', 'Bringing government closer to people.', [
        'x10-c2-2',
      ]),
    ],
  },
  {
    id: 'x10-c3',
    subjectId: 'social',
    index: 15,
    name: 'Gender, Religion and Caste',
    topics: [
      t('x10-c3', 'x10-c3-1', 'Gender and politics', "Women's roles in public life."),
      t('x10-c3', 'x10-c3-2', 'Religion and politics', 'Communalism and secularism.', [
        'x10-c3-1',
      ]),
      t('x10-c3', 'x10-c3-3', 'Caste and politics', 'How caste shapes and is shaped by politics.', [
        'x10-c3-2',
      ]),
    ],
  },
  {
    id: 'x10-c4',
    subjectId: 'social',
    index: 16,
    name: 'Political Parties',
    topics: [
      t('x10-c4', 'x10-c4-1', 'Role of political parties', 'Why democracies need parties.'),
      t('x10-c4', 'x10-c4-2', 'Party systems', 'One, two and multi-party systems.', ['x10-c4-1']),
      t('x10-c4', 'x10-c4-3', 'Challenges and reforms', 'Improving how parties work.', [
        'x10-c4-2',
      ]),
    ],
  },
  {
    id: 'x10-c5',
    subjectId: 'social',
    index: 17,
    name: 'Outcomes of Democracy',
    topics: [
      t('x10-c5', 'x10-c5-1', 'Accountable government', 'Democracy and responsive rule.'),
      t('x10-c5', 'x10-c5-2', 'Economic and social outcomes', 'What democracy delivers for people.', [
        'x10-c5-1',
      ]),
      t('x10-c5', 'x10-c5-3', 'Dignity and freedom', 'The promise democracy holds.', [
        'x10-c5-2',
      ]),
    ],
  },
  {
    id: 'x10-e1',
    subjectId: 'social',
    index: 18,
    name: 'Development',
    topics: [
      t('x10-e1', 'x10-e1-1', 'Ideas of development', 'Different goals for different people.'),
      t('x10-e1', 'x10-e1-2', 'Measuring development', 'Income and beyond.', ['x10-e1-1']),
      t('x10-e1', 'x10-e1-3', 'Sustainability of development', 'Keeping development going for the future.', [
        'x10-e1-2',
      ]),
    ],
  },
  {
    id: 'x10-e2',
    subjectId: 'social',
    index: 19,
    name: 'Sectors of the Indian Economy',
    topics: [
      t(
        'x10-e2',
        'x10-e2-1',
        'Primary, secondary and tertiary sectors',
        'The three sectors of the economy.',
      ),
      t('x10-e2', 'x10-e2-2', 'Organised and unorganised sectors', 'Where and how people work.', [
        'x10-e2-1',
      ]),
      t('x10-e2', 'x10-e2-3', 'Public and private sectors', 'Who owns economic activity.', [
        'x10-e2-2',
      ]),
    ],
  },
  {
    id: 'x10-e3',
    subjectId: 'social',
    index: 20,
    name: 'Money and Credit',
    topics: [
      t('x10-e3', 'x10-e3-1', 'Money as a medium of exchange', 'How money makes trade easy.'),
      t('x10-e3', 'x10-e3-2', 'Modern forms of credit', 'Loans, banks and terms of credit.', [
        'x10-e3-1',
      ]),
      t('x10-e3', 'x10-e3-3', 'Formal and informal credit', 'Fair and unfair sources of loans.', [
        'x10-e3-2',
      ]),
    ],
  },
  {
    id: 'x10-e4',
    subjectId: 'social',
    index: 21,
    name: 'Globalisation and the Indian Economy',
    topics: [
      t('x10-e4', 'x10-e4-1', 'What is globalisation', "The world's economies growing connected."),
      t('x10-e4', 'x10-e4-2', 'Factors enabling globalisation', 'Technology, trade and investment.', [
        'x10-e4-1',
      ]),
      t('x10-e4', 'x10-e4-3', 'Impact on India', 'How globalisation reshaped the economy.', [
        'x10-e4-2',
      ]),
    ],
  },
  {
    id: 'x10-e5',
    subjectId: 'social',
    index: 22,
    name: 'Consumer Rights',
    topics: [
      t('x10-e5', 'x10-e5-1', 'The consumer in the marketplace', 'Why consumers need protection.'),
      t('x10-e5', 'x10-e5-2', 'Consumer rights', 'The rights every buyer holds.', ['x10-e5-1']),
      t('x10-e5', 'x10-e5-3', 'Consumer movement and redressal', 'Seeking justice as a consumer.', [
        'x10-e5-2',
      ]),
    ],
  },
];

const GRADE_CHAPTERS: Record<string, Record<string, Chapter[]>> = {
  'Class 8': { math: mathChapters, science: scienceChapters, social: socialChapters },
  'Class 10': { math: mathChapters10, science: scienceChapters10, social: socialChapters10 },
};

/** ponytail: same key profile.ts writes (clss-learner-profile) — kept local to dodge a circular import. */
function currentGrade(): string {
  try {
    const raw = localStorage.getItem('clss-learner-profile');
    if (raw) {
      const grade = (JSON.parse(raw) as { grade?: string }).grade;
      if (grade && GRADE_CHAPTERS[grade]) return grade;
    }
  } catch {
    // storage unavailable — fall through to the seed grade
  }
  return 'Class 8';
}

function currentGradeChapters(): Record<string, Chapter[]> {
  return GRADE_CHAPTERS[currentGrade()] ?? (GRADE_CHAPTERS['Class 8'] as Record<string, Chapter[]>);
}

/**
 * Grade-aware by the persisted profile grade, Class 8 fallback. A Proxy so every property read
 * (and Object.values/keys) resolves the current grade live, without callers changing shape.
 */
export const chaptersBySubject: Record<string, Chapter[]> = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return currentGradeChapters()[prop];
    },
    has(_target, prop: string) {
      return prop in currentGradeChapters();
    },
    ownKeys() {
      return Reflect.ownKeys(currentGradeChapters());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const bySubject = currentGradeChapters() as Record<string, Chapter[] | undefined>;
      if (!(prop in bySubject)) return undefined;
      return { enumerable: true, configurable: true, value: bySubject[prop as string] };
    },
  },
) as Record<string, Chapter[]>;

const allTopics = new Map<string, Topic>();
for (const bySubject of Object.values(GRADE_CHAPTERS))
  for (const chapters of Object.values(bySubject))
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
