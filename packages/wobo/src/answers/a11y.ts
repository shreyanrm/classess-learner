/**
 * What each part of an answer control is, to a screen reader — as data, not as JSX.
 *
 * Roles and labels are computed here so they can be asserted in a unit test without rendering
 * anything, and so a component cannot quietly ship a `div` where a `checkbox` was promised. The
 * readouts describe STATE ("four of eight parts shaded"), never judgement: feedback stays
 * structured in the contract and Wobo speaks it.
 */

import type { AnswerSpec, AnswerState, AnswerStateOf } from '@wobo/contracts';
import { partCount } from './geometry';
import { linkOf, sliderShown } from './state';

/** The attributes a control puts on an element. A plain object: the component spreads it. */
export interface Aria {
  role: string;
  'aria-label'?: string;
  'aria-checked'?: boolean;
  'aria-pressed'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-posinset'?: number;
  'aria-setsize'?: number;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-multiselectable'?: boolean;
  'aria-keyshortcuts'?: string;
  'aria-description'?: string;
}

/** A number as a learner would hear it — no trailing zeros, no exponent. */
export function speakNumber(value: number, precision?: number): string {
  const shown = precision === undefined ? value : Number(value.toFixed(precision));
  if (!Number.isFinite(shown)) return 'no value';
  return String(Number(shown.toFixed(6)));
}

/** A coordinate, spoken. */
export function speakPoint(at: readonly [number, number], onLine: boolean): string {
  return onLine ? speakNumber(at[0]) : `${speakNumber(at[0])}, ${speakNumber(at[1])}`;
}

/** The group every control sits in, so the prompt is read before the parts are reached. */
export function controlAria(spec: AnswerSpec, fallback: string): Aria {
  return { role: 'group', 'aria-label': spec.prompt ?? fallback };
}

// --- Shade regions -------------------------------------------------------------------------------------

/** One shadeable part. A checkbox, because it is a thing that is on or off and can be either. */
export function shadeAria(
  spec: Extract<AnswerSpec, { kind: 'shade_regions' }>,
  state: AnswerStateOf<'shade_regions'>,
  index: number,
): Aria {
  const total = partCount(spec.figure);
  return {
    role: 'checkbox',
    'aria-checked': state.shaded.includes(index),
    'aria-label': `part ${index + 1} of ${total}`,
    'aria-posinset': index + 1,
    'aria-setsize': total,
  };
}

// --- Place points --------------------------------------------------------------------------------------

/** The plane itself: a driveable surface, with the keys it answers to stated up front. */
export function planeAria(spec: Extract<AnswerSpec, { kind: 'place_points' }>): Aria {
  return {
    role: 'application',
    'aria-label': spec.prompt ?? (spec.space === 'line' ? 'number line' : 'coordinate plane'),
    'aria-description':
      'arrow keys move the crosshair, enter drops a point, backspace lifts the last one',
    'aria-keyshortcuts': 'Enter Backspace',
  };
}

/** A point the learner has already dropped, labelled with where it is. */
export function pointAria(
  spec: Extract<AnswerSpec, { kind: 'place_points' }>,
  at: readonly [number, number],
  index: number,
  total: number,
): Aria {
  return {
    role: 'button',
    'aria-label': `point at ${speakPoint(at, spec.space === 'line')}`,
    'aria-posinset': index + 1,
    'aria-setsize': total,
  };
}

// --- Slider --------------------------------------------------------------------------------------------

/** The one place an ARIA role maps exactly onto the control, so it is used exactly. */
export function sliderAria(
  spec: Extract<AnswerSpec, { kind: 'slider' }>,
  state: AnswerStateOf<'slider'>,
): Aria {
  const value = sliderShown(spec, state);
  const text = spec.unit
    ? `${speakNumber(value, spec.precision)} ${spec.unit}`
    : speakNumber(value, spec.precision);
  return {
    role: 'slider',
    'aria-label': spec.prompt ?? 'value',
    'aria-valuemin': spec.min,
    'aria-valuemax': spec.max,
    'aria-valuenow': value,
    'aria-valuetext': text,
    'aria-orientation': 'horizontal',
  };
}

// --- Order ---------------------------------------------------------------------------------------------

/** The list of cards. */
export function orderListAria(spec: Extract<AnswerSpec, { kind: 'order' }>): Aria {
  return {
    role: 'listbox',
    'aria-label': spec.prompt ?? 'put these in order',
    'aria-orientation': spec.axis === 'horizontal' ? 'horizontal' : 'vertical',
    'aria-description': 'hold alt and press an arrow key to move the focused card',
    'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown',
  };
}

/** One card, with its place in the sequence spoken as part of its name. */
export function orderItemAria(label: string, index: number, total: number, focused: boolean): Aria {
  return {
    role: 'option',
    'aria-label': `${label}, position ${index + 1} of ${total}`,
    'aria-selected': focused,
    'aria-posinset': index + 1,
    'aria-setsize': total,
  };
}

// --- Match ---------------------------------------------------------------------------------------------

/** A left-hand item: pressed while it is picked up, and labelled with whatever it is joined to. */
export function matchLeftAria(
  spec: Extract<AnswerSpec, { kind: 'match' }>,
  state: AnswerStateOf<'match'>,
  id: string,
  label: string,
  picked: string | null,
): Aria {
  const joined = linkOf(state, id);
  const to = spec.right.find((r) => r.id === joined)?.label;
  return {
    role: 'button',
    'aria-pressed': picked === id,
    'aria-label': to ? `${label}, joined to ${to}` : `${label}, not joined`,
  };
}

/** A right-hand item: a landing place for whatever is currently picked up. */
export function matchRightAria(label: string, picked: string | null): Aria {
  return {
    role: 'button',
    'aria-label': picked ? `join to ${label}` : label,
    'aria-disabled': picked === null ? true : undefined,
  };
}

// --- Number pad ----------------------------------------------------------------------------------------

const PAD_NAMES: Record<string, string> = {
  '-': 'minus',
  '.': 'decimal point',
  '/': 'fraction bar',
  back: 'delete the last digit',
  clear: 'clear',
};

/** A pad key. Its face is a glyph; its name is a word. */
export function padKeyAria(key: string): Aria {
  return { role: 'button', 'aria-label': PAD_NAMES[key] ?? key };
}

/** The display. A live region, so a typed digit is heard as it lands. */
export function padDisplayAria(
  spec: Extract<AnswerSpec, { kind: 'number_pad' }>,
  state: AnswerStateOf<'number_pad'>,
): Aria {
  const spoken = state.entry
    .replace('-', 'minus ')
    .replace('/', ' over ')
    .replace('.', ' point ')
    .trim();
  return {
    role: 'status',
    'aria-label': `your answer: ${spoken || 'empty'}${spec.unit ? ` ${spec.unit}` : ''}`,
  };
}

// --- Expression ----------------------------------------------------------------------------------------

const EXPRESSION_NAMES: Record<string, string> = {
  fraction: 'fraction',
  power: 'power',
  root: 'square root',
  pi: 'pi',
  sin: 'sine',
  cos: 'cosine',
  tan: 'tangent',
  times: 'times',
  divide: 'divided by',
  plus: 'plus',
  minus: 'minus',
  equals: 'equals',
  paren: 'open bracket',
  variable: 'letter',
};

/** One key of the maths keyboard. */
export function expressionKeyAria(key: string): Aria {
  return { role: 'button', 'aria-label': EXPRESSION_NAMES[key] ?? key };
}

// --- Draw and lasso -------------------------------------------------------------------------------------

/** The board a learner draws on. */
export function drawAria(spec: Extract<AnswerSpec, { kind: 'draw' }>): Aria {
  const what =
    spec.want.shape === 'segment' ? 'a line' : spec.want.shape === 'angle' ? 'an angle' : 'a shape';
  return {
    role: 'application',
    'aria-label': spec.prompt ?? `draw ${what}`,
    'aria-description': 'drag to draw, or tab to an end point and move it with the arrow keys',
  };
}

/** A part of a figure that can be circled — a checkbox, so the keyboard path is a real one. */
export function lassoPartAria(label: string, enclosed: boolean): Aria {
  return { role: 'checkbox', 'aria-checked': enclosed, 'aria-label': label };
}

// --- Choose among visuals --------------------------------------------------------------------------------

/** One drawn option. Radio when there is one answer, checkbox when there are several. */
export function visualOptionAria(
  spec: Extract<AnswerSpec, { kind: 'choose_visual' }>,
  state: AnswerStateOf<'choose_visual'>,
  id: string,
  label: string,
): Aria {
  return {
    role: spec.multi ? 'checkbox' : 'radio',
    'aria-checked': state.selected.includes(id),
    'aria-label': label,
  };
}

/** The set of options. */
export function visualGroupAria(spec: Extract<AnswerSpec, { kind: 'choose_visual' }>): Aria {
  return {
    role: spec.multi ? 'group' : 'radiogroup',
    'aria-label': spec.prompt ?? 'choose one',
    ...(spec.multi ? { 'aria-multiselectable': true } : {}),
  };
}

// --- The state, in words ----------------------------------------------------------------------------------

/**
 * What the control currently says, factually. This is what a live region announces after every
 * move, and it is deliberately never a judgement — nothing here knows whether the answer is right.
 */
export function stateReadout(spec: AnswerSpec, state: AnswerState): string {
  if (spec.kind !== state.kind) return 'nothing yet';
  switch (state.kind) {
    case 'shade_regions':
      return spec.kind === 'shade_regions'
        ? `${state.shaded.length} of ${partCount(spec.figure)} parts shaded`
        : '';
    case 'place_points':
      return state.points.length === 0
        ? 'no points placed'
        : state.points
            .map((p) => speakPoint(p, spec.kind === 'place_points' && spec.space === 'line'))
            .join('; ');
    case 'slider':
      return spec.kind === 'slider' ? (sliderAria(spec, state)['aria-valuetext'] ?? '') : '';
    case 'order':
      return state.order.length === 0 ? 'no cards' : `${state.order.length} cards in order`;
    case 'match':
      return `${state.links.length} joined`;
    case 'number_pad':
      return state.entry === '' ? 'empty' : state.entry;
    case 'expression':
      return state.latex === '' ? 'empty' : state.latex;
    case 'draw':
      return state.path.length === 0 ? 'nothing drawn' : `${state.path.length} points drawn`;
    case 'circle_part':
      return state.lasso.length === 0 ? 'nothing circled' : 'a loop is drawn';
    case 'choose_visual':
      return state.selected.length === 0 ? 'nothing chosen' : `${state.selected.length} chosen`;
  }
}
