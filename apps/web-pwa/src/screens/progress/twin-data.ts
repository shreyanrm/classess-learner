/**
 * The knowledge twin's star chart. Named stars are the atom's real ontology nodes (KGtoPG)
 * unioned with the class-8 maths topics the catalog carries; the other chapters hang far out as
 * faint stars still to come. Coordinates are composed by hand — the twin is hero art, not a
 * force layout (DESIGN.md §11). Edges are the expert-validated prerequisite lines.
 */

import { ATOM_NODE_IDS, type MasteryBandView } from '@classess/sdk';
import { mathChapters } from '../../data/catalog';

export const VIEW_W = 1000;
export const VIEW_H = 620;

/** Independent vs support-dependent is the decisive distinction (CONTEXT.md §8). */
export type StarState = 'independent' | 'supported' | 'unlit';

export type Band = MasteryBandView['band'];

export interface Star {
  id: string;
  /** Full concept name, shown on the star card. */
  name: string;
  /** Short label beside the star — glanceable at map scale. */
  label: string;
  x: number;
  y: number;
  /** Real KGtoPG ontology node backing this star, where the graph covers it (the atom does). */
  nodeId?: string;
  /** Catalog topic (a topic is a course) — the learn door. */
  topicId?: string;
  prereqIds: string[];
}

export const STARS: Star[] = [
  {
    id: 'm1-1',
    name: 'What makes a number rational',
    label: 'rational numbers',
    x: 268,
    y: 208,
    topicId: 'm1-1',
    prereqIds: [],
  },
  {
    id: 'm1-2',
    name: 'Operations on rational numbers',
    label: 'operations',
    x: 170,
    y: 316,
    topicId: 'm1-2',
    prereqIds: ['m1-1'],
  },
  {
    id: 'm1-3',
    name: 'Rational numbers on the number line',
    label: 'the number line',
    x: 382,
    y: 136,
    topicId: 'm1-3',
    prereqIds: ['m1-1'],
  },
  {
    id: 'atom-integers',
    name: 'Integers and their operations',
    label: 'integers',
    x: 338,
    y: 442,
    nodeId: ATOM_NODE_IDS.integers,
    prereqIds: [],
  },
  {
    id: 'atom-variables',
    name: 'Variables and simple expressions',
    label: 'variables',
    x: 472,
    y: 352,
    nodeId: ATOM_NODE_IDS.variables,
    prereqIds: ['atom-integers'],
  },
  {
    id: 'm2-1',
    name: 'Solving equations with the variable on one side',
    label: 'linear equations',
    x: 596,
    y: 268,
    nodeId: ATOM_NODE_IDS.linearEquations,
    topicId: 'm2-1',
    prereqIds: ['atom-variables'],
  },
  {
    id: 'm2-2',
    name: 'Variables on both sides',
    label: 'both sides',
    x: 724,
    y: 344,
    topicId: 'm2-2',
    prereqIds: ['m2-1'],
  },
  {
    id: 'm2-3',
    name: 'Word problems that become equations',
    label: 'word problems',
    x: 836,
    y: 226,
    topicId: 'm2-3',
    prereqIds: ['m2-1', 'm2-2'],
  },
];

const byId = new Map(STARS.map((s) => [s.id, s]));

export function starById(id: string): Star | undefined {
  return byId.get(id);
}

export interface Edge {
  from: Star;
  to: Star;
}

/** Prerequisite lines, drawn from the prerequisite toward the concept it unlocks. */
export const EDGES: Edge[] = STARS.flatMap((s) =>
  s.prereqIds
    .map((p) => byId.get(p))
    .filter((p): p is Star => Boolean(p))
    .map((p) => ({ from: p, to: s })),
);

export interface FarStar {
  id: string;
  name: string;
  x: number;
  y: number;
}

const FAR_POSITIONS: [number, number][] = [
  [92, 118],
  [180, 62],
  [520, 56],
  [692, 92],
  [912, 120],
  [948, 318],
  [886, 506],
  [668, 552],
  [452, 566],
  [204, 540],
  [64, 372],
];

/** The chapters still to come — far, faint, waiting. */
export const FAR_STARS: FarStar[] = mathChapters
  .filter((c) => c.topics.length === 0)
  .map((c, i) => {
    const [x, y] = FAR_POSITIONS[i % FAR_POSITIONS.length] as [number, number];
    return { id: c.id, name: c.name, x, y };
  });

/**
 * A star's state: real mastery bands for ontology-backed stars, course completion for catalog
 * topics. Independent means "can do alone"; supported means "can do with help" — never conflated.
 */
export function starState(
  star: Star,
  bands: ReadonlyMap<string, Band>,
  completed: ReadonlySet<string>,
): StarState {
  if (star.topicId && completed.has(star.topicId)) return 'independent';
  const band = star.nodeId ? bands.get(star.nodeId) : undefined;
  if (band === 'independent') return 'independent';
  if (band === 'secure' || band === 'developing' || band === 'emerging') return 'supported';
  return 'unlit';
}

/** Plain language, never a raw score or the formula (CONTEXT.md §8). */
export const BAND_LANGUAGE: Record<StarState, string> = {
  independent: 'you can solve this independently',
  supported: 'you understand this with guidance',
  unlit: 'not started',
};

const SEEN_KEY = 'clss-twin-seen-v1';

/** Star ids whose ignite has already replayed this session. */
export function readSeen(): ReadonlySet<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function writeSeen(completed: ReadonlySet<string>): void {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...completed]));
  } catch {
    // storage unavailable — the replay simply fires again next visit
  }
}
