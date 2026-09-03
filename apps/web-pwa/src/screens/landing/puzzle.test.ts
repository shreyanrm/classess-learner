/**
 * The puzzle's rule, which is also the page's promise: Wobo never says wrong.
 */

import { describe, expect, it } from 'bun:test';
import { PUZZLE_REPLIES } from './page-copy';
import {
  BURST_DELAY_MS,
  emptyCells,
  HALF,
  RING_MS,
  shadedCount,
  TICK_MS,
  toggle,
  verdict,
} from './puzzle';

describe('the puzzle verdict', () => {
  it('celebrates exactly half, and only half', () => {
    const half = verdict(HALF);
    expect(half.tick).toBe(true);
    expect(half.burst).toBe(true);
    expect(half.win).toBe(true);
    expect(half.reply).toBe(PUZZLE_REPLIES.half);
  });

  it('rings the gap when one cell short, and invites rather than corrects', () => {
    const close = verdict(1);
    expect(close.ring).toBe(true);
    expect(close.tick).toBe(false);
    expect(close.win).toBe(false);
    expect(close.reply).toBe(PUZZLE_REPLIES.quarter);
  });

  it('asks for a first shade when nothing is shaded', () => {
    expect(verdict(0).reply).toBe(PUZZLE_REPLIES.none);
    expect(verdict(0).ring).toBe(false);
    expect(verdict(0).tick).toBe(false);
  });

  it('names what was shaded when it overshoots', () => {
    expect(verdict(3).reply).toBe(PUZZLE_REPLIES.threeQuarters);
    expect(verdict(4).reply).toBe(PUZZLE_REPLIES.whole);
  });

  it('never draws a tick and a ring at once', () => {
    for (let n = 0; n <= 4; n++) {
      const v = verdict(n);
      expect(v.tick && v.ring).toBe(false);
    }
  });

  it('bursts only on a win', () => {
    for (let n = 0; n <= 4; n++) {
      const v = verdict(n);
      expect(v.burst).toBe(v.win);
    }
  });

  it('never says the word wrong, at any count', () => {
    for (let n = 0; n <= 4; n++) expect(/wrong/i.test(verdict(n).reply)).toBe(false);
  });
});

describe('the puzzle state', () => {
  it('starts with four unshaded cells', () => {
    expect(emptyCells()).toEqual([false, false, false, false]);
    expect(shadedCount(emptyCells())).toBe(0);
  });

  it('toggles one cell and leaves the rest alone', () => {
    const once = toggle(emptyCells(), 2);
    expect(once).toEqual([false, false, true, false]);
    expect(toggle(once, 2)).toEqual(emptyCells());
  });

  it('does not mutate the cells it is given', () => {
    const before = emptyCells();
    toggle(before, 0);
    expect(before).toEqual([false, false, false, false]);
  });

  it('ignores an index that is not a cell', () => {
    expect(toggle(emptyCells(), 9)).toEqual(emptyCells());
  });
});

describe('the puzzle timings', () => {
  it('draws the ring more slowly than the tick — it is a question, not an answer', () => {
    expect(RING_MS).toBeGreaterThan(TICK_MS);
  });

  it('lets the tick get most of the way across before the fuss starts', () => {
    expect(BURST_DELAY_MS).toBeLessThan(TICK_MS);
    expect(BURST_DELAY_MS / TICK_MS).toBeGreaterThan(0.5);
  });
});
