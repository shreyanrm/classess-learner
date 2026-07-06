/**
 * The walkable prototype's mock world — one believable source of truth so every screen feels alive
 * and consistent (Today, Progress, Create, Meter, Parent all read from here). The atom Learn/Practice
 * loop stays wired to the real SDK (its events→mastery is proven); this module drives the breadth.
 *
 * ponytail: static seed data, not a store. When the real SDK backs these surfaces, swap the selectors
 * for kgtopg views — the shapes here mirror them (nodes, bands, prerequisites).
 */

import type { AccentName } from '@classess/config';
import type { Band } from '@classess/ui';

// --- The learner ---------------------------------------------------------------------------------

export type ConsentTier = 'un_elevated' | 'elevated';

export interface Learner {
  name: string;
  grade: string;
  board: string;
  /** Under-18 defaults to un_elevated (no behavioural profiling) until parental consent. */
  consentTier: ConsentTier;
  streakDays: number;
  joinedDaysAgo: number;
  parentLinked: boolean;
}

export const learner: Learner = {
  name: 'Aarav',
  grade: 'Class 8',
  board: 'CBSE',
  consentTier: 'un_elevated',
  streakDays: 6,
  joinedDaysAgo: 19,
  parentLinked: false,
};

// --- The subject & its constellation -------------------------------------------------------------

export interface Subject {
  id: string;
  name: string;
  /** One earned hue for the whole subject (Molten is reserved for Vidya, never a subject). */
  accent: AccentName;
}

export const subject: Subject = { id: 'math', name: 'Mathematics', accent: 'cobalt' };

export interface MapNode {
  id: string;
  name: string;
  band: Band;
  /** Normalised constellation position, 0..1 in each axis. */
  x: number;
  y: number;
  /** Ids of the nodes that must be secure before this one unlocks. */
  prereqIds: string[];
  /** One plain line of what it is — shown on tap. */
  blurb: string;
}

/**
 * A small middle-school algebra constellation centred on the atom (linear equations in one variable).
 * Foundations are mastered (they carry colour); the learner is mid-flight on two-step equations; the
 * frontier is still monochrome. This is the spec's "map partly lit" state.
 */
export const nodes: MapNode[] = [
  {
    id: 'integers',
    name: 'Integers',
    band: 'independent',
    x: 0.1,
    y: 0.26,
    prereqIds: [],
    blurb: 'Positive and negative whole numbers, and how they move on the line.',
  },
  {
    id: 'number-line',
    name: 'The number line',
    band: 'independent',
    x: 0.1,
    y: 0.62,
    prereqIds: [],
    blurb: 'Every number has a place; distance and direction live here.',
  },
  {
    id: 'fractions',
    name: 'Fractions',
    band: 'secure',
    x: 0.24,
    y: 0.44,
    prereqIds: ['integers', 'number-line'],
    blurb: 'Parts of a whole, and arithmetic that keeps them honest.',
  },
  {
    id: 'variables',
    name: 'Variables & expressions',
    band: 'secure',
    x: 0.34,
    y: 0.2,
    prereqIds: ['integers'],
    blurb: 'A letter can stand for a number you do not know yet.',
  },
  {
    id: 'like-terms',
    name: 'Combining like terms',
    band: 'developing',
    x: 0.46,
    y: 0.34,
    prereqIds: ['variables', 'fractions'],
    blurb: 'Tidy an expression by adding what belongs together.',
  },
  {
    id: 'one-step',
    name: 'One-step equations',
    band: 'independent',
    x: 0.48,
    y: 0.62,
    prereqIds: ['variables', 'number-line'],
    blurb: 'Undo one operation to find the unknown.',
  },
  {
    id: 'two-step',
    name: 'Two-step equations',
    band: 'developing',
    x: 0.62,
    y: 0.5,
    prereqIds: ['one-step', 'like-terms'],
    blurb: 'Two moves, in the right order, isolate the variable.',
  },
  {
    id: 'distribute',
    name: 'The distributive property',
    band: 'emerging',
    x: 0.6,
    y: 0.22,
    prereqIds: ['like-terms'],
    blurb: 'Multiply across a bracket without losing a term.',
  },
  {
    id: 'linear-one-var',
    name: 'Linear equations in one variable',
    band: 'not_started',
    x: 0.76,
    y: 0.4,
    prereqIds: ['two-step', 'distribute'],
    blurb: 'The atom: solve any single-variable linear equation, cleanly.',
  },
  {
    id: 'word-problems',
    name: 'Word problems',
    band: 'not_started',
    x: 0.8,
    y: 0.68,
    prereqIds: ['two-step'],
    blurb: 'Turn a sentence into an equation, then solve it.',
  },
  {
    id: 'inequalities',
    name: 'Inequalities',
    band: 'not_started',
    x: 0.9,
    y: 0.24,
    prereqIds: ['linear-one-var'],
    blurb: 'When the answer is a range, not a single value.',
  },
  {
    id: 'graphing-lines',
    name: 'Graphing lines',
    band: 'not_started',
    x: 0.92,
    y: 0.54,
    prereqIds: ['linear-one-var'],
    blurb: 'See an equation as a straight line on the plane.',
  },
];

/** The node the learner is on right now (mid-flight two-step equations → the atom next). */
export const currentNodeId = 'two-step';

/** The orchestrator's one clear next action for Today. */
export const nextBestNodeId = 'linear-one-var';

// --- The daily meter (concept budget) ------------------------------------------------------------

export interface Meter {
  total: number;
  used: number;
}
export const meter: Meter = { total: 5, used: 2 };

/** Retrieval items the FSRS scheduler says are due today. */
export const practiceDueCount = 3;

/** A real win already earned today (drives Today's win card + Vidya's celebrate). */
export const todaysWin: { nodeId: string; nodeName: string } | null = {
  nodeId: 'one-step',
  nodeName: 'One-step equations',
};

// --- The knowledge twin (canned, honest ranges) --------------------------------------------------

export interface TwinQA {
  q: string;
  a: string;
  /** Node this answer points at, for Vidya to drift to / a "learn next" CTA. */
  nodeId?: string;
}

export const twinQuestions: TwinQA[] = [
  {
    q: 'What are my strengths?',
    a: "You're strongest on the foundations — integers, one-step equations, and the number line are all independent. You reach for the right first move without hesitating.",
  },
  {
    q: 'Where am I stuck?',
    a: "Two-step equations are still developing — you're about 55–70% independent. The order of the two moves is where it wobbles: you sometimes divide before you subtract.",
    nodeId: 'two-step',
  },
  {
    q: 'What should I do next?',
    a: "Finish two-step equations to secure, then linear equations in one variable opens up. That's the concept that unlocks most of what's ahead.",
    nodeId: 'linear-one-var',
  },
  {
    q: 'Am I ready for graphing lines?',
    a: 'Not yet — graphing lines needs linear equations first, and that one is still locked. Two concepts stand between you and it. Close, though.',
    nodeId: 'linear-one-var',
  },
];

// --- The parent companion (pride-first weekly digest) --------------------------------------------

export interface ParentDigest {
  masteredThisWeek: string[];
  strengthSpotlight: string;
  currentFocus: string;
  headlineWin: string;
}

export const parentDigest: ParentDigest = {
  masteredThisWeek: ['One-step equations', 'Combining like terms', 'The number line'],
  strengthSpotlight: 'Aarav is excelling at spotting the right first step in an equation.',
  currentFocus: 'Building fluency with two-step equations.',
  headlineWin: 'Solved 12 equations this week with no help.',
};

// --- Plans (the Superstar offer) -----------------------------------------------------------------

export interface Plan {
  cycle: 'monthly' | 'annual';
  price: string;
  note?: string;
}

export const plans: Record<'monthly' | 'annual', Plan> = {
  monthly: { cycle: 'monthly', price: '₹999/mo' },
  annual: { cycle: 'annual', price: '₹8,999/yr', note: 'Save ₹1,000 a year' },
};

export const superstarBenefits = [
  'Master unlimited concepts a day',
  'Unlock advanced challenge problems',
  'Send a parent a weekly update',
  'Go as deep as you like on any topic',
];

// --- Selectors -----------------------------------------------------------------------------------

const byId = new Map(nodes.map((n) => [n.id, n]));

export function nodeById(id: string): MapNode | undefined {
  return byId.get(id);
}

const COLOUR_BANDS: Band[] = ['secure', 'independent'];

/** A node "carries colour" once it has earned it (secure and up) — mirrors MasteryBand.earnsColor. */
export function carriesColor(band: Band): boolean {
  return COLOUR_BANDS.includes(band);
}

export function masteredCount(): number {
  return nodes.filter((n) => n.band === 'independent').length;
}

export function inProgressCount(): number {
  return nodes.filter(
    (n) => n.band === 'emerging' || n.band === 'developing' || n.band === 'secure',
  ).length;
}

export function totalCount(): number {
  return nodes.length;
}

/** A node is locked until every prerequisite is at least secure. */
export function isLocked(node: MapNode): boolean {
  return node.prereqIds.some((pid) => {
    const p = byId.get(pid);
    return !p || !carriesColor(p.band);
  });
}
