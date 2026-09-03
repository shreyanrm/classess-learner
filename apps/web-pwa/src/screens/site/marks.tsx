'use client';

/**
 * The ink mark on each help group's tile.
 *
 * `help-centre/README.md` asks for an illustration on every group and every article: "Wobo drawing
 * the thing the article is about, in ink". Those drawings do not exist yet, and a stock icon set
 * would be the wrong thing in the right place. What ships instead is the smallest honest version of
 * the same idea — one drawing per group, in the hand the About page's tiles are drawn in (a 44px
 * grid, 3.5px ink, round caps): a pen for the basics, a board with a curve on it for the features,
 * a ladder of rungs for the syllabus. They are decorative and hidden from assistive technology; the
 * group's name and its line of copy carry the meaning.
 *
 * When the real illustrations arrive, this file is what they replace.
 */

const MARKS: Record<string, { d: string; drawn: string }> = {
  'wobo-basics': {
    d: 'M8 36 l6 -1 l20 -20 l-5 -5 l-20 20 z M26 13 l5 5',
    drawn: 'a pen',
  },
  'product-features': {
    d: 'M6 10 h32 v24 h-32 z M12 26 c4 -10 8 4 12 -4 s6 0 8 4',
    drawn: 'a board with a curve drawn on it',
  },
  'boards-and-curriculum': {
    d: 'M14 6 v32 M30 6 v32 M14 14 h16 M14 22 h16 M14 30 h16',
    drawn: 'a ladder of rungs, a syllabus climbed',
  },
};

export function GroupMark({ group }: { group: string }) {
  const mark = MARKS[group];
  if (!mark) return null;
  return (
    <svg className="hp-mark" viewBox="0 0 44 44" aria-hidden="true">
      <title>{mark.drawn}</title>
      <path d={mark.d} />
    </svg>
  );
}
