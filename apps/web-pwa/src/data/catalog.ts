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
      t('m1', 'm1-1', 'What makes a number rational', 'Fractions, negatives, and the numbers between the numbers.'),
      t('m1', 'm1-2', 'Operations on rational numbers', 'Add, subtract, multiply, divide — and keep the sign story straight.', ['m1-1']),
      t('m1', 'm1-3', 'Rational numbers on the number line', 'Every rational number has an exact home.', ['m1-1']),
    ],
  },
  {
    id: 'm2',
    subjectId: 'math',
    index: 2,
    name: 'Linear equations in one variable',
    topics: [
      t('m2', 'm2-1', 'Solving equations with the variable on one side', 'Undo operations in the right order and the unknown surrenders.', [], { nodeId: ATOM_TARGET_NODE_ID, xp: 150 }),
      t('m2', 'm2-2', 'Variables on both sides', 'Gather the xs, gather the numbers, and the equation folds flat.', ['m2-1']),
      t('m2', 'm2-3', 'Word problems that become equations', 'Turn a sentence into an equation, then solve it cleanly.', ['m2-1', 'm2-2']),
    ],
  },
  { id: 'm3', subjectId: 'math', index: 3, name: 'Understanding quadrilaterals', topics: [] },
  { id: 'm4', subjectId: 'math', index: 4, name: 'Data handling', topics: [] },
  { id: 'm5', subjectId: 'math', index: 5, name: 'Squares and square roots', topics: [] },
  { id: 'm6', subjectId: 'math', index: 6, name: 'Cubes and cube roots', topics: [] },
  { id: 'm7', subjectId: 'math', index: 7, name: 'Comparing quantities', topics: [] },
  { id: 'm8', subjectId: 'math', index: 8, name: 'Algebraic expressions and identities', topics: [] },
  { id: 'm9', subjectId: 'math', index: 9, name: 'Mensuration', topics: [] },
  { id: 'm10', subjectId: 'math', index: 10, name: 'Exponents and powers', topics: [] },
  { id: 'm11', subjectId: 'math', index: 11, name: 'Direct and inverse proportions', topics: [] },
  { id: 'm12', subjectId: 'math', index: 12, name: 'Factorisation', topics: [] },
  { id: 'm13', subjectId: 'math', index: 13, name: 'Introduction to graphs', topics: [] },
];

/** CBSE Class 8 — Science (rationalized NCERT). */
export const scienceChapters: Chapter[] = [
  { id: 's1', subjectId: 'science', index: 1, name: 'Crop production and management', topics: [] },
  { id: 's2', subjectId: 'science', index: 2, name: 'Microorganisms: friend and foe', topics: [] },
  { id: 's3', subjectId: 'science', index: 3, name: 'Coal and petroleum', topics: [] },
  { id: 's4', subjectId: 'science', index: 4, name: 'Combustion and flame', topics: [] },
  { id: 's5', subjectId: 'science', index: 5, name: 'Conservation of plants and animals', topics: [] },
  { id: 's6', subjectId: 'science', index: 6, name: 'Reproduction in animals', topics: [] },
  { id: 's7', subjectId: 'science', index: 7, name: 'Reaching the age of adolescence', topics: [] },
  { id: 's8', subjectId: 'science', index: 8, name: 'Force and pressure', topics: [] },
  { id: 's9', subjectId: 'science', index: 9, name: 'Friction', topics: [] },
  { id: 's10', subjectId: 'science', index: 10, name: 'Sound', topics: [] },
  { id: 's11', subjectId: 'science', index: 11, name: 'Chemical effects of electric current', topics: [] },
  { id: 's12', subjectId: 'science', index: 12, name: 'Some natural phenomena', topics: [] },
  { id: 's13', subjectId: 'science', index: 13, name: 'Light', topics: [] },
];

/** CBSE Class 8 — Social science (History · Geography · Civics). */
export const socialChapters: Chapter[] = [
  { id: 'h1', subjectId: 'social', index: 1, name: 'How, when and where', topics: [] },
  { id: 'h2', subjectId: 'social', index: 2, name: 'From trade to territory', topics: [] },
  { id: 'h3', subjectId: 'social', index: 3, name: 'Ruling the countryside', topics: [] },
  { id: 'h4', subjectId: 'social', index: 4, name: 'When people rebel: 1857 and after', topics: [] },
  { id: 'h5', subjectId: 'social', index: 5, name: 'Women, caste and reform', topics: [] },
  { id: 'h6', subjectId: 'social', index: 6, name: 'The making of the national movement', topics: [] },
  { id: 'g1', subjectId: 'social', index: 7, name: 'Resources', topics: [] },
  { id: 'g2', subjectId: 'social', index: 8, name: 'Land, soil, water, natural vegetation', topics: [] },
  { id: 'g3', subjectId: 'social', index: 9, name: 'Agriculture', topics: [] },
  { id: 'g4', subjectId: 'social', index: 10, name: 'Industries', topics: [] },
  { id: 'c1', subjectId: 'social', index: 11, name: 'The Indian constitution', topics: [] },
  { id: 'c2', subjectId: 'social', index: 12, name: 'Understanding secularism', topics: [] },
  { id: 'c3', subjectId: 'social', index: 13, name: 'Why do we need a parliament', topics: [] },
  { id: 'c4', subjectId: 'social', index: 14, name: 'Judiciary', topics: [] },
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
