/**
 * "Ask Wobo. It answers for itself." — the grounded replies, and the typewriter that lands them.
 *
 * On the landing page this is a small, honest, LOCAL lookup. Wobo answers the four questions the
 * page itself puts in the reader's hand, in Wobo's own voice, and says plainly what it is doing
 * when asked anything else: it answers from the help centre, and there is a person to write to. It
 * never pretends to be the tutor thinking, because on a marketing page there is no gateway to ask
 * and a fake reply is a lie about the one thing the product is.
 *
 * The words are `design/prototypes/landing-v8.html`'s, verbatim, and they live in `page-copy.ts`
 * with the rest of the page. What is here is only the arithmetic, so it can be tested without a
 * browser, a clock or a frame.
 */

import { ASK, ASK_TYPE_MS } from './page-copy';

/**
 * The reply to a question. Never empty: anything the page did not offer gets the honest fallback,
 * so the section can never be caught with nothing to say.
 *
 * The match is exact-on-trim rather than fuzzy, and that is deliberate. A keyword matcher on a page
 * like this reads as understanding, and the moment it misfires it has claimed something about the
 * product that is not true. The four chips are the promise; everything else is answered honestly.
 */
export function answerFor(question: string): string {
  const asked = question.trim();
  if (!asked) return ASK.fallback;
  const exact = ASK.answers[asked];
  if (exact) return exact;
  const folded = asked.toLowerCase();
  for (const [chip, answer] of Object.entries(ASK.answers)) {
    if (chip.toLowerCase() === folded) return answer;
  }
  return ASK.fallback;
}

/**
 * How much of a reply has been typed after `elapsed` ms — one character per tick, the prototype's
 * own rate. Pure, so the typewriter's arithmetic is tested without a clock, and so a reader who has
 * asked for less motion can be handed the whole reply at once by asking for its full length.
 */
export function typedLength(elapsed: number, tick = ASK_TYPE_MS): number {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  return Math.floor(elapsed / tick);
}
