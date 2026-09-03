/**
 * "Try one" — the mint tile's puzzle, as pure logic.
 *
 * Colour half of a four-cell square. The rule the whole tile exists to demonstrate is that Wobo
 * NEVER says wrong (DESIGN.md law 9, and the owner's copy): one cell gets the gap ringed in Wobo's
 * blue and an invitation, two gets a tick and a small marigold fuss, and anything else gets a plain
 * description of what the learner actually shaded. Nothing is ever marked with a cross.
 *
 * Split out of the component so the verdicts are asserted rather than eyeballed, and so the
 * timings the tile animates to (the prototype's own 520 ms tick, 700 ms ring, 380 ms burst delay)
 * live next to the rule that fires them.
 */

import { PUZZLE_REPLIES } from './page-copy';

/** How many of the four cells make half. */
export const HALF = 2;

/** The tick's draw, in ms — the prototype's number. */
export const TICK_MS = 520;
/** The ring's draw, in ms. Slower than the tick: it is a question, not an answer. */
export const RING_MS = 700;
/** How long after the tick starts the marigold burst appears, in ms. */
export const BURST_DELAY_MS = 380;

export interface PuzzleVerdict {
  /** What Wobo writes underneath, in Wobo's own hand. */
  reply: string;
  /** The tick, drawn over the shape. */
  tick: boolean;
  /** The blue ring around the gap — drawn when the learner is close, never as a correction. */
  ring: boolean;
  /** The small fuss. Only ever on a win. */
  burst: boolean;
  /** Whether the reply is written in marigold rather than blue. */
  win: boolean;
}

/** What Wobo does about `shaded` cells out of four. */
export function verdict(shaded: number): PuzzleVerdict {
  if (shaded === HALF) {
    return { reply: PUZZLE_REPLIES.half, tick: true, ring: false, burst: true, win: true };
  }
  if (shaded === 1) {
    return { reply: PUZZLE_REPLIES.quarter, tick: false, ring: true, burst: false, win: false };
  }
  const reply =
    shaded === 0
      ? PUZZLE_REPLIES.none
      : shaded === 4
        ? PUZZLE_REPLIES.whole
        : PUZZLE_REPLIES.threeQuarters;
  return { reply, tick: false, ring: false, burst: false, win: false };
}

/** Toggle one cell of the shading. Pure, so the tile's state is a value rather than four booleans. */
export function toggle(cells: readonly boolean[], index: number): boolean[] {
  return cells.map((on, i) => (i === index ? !on : on));
}

/** How many cells are shaded. */
export function shadedCount(cells: readonly boolean[]): number {
  return cells.reduce((n, on) => (on ? n + 1 : n), 0);
}

/** A fresh, unshaded square. */
export function emptyCells(): boolean[] {
  return [false, false, false, false];
}
