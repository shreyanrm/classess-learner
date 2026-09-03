/**
 * The keyboard path, as pure functions.
 *
 * Every answer kind is operable with nothing but a keyboard, and none of that behaviour lives in a
 * component: a handler here takes the state and a key and returns the next state, so the whole
 * keyboard contract is unit-testable without a DOM, and a component can only ever be a thin call
 * into it. A handler returns `null` for a key it does not claim, which is the component's signal
 * to let the browser have it.
 */

import type { AnswerPoint, AnswerSpec, AnswerStateOf } from '@wobo/contracts';
import { clamp, partCount, settle } from './geometry';
import {
  addPoint,
  moveCard,
  movePoint,
  pressExpression,
  pressPad,
  removePoint,
  setSlider,
  sliderNudge,
  sliderShown,
  toggleShade,
} from './state';

/** The bits of a keyboard event a handler needs. Not an event: a value. */
export interface KeyPress {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

/** Enter and Space both activate, everywhere, as the platform expects. */
export function isActivate(press: KeyPress): boolean {
  return press.key === 'Enter' || press.key === ' ' || press.key === 'Spacebar';
}

const HORIZONTAL = new Set(['ArrowLeft', 'ArrowRight']);
const VERTICAL = new Set(['ArrowUp', 'ArrowDown']);

/** A modifier that means "take the thing with you", not "move the cursor". */
function carrying(press: KeyPress): boolean {
  return press.altKey === true || press.ctrlKey === true || press.metaKey === true;
}

// --- Roving focus ------------------------------------------------------------------------------------

/**
 * Move a roving tabstop through a list, or through a grid when `columns` is given. Home and End go
 * to the ends. Out of range at either edge the focus stays put rather than wrapping, so a learner
 * never loses their place by leaning on an arrow key.
 */
export function rove(
  count: number,
  index: number,
  press: KeyPress,
  columns?: number,
): number | null {
  if (count <= 0) return null;
  const cols = columns && columns > 0 ? columns : 1;
  switch (press.key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowLeft':
      return clamp(index - 1, 0, count - 1);
    case 'ArrowRight':
      return clamp(index + 1, 0, count - 1);
    case 'ArrowUp':
      return clamp(index - cols, 0, count - 1);
    case 'ArrowDown':
      return clamp(index + cols, 0, count - 1);
    default:
      return null;
  }
}

/** How many columns a figure's parts rove in. A pie and a bar are one row; a grid is its own. */
export function figureColumns(spec: Extract<AnswerSpec, { kind: 'shade_regions' }>): number {
  return spec.figure.shape === 'grid' ? spec.figure.cols : partCount(spec.figure);
}

// --- Shade regions -------------------------------------------------------------------------------------

/** Space or Enter shades the focused part. Arrows are the caller's, through `rove`. */
export function shadeKey(
  spec: Extract<AnswerSpec, { kind: 'shade_regions' }>,
  state: AnswerStateOf<'shade_regions'>,
  index: number,
  press: KeyPress,
): AnswerStateOf<'shade_regions'> | null {
  if (!isActivate(press)) return null;
  return toggleShade(spec, state, index);
}

// --- Place points --------------------------------------------------------------------------------------

type PlaceSpec = Extract<AnswerSpec, { kind: 'place_points' }>;

/** One arrow key's worth of movement on an axis: its snap step, or a hundredth of its extent. */
export function axisNudge(min: number, max: number, step: number): number {
  return step > 0 ? step : Math.abs(max - min) / 100 || 1;
}

/**
 * The keyboard cursor on a plane or a line — the crosshair a learner drives with the arrows before
 * pressing Enter to drop a point. It is UI state, not answer state, so it lives with the caller
 * and moves through this.
 */
export function moveCursor(
  spec: PlaceSpec,
  cursor: AnswerPoint,
  press: KeyPress,
): AnswerPoint | null {
  const dx = axisNudge(spec.min[0], spec.max[0], spec.step[0]) * (press.shiftKey ? 10 : 1);
  const dy = axisNudge(spec.min[1], spec.max[1], spec.step[1]) * (press.shiftKey ? 10 : 1);
  const at = (x: number, y: number): AnswerPoint => [
    settle(x, spec.min[0], spec.max[0], spec.step[0]),
    spec.space === 'line' ? 0 : settle(y, spec.min[1], spec.max[1], spec.step[1]),
  ];
  switch (press.key) {
    case 'ArrowLeft':
      return at(cursor[0] - dx, cursor[1]);
    case 'ArrowRight':
      return at(cursor[0] + dx, cursor[1]);
    case 'ArrowUp':
      return spec.space === 'line' ? null : at(cursor[0], cursor[1] + dy);
    case 'ArrowDown':
      return spec.space === 'line' ? null : at(cursor[0], cursor[1] - dy);
    case 'Home':
      return at(spec.min[0], cursor[1]);
    case 'End':
      return at(spec.max[0], cursor[1]);
    default:
      return null;
  }
}

/** Enter drops a point where the cursor is; Backspace or Delete lifts the last one. */
export function placeKey(
  spec: PlaceSpec,
  state: AnswerStateOf<'place_points'>,
  cursor: AnswerPoint,
  press: KeyPress,
): AnswerStateOf<'place_points'> | null {
  if (isActivate(press)) return addPoint(spec, state, cursor);
  if (press.key === 'Backspace' || press.key === 'Delete') {
    return state.points.length === 0 ? null : removePoint(state, state.points.length - 1);
  }
  return null;
}

/** Arrows on a point that already has focus drag it, rather than moving the cursor. */
export function dragPointKey(
  spec: PlaceSpec,
  state: AnswerStateOf<'place_points'>,
  index: number,
  press: KeyPress,
): AnswerStateOf<'place_points'> | null {
  const point = state.points[index];
  if (!point) return null;
  if (press.key === 'Backspace' || press.key === 'Delete') return removePoint(state, index);
  const moved = moveCursor(spec, point, press);
  return moved ? movePoint(spec, state, index, moved) : null;
}

// --- Slider ---------------------------------------------------------------------------------------------

/** The full ARIA slider keyboard: arrows, page keys for ten steps, Home and End for the ends. */
export function sliderKey(
  spec: Extract<AnswerSpec, { kind: 'slider' }>,
  state: AnswerStateOf<'slider'>,
  press: KeyPress,
): AnswerStateOf<'slider'> | null {
  const nudge = sliderNudge(spec);
  const now = sliderShown(spec, state);
  switch (press.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return setSlider(spec, now + nudge);
    case 'ArrowLeft':
    case 'ArrowDown':
      return setSlider(spec, now - nudge);
    case 'PageUp':
      return setSlider(spec, now + nudge * 10);
    case 'PageDown':
      return setSlider(spec, now - nudge * 10);
    case 'Home':
      return setSlider(spec, spec.min);
    case 'End':
      return setSlider(spec, spec.max);
    default:
      return null;
  }
}

// --- Order ------------------------------------------------------------------------------------------------

/**
 * Reordering without a mouse. A bare arrow moves the focus; an arrow with a modifier CARRIES the
 * card, which is the one gesture a drag has that a list does not, and the reason a plain listbox
 * would not have been enough here.
 */
export function orderKey(
  state: AnswerStateOf<'order'>,
  index: number,
  press: KeyPress,
  axis: 'vertical' | 'horizontal' = 'vertical',
): { state: AnswerStateOf<'order'>; index: number } | null {
  const along = axis === 'horizontal' ? HORIZONTAL : VERTICAL;
  if (!along.has(press.key)) {
    const roved = rove(state.order.length, index, press);
    return roved === null ? null : { state, index: roved };
  }
  const back = press.key === 'ArrowLeft' || press.key === 'ArrowUp';
  const to = clamp(index + (back ? -1 : 1), 0, state.order.length - 1);
  if (!carrying(press)) return { state, index: to };
  return { state: moveCard(state, index, to), index: to };
}

// --- Match ------------------------------------------------------------------------------------------------

/**
 * Matching is two presses: Enter on a left item picks it up, Enter on a right item joins them.
 * `picked` is the caller's UI state; Escape puts it back down.
 */
export function matchKey(
  press: KeyPress,
  picked: string | null,
  hovered: { side: 'left' | 'right'; id: string },
): { picked: string | null; join: { left: string; right: string } | null } | null {
  if (press.key === 'Escape') return picked === null ? null : { picked: null, join: null };
  if (!isActivate(press)) return null;
  if (hovered.side === 'left')
    return { picked: picked === hovered.id ? null : hovered.id, join: null };
  if (picked === null) return null;
  return { picked: null, join: { left: picked, right: hovered.id } };
}

// --- Number pad ---------------------------------------------------------------------------------------------

/** A physical key mapped onto a pad key, or null when the pad does not want it. */
export function padKeyFor(press: KeyPress): string | null {
  if (/^\d$/.test(press.key)) return press.key;
  if (press.key === '-') return '-';
  if (press.key === '.') return '.';
  if (press.key === '/') return '/';
  if (press.key === 'Backspace') return 'back';
  if (press.key === 'Delete' || press.key === 'Escape') return 'clear';
  return null;
}

/** Type into the pad from a real keyboard. */
export function padKey(
  state: AnswerStateOf<'number_pad'>,
  press: KeyPress,
): AnswerStateOf<'number_pad'> | null {
  const key = padKeyFor(press);
  if (key === null) return null;
  const next = pressPad(state, key);
  return next.entry === state.entry ? state : next;
}

// --- Expression -----------------------------------------------------------------------------------------------

const EXPRESSION_DIRECT: Record<string, string> = {
  '+': 'plus',
  '-': 'minus',
  '=': 'equals',
  '*': 'times',
  '/': 'fraction',
  '^': 'power',
  '(': 'paren',
};

/** A physical key mapped onto an expression key, or null when the keyboard does not want it. */
export function expressionKeyFor(press: KeyPress): string | null {
  if (press.key === 'Backspace') return 'back';
  if (press.key === 'Escape') return 'clear';
  const mapped = EXPRESSION_DIRECT[press.key];
  if (mapped) return mapped;
  if (press.key.length === 1 && /[0-9A-Za-z.)]/.test(press.key)) return press.key;
  return null;
}

/** Type into the maths keyboard from a real keyboard. */
export function expressionKey(
  state: AnswerStateOf<'expression'>,
  press: KeyPress,
): AnswerStateOf<'expression'> | null {
  const key = expressionKeyFor(press);
  if (key === null) return null;
  return pressExpression(state, key);
}

// --- Draw -----------------------------------------------------------------------------------------------------

/**
 * The keyboard path for a drawn figure: the learner moves one endpoint at a time with the arrows.
 * The result is the same polyline a stylus leaves, so `check` cannot tell the two apart.
 */
export function nudgeVertex(
  state: AnswerStateOf<'draw'>,
  index: number,
  press: KeyPress,
  step = 10,
): AnswerStateOf<'draw'> | null {
  const point = state.path[index];
  if (!point) return null;
  const d = press.shiftKey ? step * 4 : step;
  const moved = ((): AnswerPoint | null => {
    switch (press.key) {
      case 'ArrowLeft':
        return [point[0] - d, point[1]];
      case 'ArrowRight':
        return [point[0] + d, point[1]];
      case 'ArrowUp':
        return [point[0], point[1] - d];
      case 'ArrowDown':
        return [point[0], point[1] + d];
      default:
        return null;
    }
  })();
  if (!moved) return null;
  const path = state.path.slice();
  path[index] = moved;
  return { kind: 'draw', path };
}
