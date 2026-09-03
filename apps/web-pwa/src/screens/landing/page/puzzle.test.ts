/**
 * The puzzle's marking — which is really Wobo's teaching voice, asserted.
 */

import { describe, expect, it } from 'bun:test';
import { CELL_COUNT, EMPTY, puzzleReply, toggle } from './puzzle';

describe('puzzleReply', () => {
  it('celebrates a half with the tick, and only a half', () => {
    expect(puzzleReply(2)).toEqual({ say: 'there we go', win: true, ink: 'tick', drawMs: 520 });
    for (const n of [0, 1, 3, 4]) expect(puzzleReply(n).win).toBe(false);
  });

  it('rings the gap on a quarter and invites one more', () => {
    const reply = puzzleReply(1);
    expect(reply.ink).toBe('ring');
    expect(reply.say).toBe("that's a quarter. one more");
    expect(reply.drawMs).toBeGreaterThan(0);
  });

  it('names what three quarters and the whole are, rather than marking them wrong', () => {
    expect(puzzleReply(3).say).toBe("that's three quarters");
    expect(puzzleReply(CELL_COUNT).say).toBe("that's the whole thing");
  });

  it('asks for an answer before marking one', () => {
    expect(puzzleReply(0)).toEqual({ say: 'shade a part first', win: false, ink: null, drawMs: 0 });
  });

  it('never says wrong, never shouts, never draws ink it has no time for', () => {
    for (let n = 0; n <= CELL_COUNT; n++) {
      const reply = puzzleReply(n);
      expect(reply.say).not.toMatch(/wrong|no\b|incorrect/i);
      expect(reply.say).not.toContain('!');
      expect(reply.ink === null).toBe(reply.drawMs === 0);
    }
  });
});

describe('toggle', () => {
  it('shades a cell and unshades it again', () => {
    const one = toggle(EMPTY, 2);
    expect(one).toEqual([false, false, true, false]);
    expect(toggle(one, 2)).toEqual([...EMPTY]);
  });

  it('leaves the other cells alone, and the input untouched', () => {
    const before = [...EMPTY];
    toggle(before, 0);
    expect(before).toEqual([...EMPTY]);
  });

  it('starts with four cells, none shaded', () => {
    expect(EMPTY).toHaveLength(CELL_COUNT);
    expect(EMPTY.some(Boolean)).toBe(false);
  });
});
