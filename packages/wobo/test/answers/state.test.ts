import { describe, expect, it } from 'bun:test';
import { AnswerState } from '@wobo/contracts';
import { check } from '../../src/answers/check';
import {
  CHOOSE_HALF,
  CIRCLE_CELL,
  DRAW_ANGLE,
  DRAW_SEGMENT,
  DRAW_TRIANGLE,
  MATCH_UNITS,
  ORDER_STEPS,
  PLACE_LINE,
  PLACE_PLANE,
  SAMPLE_SPECS,
  SHADE_HALF,
  SLIDER_ANGLE,
} from '../../src/answers/samples';
import {
  addPoint,
  backExpression,
  extendLasso,
  isEmptyState,
  lassoed,
  lassoParts,
  linkOf,
  moveCard,
  movePoint,
  pointBudget,
  pressExpression,
  pressPad,
  previewTex,
  removePoint,
  resetState,
  seedPath,
  setSlider,
  settlePoint,
  sliderNudge,
  sliderShown,
  sliderStart,
  toggleLink,
  toggleOption,
  toggleShade,
} from '../../src/answers/state';
import { EXPRESSION_HOLE } from '../../src/answers/value';

describe('start over', () => {
  it('returns every kind to a state the contract accepts', () => {
    for (const spec of SAMPLE_SPECS) {
      const empty = resetState(spec);
      expect(empty.kind).toBe(spec.kind);
      expect(AnswerState.safeParse(empty).success).toBe(true);
      expect(isEmptyState(spec, empty)).toBe(true);
    }
  });

  it('puts the order cards back in the spec’s own sequence, not in the answer', () => {
    const empty = resetState(ORDER_STEPS);
    expect(empty).toEqual({ kind: 'order', order: ['divide', 'subtract', 'check'] });
    expect(check(ORDER_STEPS, empty).correct).toBe(false);
  });

  it('is not empty once something has been done', () => {
    expect(isEmptyState(SHADE_HALF, { kind: 'shade_regions', shaded: [1] })).toBe(false);
    expect(isEmptyState(SLIDER_ANGLE, { kind: 'slider', value: 0 })).toBe(false);
    expect(
      isEmptyState(ORDER_STEPS, { kind: 'order', order: ['check', 'divide', 'subtract'] }),
    ).toBe(false);
  });

  it('treats a mismatched pair as empty rather than reading the wrong fields', () => {
    expect(isEmptyState(SHADE_HALF, { kind: 'slider', value: 4 })).toBe(true);
  });
});

describe('shading', () => {
  it('toggles a part on and back off', () => {
    const on = toggleShade(SHADE_HALF, resetState(SHADE_HALF) as never, 2);
    expect(on.shaded).toEqual([2]);
    expect(toggleShade(SHADE_HALF, on, 2).shaded).toEqual([]);
  });

  it('keeps the order parts were shaded in — it is what names the surplus', () => {
    let state = { kind: 'shade_regions', shaded: [] } as ReturnType<typeof toggleShade>;
    for (const i of [3, 1, 2]) state = toggleShade(SHADE_HALF, state, i);
    expect(state.shaded).toEqual([3, 1, 2]);
  });

  it('ignores a part the figure does not have', () => {
    const state = { kind: 'shade_regions' as const, shaded: [] };
    expect(toggleShade(SHADE_HALF, state, 99)).toBe(state);
    expect(toggleShade(SHADE_HALF, state, -1)).toBe(state);
  });
});

describe('placing points', () => {
  it('snaps a dropped point onto the item’s own grid', () => {
    expect(settlePoint(PLACE_PLANE, [2.4, -1.6])).toEqual([2, -2]);
    expect(settlePoint(PLACE_LINE, [0.71, 9])).toEqual([0.75, 0]);
  });

  it('clamps a point dragged past the axis', () => {
    expect(settlePoint(PLACE_PLANE, [99, -99])).toEqual([5, -5]);
  });

  it('drops points up to the budget, then the oldest makes way', () => {
    expect(pointBudget(PLACE_PLANE)).toBe(2);
    let state = resetState(PLACE_PLANE) as ReturnType<typeof addPoint>;
    state = addPoint(PLACE_PLANE, state, [1, 1]);
    state = addPoint(PLACE_PLANE, state, [2, 2]);
    state = addPoint(PLACE_PLANE, state, [3, 3]);
    expect(state.points).toEqual([
      [2, 2],
      [3, 3],
    ]);
  });

  it('moves and removes by index, and ignores an index it does not have', () => {
    const state = {
      kind: 'place_points' as const,
      points: [
        [1, 1],
        [2, 2],
      ] as [number, number][],
    };
    expect(movePoint(PLACE_PLANE, state, 0, [4, 4]).points[0]).toEqual([4, 4]);
    expect(removePoint(state, 1).points).toEqual([[1, 1]]);
    expect(movePoint(PLACE_PLANE, state, 9, [4, 4])).toBe(state);
    expect(removePoint(state, 9)).toBe(state);
  });
});

describe('the slider', () => {
  it('rests at the midpoint until it is touched', () => {
    expect(sliderStart(SLIDER_ANGLE)).toBe(90);
    expect(sliderShown(SLIDER_ANGLE, { kind: 'slider', value: null })).toBe(90);
    expect(sliderShown(SLIDER_ANGLE, { kind: 'slider', value: 30 })).toBe(30);
  });

  it('snaps and clamps in one place, for pointer and key alike', () => {
    expect(setSlider(SLIDER_ANGLE, 92).value).toBe(90);
    expect(setSlider(SLIDER_ANGLE, 1000).value).toBe(180);
    expect(setSlider(SLIDER_ANGLE, -1000).value).toBe(0);
  });

  it('nudges by a step, or by a hundredth of the range when continuous', () => {
    expect(sliderNudge(SLIDER_ANGLE)).toBe(5);
    expect(sliderNudge({ ...SLIDER_ANGLE, step: undefined })).toBeCloseTo(1.8, 9);
  });
});

describe('ordering', () => {
  const start = resetState(ORDER_STEPS) as { kind: 'order'; order: string[] };

  it('carries a card past its neighbour and closes the gap behind it', () => {
    expect(moveCard(start, 1, 0).order).toEqual(['subtract', 'divide', 'check']);
    expect(moveCard(start, 0, 2).order).toEqual(['subtract', 'check', 'divide']);
  });

  it('clamps a move at the ends and does nothing when it would not move', () => {
    expect(moveCard(start, 0, -5).order).toEqual(start.order);
    expect(moveCard(start, 0, 0)).toBe(start);
    expect(moveCard(start, 9, 0)).toBe(start);
  });
});

describe('matching', () => {
  const empty = resetState(MATCH_UNITS) as { kind: 'match'; links: never[] };

  it('gives a left item one connector, and moves it rather than stacking a second', () => {
    const first = toggleLink(MATCH_UNITS, empty, 'mass', 'joule');
    const moved = toggleLink(MATCH_UNITS, first, 'mass', 'kilogram');
    expect(moved.links).toEqual([{ left: 'mass', right: 'kilogram' }]);
    expect(linkOf(moved, 'mass')).toBe('kilogram');
  });

  it('undoes a connector when the same pair is joined again', () => {
    const joined = toggleLink(MATCH_UNITS, empty, 'mass', 'kilogram');
    expect(toggleLink(MATCH_UNITS, joined, 'mass', 'kilogram').links).toEqual([]);
    expect(linkOf(empty, 'mass')).toBeNull();
  });
});

describe('the number pad', () => {
  it('builds a decimal and a fraction, and refuses the presses that would break them', () => {
    const start = { kind: 'number_pad' as const, entry: '' };
    expect(pressPad(start, '.').entry).toBe('');
    expect(pressPad({ kind: 'number_pad', entry: '3' }, '.').entry).toBe('3.');
    expect(pressPad({ kind: 'number_pad', entry: '3.5' }, '.').entry).toBe('3.5');
    expect(pressPad({ kind: 'number_pad', entry: '3.5' }, '/').entry).toBe('3.5');
    expect(pressPad({ kind: 'number_pad', entry: '3' }, '/').entry).toBe('3/');
    expect(pressPad({ kind: 'number_pad', entry: '3/4' }, '/').entry).toBe('3/4');
  });

  it('toggles the minus rather than stacking it', () => {
    expect(pressPad({ kind: 'number_pad', entry: '5' }, '-').entry).toBe('-5');
    expect(pressPad({ kind: 'number_pad', entry: '-5' }, '-').entry).toBe('5');
  });

  it('backs off one character and clears outright', () => {
    expect(pressPad({ kind: 'number_pad', entry: '3/4' }, 'back').entry).toBe('3/');
    expect(pressPad({ kind: 'number_pad', entry: '3/4' }, 'clear').entry).toBe('');
  });
});

describe('the expression keyboard', () => {
  const empty = { kind: 'expression' as const, latex: '' };

  it('opens a structure with holes when there is nothing to wrap', () => {
    expect(pressExpression(empty, 'fraction').latex).toBe(
      `\\frac{${EXPRESSION_HOLE}}{${EXPRESSION_HOLE}}`,
    );
  });

  it('fills the first hole, then the next', () => {
    let state = pressExpression(empty, 'fraction');
    state = pressExpression(state, '1');
    expect(state.latex).toBe(`\\frac{1}{${EXPRESSION_HOLE}}`);
    state = pressExpression(state, '2');
    expect(state.latex).toBe('\\frac{1}{2}');
  });

  it('wraps the atom already written, the way a hand does on paper', () => {
    const three = pressExpression(empty, '3');
    expect(pressExpression(three, 'fraction').latex).toBe(`\\frac{3}{${EXPRESSION_HOLE}}`);
    expect(pressExpression(three, 'power').latex).toBe(`3^{${EXPRESSION_HOLE}}`);
    expect(pressExpression(three, 'root').latex).toBe('\\sqrt{3}');
  });

  it('wraps a whole group, not just its last character', () => {
    const half = pressExpression(pressExpression(pressExpression(empty, 'fraction'), '1'), '2');
    expect(pressExpression(half, 'root').latex).toBe('\\sqrt{\\frac{1}{2}}');
  });

  it('writes pi and the trig functions as commands, never as loose letters', () => {
    expect(pressExpression(empty, 'pi').latex).toBe('\\pi');
    expect(pressExpression(empty, 'sin').latex).toBe('\\sin(');
  });

  it('undoes a whole structure, or one character', () => {
    expect(backExpression('\\frac{1}{2}')).toBe('');
    expect(backExpression('12')).toBe('1');
    expect(backExpression(`3^{${EXPRESSION_HOLE}}`)).toBe('3');
    expect(backExpression('')).toBe('');
    expect(pressExpression({ kind: 'expression', latex: '12' }, 'clear').latex).toBe('');
  });

  it('previews a hole as the hollow box the hand already draws for an unknown glyph', () => {
    expect(previewTex(`\\frac{1}{${EXPRESSION_HOLE}}`)).toBe('\\frac{1}{▢}');
  });

  it('counts an expression that is only holes as still empty', () => {
    const spec = SAMPLE_SPECS.find((s) => s.kind === 'expression');
    if (!spec) throw new Error('no expression sample');
    expect(isEmptyState(spec, pressExpression(empty, 'fraction'))).toBe(true);
  });
});

describe('drawing and lassoing', () => {
  it('seeds a figure of the right shape for a learner with no pointer', () => {
    expect(seedPath(DRAW_SEGMENT)).toHaveLength(2);
    expect(seedPath(DRAW_ANGLE)).toHaveLength(3);
    expect(seedPath(DRAW_TRIANGLE)).toHaveLength(3);
    // The seed is a starting point, not the answer.
    expect(check(DRAW_SEGMENT, { kind: 'draw', path: seedPath(DRAW_SEGMENT) }).correct).toBe(false);
  });

  it('builds the same loop from the keyboard that a pointer would have drawn', () => {
    const state = lassoParts(CIRCLE_CELL, ['nucleus']);
    expect(lassoed(CIRCLE_CELL, state)).toEqual(['nucleus']);
    expect(check(CIRCLE_CELL, state).correct).toBe(true);
  });

  it('an empty selection is an empty lasso', () => {
    expect(lassoParts(CIRCLE_CELL, []).lasso).toEqual([]);
    expect(lassoed(CIRCLE_CELL, { kind: 'circle_part', lasso: [] })).toEqual([]);
  });

  it('extends a lasso point by point as a finger moves', () => {
    const one = extendLasso({ kind: 'circle_part', lasso: [] }, [1, 1]);
    expect(extendLasso(one, [2, 2]).lasso).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });
});

describe('choosing among visuals', () => {
  const empty = resetState(CHOOSE_HALF) as { kind: 'choose_visual'; selected: string[] };

  it('replaces the pick on a single-answer item', () => {
    const a = toggleOption(CHOOSE_HALF, empty, 'a');
    expect(toggleOption(CHOOSE_HALF, a, 'b').selected).toEqual(['b']);
    expect(toggleOption(CHOOSE_HALF, a, 'a').selected).toEqual([]);
  });

  it('accumulates on a multi-answer item', () => {
    const multi = { ...CHOOSE_HALF, multi: true };
    const a = toggleOption(multi, empty, 'a');
    expect(toggleOption(multi, a, 'b').selected).toEqual(['a', 'b']);
  });

  it('ignores an option the item does not have', () => {
    expect(toggleOption(CHOOSE_HALF, empty, 'nope')).toBe(empty);
  });
});
