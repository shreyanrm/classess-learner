import type { OntologyNode } from './dto';

/**
 * The atom's ontology slice: solving linear equations in one variable, plus its local, expert-shaped
 * prerequisite chain. This is the minimum the app needs to teach the proof topic on seed data — not
 * the whole NCERT catalog. Node ids are fixed and deterministic so seed, cache, and tests agree.
 */

/** Mathematics' earned content-colour (cobalt). One accent per subject; ignited on mastery. */
export const MATH_ACCENT = '#1E6BFF';

export const ATOM_NODE_IDS = {
  integers: '00000000-0000-7000-8000-00000000a001',
  variables: '00000000-0000-7000-8000-00000000a002',
  linearEquations: '00000000-0000-7000-8000-00000000a003',
} as const;

export const ATOM_NODES: OntologyNode[] = [
  {
    node_id: ATOM_NODE_IDS.integers,
    name: 'Integers and their operations',
    kind: 'topic',
    prerequisite_ids: [],
    accent: MATH_ACCENT,
    sequence: 1,
  },
  {
    node_id: ATOM_NODE_IDS.variables,
    name: 'Variables and simple expressions',
    kind: 'topic',
    prerequisite_ids: [ATOM_NODE_IDS.integers],
    accent: MATH_ACCENT,
    sequence: 2,
  },
  {
    node_id: ATOM_NODE_IDS.linearEquations,
    name: 'Solving linear equations in one variable',
    kind: 'topic',
    prerequisite_ids: [ATOM_NODE_IDS.variables],
    accent: MATH_ACCENT,
    sequence: 3,
  },
];

/** The proof topic the whole product rests on. */
export const ATOM_TARGET_NODE_ID = ATOM_NODE_IDS.linearEquations;
