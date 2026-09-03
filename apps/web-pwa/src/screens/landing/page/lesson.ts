/**
 * The lesson Wobo draws on this page: the proof of Pythagoras, stroke by stroke.
 *
 * The prototype writes this twice — once inside the hero's demo card (`#lessonA`) and once inside
 * the night chapter's board (`#lessonB`) — with identical geometry, because they are the same
 * lesson seen twice: once looping on its own, once scrubbed by the reader's scroll. Here it is
 * written ONCE, as data, and rendered into both. A stroke that drifts between the two would be a
 * continuity error the eye catches immediately, and data cannot drift from itself.
 *
 * `s` and `e` are the fractions of the lesson's run at which a stroke starts and finishes drawing.
 * They land on the DOM as `data-s` / `data-e`, which is the contract the drawing engine reads
 * (`engine/`): it walks `[data-s]` in document order, so the ORDER of this array is the order Wobo's
 * hand moves, and the pen rides whichever stroke is mid-draw.
 *
 * The board's own coordinate space is 640×400, and the pen's rest is the middle of it.
 */

export type Tone = 'ink' | 'pig' | 'rose' | 'thin';

export interface StrokePath {
  readonly kind: 'path';
  readonly d: string;
  readonly tone: Tone;
  readonly s: number;
  readonly e: number;
}

export interface StrokeText {
  readonly kind: 'text';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly tone: Tone;
  readonly s: number;
  readonly e: number;
}

export type Stroke = StrokePath | StrokeText;

/** The board's viewBox, and the point the pen's gaze is measured from. */
export const BOARD_VIEWBOX = '0 0 640 400';
export const BOARD_CENTRE = { x: 560, y: 340 } as const;

/**
 * The proof, in the order Wobo draws it: the triangle, its right angle, the two legs named, the
 * square on `a`, the square on `b`, the square on the hypotenuse in pigment, then the arithmetic,
 * the answer circled, and Aanya's own "oh." in coral underneath.
 */
export const LESSON: readonly Stroke[] = [
  { kind: 'path', tone: 'ink', s: 0.08, e: 0.2, d: 'M190 250 L310 250 L190 160 Z' },
  { kind: 'path', tone: 'thin', s: 0.2, e: 0.24, d: 'M190 236 h14 v14' },
  { kind: 'text', tone: 'ink', s: 0.22, e: 0.25, x: 242, y: 276, size: 22, text: '4' },
  { kind: 'text', tone: 'ink', s: 0.25, e: 0.28, x: 166, y: 212, size: 22, text: '3' },
  { kind: 'path', tone: 'thin', s: 0.28, e: 0.36, d: 'M190 250 L190 370 L310 370 L310 250' },
  { kind: 'text', tone: 'ink', s: 0.35, e: 0.38, x: 236, y: 318, size: 26, text: 'a²' },
  { kind: 'path', tone: 'thin', s: 0.38, e: 0.45, d: 'M190 160 L100 160 L100 250 L190 250' },
  { kind: 'text', tone: 'ink', s: 0.44, e: 0.47, x: 128, y: 214, size: 26, text: 'b²' },
  { kind: 'path', tone: 'pig', s: 0.47, e: 0.58, d: 'M310 250 L400 130 L280 40 L190 160' },
  { kind: 'text', tone: 'pig', s: 0.57, e: 0.6, x: 322, y: 150, size: 26, text: 'c²' },
  { kind: 'text', tone: 'ink', s: 0.6, e: 0.67, x: 430, y: 120, size: 38, text: 'a² + b² = c²' },
  { kind: 'text', tone: 'ink', s: 0.68, e: 0.73, x: 430, y: 180, size: 30, text: '4² + 3² = c²' },
  { kind: 'text', tone: 'ink', s: 0.74, e: 0.79, x: 430, y: 232, size: 30, text: '16 + 9 = 25' },
  { kind: 'text', tone: 'pig', s: 0.8, e: 0.86, x: 430, y: 292, size: 34, text: 'so c = 5' },
  {
    kind: 'path',
    tone: 'pig',
    s: 0.86,
    e: 0.92,
    d: 'M420 262 c-16 22 -10 52 30 54 s90 6 120 -10 s10 -46 -30 -54 s-100 -8 -120 10',
  },
  { kind: 'text', tone: 'rose', s: 0.93, e: 1, x: 430, y: 352, size: 30, text: "oh. that's why." },
];

/** The class list a stroke paints itself with — the same two vocabularies the prototype uses. */
export function strokeClass(stroke: Stroke): string {
  if (stroke.kind === 'path') return stroke.tone === 'ink' ? 'ink' : `ink ${stroke.tone}`;
  return stroke.tone === 'ink' ? 'hw' : `hw ${stroke.tone}`;
}

/**
 * Where the lesson is at a given fraction of its run: the stroke being drawn and how far into it.
 *
 * Pure, so the drawing can be asserted without a DOM: at 0 nothing has begun, at 1 every stroke has
 * landed, and in between exactly one stroke is live (the prototype's timings overlap by a frame or
 * two on purpose — a hand does not stop between letters — so "exactly one" means the LAST one that
 * is still mid-draw, which is the one the pen rides).
 */
export function strokeAt(p: number): { index: number; k: number } | null {
  let found: { index: number; k: number } | null = null;
  for (let i = 0; i < LESSON.length; i++) {
    const stroke = LESSON[i];
    if (!stroke) continue;
    const k = (p - stroke.s) / (stroke.e - stroke.s);
    if (k > 0 && k < 1) found = { index: i, k };
  }
  return found;
}

/** How much of stroke `i` is drawn at `p`, 0..1. */
export function amountAt(i: number, p: number): number {
  const stroke = LESSON[i];
  if (!stroke) return 0;
  const k = (p - stroke.s) / (stroke.e - stroke.s);
  return k < 0 ? 0 : k > 1 ? 1 : k;
}
