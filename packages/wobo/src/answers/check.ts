/**
 * `check(spec, state)` — one pure function, one definition of "right".
 *
 * The app runs it the instant the learner presses Check, so feedback is immediate and offline; the
 * brain runs the same function on the same spec to bank the evidence. Nothing here reads the DOM,
 * a clock, or a random number, so both runs agree by construction rather than by review.
 *
 * Two laws (stated in the contract, enforced here):
 *   - feedback is codes and counts, never a sentence: Wobo owns the words;
 *   - a highlight rings the LEARNER'S own marks, never the right answer, so pointing at the exact
 *     spot never hands the answer over.
 */

import type {
  AnswerCheck,
  AnswerFeedback,
  AnswerHighlight,
  AnswerPoint,
  AnswerSpec,
  AnswerState,
  ChooseVisualSpec,
  CirclePartSpec,
  DrawSpec,
  ExpressionSpec,
  MatchSpec,
  NumberPadSpec,
  OrderSpec,
  PlacePointsSpec,
  ShadeRegionsSpec,
  SliderSpec,
} from '@wobo/contracts';
import { distance } from '../board/pen';
import {
  angleAt,
  axisTolerance,
  boxCenter,
  clamp,
  insideLoop,
  isLasso,
  partCount,
  reduceToVertices,
  straightness,
} from './geometry';
import { expressionIsBlank, expressionMatches, isSimplified, parsePadEntry } from './value';

type State<K extends AnswerState['kind']> = Extract<AnswerState, { kind: K }>;

const MAX_FEEDBACK = 12;
const MAX_HIGHLIGHT = 32;

/**
 * Assemble a result. `partial` survives only when the attempt is wrong and has something right in
 * it — a wrong answer with `partial` absent is a wrong answer with nothing to build on, and Wobo
 * reads exactly that difference.
 */
function result(
  correct: boolean,
  feedback: AnswerFeedback[],
  highlight: AnswerHighlight[],
  partial?: number,
): AnswerCheck {
  const scored = partial === undefined ? undefined : clamp(partial, 0, 1);
  const keep = !correct && scored !== undefined && scored > 0 && scored < 1;
  return {
    correct,
    ...(keep && scored !== undefined ? { partial: scored } : {}),
    feedback: (correct ? [{ code: 'correct' as const }, ...feedback] : feedback).slice(
      0,
      MAX_FEEDBACK,
    ),
    highlight: highlight.slice(0, MAX_HIGHLIGHT),
  };
}

const empty = (): AnswerCheck => result(false, [{ code: 'empty' }], []);
const malformed = (): AnswerCheck => result(false, [{ code: 'malformed' }], []);

/** `a` minus `b`, order preserved — the set arithmetic every truth table below is written in. */
function without<T>(a: readonly T[], b: readonly T[]): T[] {
  const drop = new Set(b);
  return a.filter((x) => !drop.has(x));
}

const uniq = <T>(a: readonly T[]): T[] => [...new Set(a)];

// --- Shade regions ---------------------------------------------------------------------------------

function checkShade(spec: ShadeRegionsSpec, state: State<'shade_regions'>): AnswerCheck {
  const total = partCount(spec.figure);
  const shaded = uniq(state.shaded).filter((i) => i >= 0 && i < total);
  if (shaded.length === 0) return empty();

  if (spec.wantParts) {
    const want = uniq(spec.wantParts).filter((i) => i >= 0 && i < total);
    const extra = without(shaded, want);
    const missing = without(want, shaded);
    if (extra.length === 0 && missing.length === 0) {
      return result(
        true,
        [],
        shaded.map((index) => ({ on: 'part', index })),
      );
    }
    const feedback: AnswerFeedback[] = [];
    if (extra.length > 0) {
      feedback.push({ code: 'wrong_parts', count: extra.length, ids: extra.map(String) });
    }
    if (missing.length > 0) feedback.push({ code: 'too_few', count: missing.length });
    const hit = shaded.length - extra.length;
    return result(
      false,
      feedback,
      extra.map((index) => ({ on: 'part', index })),
      want.length === 0 ? 0 : hit / want.length,
    );
  }

  if (shaded.length === spec.want) {
    return result(
      true,
      [],
      shaded.map((index) => ({ on: 'part', index })),
    );
  }
  const over = shaded.length - spec.want;
  if (over > 0) {
    // Ring the surplus the learner shaded last: their own marks, never the right ones.
    const surplus = shaded.slice(-over);
    return result(
      false,
      [{ code: 'too_many', count: over, expected: spec.want, actual: shaded.length }],
      surplus.map((index) => ({ on: 'part', index })),
      spec.want === 0 ? 0 : spec.want / shaded.length,
    );
  }
  return result(
    false,
    [{ code: 'too_few', count: -over, expected: spec.want, actual: shaded.length }],
    [],
    spec.want === 0 ? 0 : shaded.length / spec.want,
  );
}

// --- Place points ----------------------------------------------------------------------------------

function checkPlacePoints(spec: PlacePointsSpec, state: State<'place_points'>): AnswerCheck {
  if (state.points.length === 0) return empty();
  const onLine = spec.space === 'line';
  const xTol = axisTolerance(spec.min[0], spec.max[0], spec.step[0]);
  const yTol = onLine
    ? Number.POSITIVE_INFINITY
    : axisTolerance(spec.min[1], spec.max[1], spec.step[1]);

  const used = new Set<number>();
  let missing = 0;
  for (const target of spec.targets) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    state.points.forEach((p, i) => {
      if (used.has(i)) return;
      const dx = Math.abs(p[0] - target.at[0]);
      const dy = onLine ? 0 : Math.abs(p[1] - target.at[1]);
      if (dx > (target.tolerance ?? xTol) + 1e-9) return;
      if (dy > (target.tolerance ?? yTol) + 1e-9) return;
      const d = Math.hypot(dx, dy);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    });
    if (bestIndex >= 0) used.add(bestIndex);
    else missing += 1;
  }

  const extras = state.points.filter((_, i) => !used.has(i));
  const matched = spec.targets.length - missing;
  if (missing === 0 && extras.length === 0) {
    return result(
      true,
      [],
      state.points.map((at) => ({ on: 'point', at })),
    );
  }
  const feedback: AnswerFeedback[] = [];
  if (missing > 0) feedback.push({ code: 'missing_point', count: missing });
  if (extras.length > 0) feedback.push({ code: 'extra_point', count: extras.length });
  return result(
    false,
    feedback,
    extras.map((at) => ({ on: 'point', at })),
    matched / spec.targets.length,
  );
}

// --- Slider ----------------------------------------------------------------------------------------

/** The slack a slider is judged with: the spec's, else half a step, else 2% of the range. */
export function sliderTolerance(spec: SliderSpec): number {
  if (spec.tolerance !== undefined) return spec.tolerance;
  if (spec.step && spec.step > 0) return spec.step / 2;
  return Math.abs(spec.max - spec.min) * 0.02 || 1e-6;
}

function checkSlider(spec: SliderSpec, state: State<'slider'>): AnswerCheck {
  if (state.value === null) return empty();
  const off = Math.abs(state.value - spec.want);
  // Half a step of slack must still admit the step itself: floating error on 0.1 steps would
  // otherwise reject the exact value the learner landed on.
  if (off <= sliderTolerance(spec) + 1e-9) {
    return result(true, [], [{ on: 'track', value: state.value }]);
  }
  const range = Math.abs(spec.max - spec.min) || 1;
  return result(
    false,
    [{ code: 'off_by', expected: spec.want, actual: state.value }],
    [{ on: 'track', value: state.value }],
    1 - off / range,
  );
}

// --- Order -----------------------------------------------------------------------------------------

function checkOrder(spec: OrderSpec, state: State<'order'>): AnswerCheck {
  if (state.order.length === 0) return empty();
  if (state.order.length !== spec.want.length) return malformed();
  const wrongIds = state.order.filter((id, i) => spec.want[i] !== id);
  if (wrongIds.length === 0) {
    return result(
      true,
      [],
      state.order.map((id) => ({ on: 'item', id })),
    );
  }
  return result(
    false,
    [{ code: 'wrong_order', count: wrongIds.length, ids: wrongIds }],
    wrongIds.map((id) => ({ on: 'item', id })),
    (spec.want.length - wrongIds.length) / spec.want.length,
  );
}

// --- Match -----------------------------------------------------------------------------------------

const pairKey = (p: { left: string; right: string }): string => `${p.left} ${p.right}`;

function checkMatch(spec: MatchSpec, state: State<'match'>): AnswerCheck {
  if (state.links.length === 0) return empty();
  const want = new Set(spec.want.map(pairKey));
  const right = uniq(state.links.map(pairKey)).filter((k) => want.has(k));
  const wrong = state.links.filter((l) => !want.has(pairKey(l)));
  const unpaired = spec.want.length - right.length;
  if (wrong.length === 0 && unpaired === 0) {
    return result(
      true,
      [],
      state.links.map((l) => ({ on: 'pair', left: l.left, right: l.right })),
    );
  }
  const feedback: AnswerFeedback[] = [];
  if (wrong.length > 0) {
    feedback.push({ code: 'wrong_pair', count: wrong.length, ids: wrong.map((l) => l.left) });
  }
  if (unpaired > 0) feedback.push({ code: 'unpaired', count: unpaired });
  return result(
    false,
    feedback,
    wrong.map((l) => ({ on: 'pair', left: l.left, right: l.right })),
    right.length / spec.want.length,
  );
}

// --- Number pad ------------------------------------------------------------------------------------

function checkNumberPad(spec: NumberPadSpec, state: State<'number_pad'>): AnswerCheck {
  if (state.entry === '') return empty();
  const parsed = parsePadEntry(state.entry);
  if (!parsed) return malformed();
  const tol = spec.tolerance ?? 0;
  const ring: AnswerHighlight[] = [{ on: 'entry' }];

  if (spec.wantFraction) {
    const { numerator, denominator } = spec.wantFraction;
    const wanted = numerator / denominator;
    if (parsed.numerator === undefined || parsed.denominator === undefined) {
      // The right value in the wrong representation: 0.75 where three quarters was asked for.
      return Math.abs(parsed.value - wanted) <= tol + 1e-12
        ? result(false, [{ code: 'wrong_unit', expected: wanted, actual: parsed.value }], ring, 0.5)
        : result(false, [{ code: 'off_by', expected: wanted, actual: parsed.value }], ring);
    }
    if (parsed.numerator === numerator && parsed.denominator === denominator) {
      return result(true, [], ring);
    }
    if (Math.abs(parsed.value - wanted) <= tol + 1e-12) {
      const code = isSimplified(parsed.numerator, parsed.denominator)
        ? 'wrong_unit'
        : 'not_simplified';
      return result(false, [{ code }], ring, 0.5);
    }
    return result(false, [{ code: 'off_by', expected: wanted, actual: parsed.value }], ring);
  }

  const onValue = Math.abs(parsed.value - spec.want) <= tol + 1e-12;
  if (
    onValue &&
    spec.requireSimplified &&
    parsed.numerator !== undefined &&
    parsed.denominator !== undefined &&
    !isSimplified(parsed.numerator, parsed.denominator)
  ) {
    return result(false, [{ code: 'not_simplified' }], ring, 0.5);
  }
  if (onValue) return result(true, [], ring);
  if (spec.want !== 0 && Math.abs(parsed.value + spec.want) <= tol + 1e-12) {
    return result(
      false,
      [{ code: 'wrong_sign', expected: spec.want, actual: parsed.value }],
      ring,
      0.5,
    );
  }
  return result(false, [{ code: 'off_by', expected: spec.want, actual: parsed.value }], ring);
}

// --- Expression ------------------------------------------------------------------------------------

function checkExpression(spec: ExpressionSpec, state: State<'expression'>): AnswerCheck {
  // Structure with nothing in it is an unfinished answer, not a wrong one.
  if (expressionIsBlank(state.latex)) return empty();
  if (expressionMatches(state.latex, spec.want, spec.accept ?? [])) {
    return result(true, [], [{ on: 'entry' }]);
  }
  return result(false, [{ code: 'wrong_expression' }], [{ on: 'entry' }]);
}

// --- Draw on the board -----------------------------------------------------------------------------

/** The default slack on a drawn figure: fifteen board units, about a fingertip. */
export const DRAW_TOLERANCE = 15;
/** How bowed a "straight" segment may be before it stops being a segment. */
export const STRAIGHT_LIMIT = 1.12;
/** Default slack on a drawn angle, in degrees. */
export const ANGLE_TOLERANCE = 5;

/** A drawn shape whose ends nearly meet is closed; joining them is what the eye already did. */
function closeLoop(path: readonly AnswerPoint[]): AnswerPoint[] {
  const points = path.slice();
  const first = points[0];
  const last = points[points.length - 1];
  if (first && last && distance(first, last) > 0) points.push(first);
  return points;
}

/**
 * A drawn polygon has no privileged first corner and no privileged direction, so it is compared
 * against every rotation of the wanted one, forwards and backwards, and judged on its best fit.
 */
function bestRotation(
  drawn: readonly AnswerPoint[],
  want: readonly AnswerPoint[],
): { worst: number; offenders: AnswerPoint[] } {
  let worstOfBest = Number.POSITIVE_INFINITY;
  let offenders: AnswerPoint[] = drawn.slice();
  for (const order of [want, [...want].reverse()]) {
    for (let shift = 0; shift < order.length; shift++) {
      const gaps = drawn.map((p, i) => {
        const target = order[(i + shift) % order.length];
        return target ? distance(p, target) : Number.POSITIVE_INFINITY;
      });
      const worst = gaps.reduce((m, g) => (g > m ? g : m), 0);
      if (worst < worstOfBest) {
        worstOfBest = worst;
        offenders = drawn.filter((_, i) => (gaps[i] ?? 0) >= worst - 1e-9);
      }
    }
  }
  return { worst: worstOfBest, offenders };
}

function checkDraw(spec: DrawSpec, state: State<'draw'>): AnswerCheck {
  const path = state.path;
  if (path.length < 2) return empty();
  const want = spec.want;
  const tol = want.tolerance ?? DRAW_TOLERANCE;
  const first = path[0];
  const last = path[path.length - 1];
  if (!first || !last) return malformed();

  if (want.shape === 'segment') {
    const ends: AnswerHighlight[] = [
      { on: 'point', at: first },
      { on: 'point', at: last },
    ];
    const bow = straightness(path);
    if (bow > STRAIGHT_LIMIT) {
      return result(false, [{ code: 'wrong_shape', actual: Math.round(bow * 100) / 100 }], ends);
    }
    const forward = Math.max(distance(first, want.from), distance(last, want.to));
    const backward = Math.max(distance(first, want.to), distance(last, want.from));
    const off = Math.min(forward, backward);
    if (off <= tol) return result(true, [], ends);
    return result(
      false,
      [{ code: 'wrong_position', actual: Math.round(off) }],
      ends,
      clamp(1 - off / (tol * 6), 0, 0.99),
    );
  }

  if (want.shape === 'angle') {
    const corner = reduceToVertices(path, 3);
    const a = corner[0];
    const v = corner[1];
    const b = corner[corner.length - 1];
    if (!a || !v || !b || corner.length < 3) {
      return result(false, [{ code: 'wrong_shape' }], [{ on: 'point', at: first }]);
    }
    const ring: AnswerHighlight[] = [{ on: 'point', at: v }];
    const vertexOff = distance(v, want.vertex);
    if (vertexOff > tol) {
      return result(false, [{ code: 'wrong_position', actual: Math.round(vertexOff) }], ring, 0.4);
    }
    const degrees = angleAt(a, v, b);
    const slack = want.degreeTolerance ?? ANGLE_TOLERANCE;
    if (Math.abs(degrees - want.degrees) <= slack) return result(true, [], ring);
    return result(
      false,
      [{ code: 'wrong_angle', expected: want.degrees, actual: Math.round(degrees) }],
      ring,
      clamp(1 - Math.abs(degrees - want.degrees) / 180, 0, 0.99),
    );
  }

  const n = want.points.length;
  // A closed ring of n corners is n+1 vertices once the loop is joined; the repeat is dropped.
  const drawn = reduceToVertices(closeLoop(path), n + 1).slice(0, n);
  if (drawn.length < n) {
    return result(false, [{ code: 'wrong_shape', expected: n, actual: drawn.length }], []);
  }
  const best = bestRotation(drawn, want.points);
  if (best.worst <= tol) {
    return result(
      true,
      [],
      drawn.map((at) => ({ on: 'point', at })),
    );
  }
  return result(
    false,
    [{ code: 'wrong_shape', count: best.offenders.length, actual: Math.round(best.worst) }],
    best.offenders.map((at) => ({ on: 'point', at })),
    clamp(1 - best.worst / (tol * 6), 0, 0.99),
  );
}

// --- Circle the part -------------------------------------------------------------------------------

function checkCirclePart(spec: CirclePartSpec, state: State<'circle_part'>): AnswerCheck {
  if (state.lasso.length < 3) return empty();
  if (!isLasso(state.lasso)) return malformed();
  const inside = spec.parts
    .filter((p) => insideLoop(boxCenter(p.box), state.lasso))
    .map((p) => p.id);
  if (inside.length === 0) return empty();
  const extra = without(inside, spec.want);
  const missing = without(spec.want, inside);
  if (extra.length === 0 && missing.length === 0) {
    return result(
      true,
      [],
      inside.map((id) => ({ on: 'region', id })),
    );
  }
  const feedback: AnswerFeedback[] = [];
  if (extra.length > 0) feedback.push({ code: 'wrong_parts', count: extra.length, ids: extra });
  if (missing.length > 0) feedback.push({ code: 'too_few', count: missing.length });
  return result(
    false,
    feedback,
    extra.map((id) => ({ on: 'region', id })),
    (spec.want.length - missing.length) / spec.want.length,
  );
}

// --- Choose among visuals --------------------------------------------------------------------------

function checkChooseVisual(spec: ChooseVisualSpec, state: State<'choose_visual'>): AnswerCheck {
  const selected = uniq(state.selected).filter((id) => spec.options.some((o) => o.id === id));
  if (selected.length === 0) return empty();
  if (!spec.multi && selected.length > 1) {
    return result(
      false,
      [{ code: 'too_many', count: selected.length - 1, expected: 1, actual: selected.length }],
      selected.map((id) => ({ on: 'option', id })),
    );
  }
  const wrong = without(selected, spec.want);
  const missing = without(spec.want, selected);
  if (wrong.length === 0 && missing.length === 0) {
    return result(
      true,
      [],
      selected.map((id) => ({ on: 'option', id })),
    );
  }
  const feedback: AnswerFeedback[] = [];
  if (wrong.length > 0) feedback.push({ code: 'wrong_option', count: wrong.length, ids: wrong });
  if (missing.length > 0) feedback.push({ code: 'missing_option', count: missing.length });
  return result(
    false,
    feedback,
    wrong.map((id) => ({ on: 'option', id })),
    (spec.want.length - missing.length) / spec.want.length,
  );
}

// --- The seam --------------------------------------------------------------------------------------

/**
 * Judge an attempt. A state of the wrong kind is `malformed` rather than a throw: this runs on
 * whatever the network handed back, and a mismatched pair is bad data, not a crash.
 */
export function check(spec: AnswerSpec, state: AnswerState): AnswerCheck {
  if (spec.kind !== state.kind) return malformed();
  switch (spec.kind) {
    case 'shade_regions':
      return checkShade(spec, state as State<'shade_regions'>);
    case 'place_points':
      return checkPlacePoints(spec, state as State<'place_points'>);
    case 'slider':
      return checkSlider(spec, state as State<'slider'>);
    case 'order':
      return checkOrder(spec, state as State<'order'>);
    case 'match':
      return checkMatch(spec, state as State<'match'>);
    case 'number_pad':
      return checkNumberPad(spec, state as State<'number_pad'>);
    case 'expression':
      return checkExpression(spec, state as State<'expression'>);
    case 'draw':
      return checkDraw(spec, state as State<'draw'>);
    case 'circle_part':
      return checkCirclePart(spec, state as State<'circle_part'>);
    case 'choose_visual':
      return checkChooseVisual(spec, state as State<'choose_visual'>);
  }
}
