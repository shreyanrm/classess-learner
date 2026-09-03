/**
 * How long a generation has been going, said honestly.
 *
 * The gateway really does move through these stages — write the lesson, draw the visuals, verify
 * every answer — so the label reports where the work is rather than a fabricated percentage. It is
 * time-based because the client cannot see per-stage events; the labels are tuned to a typical live
 * compose (about 30 to 45 seconds).
 *
 * This is the ONE place those words live. The composing toast (`store/DownloadCenter.tsx`) and the
 * long-wait scene (`Scene.tsx`) both read it, so a learner who taps the toast to wait sees the
 * sentence continue rather than a second, differently-worded loader appear on top of the first.
 */

export interface ComposeStage {
  /** Elapsed milliseconds this label holds until. */
  readonly until: number;
  readonly label: string;
}

export const COMPOSE_STAGES: readonly ComposeStage[] = [
  { until: 9_000, label: 'Writing the lesson' },
  { until: 20_000, label: 'Drawing the visuals' },
  { until: 34_000, label: 'Checking every answer' },
  { until: Number.POSITIVE_INFINITY, label: 'Almost ready' },
];

/** The label for a compose that started `elapsedMs` ago. */
export function composeStage(elapsedMs: number): string {
  for (const s of COMPOSE_STAGES) if (elapsedMs < s.until) return s.label;
  return 'Almost ready';
}

/**
 * How long a wait has to run before it is worth taking over the screen for.
 *
 * Under this, the toast is the right amount of product: the learner is browsing and something is
 * being made for them in the background. Past it, a learner who has chosen to wait deserves Wobo's
 * company rather than a pill in the corner.
 */
export const LONG_WAIT_MS = 4_000;

/** True when a compose that started at `startedAt` has been running long enough to fill a screen. */
export function isLongWait(startedAt: number, now: number): boolean {
  return now - startedAt >= LONG_WAIT_MS;
}

/**
 * The handwritten lines Wobo writes while the page is being drawn, in order. They rotate; the first
 * is what nearly every learner ever sees, because most boots are over before the second arrives.
 */
export const LOADING_LINES: readonly string[] = [
  'sharpening the pencil',
  'warming up the ink',
  'reading your syllabus',
  'drawing your board',
  'finding your place',
];

/** How long each handwritten line holds before the next one is written. */
export const LOADING_LINE_MS = 2_600;

/** The line showing after `elapsedMs` of waiting. */
export function loadingLine(elapsedMs: number, lines: readonly string[] = LOADING_LINES): string {
  const i = Math.floor(Math.max(0, elapsedMs) / LOADING_LINE_MS) % lines.length;
  return lines[i] as string;
}
