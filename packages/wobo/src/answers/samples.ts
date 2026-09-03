/**
 * One sample spec per kind — real items, not lorem: "colour a half", "plot two points", "put the
 * steps in order".
 *
 * They live in `src` rather than in a test folder because three things need the same samples and
 * must not drift: the unit tests' truth tables, the dev bench that renders every kind at every
 * width, and anyone reading the library to learn what a spec looks like.
 */

import type { AnswerSpec, AnswerSpecOf } from '@wobo/contracts';

export const SHADE_HALF: AnswerSpecOf<'shade_regions'> = {
  kind: 'shade_regions',
  id: 'shade-half',
  prompt: 'Colour a half of the shape',
  figure: { shape: 'grid', rows: 2, cols: 4 },
  want: 4,
};

export const SHADE_PIE: AnswerSpecOf<'shade_regions'> = {
  kind: 'shade_regions',
  id: 'shade-pie',
  prompt: 'Colour three quarters of the circle',
  figure: { shape: 'pie', parts: 4 },
  want: 3,
};

export const SHADE_EXACT: AnswerSpecOf<'shade_regions'> = {
  kind: 'shade_regions',
  id: 'shade-exact',
  prompt: 'Colour the top row',
  figure: { shape: 'grid', rows: 2, cols: 3 },
  want: 3,
  wantParts: [0, 1, 2],
};

export const SHADE_LINE: AnswerSpecOf<'shade_regions'> = {
  kind: 'shade_regions',
  id: 'shade-line',
  prompt: 'Colour two fifths of the line',
  figure: { shape: 'number_line', parts: 5, min: 0, max: 1 },
  want: 2,
};

export const PLACE_PLANE: AnswerSpecOf<'place_points'> = {
  kind: 'place_points',
  id: 'plot-two',
  prompt: 'Plot the two points',
  space: 'plane',
  min: [-5, -5],
  max: [5, 5],
  step: [1, 1],
  axisLabels: ['x', 'y'],
  targets: [
    { id: 'a', at: [2, 3] },
    { id: 'b', at: [-1, -2] },
  ],
};

export const PLACE_LINE: AnswerSpecOf<'place_points'> = {
  kind: 'place_points',
  id: 'plot-line',
  prompt: 'Mark three quarters',
  space: 'line',
  min: [0, 0],
  max: [1, 0],
  step: [0.25, 0],
  targets: [{ id: 'q', at: [0.75, 0] }],
};

export const SLIDER_ANGLE: AnswerSpecOf<'slider'> = {
  kind: 'slider',
  id: 'set-angle',
  prompt: 'Set the angle to a right angle',
  min: 0,
  max: 180,
  step: 5,
  want: 90,
  unit: 'degrees',
};

export const ORDER_STEPS: AnswerSpecOf<'order'> = {
  kind: 'order',
  id: 'order-steps',
  prompt: 'Put the steps in order',
  items: [
    { id: 'divide', label: 'Divide both sides by two' },
    { id: 'subtract', label: 'Subtract three from both sides' },
    { id: 'check', label: 'Check the answer' },
  ],
  want: ['subtract', 'divide', 'check'],
};

export const MATCH_UNITS: AnswerSpecOf<'match'> = {
  kind: 'match',
  id: 'match-units',
  prompt: 'Join each quantity to its unit',
  left: [
    { id: 'mass', label: 'Mass' },
    { id: 'force', label: 'Force' },
    { id: 'energy', label: 'Energy' },
  ],
  right: [
    { id: 'joule', label: 'Joule' },
    { id: 'kilogram', label: 'Kilogram' },
    { id: 'newton', label: 'Newton' },
  ],
  want: [
    { left: 'mass', right: 'kilogram' },
    { left: 'force', right: 'newton' },
    { left: 'energy', right: 'joule' },
  ],
};

export const PAD_FRACTION: AnswerSpecOf<'number_pad'> = {
  kind: 'number_pad',
  id: 'pad-fraction',
  prompt: 'What fraction is shaded?',
  keys: { minus: true, decimal: true, fraction: true },
  want: 0.75,
  wantFraction: { numerator: 3, denominator: 4 },
};

export const PAD_VALUE: AnswerSpecOf<'number_pad'> = {
  kind: 'number_pad',
  id: 'pad-value',
  prompt: 'What is the temperature change?',
  keys: { minus: true, decimal: true },
  want: -12.5,
  unit: 'degrees',
};

export const EXPRESSION_AREA: AnswerSpecOf<'expression'> = {
  kind: 'expression',
  id: 'expr-area',
  prompt: 'Write the area of the circle',
  keys: ['fraction', 'power', 'root', 'pi', 'times', 'equals', 'paren', 'variable'],
  variables: ['r'],
  want: '\\pi r^{2}',
  accept: ['\\pi\\times r^{2}'],
};

export const DRAW_SEGMENT: AnswerSpecOf<'draw'> = {
  kind: 'draw',
  id: 'draw-segment',
  prompt: 'Draw the line of symmetry',
  view: [0, 0, 1000, 600],
  want: { shape: 'segment', from: [500, 100], to: [500, 500], tolerance: 40 },
};

export const DRAW_ANGLE: AnswerSpecOf<'draw'> = {
  kind: 'draw',
  id: 'draw-angle',
  prompt: 'Draw a right angle at the point',
  view: [0, 0, 1000, 600],
  want: { shape: 'angle', vertex: [500, 300], degrees: 90, tolerance: 60, degreeTolerance: 8 },
};

export const DRAW_TRIANGLE: AnswerSpecOf<'draw'> = {
  kind: 'draw',
  id: 'draw-triangle',
  prompt: 'Draw the triangle',
  view: [0, 0, 1000, 600],
  want: {
    shape: 'polygon',
    points: [
      [300, 450],
      [700, 450],
      [500, 150],
    ],
    tolerance: 60,
  },
};

export const CIRCLE_CELL: AnswerSpecOf<'circle_part'> = {
  kind: 'circle_part',
  id: 'circle-cell',
  prompt: 'Circle the nucleus',
  view: [0, 0, 1000, 600],
  parts: [
    { id: 'nucleus', label: 'nucleus', box: [420, 240, 160, 120] },
    { id: 'wall', label: 'cell wall', box: [80, 60, 120, 100] },
    { id: 'vacuole', label: 'vacuole', box: [760, 380, 140, 120] },
  ],
  want: ['nucleus'],
};

export const CHOOSE_HALF: AnswerSpecOf<'choose_visual'> = {
  kind: 'choose_visual',
  id: 'choose-half',
  prompt: 'Which one shows a half?',
  options: [
    {
      id: 'a',
      label: 'a bar with one part of four shaded',
      visual: { of: 'partition', figure: { shape: 'bar', parts: 4 }, shaded: [0] },
    },
    {
      id: 'b',
      label: 'a bar with two parts of four shaded',
      visual: { of: 'partition', figure: { shape: 'bar', parts: 4 }, shaded: [0, 1] },
    },
    {
      id: 'c',
      label: 'a circle with three parts of four shaded',
      visual: { of: 'partition', figure: { shape: 'pie', parts: 4 }, shaded: [0, 1, 2] },
    },
    {
      id: 'd',
      label: 'a triangle',
      visual: {
        of: 'strokes',
        closed: true,
        strokes: [
          [
            [10, 90],
            [90, 90],
            [50, 10],
          ],
        ],
      },
    },
  ],
  want: ['b'],
};

/** Every kind, once — what the bench renders and what the coverage test walks. */
export const SAMPLE_SPECS: AnswerSpec[] = [
  SHADE_HALF,
  PLACE_PLANE,
  SLIDER_ANGLE,
  ORDER_STEPS,
  MATCH_UNITS,
  PAD_FRACTION,
  EXPRESSION_AREA,
  DRAW_SEGMENT,
  CIRCLE_CELL,
  CHOOSE_HALF,
];
