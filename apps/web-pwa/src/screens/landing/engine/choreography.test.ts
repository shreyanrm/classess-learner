/**
 * The score's arithmetic, checked without a browser.
 *
 * These are the numbers a reader actually experiences — which card is up, where the ring goes, what
 * a counter reads halfway through — so they are worth proving rather than eyeballing on a page that
 * takes four scrolls to reach.
 */

import { describe, expect, it } from 'bun:test';
import {
  barTop,
  CELL_PITCH,
  CELL_POSITIONS,
  CHART_BASELINE,
  cardIndex,
  countAt,
  floatDrift,
  HALF,
  ringPath,
  SPARK_MIN,
  SPARKS,
  sparkVector,
} from './choreography';

describe('cardIndex', () => {
  it('gives each of the four cards an equal quarter of the pin', () => {
    expect(cardIndex(0, 4)).toBe(0);
    expect(cardIndex(0.2, 4)).toBe(0);
    expect(cardIndex(0.3, 4)).toBe(1);
    expect(cardIndex(0.55, 4)).toBe(2);
    expect(cardIndex(0.8, 4)).toBe(3);
  });

  it('holds the last card through the final pixel of the pin', () => {
    // The `.999` exists for exactly this: floor(1 * 4) is 4, one past the last card, and the panel
    // would blank as it released.
    expect(cardIndex(1, 4)).toBe(3);
    expect(cardIndex(1.5, 4)).toBe(3);
  });

  it('survives a measurement that has not happened yet', () => {
    expect(cardIndex(Number.NaN, 4)).toBe(0);
    expect(cardIndex(0.5, 0)).toBe(0);
    expect(cardIndex(-1, 4)).toBe(0);
  });
});

describe('the report', () => {
  it('grows a bar from the chart’s baseline', () => {
    expect(barTop(0)).toBe(CHART_BASELINE);
    expect(barTop(96)).toBe(54);
  });

  it('counts up to the number a parent reads, and no further', () => {
    expect(countAt(0, 96)).toBe(0);
    expect(countAt(0.5, 96)).toBe(48);
    expect(countAt(1, 96)).toBe(96);
    expect(countAt(2, 96)).toBe(96);
  });
});

describe('the hero floats', () => {
  it('sends each object a layer further than the one before it', () => {
    expect(floatDrift(0)).toBe(-60);
    expect(floatDrift(1)).toBe(-86);
    expect(floatDrift(0)).toBeGreaterThan(floatDrift(1));
  });
});

describe('ringPath', () => {
  it('draws nothing when nothing is coloured', () => {
    expect(ringPath([])).toBe('');
    expect(ringPath([99])).toBe('');
  });

  it('rings one square as a closed loop that starts and overshoots', () => {
    const d = ringPath([0]);
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('C');
    expect(d).toContain('S');
  });

  it('grows with the selection, in both directions', () => {
    const one = ringPath([0]);
    const row = ringPath([0, 1]);
    const all = ringPath([0, 1, 2, 3]);
    expect(new Set([one, row, all]).size).toBe(3);
    // Every combination of the four squares produces a path — there is no shape Wobo cannot ring.
    for (let mask = 1; mask < 16; mask++) {
      const selection = [0, 1, 2, 3].filter((i) => mask & (1 << i));
      expect(ringPath(selection).length).toBeGreaterThan(20);
    }
  });

  it('sits on the same grid the four squares are laid out on', () => {
    expect(CELL_PITCH).toBe(112); // a 104px cell plus its 8px gap
    expect(CELL_POSITIONS).toHaveLength(4);
    expect(HALF).toBe(2);
  });
});

describe('the burst', () => {
  it('throws its sparks all the way round, and never into the middle', () => {
    const angles = new Set<string>();
    for (let i = 0; i < SPARKS; i++) {
      const { x, y } = sparkVector(i, SPARKS, 0);
      angles.add(`${Math.round(x)},${Math.round(y)}`);
      expect(Math.hypot(x, y + 30)).toBeCloseTo(SPARK_MIN, 5);
    }
    expect(angles.size).toBe(SPARKS);
  });

  it('reads a nonsense sample as the shortest throw rather than NaN', () => {
    const { x, y } = sparkVector(0, SPARKS, Number.NaN);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  });
});
