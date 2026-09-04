/**
 * The practice set the screen runs — the five items board 04 of design/prototypes/app-v1.html
 * lists, each as a real spec the answer library (packages/wobo/src/answers) draws and `check`
 * decides, instantly and offline: colour a half of a tile, pick the bigger of two drawn fractions,
 * drag a point along a line, build a fraction on the number pad, cut a bar in half with one drawn
 * line. The prompts are the board's, word for word. Nothing here is attributed to an ontology node
 * yet, so a run records no evidence.
 */

import type { AnswerCheck, AnswerSpec, AnswerSpecOf, AnswerState } from '@wobo/contracts';

/** What the crumb calls the set. */
export const SET_TITLE = 'Fractions';

/** Colour ½ of the shape — a 2×2 tile, any two cells. */
export const COLOUR_HALF: AnswerSpecOf<'shade_regions'> = {
  kind: 'shade_regions',
  id: 'colour-half',
  prompt: 'Colour ½ of the shape.',
  figure: { shape: 'grid', rows: 2, cols: 2 },
  want: 2,
};

/** Which is bigger, ⅓ or ¼? — two bars, one part of each shaded. */
export const BIGGER_THIRD_OR_QUARTER: AnswerSpecOf<'choose_visual'> = {
  kind: 'choose_visual',
  id: 'bigger-third-or-quarter',
  prompt: 'Which is bigger, ⅓ or ¼?',
  options: [
    {
      id: 'third',
      label: 'a bar in three parts with one part shaded',
      visual: { of: 'partition', figure: { shape: 'bar', parts: 3 }, shaded: [0] },
    },
    {
      id: 'quarter',
      label: 'a bar in four parts with one part shaded',
      visual: { of: 'partition', figure: { shape: 'bar', parts: 4 }, shaded: [0] },
    },
  ],
  want: ['third'],
};

/** Drag the point to ⅔ — a line from 0 to 1 in thirds. */
export const DRAG_TO_TWO_THIRDS: AnswerSpecOf<'place_points'> = {
  kind: 'place_points',
  id: 'drag-to-two-thirds',
  prompt: 'Drag the point to ⅔',
  space: 'line',
  min: [0, 0],
  max: [1, 0],
  step: [1 / 3, 0],
  targets: [{ id: 'two-thirds', at: [2 / 3, 0] }],
};

/** Build 3/4 on the number pad — the form matters, not merely the value. */
export const BUILD_THREE_QUARTERS: AnswerSpecOf<'number_pad'> = {
  kind: 'number_pad',
  id: 'build-three-quarters',
  prompt: 'Build 3/4 on the number pad',
  keys: { fraction: true },
  want: 0.75,
  wantFraction: { numerator: 3, denominator: 4 },
};

/** The bar the last item is drawn over, in board units: the thing the line has to cut. */
export const CUT_BAR: readonly [x: number, y: number, w: number, h: number] = [200, 220, 600, 160];

/**
 * Draw a line that cuts it in half — one stroke, and FOUR right answers.
 *
 * The bar is a rectangle, so every line through its centre halves it: down the middle, across the
 * middle, and either diagonal. The item used to want the vertical one and marked the other three
 * wrong, which is the item being wrong about its own mathematics. All four are listed, and `check`
 * gives the learner the best of them.
 */
export const CUT_IN_HALF: AnswerSpecOf<'draw'> = {
  kind: 'draw',
  id: 'cut-in-half',
  prompt: 'Draw a line that cuts it in half',
  view: [0, 0, 1000, 600],
  // down the middle — the stroke the prototype draws
  want: { shape: 'segment', from: [500, 200], to: [500, 400], tolerance: 90 },
  accept: [
    // across the middle
    { shape: 'segment', from: [180, 300], to: [820, 300], tolerance: 90 },
    // corner to corner, both ways
    { shape: 'segment', from: [200, 220], to: [800, 380], tolerance: 90 },
    { shape: 'segment', from: [200, 380], to: [800, 220], tolerance: 90 },
  ],
};

export const FRACTIONS_SET: readonly [AnswerSpec, ...AnswerSpec[]] = [
  COLOUR_HALF,
  BIGGER_THIRD_OR_QUARTER,
  DRAG_TO_TWO_THIRDS,
  BUILD_THREE_QUARTERS,
  CUT_IN_HALF,
];

/** A fraction in a prompt, written out (½) or as digits (3/4) — set in Wobo's hand on the card. */
export const FRACTION = /([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\b\d+\/\d+\b)/g;

/**
 * The prompt split into plain runs and fractions, so the card can set the fractions in Caveat the
 * way the prototype does ("Colour <i>½</i> of the shape."). Pure, for the test.
 */
export function promptParts(prompt: string): { text: string; fraction: boolean }[] {
  const parts: { text: string; fraction: boolean }[] = [];
  let last = 0;
  for (const m of prompt.matchAll(FRACTION)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: prompt.slice(last, at), fraction: false });
    parts.push({ text: m[0], fraction: true });
    last = at + m[0].length;
  }
  if (last < prompt.length) parts.push({ text: prompt.slice(last), fraction: false });
  return parts;
}

/**
 * The board's ringed-quarter moment: one cell of four coloured where half was asked, checked. Wobo
 * rings the learner's own quarter and writes "that's a quarter, not half" beside it. The library's
 * own check rings nothing when parts are missing (the answer stays the learner's to find); the ring
 * here is on what they DID colour, which is the point being made.
 */
export function quarterMoment(
  spec: AnswerSpec,
  state: AnswerState,
  result: AnswerCheck | null,
): { note: string; result: AnswerCheck } | null {
  if (!result || result.correct) return null;
  if (spec.kind !== 'shade_regions' || state.kind !== 'shade_regions') return null;
  if (spec.figure.shape !== 'grid' || spec.figure.rows * spec.figure.cols !== 4) return null;
  if (spec.want !== 2 || state.shaded.length !== 1) return null;
  const index = state.shaded[0];
  if (index === undefined) return null;
  return {
    note: "that's a quarter, not half",
    result: { ...result, highlight: [{ on: 'part', index }] },
  };
}
