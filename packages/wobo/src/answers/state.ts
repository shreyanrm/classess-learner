/**
 * Every legal move a learner can make, as a pure function of the state before it.
 *
 * The pointer path and the keyboard path both come through here, which is the point: a drag and an
 * arrow key produce the SAME state, so `check` has one thing to read and a screen-reader user and
 * a stylus user are answering the same question. Nothing in this file touches an event object.
 */

import type { AnswerPoint, AnswerSpec, AnswerState, AnswerStateOf } from '@wobo/contracts';
import { boxCenter, clamp, hullOf, insideLoop, partCount, settle } from './geometry';
import { EXPRESSION_HOLE, expressionIsBlank, pressPadKey } from './value';

/**
 * The state a kind starts in, and the state "start over" returns to. One definition, so a reset is
 * genuinely the beginning and never a half-cleared control.
 */
export function resetState(spec: AnswerSpec): AnswerState {
  switch (spec.kind) {
    case 'shade_regions':
      return { kind: 'shade_regions', shaded: [] };
    case 'place_points':
      return { kind: 'place_points', points: [] };
    case 'slider':
      return { kind: 'slider', value: null };
    case 'order':
      // The cards start in the order the spec lists them, which is deliberately not the answer.
      return { kind: 'order', order: spec.items.map((i) => i.id) };
    case 'match':
      return { kind: 'match', links: [] };
    case 'number_pad':
      return { kind: 'number_pad', entry: '' };
    case 'expression':
      return { kind: 'expression', latex: '' };
    case 'draw':
      return { kind: 'draw', path: [] };
    case 'circle_part':
      return { kind: 'circle_part', lasso: [] };
    case 'choose_visual':
      return { kind: 'choose_visual', selected: [] };
  }
}

/** True when nothing has been done yet — what greys out "start over" and "check". */
export function isEmptyState(spec: AnswerSpec, state: AnswerState): boolean {
  if (spec.kind !== state.kind) return true;
  switch (state.kind) {
    case 'shade_regions':
      return state.shaded.length === 0;
    case 'place_points':
      return state.points.length === 0;
    case 'slider':
      return state.value === null;
    case 'order':
      return spec.kind === 'order' && state.order.every((id, i) => spec.items[i]?.id === id);
    case 'match':
      return state.links.length === 0;
    case 'number_pad':
      return state.entry === '';
    case 'expression':
      return expressionIsBlank(state.latex);
    case 'draw':
      return state.path.length === 0;
    case 'circle_part':
      return state.lasso.length === 0;
    case 'choose_visual':
      return state.selected.length === 0;
  }
}

// --- Shade regions ----------------------------------------------------------------------------------

/** Tap a part on, tap it off. Out-of-range indices are ignored rather than stored. */
export function toggleShade(
  spec: Extract<AnswerSpec, { kind: 'shade_regions' }>,
  state: AnswerStateOf<'shade_regions'>,
  index: number,
): AnswerStateOf<'shade_regions'> {
  if (index < 0 || index >= partCount(spec.figure)) return state;
  const on = state.shaded.includes(index);
  // Shading order is kept: it is what tells the checker which parts were the surplus ones.
  return {
    kind: 'shade_regions',
    shaded: on ? state.shaded.filter((i) => i !== index) : [...state.shaded, index],
  };
}

// --- Place points -----------------------------------------------------------------------------------

type PlaceSpec = Extract<AnswerSpec, { kind: 'place_points' }>;

/** How many points this item lets the learner drop. */
export function pointBudget(spec: PlaceSpec): number {
  return spec.maxPoints ?? spec.targets.length;
}

/** Snap a raw axis coordinate onto the item's grid and inside its extent. */
export function settlePoint(spec: PlaceSpec, at: AnswerPoint): AnswerPoint {
  const x = settle(at[0], spec.min[0], spec.max[0], spec.step[0]);
  const y = spec.space === 'line' ? 0 : settle(at[1], spec.min[1], spec.max[1], spec.step[1]);
  return [x, y];
}

/** Drop a point. At the budget the oldest point makes way, so the control is never stuck. */
export function addPoint(
  spec: PlaceSpec,
  state: AnswerStateOf<'place_points'>,
  at: AnswerPoint,
): AnswerStateOf<'place_points'> {
  const next = [...state.points, settlePoint(spec, at)];
  const budget = pointBudget(spec);
  return { kind: 'place_points', points: next.slice(Math.max(0, next.length - budget)) };
}

/** Drag one point somewhere else. */
export function movePoint(
  spec: PlaceSpec,
  state: AnswerStateOf<'place_points'>,
  index: number,
  at: AnswerPoint,
): AnswerStateOf<'place_points'> {
  if (index < 0 || index >= state.points.length) return state;
  const points = state.points.slice();
  points[index] = settlePoint(spec, at);
  return { kind: 'place_points', points };
}

/** Take a point back off. */
export function removePoint(
  state: AnswerStateOf<'place_points'>,
  index: number,
): AnswerStateOf<'place_points'> {
  if (index < 0 || index >= state.points.length) return state;
  return { kind: 'place_points', points: state.points.filter((_, i) => i !== index) };
}

// --- Slider -----------------------------------------------------------------------------------------

type SliderSpecT = Extract<AnswerSpec, { kind: 'slider' }>;

/** Where the thumb sits before the learner has touched it. */
export function sliderStart(spec: SliderSpecT): number {
  return spec.start ?? (spec.min + spec.max) / 2;
}

/** The value the thumb is drawn at, whether or not the learner has moved it yet. */
export function sliderShown(spec: SliderSpecT, state: AnswerStateOf<'slider'>): number {
  return state.value ?? sliderStart(spec);
}

/** Move the thumb. Snapping and clamping happen once, here, for pointer and key alike. */
export function setSlider(spec: SliderSpecT, value: number): AnswerStateOf<'slider'> {
  return { kind: 'slider', value: settle(value, spec.min, spec.max, spec.step ?? 0) };
}

/** One arrow key's worth of movement: a step, or a hundredth of the range when continuous. */
export function sliderNudge(spec: SliderSpecT): number {
  return spec.step && spec.step > 0 ? spec.step : Math.abs(spec.max - spec.min) / 100 || 1;
}

// --- Order ------------------------------------------------------------------------------------------

/** Move the card at `from` to sit at `to`, closing the gap behind it. */
export function moveCard(
  state: AnswerStateOf<'order'>,
  from: number,
  to: number,
): AnswerStateOf<'order'> {
  const n = state.order.length;
  if (from < 0 || from >= n) return state;
  const target = clamp(to, 0, n - 1);
  if (target === from) return state;
  const order = state.order.slice();
  const [card] = order.splice(from, 1);
  if (card === undefined) return state;
  order.splice(target, 0, card);
  return { kind: 'order', order };
}

// --- Match ------------------------------------------------------------------------------------------

type MatchSpecT = Extract<AnswerSpec, { kind: 'match' }>;

/**
 * Draw or undo one connector. A left item holds one link at a time — linking it again moves the
 * connector rather than stacking a second one, which is what a learner expects from a line.
 */
export function toggleLink(
  _spec: MatchSpecT,
  state: AnswerStateOf<'match'>,
  left: string,
  right: string,
): AnswerStateOf<'match'> {
  const existing = state.links.find((l) => l.left === left);
  if (existing && existing.right === right) {
    return { kind: 'match', links: state.links.filter((l) => l.left !== left) };
  }
  return { kind: 'match', links: [...state.links.filter((l) => l.left !== left), { left, right }] };
}

/** What this left item is currently joined to, if anything. */
export function linkOf(state: AnswerStateOf<'match'>, left: string): string | null {
  return state.links.find((l) => l.left === left)?.right ?? null;
}

// --- Number pad ---------------------------------------------------------------------------------------

/** One key on the pad. Illegal presses are no-ops, never a mangled display (see `value.ts`). */
export function pressPad(
  state: AnswerStateOf<'number_pad'>,
  key: string,
): AnswerStateOf<'number_pad'> {
  return { kind: 'number_pad', entry: pressPadKey(state.entry, key) };
}

// --- Expression ----------------------------------------------------------------------------------------

/** The literal each expression key writes. Structures carry their own holes. */
const EXPRESSION_SNIPPET: Record<string, string> = {
  fraction: `\\frac{${EXPRESSION_HOLE}}{${EXPRESSION_HOLE}}`,
  power: `^{${EXPRESSION_HOLE}}`,
  root: `\\sqrt{${EXPRESSION_HOLE}}`,
  pi: '\\pi',
  sin: '\\sin(',
  cos: '\\cos(',
  tan: '\\tan(',
  times: '\\times',
  divide: '\\div',
  plus: '+',
  minus: '-',
  equals: '=',
  paren: '(',
};

/** True when this key builds a structure around what came before it. */
const WRAPS_PREVIOUS = new Set(['fraction', 'power', 'root']);

/**
 * The last thing that was pressed, as one token — what a backspace takes away.
 *
 * A trailing `{...}` is walked back over ALL of its command's arguments, so `\frac{1}{2}` is one
 * token and not the `{2}` a naive scan would have found. A group behind a `^` or a `_` takes the
 * marker with it, so undoing a power leaves the base standing.
 */
function lastToken(latex: string): string {
  if (latex.endsWith(EXPRESSION_HOLE)) return EXPRESSION_HOLE;
  if (latex.endsWith('}')) {
    let i = latex.length;
    while (i > 0 && latex[i - 1] === '}') {
      let depth = 0;
      let j = i - 1;
      for (; j >= 0; j--) {
        const ch = latex[j];
        if (ch === '}') depth += 1;
        else if (ch === '{') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      if (j < 0) return latex;
      i = j;
      const head = /\\[a-zA-Z]+$/.exec(latex.slice(0, i));
      if (head) return latex.slice(i - head[0].length);
    }
    const mark = latex[i - 1];
    return mark === '^' || mark === '_' ? latex.slice(i - 1) : latex.slice(i);
  }
  const run = /(\d|[A-Za-z]|\\[a-zA-Z]+)$/.exec(latex);
  return run ? run[0] : '';
}

/**
 * The whole trailing atom — what a fraction, a power or a root WRAPS.
 *
 * Wider than `lastToken` on purpose: `12` then a fraction gives twelve over a hole, not two over a
 * hole, and `3^{2}` then a root goes under the radical complete with its power.
 */
function trailingAtom(latex: string): string {
  if (latex.endsWith('}') || latex.endsWith(EXPRESSION_HOLE)) {
    const token = lastToken(latex);
    if (token.startsWith('^') || token.startsWith('_')) {
      return trailingAtom(latex.slice(0, latex.length - token.length)) + token;
    }
    return token;
  }
  const run = /(\d+(?:\.\d+)?|[A-Za-z]|\\[a-zA-Z]+)$/.exec(latex);
  return run ? run[0] : '';
}

/**
 * Press one key of the maths keyboard.
 *
 * Two rules, and they are the two a learner already knows from paper: input lands in the first
 * empty hole if there is one, and a fraction, power or root pressed after an atom WRAPS that atom
 * rather than starting a fresh empty one. So `3` then fraction gives three over a hole, and
 * fraction on an empty line gives a hole over a hole.
 */
export function pressExpression(
  state: AnswerStateOf<'expression'>,
  key: string,
): AnswerStateOf<'expression'> {
  const latex = state.latex;
  if (key === 'clear') return { kind: 'expression', latex: '' };
  if (key === 'back') return { kind: 'expression', latex: backExpression(latex) };
  const snippet = EXPRESSION_SNIPPET[key] ?? key;
  if (snippet.length === 0) return state;

  const hole = latex.indexOf(EXPRESSION_HOLE);
  if (hole >= 0) {
    return {
      kind: 'expression',
      latex: latex.slice(0, hole) + snippet + latex.slice(hole + EXPRESSION_HOLE.length),
    };
  }

  if (WRAPS_PREVIOUS.has(key)) {
    const atom = trailingAtom(latex);
    if (atom) {
      const head = latex.slice(0, latex.length - atom.length);
      const wrapped =
        key === 'fraction'
          ? `\\frac{${atom}}{${EXPRESSION_HOLE}}`
          : key === 'root'
            ? `\\sqrt{${atom}}`
            : `${atom}^{${EXPRESSION_HOLE}}`;
      return { kind: 'expression', latex: head + wrapped };
    }
  }
  return { kind: 'expression', latex: latex + snippet };
}

/** Undo the last press: a whole structure if the line ends in one, otherwise one character. */
export function backExpression(latex: string): string {
  if (latex === '') return latex;
  const token = lastToken(latex);
  return token ? latex.slice(0, latex.length - token.length) : latex.slice(0, -1);
}

/** The preview string: holes become the hollow box the hand already draws for a glyph it lacks. */
export function previewTex(latex: string): string {
  return latex.replaceAll(EXPRESSION_HOLE, '▢');
}

// --- Draw and lasso ------------------------------------------------------------------------------------

/** Extend the stroke the learner is drawing. */
export function extendPath(state: AnswerStateOf<'draw'>, at: AnswerPoint): AnswerStateOf<'draw'> {
  return { kind: 'draw', path: [...state.path, at] };
}

/** Replace the stroke outright — a fresh drag, or a keyboard-built figure. */
export function setPath(path: AnswerPoint[]): AnswerStateOf<'draw'> {
  return { kind: 'draw', path };
}

/**
 * The figure a keyboard starts from. Drawing is a pointer gesture, so a learner without one is
 * handed a figure of the right SHAPE in the middle of the board and moves its vertices with the
 * arrows — the answer is still theirs to get right, and the state is identical to a drawn one.
 */
export function seedPath(spec: Extract<AnswerSpec, { kind: 'draw' }>): AnswerPoint[] {
  const [x, y, w, h] = spec.view ?? [0, 0, 1000, 600];
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (spec.want.shape === 'segment') {
    return [
      [x + w * 0.3, cy],
      [x + w * 0.7, cy],
    ];
  }
  if (spec.want.shape === 'angle') {
    return [
      [cx + w * 0.2, cy],
      [cx, cy],
      [cx, cy - h * 0.3],
    ];
  }
  const n = spec.want.points.length;
  const r = Math.min(w, h) * 0.3;
  return Array.from({ length: n }, (_, i): AnswerPoint => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

/** Extend the lasso. */
export function extendLasso(
  state: AnswerStateOf<'circle_part'>,
  at: AnswerPoint,
): AnswerStateOf<'circle_part'> {
  return { kind: 'circle_part', lasso: [...state.lasso, at] };
}

type CircleSpecT = Extract<AnswerSpec, { kind: 'circle_part' }>;

/**
 * The keyboard's lasso. A learner who cannot draw a loop names the parts instead, and the hull of
 * those parts becomes the same loop a pointer would have drawn — so `check` reads one shape, and
 * the two paths cannot disagree about what "circled" means.
 */
export function lassoParts(
  spec: CircleSpecT,
  ids: readonly string[],
): AnswerStateOf<'circle_part'> {
  const boxes = spec.parts.filter((p) => ids.includes(p.id)).map((p) => p.box);
  if (boxes.length === 0) return { kind: 'circle_part', lasso: [] };
  // A single part's own box is already a loop; two or more need the hull that contains them all.
  const grown = boxes.map(([x, y, w, h]): [number, number, number, number] => [
    x - w * 0.15,
    y - h * 0.15,
    w * 1.3,
    h * 1.3,
  ]);
  // Closed explicitly: `check` reads a lasso as a loop, and an open hull is a line to it.
  const hull = hullOf(grown);
  const first = hull[0];
  return { kind: 'circle_part', lasso: first ? [...hull, first] : hull };
}

/** Which parts a lasso currently encloses — what the keyboard path reads back to stay in sync. */
export function lassoed(spec: CircleSpecT, state: AnswerStateOf<'circle_part'>): string[] {
  if (state.lasso.length < 3) return [];
  return spec.parts.filter((p) => insideLoop(boxCenter(p.box), state.lasso)).map((p) => p.id);
}

// --- Choose among visuals ------------------------------------------------------------------------------

type ChooseSpecT = Extract<AnswerSpec, { kind: 'choose_visual' }>;

/** Pick an option. Single-answer items replace the pick; multi-answer items toggle it. */
export function toggleOption(
  spec: ChooseSpecT,
  state: AnswerStateOf<'choose_visual'>,
  id: string,
): AnswerStateOf<'choose_visual'> {
  if (!spec.options.some((o) => o.id === id)) return state;
  if (!spec.multi) {
    return { kind: 'choose_visual', selected: state.selected.includes(id) ? [] : [id] };
  }
  return {
    kind: 'choose_visual',
    selected: state.selected.includes(id)
      ? state.selected.filter((x) => x !== id)
      : [...state.selected, id],
  };
}
