import { z } from 'zod';

/**
 * Answer kinds — the shared language of "answering is doing" (docs/WOBO-PLAN.md §16).
 *
 * A practice item never asks for a text choice where a visual act exists. The brain picks a KIND
 * and writes a SPEC; the learner's manipulation is a STATE; a single pure `check(spec, state)`
 * turns the two into a CHECK. All three live here, in the contract, because both halves run them:
 * the app checks instantly for feedback, the brain checks again for evidence, and neither is
 * allowed a private definition of "right".
 *
 * Three rules are encoded rather than left to convention:
 *
 *  1. **Feedback is structured, never prose.** A check returns codes and counts. Wobo says the
 *     sentence; the contract only ever says what happened. A schema that carried a message would
 *     have frozen one voice into the seam and made translation a fork.
 *  2. **A highlight rings the learner's OWN marks.** Ringing the right answer on a wrong attempt
 *     hands the answer over, which is the one thing a tutor must not do — so `highlight` names the
 *     parts the learner shaded, the points they dropped, the pair they drew. Wobo draws on the
 *     exact spot without giving anything away.
 *  3. **`partial` means partial credit exists.** It is present only on a wrong-but-not-empty
 *     attempt with something right in it, so its presence alone is the signal for a second try.
 */

// --- Shared value objects -------------------------------------------------------------------------

const finite = z.number().finite();

/** A short, stable identifier for a part, item, option or spec. */
export const zAnswerId = z.string().min(1).max(64);
/** A visible label. Sentence case, no emoji — the same copy law as everywhere else. */
export const zAnswerText = z.string().min(1).max(280);

/** A point. Axis units on a plane or number line; board units (0..1000) for anything drawn. */
export const AnswerPoint = z.tuple([finite, finite]);
export type AnswerPoint = z.infer<typeof AnswerPoint>;

/** An axis-aligned box: `[x, y, w, h]`, in the same space as the figure that owns it. */
export const AnswerBox = z.tuple([finite, finite, finite.nonnegative(), finite.nonnegative()]);
export type AnswerBox = z.infer<typeof AnswerBox>;

/** A named thing the learner can order, match or choose. */
export const AnswerItem = z.object({ id: zAnswerId, label: zAnswerText });
export type AnswerItem = z.infer<typeof AnswerItem>;

export const ANSWER_KINDS = [
  'shade_regions',
  'place_points',
  'slider',
  'order',
  'match',
  'number_pad',
  'expression',
  'draw',
  'circle_part',
  'choose_visual',
] as const;

export const AnswerKind = z.enum(ANSWER_KINDS);
export type AnswerKind = (typeof ANSWER_KINDS)[number];

// --- Figures a learner shades or chooses between --------------------------------------------------

/**
 * A partitioned figure. Parts are numbered from zero in reading order: left-to-right then
 * top-to-bottom for a grid, clockwise from twelve for a pie, left-to-right for a bar or a line.
 */
export const AnswerFigure = z.discriminatedUnion('shape', [
  z.object({
    shape: z.literal('grid'),
    rows: z.number().int().min(1).max(20),
    cols: z.number().int().min(1).max(20),
  }),
  z.object({ shape: z.literal('pie'), parts: z.number().int().min(2).max(24) }),
  z.object({ shape: z.literal('bar'), parts: z.number().int().min(1).max(24) }),
  z.object({
    shape: z.literal('number_line'),
    parts: z.number().int().min(1).max(24),
    min: finite,
    max: finite,
  }),
]);
export type AnswerFigure = z.infer<typeof AnswerFigure>;

/** One of the drawn options in a "choose among visuals" item. */
export const AnswerVisual = z.union([
  z.object({
    of: z.literal('partition'),
    figure: AnswerFigure,
    shaded: z.array(z.number().int().nonnegative()).max(400),
  }),
  z.object({
    of: z.literal('strokes'),
    /** Polylines in a 0..100 box, drawn by the hand at whatever size the option is given. */
    strokes: z.array(z.array(AnswerPoint).min(2).max(64)).min(1).max(12),
    closed: z.boolean().optional(),
  }),
]);
export type AnswerVisual = z.infer<typeof AnswerVisual>;

// --- Specs ----------------------------------------------------------------------------------------

const base = { id: zAnswerId, prompt: zAnswerText.optional() };

/** Colour 1/2 of the shape. Either a count of parts, or the exact parts, must come back. */
export const ShadeRegionsSpec = z.object({
  ...base,
  kind: z.literal('shade_regions'),
  figure: AnswerFigure,
  /** How many parts must end up shaded. */
  want: z.number().int().nonnegative(),
  /** When WHICH parts matters and not merely how many. */
  wantParts: z.array(z.number().int().nonnegative()).max(400).optional(),
});

/** Drop points on a coordinate plane or a number line. */
export const PlacePointsSpec = z.object({
  ...base,
  kind: z.literal('place_points'),
  space: z.enum(['plane', 'line']),
  /** Axis extent, `[x, y]`. On a line the y half is ignored. */
  min: AnswerPoint,
  max: AnswerPoint,
  /** Snapping step per axis. Zero on an axis means that axis is continuous. */
  step: AnswerPoint,
  targets: z
    .array(
      z.object({
        id: zAnswerId,
        at: AnswerPoint,
        /** Axis units. Defaults to half a snap step, or 1% of the extent when continuous. */
        tolerance: finite.positive().optional(),
      }),
    )
    .min(1)
    .max(12),
  /** How many points the learner may drop. Defaults to the number of targets. */
  maxPoints: z.number().int().min(1).max(12).optional(),
  axisLabels: z.tuple([zAnswerText, zAnswerText]).optional(),
});

/** One value on a track, continuous or stepped, with the number drawn live beside the thumb. */
export const SliderSpec = z.object({
  ...base,
  kind: z.literal('slider'),
  min: finite,
  max: finite,
  /** Absent or zero is continuous. */
  step: finite.nonnegative().optional(),
  want: finite,
  /** Defaults to half a step, or 2% of the range when continuous. */
  tolerance: finite.positive().optional(),
  /** Where the thumb rests before the learner touches it. Defaults to the midpoint. */
  start: finite.optional(),
  unit: z.string().max(16).optional(),
  /** Decimal places in the drawn label. Defaults to what the step needs. */
  precision: z.number().int().min(0).max(6).optional(),
});

/** Drag the cards into the right sequence. */
export const OrderSpec = z.object({
  ...base,
  kind: z.literal('order'),
  items: z.array(AnswerItem).min(2).max(12),
  want: z.array(zAnswerId).min(2).max(12),
  /** Vertical is the default; a horizontal row suits short steps on a wide screen. */
  axis: z.enum(['vertical', 'horizontal']).optional(),
});

/** Pair the left column to the right one; the connectors are drawn. */
export const MatchSpec = z.object({
  ...base,
  kind: z.literal('match'),
  left: z.array(AnswerItem).min(2).max(8),
  right: z.array(AnswerItem).min(2).max(8),
  want: z
    .array(z.object({ left: zAnswerId, right: zAnswerId }))
    .min(1)
    .max(8),
});

/** Digits, a minus, a decimal point and a fraction bar. The value is typeset as it is built. */
export const NumberPadSpec = z.object({
  ...base,
  kind: z.literal('number_pad'),
  keys: z
    .object({
      minus: z.boolean().optional(),
      decimal: z.boolean().optional(),
      fraction: z.boolean().optional(),
    })
    .optional(),
  /** The value that is right. A fraction entry is compared by value unless `wantFraction` is set. */
  want: finite,
  /** When the FORM matters — three quarters, not 0.75. */
  wantFraction: z.object({ numerator: z.number().int(), denominator: z.number().int() }).optional(),
  /** Exact by default. */
  tolerance: finite.nonnegative().optional(),
  /** 2/4 is the right value in the wrong form. */
  requireSimplified: z.boolean().optional(),
  unit: z.string().max(16).optional(),
});

export const EXPRESSION_KEYS = [
  'fraction',
  'power',
  'root',
  'pi',
  'sin',
  'cos',
  'tan',
  'times',
  'divide',
  'plus',
  'minus',
  'equals',
  'paren',
  'variable',
] as const;
export const ExpressionKey = z.enum(EXPRESSION_KEYS);
export type ExpressionKey = (typeof EXPRESSION_KEYS)[number];

/** A maths keyboard. Produces a LaTeX-ish string; the preview is written in Wobo's hand. */
export const ExpressionSpec = z.object({
  ...base,
  kind: z.literal('expression'),
  keys: z.array(ExpressionKey).min(1).max(EXPRESSION_KEYS.length),
  /** Extra letters this item needs — `x`, `y`, `r`. */
  variables: z.array(z.string().min(1).max(3)).max(8).optional(),
  want: z.string().min(1).max(400),
  /** Other spellings of the same answer, compared after the same normalisation. */
  accept: z.array(z.string().min(1).max(400)).max(8).optional(),
});

/** Draw the thing itself: a segment, an angle, a shape. Board units throughout. */
export const DrawWant = z.discriminatedUnion('shape', [
  z.object({
    shape: z.literal('segment'),
    from: AnswerPoint,
    to: AnswerPoint,
    tolerance: finite.positive().optional(),
  }),
  z.object({
    shape: z.literal('angle'),
    vertex: AnswerPoint,
    degrees: finite,
    tolerance: finite.positive().optional(),
    /** Degrees of slack on the angle itself. Defaults to five. */
    degreeTolerance: finite.positive().optional(),
  }),
  z.object({
    shape: z.literal('polygon'),
    points: z.array(AnswerPoint).min(3).max(12),
    tolerance: finite.positive().optional(),
  }),
]);
export type DrawWant = z.infer<typeof DrawWant>;

export const DrawSpec = z.object({
  ...base,
  kind: z.literal('draw'),
  want: DrawWant,
  /** The extent of the board the learner draws on, in board units. */
  view: AnswerBox.optional(),
  /** Ink already on the board to draw over — the host resolves these ids to board objects. */
  backdrop: z.array(zAnswerId).max(24).optional(),
});

/** Lasso the part being asked for. Checked by which parts the loop encloses. */
export const CirclePartSpec = z.object({
  ...base,
  kind: z.literal('circle_part'),
  parts: z
    .array(z.object({ id: zAnswerId, label: zAnswerText, box: AnswerBox }))
    .min(2)
    .max(24),
  want: z.array(zAnswerId).min(1).max(24),
  view: AnswerBox.optional(),
  backdrop: z.array(zAnswerId).max(24).optional(),
});

/** Two to six drawn options; one of them, or several. */
export const ChooseVisualSpec = z.object({
  ...base,
  kind: z.literal('choose_visual'),
  options: z
    .array(z.object({ id: zAnswerId, label: zAnswerText, visual: AnswerVisual }))
    .min(2)
    .max(6),
  want: z.array(zAnswerId).min(1).max(6),
  multi: z.boolean().optional(),
});

/** Per-kind spec types, so a component can be typed to exactly the kind it draws. */
export type ShadeRegionsSpec = z.infer<typeof ShadeRegionsSpec>;
export type PlacePointsSpec = z.infer<typeof PlacePointsSpec>;
export type SliderSpec = z.infer<typeof SliderSpec>;
export type OrderSpec = z.infer<typeof OrderSpec>;
export type MatchSpec = z.infer<typeof MatchSpec>;
export type NumberPadSpec = z.infer<typeof NumberPadSpec>;
export type ExpressionSpec = z.infer<typeof ExpressionSpec>;
export type DrawSpec = z.infer<typeof DrawSpec>;
export type CirclePartSpec = z.infer<typeof CirclePartSpec>;
export type ChooseVisualSpec = z.infer<typeof ChooseVisualSpec>;

export const AnswerSpec = z.discriminatedUnion('kind', [
  ShadeRegionsSpec,
  PlacePointsSpec,
  SliderSpec,
  OrderSpec,
  MatchSpec,
  NumberPadSpec,
  ExpressionSpec,
  DrawSpec,
  CirclePartSpec,
  ChooseVisualSpec,
]);
export type AnswerSpec = z.infer<typeof AnswerSpec>;
export type AnswerSpecOf<K extends AnswerKind> = Extract<AnswerSpec, { kind: K }>;

// --- States ---------------------------------------------------------------------------------------

export const ShadeRegionsState = z.object({
  kind: z.literal('shade_regions'),
  shaded: z.array(z.number().int().nonnegative()).max(400),
});
export const PlacePointsState = z.object({
  kind: z.literal('place_points'),
  points: z.array(AnswerPoint).max(12),
});
export const SliderState = z.object({
  kind: z.literal('slider'),
  /** Null until the learner moves it — an untouched slider is an empty answer, not a zero. */
  value: finite.nullable(),
});
export const OrderState = z.object({ kind: z.literal('order'), order: z.array(zAnswerId).max(12) });
export const MatchState = z.object({
  kind: z.literal('match'),
  links: z.array(z.object({ left: zAnswerId, right: zAnswerId })).max(16),
});
export const NumberPadState = z.object({
  kind: z.literal('number_pad'),
  /** What is on the display: digits, one optional minus, one `.` or one `/`. */
  entry: z.string().max(32),
});
export const ExpressionState = z.object({
  kind: z.literal('expression'),
  latex: z.string().max(400),
});
export const DrawState = z.object({
  kind: z.literal('draw'),
  /** The learner's polyline, in board units. */
  path: z.array(AnswerPoint).max(400),
});
export const CirclePartState = z.object({
  kind: z.literal('circle_part'),
  lasso: z.array(AnswerPoint).max(400),
});
export const ChooseVisualState = z.object({
  kind: z.literal('choose_visual'),
  selected: z.array(zAnswerId).max(6),
});

/** Per-kind state types. */
export type ShadeRegionsState = z.infer<typeof ShadeRegionsState>;
export type PlacePointsState = z.infer<typeof PlacePointsState>;
export type SliderState = z.infer<typeof SliderState>;
export type OrderState = z.infer<typeof OrderState>;
export type MatchState = z.infer<typeof MatchState>;
export type NumberPadState = z.infer<typeof NumberPadState>;
export type ExpressionState = z.infer<typeof ExpressionState>;
export type DrawState = z.infer<typeof DrawState>;
export type CirclePartState = z.infer<typeof CirclePartState>;
export type ChooseVisualState = z.infer<typeof ChooseVisualState>;

export const AnswerState = z.discriminatedUnion('kind', [
  ShadeRegionsState,
  PlacePointsState,
  SliderState,
  OrderState,
  MatchState,
  NumberPadState,
  ExpressionState,
  DrawState,
  CirclePartState,
  ChooseVisualState,
]);
export type AnswerState = z.infer<typeof AnswerState>;
export type AnswerStateOf<K extends AnswerKind> = Extract<AnswerState, { kind: K }>;

// --- The check ------------------------------------------------------------------------------------

/**
 * What happened, as a code. Wobo turns one of these into a sentence; nothing here is ever shown
 * to a learner as written.
 */
export const ANSWER_FEEDBACK_CODES = [
  'correct',
  'empty',
  'malformed',
  'too_many',
  'too_few',
  'wrong_parts',
  'missing_point',
  'extra_point',
  'off_by',
  'wrong_sign',
  'not_simplified',
  'wrong_unit',
  'wrong_order',
  'wrong_pair',
  'unpaired',
  'wrong_expression',
  'wrong_shape',
  'wrong_angle',
  'wrong_length',
  'wrong_position',
  'wrong_option',
  'missing_option',
] as const;

export const AnswerFeedbackCode = z.enum(ANSWER_FEEDBACK_CODES);
export type AnswerFeedbackCode = (typeof ANSWER_FEEDBACK_CODES)[number];

export const AnswerFeedback = z.object({
  code: AnswerFeedbackCode,
  /** How many things this code is about — three parts too many, two pairs crossed. */
  count: z.number().int().nonnegative().optional(),
  /** For a code about a value: what was wanted, and what arrived. */
  expected: finite.optional(),
  actual: finite.optional(),
  /** The learner's own parts, items or options this code is about. */
  ids: z.array(z.string().max(64)).max(32).optional(),
});
export type AnswerFeedback = z.infer<typeof AnswerFeedback>;

/**
 * Where to ring. Always something the learner did — see rule 2 at the top of this file.
 */
export const AnswerHighlight = z.discriminatedUnion('on', [
  /** A numbered part of a partitioned figure. */
  z.object({ on: z.literal('part'), index: z.number().int().nonnegative() }),
  /** A named region of a drawn figure (circle-the-part). */
  z.object({ on: z.literal('region'), id: zAnswerId }),
  /** A card in an order, or a column entry in a match. */
  z.object({ on: z.literal('item'), id: zAnswerId }),
  /** One of the drawn options. */
  z.object({ on: z.literal('option'), id: zAnswerId }),
  /** A connector the learner drew. */
  z.object({ on: z.literal('pair'), left: zAnswerId, right: zAnswerId }),
  /** A point the learner dropped, or a vertex of what they drew. */
  z.object({ on: z.literal('point'), at: AnswerPoint }),
  /** A position on a slider track. */
  z.object({ on: z.literal('track'), value: finite }),
  /** The typed value itself — the pad display or the expression preview. */
  z.object({ on: z.literal('entry') }),
  /** An arbitrary box in the control's own space. */
  z.object({ on: z.literal('box'), box: AnswerBox }),
]);
export type AnswerHighlight = z.infer<typeof AnswerHighlight>;

export const AnswerCheck = z.object({
  correct: z.boolean(),
  /**
   * Partial credit, 0..1 exclusive. Present only when the attempt is wrong AND has something
   * right in it, so its presence is itself the "try the rest again" signal.
   */
  partial: z.number().gt(0).lt(1).optional(),
  feedback: z.array(AnswerFeedback).max(12),
  highlight: z.array(AnswerHighlight).max(32),
});
export type AnswerCheck = z.infer<typeof AnswerCheck>;

// --- Parsing --------------------------------------------------------------------------------------

/** A spec off the wire, or null. The brain composes these; the app never trusts one unparsed. */
export function parseAnswerSpec(raw: unknown): AnswerSpec | null {
  const parsed = AnswerSpec.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** A state off the wire (a resumed attempt), or null. */
export function parseAnswerState(raw: unknown): AnswerState | null {
  const parsed = AnswerState.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** True when a state belongs to this spec — the one invariant `check` may assume. */
export function stateMatchesSpec(spec: AnswerSpec, state: AnswerState): boolean {
  return spec.kind === state.kind;
}
