/**
 * "Ask Wobo about Wobo" — the reply, and the hand that writes it out.
 *
 * The answers are GROUNDED: every one of them is a sentence this page or the help centre already
 * says, in Wobo's own first person. They are not generated, and nothing here reaches the network.
 *
 * TODO(wave8): once the gateway exposes the help-grounded capability unauthenticated behind a tiny
 * per-visitor budget, this becomes the fallback for it — a visitor who is rate-limited, offline or
 * ahead of the rollout still gets a real answer instead of a spinner that never resolves. The
 * capability does not exist in `@wobo/sdk` yet (Wave 6 owns that package), and a call to an endpoint
 * that is not there would be a lie told in a loading state.
 *
 * A reply is SEGMENTS, not a string of HTML. The prototype writes `<em>` into `innerHTML` a
 * character at a time, which is fine in a mock and is an injection surface in a page that types out
 * whatever a visitor put in the box. Segments type out identically and cannot execute anything.
 */

export interface Segment {
  readonly text: string;
  /** The half of the reply set in pigment — Wobo's own emphasis. */
  readonly em?: boolean;
}

export type Reply = readonly Segment[];

interface Grounded {
  readonly match: RegExp;
  readonly reply: Reply;
}

/**
 * The table, in order. `find` takes the FIRST match, so the order is the priority: a question that
 * names both a class and a feeling ("a Class 6 kid who hates maths") is answered as a question about
 * the syllabus, because that is the one Wobo can answer with a fact.
 *
 * The last row matches everything, so `askWobo` always has an answer.
 */
const GROUNDED: readonly Grounded[] = [
  {
    match: /syllabus|school|board|class/i,
    reply: [
      {
        text: 'Yes. Tell me your board and class once, and I teach the chapters your school teaches, in the order your school teaches them. ',
      },
      { text: 'If your school has its own plan, hand me that.', em: true },
    ],
  },
  {
    match: /stuck|wrong|help|mistake/i,
    reply: [
      {
        text: "I never say 'wrong'. I draw the gap on your answer, ask one small question, and wait. ",
      },
      { text: 'Twice stuck and I show the whole thing, step by step.', em: true },
    ],
  },
  {
    match: /safe|alone|privacy|data/i,
    reply: [
      {
        text: 'Yes. I stay on the syllabus, keep my opinions to myself, never show ads, and never sell anything based on how a child behaves. ',
      },
      { text: 'Parents can read every lesson, any time.', em: true },
    ],
  },
  {
    match: /free|price|cost|plan/i,
    reply: [
      {
        text: 'Free every day: lessons on your syllabus, me drawing within a daily allowance, practice, and the Sunday note. ',
      },
      { text: 'No card, no trial that ends.', em: true },
    ],
  },
  {
    match: /hate|boring|fun|like/i,
    reply: [
      { text: 'Hating maths usually means nobody drew it. ' },
      { text: "Give me one Tuesday evening and a question you're stuck on.", em: true },
    ],
  },
  {
    match: /.*/,
    reply: [
      { text: "Good question. In the app I'd answer that from the help pages and draw where it helps. " },
      { text: "Ask me the same thing once you're in.", em: true },
    ],
  },
];

/** Wobo's answer to `question`. Never null — the last row of the table catches everything. */
export function askWobo(question: string): Reply {
  const hit = GROUNDED.find((row) => row.match.test(question));
  // The table's last row matches the empty string, so this is unreachable; TypeScript does not know
  // that, and an empty reply is a better shape to fall back to than a non-null assertion.
  return hit ? hit.reply : [];
}

/** How many characters the reply is, all segments together. */
export function replyLength(reply: Reply): number {
  return reply.reduce((n, seg) => n + seg.text.length, 0);
}

/** Two characters a frame, a frame every 14 ms — the prototype's hand speed. */
export const TYPE_STEP = 2;
export const TYPE_MS = 14;

/**
 * The first `chars` characters of the reply, still in segments.
 *
 * Segments that have not been reached yet are dropped rather than emitted empty, so the pigment
 * span does not exist in the DOM until the hand actually gets to it.
 */
export function typedTo(reply: Reply, chars: number): Segment[] {
  const out: Segment[] = [];
  let left = chars;
  for (const seg of reply) {
    if (left <= 0) break;
    if (left >= seg.text.length) {
      out.push(seg);
      left -= seg.text.length;
    } else {
      out.push({ text: seg.text.slice(0, left), em: seg.em });
      left = 0;
    }
  }
  return out;
}
