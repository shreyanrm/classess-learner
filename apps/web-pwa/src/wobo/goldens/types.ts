/**
 * What a golden board is (docs/BOARD.md, WOBO-PLAN §2).
 *
 * A golden board is one recorded turn: the prompt a learner could have asked, the plan the brain
 * would stream back, and the structure the hand must produce from it. It is the regression contract
 * for the whole pipe — grammar, anchors, ordering, verified numbers, choreography — and it is
 * asserted twice, from both ends:
 *
 *  - the hand (`apps/web-pwa/tests/board.spec.ts`) plays the plan in the bench and reads the DOM;
 *  - the brain (`services/gateway/tests/test_board_golden.py`) validates every object against the
 *    grammar mirror and RECOMPUTES every number in it from first principles.
 *
 * The plans are JSON so both halves read the same bytes; `build.ts` is the code that computes them,
 * so "every number on a board is computed by code" is literally true and re-runnable, and the
 * fixtures are never hand-edited.
 */

import type { BoardEvent, BoardObjectKind, Presentation } from '@wobo/wobo';

/** Which of the four anchor forms an object uses. Never "pixels": there is no fifth form. */
export type AnchorForm = 'board' | 'object' | 'target' | 'focus';

export interface GoldenNumber {
  /** The object id carrying it. */
  id: string;
  /** The value, exactly as computed. */
  value: number;
  /** Decimal places the board shows. */
  precision?: number;
  unit?: string;
  /** The verifier that signed it, e.g. `board.numbers_agree:apex height`. */
  check: string;
  /** How the brain's test recomputes it, in words — the human half of the contract. */
  from: string;
}

export interface GoldenExpectation {
  /** Every object id, in the order Wobo inks them. */
  ids: string[];
  /** The kind of each id, in the same order. */
  kinds: BoardObjectKind[];
  /** The anchor form of each id, in the same order. */
  anchors: AnchorForm[];
  /**
   * Marks that hang off another object: `[markId, ownerId]`. Their rendered boxes must overlap,
   * which is what proves an anchor actually resolved rather than defaulting to the origin.
   */
  hangsOff: [string, string][];
  /** Text Wobo writes, in the order it lands — the derivation, read off the DOM. */
  written: string[];
  /** Every computed quantity on the board. */
  numbers: GoldenNumber[];
}

export interface GoldenBoard {
  name: string;
  /** The learner's words. */
  prompt: string;
  /** The board's own name — it titles the surface and names the export. */
  title: string;
  /** Which surface Wobo chose, and why the choice is right (BOARD.md §5). */
  presentation: Presentation;
  subject: 'math' | 'physics' | 'chemistry' | 'biology' | 'social';
  expect: GoldenExpectation;
  plan: BoardEvent[];
}
