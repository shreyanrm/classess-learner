import { describe, expect, it } from 'bun:test';
import { frameOf } from '../../src/board/anchors';
import type { ObjectGeometry } from '../../src/board/geometry';
import type { Stroke } from '../../src/board/pen';
import { inkLength, spokenLabel, strokeSlots, surfaceArea } from '../../src/board/renderer';

const stroke = (length: number): Stroke => ({ d: 'M 0 0 L 1 0', length });

const geometry = (strokes: Stroke[], glyphTravel: number): ObjectGeometry => ({
  strokes,
  glyphs: glyphTravel
    ? [{ trace: [{ d: 'M 0 0', length: glyphTravel }], box: { x: 0, y: 0, w: 1, h: 1 } }]
    : [],
  box: { x: 0, y: 0, w: 1, h: 1 },
  length: strokes.reduce((s, x) => s + x.length, 0) + glyphTravel,
});

describe('one clock for strokes and written glyphs', () => {
  it('shares the object’s draw time across everything it has to draw', () => {
    // An axis: 30 units of rule, then a 10-unit label. The rules must not finish before the label
    // starts — three quarters of the time is the rules, the last quarter is the writing.
    const slots = strokeSlots(geometry([stroke(30)], 10));
    expect(slots[0]).toEqual({ from: 0, to: 0.75 });
  });

  it('splits the strokes in proportion to their own length', () => {
    const slots = strokeSlots(geometry([stroke(30), stroke(10)], 0));
    expect(slots[0]).toEqual({ from: 0, to: 0.75 });
    expect(slots[1]).toEqual({ from: 0.75, to: 1 });
  });

  it('falls back to equal shares when nothing has length (a pure fill)', () => {
    const slots = strokeSlots(geometry([{ d: 'M 0 0 Z', length: 0, fill: true }], 0));
    expect(slots[0]?.to).toBe(1);
  });

  it('an object with only writing has no stroke slots at all', () => {
    expect(strokeSlots(geometry([], 40))).toEqual([]);
  });
});

describe('surface helpers', () => {
  it('measures the pen travel of a set of strokes', () => {
    expect(inkLength([stroke(10), stroke(5)])).toBe(15);
    expect(inkLength([])).toBe(0);
  });

  it('reports the board area of a surface: 1000 wide by its own aspect', () => {
    expect(surfaceArea(frameOf({ x: 0, y: 0, width: 500, height: 250 }))).toEqual({
      x: 0,
      y: 0,
      w: 1000,
      h: 500,
    });
  });
});

/**
 * Everything she writes on a board is announced (docs/BOARD.md §8, DESIGN.md's accessibility law).
 *
 * The surface used to be `role="img"`, which is atomic to assistive technology: the thirteen
 * per-object aria-labels the hand writes into the tree were invisible, the whole board read as one
 * image called "her board", and nothing announced new ink at all. This is the text that now goes
 * into the live region beside the surface — her own words, taken off the object itself.
 */
describe('what a screen reader is told about a board', () => {
  const said = (object: Record<string, unknown>) => spokenLabel(object as never);

  it('reads the words she wrote', () => {
    expect(said({ id: 'a', kind: 'write', text: 'the first revolt' })).toBe('the first revolt');
    expect(said({ id: 'b', kind: 'label', text: '1857' })).toBe('1857');
    expect(said({ id: 'c', kind: 'tex', tex: 'a^2 + b^2' })).toBe('a^2 + b^2');
    expect(said({ id: 'd', kind: 'region', title: 'the salt march' })).toBe('the salt march');
  });

  it('reads a computed number with its unit', () => {
    expect(said({ id: 'n', kind: 'number', value: 9.81, unit: 'm/s2', verified: true })).toBe(
      '9.81 m/s2',
    );
    expect(said({ id: 'n', kind: 'number', value: 90, verified: true })).toBe('90');
    // A label on the number is her sentence about it, and wins over the bare digits.
    expect(
      said({ id: 'n', kind: 'number', value: 90, label: 'from 1857 to 1947 = 90 years' }),
    ).toBe('from 1857 to 1947 = 90 years');
  });

  it('reads a table row by row', () => {
    expect(
      said({
        id: 't',
        kind: 'table',
        rows: [
          ['element', 'left', 'right'],
          ['C', '6', '6'],
        ],
      }),
    ).toBe('element, left, right. C, 6, 6');
  });

  it('says nothing about a shape that has no words — it is not a caption on a picture', () => {
    expect(said({ id: 'l', kind: 'line', to: { board: [10, 10] } })).toBe('');
    expect(said({ id: 'c', kind: 'circle', pad: 8 })).toBe('');
  });
});
