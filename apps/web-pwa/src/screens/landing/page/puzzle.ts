/**
 * The one puzzle on the page: colour half of a four-cell square.
 *
 * The whole point of the section it sits in is that Wobo never says "wrong" — it draws the gap and
 * waits — so the replies here are the product's teaching voice in miniature, and they are the thing
 * worth testing. The marking is pure: cells in, a reply out. The tick, the ring and the little
 * burst of marigold are what the component draws from that reply.
 */

/** What Wobo draws on the learner's answer. */
export type PuzzleInk = 'tick' | 'ring' | null;

export interface PuzzleReply {
  /** Wobo's handwritten line under the puzzle. Lowercase on purpose: it is a hand, not a headline. */
  readonly say: string;
  /** Right: the tick, the marigold burst, and the line turns marigold. */
  readonly win: boolean;
  readonly ink: PuzzleInk;
  /** How long that ink takes to draw itself on, in ms. */
  readonly drawMs: number;
}

/** The four cells of the shape. Two of them is a half. */
export const CELL_COUNT = 4;
/** The burst of marigold lands after the tick is most of the way drawn. */
export const BURST_DELAY_MS = 380;

/**
 * Wobo's reply to `n` shaded cells.
 *
 * Note what is NOT here: the word "wrong", any exclamation mark, and any reply that simply says no.
 * One shaded cell gets the gap ringed and an invitation ("one more"); three and four get named for
 * what they actually are, which is the correction. Zero gets an instruction, because nothing has
 * been answered yet.
 */
export function puzzleReply(n: number): PuzzleReply {
  if (n === 2) return { say: 'there we go', win: true, ink: 'tick', drawMs: 520 };
  if (n === 1) return { say: "that's a quarter. one more", win: false, ink: 'ring', drawMs: 700 };
  if (n === 0) return { say: 'shade a part first', win: false, ink: null, drawMs: 0 };
  if (n === CELL_COUNT) return { say: "that's the whole thing", win: false, ink: null, drawMs: 0 };
  return { say: "that's three quarters", win: false, ink: null, drawMs: 0 };
}

/** The cells after a click on `index` — a toggle, so shading is undoable without a reset. */
export function toggle(cells: readonly boolean[], index: number): boolean[] {
  return cells.map((on, i) => (i === index ? !on : on));
}

export const EMPTY: readonly boolean[] = [false, false, false, false];
