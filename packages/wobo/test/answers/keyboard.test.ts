import { describe, expect, it } from 'bun:test';
import { check } from '../../src/answers/check';
import {
  axisNudge,
  dragPointKey,
  expressionKey,
  expressionKeyFor,
  figureColumns,
  isActivate,
  matchKey,
  moveCursor,
  nudgeVertex,
  orderKey,
  padKey,
  padKeyFor,
  placeKey,
  rove,
  shadeKey,
  sliderKey,
} from '../../src/answers/keyboard';
import {
  DRAW_SEGMENT,
  MATCH_UNITS,
  ORDER_STEPS,
  PLACE_LINE,
  PLACE_PLANE,
  SHADE_HALF,
  SHADE_PIE,
  SLIDER_ANGLE,
} from '../../src/answers/samples';
import { resetState } from '../../src/answers/state';

const press = (key: string, mods: Partial<Record<string, boolean>> = {}) => ({ key, ...mods });

describe('activation', () => {
  it('is Enter or Space, everywhere, as the platform taught the learner', () => {
    expect(isActivate(press('Enter'))).toBe(true);
    expect(isActivate(press(' '))).toBe(true);
    expect(isActivate(press('a'))).toBe(false);
  });
});

describe('roving focus', () => {
  it('walks a list and stops at both ends rather than wrapping', () => {
    expect(rove(4, 0, press('ArrowRight'))).toBe(1);
    expect(rove(4, 3, press('ArrowRight'))).toBe(3);
    expect(rove(4, 0, press('ArrowLeft'))).toBe(0);
    expect(rove(4, 1, press('Home'))).toBe(0);
    expect(rove(4, 1, press('End'))).toBe(3);
  });

  it('walks a grid by rows when it is told the width', () => {
    expect(rove(8, 0, press('ArrowDown'), 4)).toBe(4);
    expect(rove(8, 4, press('ArrowUp'), 4)).toBe(0);
  });

  it('claims nothing it does not handle', () => {
    expect(rove(4, 0, press('a'))).toBeNull();
    expect(rove(0, 0, press('ArrowRight'))).toBeNull();
  });

  it('roves a grid figure by its columns and everything else in one row', () => {
    expect(figureColumns(SHADE_HALF)).toBe(4);
    expect(figureColumns(SHADE_PIE)).toBe(4);
  });
});

describe('shading by keyboard', () => {
  it('shades on Space and leaves the arrows to the caller', () => {
    const empty = resetState(SHADE_HALF) as never;
    expect(shadeKey(SHADE_HALF, empty, 2, press(' '))?.shaded).toEqual([2]);
    expect(shadeKey(SHADE_HALF, empty, 2, press('ArrowRight'))).toBeNull();
  });

  it('reaches the right answer with nothing but keys', () => {
    let state = resetState(SHADE_HALF) as never;
    for (const i of [0, 1, 2, 3]) {
      const next = shadeKey(SHADE_HALF, state, i, press('Enter'));
      if (next) state = next as never;
    }
    expect(check(SHADE_HALF, state).correct).toBe(true);
  });
});

describe('the crosshair on a plane', () => {
  it('moves by the axis step, and by ten of them with shift', () => {
    expect(axisNudge(-5, 5, 1)).toBe(1);
    expect(axisNudge(0, 1, 0)).toBeCloseTo(0.01, 9);
    expect(moveCursor(PLACE_PLANE, [0, 0], press('ArrowRight'))).toEqual([1, 0]);
    expect(moveCursor(PLACE_PLANE, [0, 0], press('ArrowRight', { shiftKey: true }))).toEqual([
      5, 0,
    ]);
  });

  it('grows y upwards, the way a plane does', () => {
    expect(moveCursor(PLACE_PLANE, [0, 0], press('ArrowUp'))).toEqual([0, 1]);
    expect(moveCursor(PLACE_PLANE, [0, 0], press('ArrowDown'))).toEqual([0, -1]);
  });

  it('has no second axis on a number line', () => {
    expect(moveCursor(PLACE_LINE, [0.5, 0], press('ArrowUp'))).toBeNull();
    expect(moveCursor(PLACE_LINE, [0.5, 0], press('ArrowRight'))).toEqual([0.75, 0]);
  });

  it('stops at the ends of the axis', () => {
    expect(moveCursor(PLACE_PLANE, [5, 0], press('ArrowRight'))).toEqual([5, 0]);
    expect(moveCursor(PLACE_PLANE, [0, 0], press('Home'))).toEqual([-5, 0]);
    expect(moveCursor(PLACE_PLANE, [0, 0], press('End'))).toEqual([5, 0]);
  });

  it('drops on Enter and lifts the last point on Backspace', () => {
    const empty = resetState(PLACE_PLANE) as never;
    const dropped = placeKey(PLACE_PLANE, empty, [2, 3], press('Enter'));
    expect(dropped?.points).toEqual([[2, 3]]);
    expect(placeKey(PLACE_PLANE, empty, [2, 3], press('Backspace'))).toBeNull();
    expect(dropped && placeKey(PLACE_PLANE, dropped, [0, 0], press('Delete'))?.points).toEqual([]);
  });

  it('answers a whole item with keys alone', () => {
    let state = resetState(PLACE_PLANE) as never;
    for (const at of [
      [2, 3],
      [-1, -2],
    ] as [number, number][]) {
      const next = placeKey(PLACE_PLANE, state, at, press('Enter'));
      if (next) state = next as never;
    }
    expect(check(PLACE_PLANE, state).correct).toBe(true);
  });

  it('drags a point that already has focus, rather than the crosshair', () => {
    const state = { kind: 'place_points' as const, points: [[1, 1]] as [number, number][] };
    expect(dragPointKey(PLACE_PLANE, state, 0, press('ArrowRight'))?.points).toEqual([[2, 1]]);
    expect(dragPointKey(PLACE_PLANE, state, 0, press('Delete'))?.points).toEqual([]);
    expect(dragPointKey(PLACE_PLANE, state, 4, press('ArrowRight'))).toBeNull();
  });
});

describe('the slider keyboard', () => {
  const start = resetState(SLIDER_ANGLE) as { kind: 'slider'; value: number | null };

  it('is the full ARIA slider contract', () => {
    expect(sliderKey(SLIDER_ANGLE, start, press('ArrowRight'))?.value).toBe(95);
    expect(sliderKey(SLIDER_ANGLE, start, press('ArrowUp'))?.value).toBe(95);
    expect(sliderKey(SLIDER_ANGLE, start, press('ArrowLeft'))?.value).toBe(85);
    expect(sliderKey(SLIDER_ANGLE, start, press('PageUp'))?.value).toBe(140);
    expect(sliderKey(SLIDER_ANGLE, start, press('PageDown'))?.value).toBe(40);
    expect(sliderKey(SLIDER_ANGLE, start, press('Home'))?.value).toBe(0);
    expect(sliderKey(SLIDER_ANGLE, start, press('End'))?.value).toBe(180);
    expect(sliderKey(SLIDER_ANGLE, start, press('a'))).toBeNull();
  });

  it('clamps at the ends rather than running past them', () => {
    const top = { kind: 'slider' as const, value: 180 };
    expect(sliderKey(SLIDER_ANGLE, top, press('PageUp'))?.value).toBe(180);
  });

  it('a first arrow press commits a value, so an untouched slider becomes a real answer', () => {
    expect(start.value).toBeNull();
    expect(sliderKey(SLIDER_ANGLE, start, press('ArrowLeft'))?.value).toBe(85);
  });
});

describe('carrying a card', () => {
  const start = resetState(ORDER_STEPS) as never;

  it('moves the focus on a bare arrow and the card with a modifier', () => {
    expect(orderKey(start, 0, press('ArrowDown'))).toEqual({ state: start, index: 1 });
    const carried = orderKey(start, 1, press('ArrowUp', { altKey: true }));
    expect(carried?.index).toBe(0);
    expect(carried?.state.order).toEqual(['subtract', 'divide', 'check']);
  });

  it('reaches the right answer with the keyboard alone', () => {
    const carried = orderKey(start, 1, press('ArrowUp', { altKey: true }));
    expect(carried && check(ORDER_STEPS, carried.state).correct).toBe(true);
  });

  it('takes the cross axis as a plain focus move', () => {
    expect(orderKey(start, 0, press('ArrowRight'))?.index).toBe(1);
    expect(orderKey(start, 0, press('a'))).toBeNull();
  });

  it('respects a horizontal row', () => {
    const spec = { ...ORDER_STEPS, axis: 'horizontal' as const };
    const carried = orderKey(start, 1, press('ArrowLeft', { ctrlKey: true }), spec.axis);
    expect(carried?.state.order).toEqual(['subtract', 'divide', 'check']);
  });
});

describe('matching by keyboard', () => {
  it('picks a left item up, joins on a right one, and puts it down on Escape', () => {
    const picked = matchKey(press('Enter'), null, { side: 'left', id: 'mass' });
    expect(picked).toEqual({ picked: 'mass', join: null });
    const joined = matchKey(press('Enter'), 'mass', { side: 'right', id: 'kilogram' });
    expect(joined).toEqual({ picked: null, join: { left: 'mass', right: 'kilogram' } });
    expect(matchKey(press('Escape'), 'mass', { side: 'left', id: 'mass' })).toEqual({
      picked: null,
      join: null,
    });
  });

  it('does nothing on a right item with nothing picked up', () => {
    expect(matchKey(press('Enter'), null, { side: 'right', id: 'joule' })).toBeNull();
    expect(matchKey(press('Escape'), null, { side: 'left', id: 'mass' })).toBeNull();
  });

  it('puts a left item back down when it is pressed twice', () => {
    expect(matchKey(press(' '), 'mass', { side: 'left', id: 'mass' })?.picked).toBeNull();
  });

  it('names a real pair from the item', () => {
    const joined = matchKey(press('Enter'), 'mass', { side: 'right', id: 'kilogram' });
    if (!joined?.join) throw new Error('a join should have been made');
    expect(MATCH_UNITS.want).toContainEqual(joined.join);
  });
});

describe('typing into the pad', () => {
  it('maps the physical keys a learner will actually press', () => {
    expect(padKeyFor(press('7'))).toBe('7');
    expect(padKeyFor(press('-'))).toBe('-');
    expect(padKeyFor(press('.'))).toBe('.');
    expect(padKeyFor(press('/'))).toBe('/');
    expect(padKeyFor(press('Backspace'))).toBe('back');
    expect(padKeyFor(press('Escape'))).toBe('clear');
    expect(padKeyFor(press('q'))).toBeNull();
  });

  it('claims the key even when the press changes nothing, so the browser does not act on it', () => {
    const state = { kind: 'number_pad' as const, entry: '' };
    expect(padKey(state, press('.'))).toBe(state);
    expect(padKey(state, press('q'))).toBeNull();
    expect(padKey(state, press('4'))?.entry).toBe('4');
  });
});

describe('typing into the maths keyboard', () => {
  it('maps the operators to their commands', () => {
    expect(expressionKeyFor(press('/'))).toBe('fraction');
    expect(expressionKeyFor(press('^'))).toBe('power');
    expect(expressionKeyFor(press('*'))).toBe('times');
    expect(expressionKeyFor(press('x'))).toBe('x');
    expect(expressionKeyFor(press('Backspace'))).toBe('back');
    expect(expressionKeyFor(press('Tab'))).toBeNull();
  });

  it('builds a fraction from the keys a learner already knows', () => {
    let state = { kind: 'expression' as const, latex: '' };
    for (const key of ['1', '/', '2']) {
      const next = expressionKey(state, press(key));
      if (next) state = next;
    }
    expect(state.latex).toBe('\\frac{1}{2}');
  });
});

describe('nudging a drawn figure', () => {
  const state = {
    kind: 'draw' as const,
    path: [
      [100, 100],
      [200, 100],
    ] as [number, number][],
  };

  it('moves one vertex at a time, and further with shift', () => {
    expect(nudgeVertex(state, 0, press('ArrowRight'))?.path[0]).toEqual([110, 100]);
    expect(nudgeVertex(state, 0, press('ArrowUp'))?.path[0]).toEqual([100, 90]);
    expect(nudgeVertex(state, 1, press('ArrowLeft', { shiftKey: true }))?.path[1]).toEqual([
      160, 100,
    ]);
  });

  it('claims nothing for a vertex that is not there, or a key that is not an arrow', () => {
    expect(nudgeVertex(state, 9, press('ArrowRight'))).toBeNull();
    expect(nudgeVertex(state, 0, press('Enter'))).toBeNull();
  });

  it('gets a segment right with the arrows alone', () => {
    let drawn = {
      kind: 'draw' as const,
      path: [
        [500, 140],
        [500, 460],
      ] as [number, number][],
    };
    for (let i = 0; i < 4; i++) {
      const next = nudgeVertex(drawn, 0, press('ArrowUp'));
      if (next) drawn = next;
    }
    expect(check(DRAW_SEGMENT, drawn).correct).toBe(true);
  });
});
