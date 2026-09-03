/**
 * The scroll reveal's arithmetic.
 *
 * The rule under test is the one that matters most on this page: a section that has not been
 * revealed is still readable. If `REST_OPACITY` ever drifts toward zero, or `revealStyle` ever
 * returns an opacity below it, a visitor whose IntersectionObserver never fires gets a blank page —
 * so the floor is asserted, not assumed.
 */

import { describe, expect, it } from 'bun:test';
import { clamp01, nearTop, REST_OPACITY, REST_RISE, revealAmount, revealStyle } from './scroll';

describe('clamp01', () => {
  it('clamps both ends', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(9)).toBe(1);
  });

  it('treats a broken measurement as not-yet-revealed rather than as NaN', () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('revealAmount', () => {
  const viewport = 800;

  it('is 0 for a box still below the fold', () => {
    expect(revealAmount(900, 400, viewport)).toBe(0);
  });

  it('is 1 for a box that has fully arrived', () => {
    expect(revealAmount(100, 400, viewport)).toBe(1);
  });

  it('rises through the middle', () => {
    const mid = revealAmount(viewport * 0.86 - 160, 400, viewport);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('reveals everything when the viewport cannot be measured', () => {
    expect(revealAmount(500, 400, 0)).toBe(1);
  });

  it('never returns a value outside [0, 1]', () => {
    for (let top = -2000; top <= 2000; top += 137) {
      const v = revealAmount(top, 300, viewport);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('revealStyle', () => {
  it('rests visible — never at opacity 0', () => {
    expect(REST_OPACITY).toBeGreaterThanOrEqual(0.6);
    expect(revealStyle(0).opacity).toBe(REST_OPACITY);
  });

  it('settles to exactly its resting place', () => {
    expect(revealStyle(1).opacity).toBe(1);
    expect(revealStyle(1).transform).toBe('translate3d(0, 0.00px, 0)');
  });

  it('rises from below by the rest distance', () => {
    expect(revealStyle(0).transform).toBe(`translate3d(0, ${REST_RISE.toFixed(2)}px, 0)`);
  });

  it('is monotonic in opacity', () => {
    let previous = 0;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const { opacity } = revealStyle(t);
      expect(opacity).toBeGreaterThanOrEqual(previous);
      previous = opacity;
    }
  });

  it('keeps a broken input legible', () => {
    expect(revealStyle(Number.NaN).opacity).toBe(REST_OPACITY);
  });
});

describe('nearTop', () => {
  it('is true through the first two viewport heights', () => {
    expect(nearTop(0, 900)).toBe(true);
    expect(nearTop(1799, 900)).toBe(true);
  });

  it('is false once the reader is into the boards', () => {
    expect(nearTop(1800, 900)).toBe(false);
    expect(nearTop(9000, 900)).toBe(false);
  });

  it('takes the number of screens it is given', () => {
    expect(nearTop(1000, 900, 1)).toBe(false);
    expect(nearTop(1000, 900, 3)).toBe(true);
  });

  it('keeps the field running when the window cannot be measured', () => {
    expect(nearTop(0, 0)).toBe(true);
    expect(nearTop(Number.NaN, 900)).toBe(true);
  });
});
