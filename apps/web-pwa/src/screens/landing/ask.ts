/**
 * "Ask Wobo. It answers for itself." — the grounded replies, and the typewriter that lands them.
 *
 * On the landing page this is a small, honest, LOCAL matcher: six replies, chosen by what the
 * question is about, written in Wobo's own voice. It never claims to be the tutor thinking. In the
 * app the same section calls the help-grounded capability (unauthenticated, tiny budget), and this
 * table is what it falls back to when there is no gateway to ask — which is exactly what a visitor
 * on the marketing page has.
 *
 * The words are the prototype's, verbatim. `<em>` marks the clause Wobo would say in blue.
 */

export interface AskAnswer {
  /** What the question has to be about for this reply. */
  match: RegExp;
  /** The reply, in two runs: plain, then the emphasised clause in Wobo blue. */
  plain: string;
  accent: string;
}

/**
 * Ordered, and the last one matches everything — so `answerFor` always has something to say and
 * never has to handle "no answer", which on a page about a tutor would be the worst possible bug.
 */
export const ANSWERS: readonly AskAnswer[] = [
  {
    match: /syllabus|school|board|class/i,
    plain:
      'Yes. Tell me your board and class once, and I teach the chapters your school teaches, in the order your school teaches them. ',
    accent: 'If your school has its own plan, hand me that.',
  },
  {
    match: /stuck|wrong|help|mistake/i,
    plain: "I never say 'wrong'. I draw the gap on your answer, ask one small question, and wait. ",
    accent: 'Twice stuck and I show the whole thing, step by step.',
  },
  {
    match: /safe|alone|privacy|data/i,
    plain:
      'Yes. I stay on the syllabus, keep my opinions to myself, never show ads, and never sell anything based on how a child behaves. ',
    accent: 'Parents can read every lesson, any time.',
  },
  {
    match: /free|price|cost|plan/i,
    plain:
      'Free every day: lessons on your syllabus, me drawing within a daily allowance, practice, and the Sunday note. ',
    accent: 'No card, no trial that ends.',
  },
  {
    match: /hate|boring|fun|like/i,
    plain: 'Hating maths usually means nobody drew it. ',
    accent: "Give me one Tuesday evening and a question you're stuck on.",
  },
  {
    match: /.*/,
    plain:
      "Good question. In the app I'd answer that from the help pages and draw where it helps. ",
    accent: "Ask me the same thing once you're in.",
  },
];

/** The reply Wobo gives to a question. Never null: the last entry catches everything. */
export function answerFor(question: string): AskAnswer {
  return ANSWERS.find((a) => a.match.test(question)) ?? (ANSWERS[ANSWERS.length - 1] as AskAnswer);
}

/** How many characters the typewriter adds per tick, and how long a tick is — the prototype's. */
export const TYPE_STEP = 2;
export const TYPE_TICK_MS = 14;

/**
 * How much of a reply has been typed after `elapsed` ms. Pure, so the typewriter's arithmetic is
 * tested without a clock, and so a reduced-motion reader can be handed the whole reply at once by
 * asking for its length.
 */
export function typedLength(elapsed: number, step = TYPE_STEP, tick = TYPE_TICK_MS): number {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  return Math.floor(elapsed / tick) * step;
}

/**
 * The reply split at a character count, across its two runs. The accent run only starts once the
 * plain run is finished, so the blue clause never appears before the sentence that leads into it.
 */
export function typedRuns(answer: AskAnswer, chars: number): { plain: string; accent: string } {
  const plain = answer.plain.slice(0, Math.max(0, chars));
  const accent = answer.accent.slice(0, Math.max(0, chars - answer.plain.length));
  return { plain, accent };
}

/** The whole reply's length, in characters. */
export function answerLength(answer: AskAnswer): number {
  return answer.plain.length + answer.accent.length;
}
