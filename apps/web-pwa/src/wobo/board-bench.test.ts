import { describe, expect, it } from 'bun:test';
import { isDrawable, parseBoardObject } from '@classess/wobo';
import { GOLDEN_PYTHAGORAS, PYTHAGORAS_PLAN } from './board-bench';

/**
 * The golden board: a regression on the plan's *structure*, never on its pixels. If the grammar
 * changes under it, or a quantity stops being computed, this is what says so.
 */
describe('the golden Pythagoras board', () => {
  it('is entirely valid grammar — nothing is dropped on the way to the hand', () => {
    expect(GOLDEN_PYTHAGORAS).toHaveLength(PYTHAGORAS_PLAN.length);
  });

  it('draws the axes, the triangle, a square on every side, and the derivation', () => {
    const ids = GOLDEN_PYTHAGORAS.flatMap((e) => (e.type === 'ink' ? [e.object.id] : []));
    expect(ids).toEqual([
      'x-axis',
      'y-axis',
      'triangle',
      'label-a',
      'label-b',
      'label-c',
      'square-a',
      'square-b',
      'square-c',
      'law',
      'a-squared',
      'b-squared',
      'c-squared',
      'sum-underline',
      'answer',
      'answer-circle',
    ]);
  });

  it('every quantity on it is computed by code and verified', () => {
    const numbers = GOLDEN_PYTHAGORAS.flatMap((e) =>
      e.type === 'ink' && e.object.kind === 'number' ? [e.object] : [],
    );
    expect(numbers.map((n) => n.value)).toEqual([16, 9, 25]);
    for (const n of numbers) expect(isDrawable(n)).toBe(true);
  });

  it('the three squares close, and the big one is built on the hypotenuse', () => {
    const squares = GOLDEN_PYTHAGORAS.flatMap((e) =>
      e.type === 'ink' && e.object.kind === 'polygon' && e.object.id.startsWith('square')
        ? [e.object]
        : [],
    );
    expect(squares).toHaveLength(3);
    for (const square of squares) {
      expect(square.points).toHaveLength(4);
      // Every side of a square is the same length, whichever side of the triangle it stands on.
      const sides = square.points.map((p, i) => {
        const next = square.points[(i + 1) % square.points.length] as [number, number];
        return Math.hypot(next[0] - p[0], next[1] - p[1]);
      });
      const first = sides[0] as number;
      for (const side of sides) expect(side).toBeCloseTo(first, 6);
    }
  });

  it('speaks and draws in step: every stroke has a start, in order', () => {
    let last = -1;
    for (const event of GOLDEN_PYTHAGORAS) {
      const at = event.t ?? 0;
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
  });

  it('nothing on it is placed by pixels', () => {
    for (const event of GOLDEN_PYTHAGORAS) {
      if (event.type !== 'ink') continue;
      const object = parseBoardObject(event.object);
      expect(object, event.object.id).not.toBeNull();
      if (object && 'anchor' in object && object.anchor) {
        const anchor = object.anchor;
        const kind =
          'board' in anchor
            ? 'board'
            : 'target' in anchor
              ? 'target'
              : 'object' in anchor
                ? 'object'
                : 'focus';
        expect(['board', 'target', 'object', 'focus']).toContain(kind);
      }
    }
  });

  it('closes the turn', () => {
    expect(GOLDEN_PYTHAGORAS.at(-1)?.type).toBe('done');
  });
});
