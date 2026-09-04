/**
 * Item 5 of the set — "Draw a line that cuts it in half".
 *
 * The thing being cut is a rectangle, and a rectangle is halved by ANY line through its centre:
 * down the middle, across the middle, and either diagonal. The item wanted the vertical stroke and
 * marked the other three wrong; this holds it to the mathematics instead, and holds it to still
 * refusing a line that halves nothing.
 */

import { describe, expect, it } from 'bun:test';
import { check } from '@wobo/wobo';
import { CUT_BAR, CUT_IN_HALF, FRACTIONS_SET } from './set';

const [x, y, w, h] = CUT_BAR;
const left = x;
const right = x + w;
const top = y;
const bottom = y + h;
const midX = x + w / 2;
const midY = y + h / 2;

const cut = (path: [number, number][]) => check(CUT_IN_HALF, { kind: 'draw', path });

describe('the line that cuts the bar in half', () => {
  it('is the fifth item of the set', () => {
    expect(FRACTIONS_SET[4]).toBe(CUT_IN_HALF);
  });

  it('takes the line down the middle', () => {
    expect(
      cut([
        [midX, top],
        [midX, bottom],
      ]).correct,
    ).toBe(true);
  });

  it('takes the line across the middle', () => {
    expect(
      cut([
        [left, midY],
        [right, midY],
      ]).correct,
    ).toBe(true);
  });

  it('takes either diagonal', () => {
    expect(
      cut([
        [left, top],
        [right, bottom],
      ]).correct,
    ).toBe(true);
    expect(
      cut([
        [left, bottom],
        [right, top],
      ]).correct,
    ).toBe(true);
  });

  it('does not care which end the stroke started from', () => {
    expect(
      cut([
        [right, midY],
        [left, midY],
      ]).correct,
    ).toBe(true);
  });

  it('still refuses a line that leaves two unequal parts', () => {
    expect(
      cut([
        [left + 40, top],
        [left + 40, bottom],
      ]).correct,
    ).toBe(false);
  });

  it('still refuses a stroke that is not a line at all', () => {
    expect(
      cut([
        [left, midY],
        [midX, top - 160],
        [right, midY],
      ]).correct,
    ).toBe(false);
  });
});
