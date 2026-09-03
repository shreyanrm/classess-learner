'use client';

/**
 * The ink mark beside each help group.
 *
 * `help-centre/README.md` asks for an illustration on every group and every article: "Wobo drawing
 * the thing the article is about, in ink". Those drawings do not exist yet, and a stock icon set
 * would be the wrong thing in the right place. What ships instead is the smallest honest version of
 * the same idea — one stroke per group, in Wobo's ink, drawn in the same hand as the board: a pen
 * with its stroke for the basics, a board with a mark on it for the features, a ladder of rungs for
 * the syllabus. They are decorative and hidden from assistive technology; the group's name and its
 * line of copy carry the meaning.
 *
 * When the real illustrations arrive, this file is what they replace.
 */

const MARKS: Record<string, { d: string; drawn: string }> = {
  'wobo-basics': {
    d: 'M3 20 C 10 19, 14 11, 21 7 M21 7 L28 4 L26 11 Z',
    drawn: 'a pen, with its stroke behind it',
  },
  'product-features': {
    d: 'M3 5 H37 V19 H3 Z M10 12 C 14 8, 18 16, 22 12 M26 12 H31',
    drawn: 'a board with a curve drawn on it',
  },
  'boards-and-curriculum': {
    d: 'M6 21 V4 M22 21 V4 M6 17 H22 M6 12 H22 M6 7 H22',
    drawn: 'a ladder of rungs, a syllabus climbed',
  },
};

export function GroupMark({ group }: { group: string }) {
  const mark = MARKS[group];
  if (!mark) return null;
  return (
    <svg className="st-mark" viewBox="0 0 40 24" fill="none" aria-hidden>
      <title>{mark.drawn}</title>
      <path
        d={mark.d}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
