/**
 * The mock brains the hermetic bench recomputes with (docs/BOARD.md §2, §8).
 *
 * A bound control is a question, and the answer belongs to the brain's verifier — "when a bound
 * control changes, dependants are recomputed by the brain's verifier, not by the model". The bench
 * has no brain and no network by design, so it brings its own: one function per golden that owns a
 * control, computing the new geometry and the new numbers **here, in code**, exactly as `build.ts`
 * computed the board's originals. Nothing is a literal and nothing is interpolated between frames.
 *
 * They answer the same `BoardBrain` shape the gateway does, so the loop the bench exercises is the
 * one the app runs: the handle moves, the dependants are gathered, ink frames come back, and the
 * hand redraws them through the same grammar.
 */

import type { BoardEvent, BoardPoint } from '@wobo/wobo';
import type { BoardBrain } from '../variables';

// --- the tangent to y = x² --------------------------------------------------------------------

/**
 * The board mapping the golden was drawn on (`build.ts`, `tangent()`): origin at (500, 520), 70
 * board units per x, 45 per y. Kept in one place so a recompute cannot drift from the first draw.
 */
const OX = 500;
const OY = 520;
const SX = 70;
const SY = 45;
const TANGENT_FROM = 0.4;
const TANGENT_TO = 2.6;

const bx = (x: number): number => OX + x * SX;
const by = (y: number): number => OY - y * SY;
const round = (n: number): number => Math.round(n * 1e6) / 1e6;

/** Offsets rebased so the smallest is [0, 0] — the same rule the generator's `shape()` follows. */
function shape(points: readonly BoardPoint[]): {
  anchor: { board: BoardPoint };
  points: BoardPoint[];
} {
  const minX = Math.min(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1]));
  return {
    anchor: { board: [round(minX), round(minY)] },
    points: points.map(([x, y]) => [round(x - minX), round(y - minY)] as BoardPoint),
  };
}

/**
 * A handle being dragged tracks the finger; it does not re-perform. Everything here lands in a
 * millisecond, which is what makes a slider feel like a slider rather than a replay.
 */
const SNAP = { start: 0, dur: 1 };

/**
 * y = x², recomputed at the point of contact the learner has dragged to. Both quantities are
 * derived the long way round — the height from the function, the slope from the derivative — and
 * the tangent is drawn from the line those two define, so a mistake in one would show as a line
 * that no longer touches the curve.
 */
export const tangentParabolaBrain: BoardBrain = ({ variable, value }): BoardEvent[] => {
  if (variable !== 'a' || typeof value !== 'number' || !Number.isFinite(value)) return [];
  const a = Math.min(TANGENT_TO, Math.max(TANGENT_FROM, value));
  const height = a * a; // f(a)
  const slope = 2 * a; // f'(a)
  const intercept = height - slope * a;
  const ink = (object: Record<string, unknown>): BoardEvent =>
    ({ type: 'ink', object: { ...object, depends: ['a'], t: SNAP }, t: 0 }) as BoardEvent;

  return [
    ink({
      id: 'touch-point',
      kind: 'point',
      anchor: { board: [round(bx(a)), round(by(height))] },
      style: { ink: 'accent', weight: 3 },
    }),
    ink({
      id: 'slope-value',
      kind: 'number',
      anchor: { board: [790, 180] },
      value: round(slope),
      label: 'slope =',
      verified: true,
      check: 'board.numbers_agree:tangent slope',
      meta: `d/dx(x**2) at x = ${a}`,
    }),
    ink({
      id: 'point-value',
      kind: 'number',
      anchor: { board: [790, 240] },
      value: round(height),
      precision: 2,
      label: 'y =',
      verified: true,
      check: 'board.numbers_agree:point on the curve',
      meta: `${a}**2`,
    }),
    ink({
      id: 'tangent-line',
      kind: 'polyline',
      ...shape([
        [bx(TANGENT_FROM), by(slope * TANGENT_FROM + intercept)],
        [bx(TANGENT_TO), by(slope * TANGENT_TO + intercept)],
      ]),
      style: { ink: 'accent', weight: 2 },
    }),
    ink({
      id: 'tangent-label',
      kind: 'label',
      anchor: { object: 'tangent-line' },
      text: 'the tangent',
      style: { ink: 'accent', weight: 1 },
    }),
    ink({
      id: 'point-arrow',
      kind: 'arrow',
      anchor: { object: 'touch-point' },
      from: { board: [790, 300] },
      style: { ink: 'accent', weight: 2 },
    }),
  ];
};

/** Every golden that offers a control, and the brain that answers it. */
export const GOLDEN_BRAINS: Record<string, BoardBrain> = {
  'tangent-parabola': tangentParabolaBrain,
};
