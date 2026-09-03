/**
 * The lesson Wobo draws on this page: the proof that a² + b² = c², stroke by stroke.
 *
 * Lifted verbatim from the approved prototype (`scratchpad/design/landing-v7.html`) — the same
 * geometry, the same handwriting positions, and the same `s`/`e` timing windows, which are
 * fractions of the whole draw (0 → 1). The prototype drew this twice, in the hero's demo card and
 * on the board that rises in the Tuesday-night chapter; it is one list here so the two can never
 * drift apart.
 *
 * The engine (`engine/**`) reads `s` and `e` off the rendered DOM (`data-s`, `data-e`), exactly as
 * the prototype's script did, so this module only has to render them.
 */

export interface LessonStroke {
  kind: 'path';
  /** The `.ink` variant: plain ink, the thin construction line, or Wobo's blue. */
  tone: 'ink' | 'thin' | 'pig';
  d: string;
  s: string;
  e: string;
}

export interface LessonWord {
  kind: 'text';
  /** The `.hw` variant: Wobo's hand in ink, in blue, or in coral for the learner's own moment. */
  tone: 'ink' | 'pig' | 'rose';
  x: number;
  y: number;
  size: number;
  text: string;
  s: string;
  e: string;
}

export type LessonMark = LessonStroke | LessonWord;

/** The proof, in the order Wobo draws it. */
export const LESSON: readonly LessonMark[] = [
  { kind: 'path', tone: 'ink', s: '.08', e: '.2', d: 'M190 250 L310 250 L190 160 Z' },
  { kind: 'path', tone: 'thin', s: '.2', e: '.24', d: 'M190 236 h14 v14' },
  { kind: 'text', tone: 'ink', s: '.22', e: '.25', x: 242, y: 276, size: 22, text: '4' },
  { kind: 'text', tone: 'ink', s: '.25', e: '.28', x: 166, y: 212, size: 22, text: '3' },
  { kind: 'path', tone: 'thin', s: '.28', e: '.36', d: 'M190 250 L190 370 L310 370 L310 250' },
  { kind: 'text', tone: 'ink', s: '.35', e: '.38', x: 236, y: 318, size: 26, text: 'a²' },
  { kind: 'path', tone: 'thin', s: '.38', e: '.45', d: 'M190 160 L100 160 L100 250 L190 250' },
  { kind: 'text', tone: 'ink', s: '.44', e: '.47', x: 128, y: 214, size: 26, text: 'b²' },
  { kind: 'path', tone: 'pig', s: '.47', e: '.58', d: 'M310 250 L400 130 L280 40 L190 160' },
  { kind: 'text', tone: 'pig', s: '.57', e: '.6', x: 322, y: 150, size: 26, text: 'c²' },
  { kind: 'text', tone: 'ink', s: '.6', e: '.67', x: 430, y: 120, size: 38, text: 'a² + b² = c²' },
  { kind: 'text', tone: 'ink', s: '.68', e: '.73', x: 430, y: 180, size: 30, text: '4² + 3² = c²' },
  { kind: 'text', tone: 'ink', s: '.74', e: '.79', x: 430, y: 232, size: 30, text: '16 + 9 = 25' },
  { kind: 'text', tone: 'pig', s: '.8', e: '.86', x: 430, y: 292, size: 34, text: 'so c = 5' },
  {
    kind: 'path',
    tone: 'pig',
    s: '.86',
    e: '.92',
    d: 'M420 262 c-16 22 -10 52 30 54 s90 6 120 -10 s10 -46 -30 -54 s-100 -8 -120 10',
  },
  {
    kind: 'text',
    tone: 'rose',
    s: '.93',
    e: '1',
    x: 430,
    y: 352,
    size: 30,
    text: "oh. that's why.",
  },
];
