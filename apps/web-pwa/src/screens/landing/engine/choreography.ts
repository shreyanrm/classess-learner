/**
 * The choreography — every number the two cinematic chapters are cut on, and the arithmetic that
 * turns a scroll position into a moment in them.
 *
 * The timelines themselves live in `chapters.ts`; this module is the score. Keeping the beats as
 * data does two things: the timings are readable in one place (so "9:46 pm. Oh." lands where it
 * was directed to land, not where a tween happened to end), and every question the page asks of
 * them — which caption is up, how far the proof has been drawn, how close the camera is — is a
 * pure function that can be tested without a browser, a scroll, or a frame.
 *
 * Time here is TIMELINE time in seconds, the same unit GSAP positions tweens in. A pinned chapter
 * maps its scroll distance onto 0..total.
 */

import { clamp01 } from './env';

// --- Pinning ------------------------------------------------------------------------------------

/** How far the page scrolls while the night chapter is pinned, in px. */
export const NIGHT_SCRUB_PX = 4200;

/** How far the page scrolls while the Sunday chapter is pinned, in px. */
export const SUNDAY_SCRUB_PX = 1800;

/** How much the scrub lags the scroll — the chapters follow the reader, they do not snap to them. */
export const SCRUB = 0.8;

/**
 * How far through a pinned chapter the reader is: 0 at the moment it pins, 1 at the moment it
 * releases. A zero or negative distance is a chapter that never scrubs, which reads as finished.
 */
export function pinProgress(scrollY: number, start: number, distance: number): number {
  if (!(distance > 0)) return 1;
  return clamp01((scrollY - start) / distance);
}

/** The moment on a timeline a progress lands on. */
export function beatTime(progress: number, total: number): number {
  return clamp01(progress) * total;
}

// --- The night chapter --------------------------------------------------------------------------

/** A caption's window on the night timeline. `out` of null means it holds to the end. */
export interface Caption {
  id: string;
  in: number;
  out: number | null;
}

/** How long a caption takes to arrive, and to leave. */
export const CAPTION_FADE = 0.3;

/**
 * The four captions of the night chapter, at the positions the prototype hands them over on:
 * the problem, the asking, the drawing, and the moment it lands.
 */
export const NIGHT_CAPTIONS: readonly Caption[] = Object.freeze([
  { id: 'c1', in: 0.1, out: 1.4 },
  { id: 'c2', in: 1.7, out: 2.7 },
  { id: 'c3', in: 3.4, out: 5.2 },
  { id: 'c4', in: 5.5, out: null },
]);

/** Where the camera pushes into the phone, and how long the push takes. */
export const NIGHT_ZOOM = Object.freeze({
  at: 2.0,
  duration: 1.0,
  scale: 2.6,
  x: '-38vw',
  y: '22vh',
});

/** Where the scene hands over to the board. */
export const NIGHT_SCENE_OUT = Object.freeze({ at: 2.9, duration: 0.3 });

/** Where the board rises, and how long it takes. */
export const NIGHT_BOARD_IN = Object.freeze({ at: 3.0, duration: 0.8 });

/** The window the proof is drawn across — the scrubbed lesson. */
export const NIGHT_DRAW = Object.freeze({ at: 3.6, duration: 2.0 });

/** Where the learner's question is cleared off the board. */
export const NIGHT_QUESTION_OUT = Object.freeze({ at: 3.7, duration: 0.3 });

/** The tail the chapter holds on after the last caption, so "Oh." is read before it releases. */
export const NIGHT_TAIL = 0.7;

/** The night timeline's full length in seconds. */
export const NIGHT_TOTAL = 5.5 + CAPTION_FADE + NIGHT_TAIL;

/** How visible a caption is at a moment: in over the fade, held, out over the fade. */
export function captionOpacity(t: number, caption: Caption, fade = CAPTION_FADE): number {
  if (t <= caption.in) return 0;
  const rising = clamp01((t - caption.in) / fade);
  if (caption.out === null) return rising;
  if (t < caption.out) return rising;
  return rising * (1 - clamp01((t - caption.out) / fade));
}

/**
 * Which caption is on screen at a moment — the latest one still carrying any opacity, so a
 * hand-over reads as the new line arriving rather than as two lines fighting.
 */
export function captionAt(t: number, captions: readonly Caption[] = NIGHT_CAPTIONS): string | null {
  let current: string | null = null;
  for (const caption of captions) {
    if (captionOpacity(t, caption) > 0) current = caption.id;
  }
  return current;
}

/** How much of the proof has been drawn at a moment on the night timeline. */
export function nightDrawAmount(t: number): number {
  return clamp01((t - NIGHT_DRAW.at) / NIGHT_DRAW.duration);
}

/** `power2.out` — the ease the board rises on. */
export function power2Out(k: number): number {
  const t = clamp01(k);
  return 1 - (1 - t) ** 2;
}

/** `power2.inOut` — the ease the camera pushes in on. */
export function power2InOut(k: number): number {
  const t = clamp01(k);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** How far the board has risen at a moment: 0 while it is a speck, 1 once it is the whole frame. */
export function boardReveal(t: number): number {
  return power2Out(clamp01((t - NIGHT_BOARD_IN.at) / NIGHT_BOARD_IN.duration));
}

/**
 * The camera's scale on the desk scene at a moment: it settles from its 1.06 opening frame, holds,
 * then pushes to 2.6 into the phone.
 */
export function sceneScale(t: number): number {
  if (t <= 0) return 1.06;
  if (t < 1) return 1.06 + (1 - 1.06) * clamp01(t);
  if (t <= NIGHT_ZOOM.at) return 1;
  const k = power2InOut(clamp01((t - NIGHT_ZOOM.at) / NIGHT_ZOOM.duration));
  return 1 + (NIGHT_ZOOM.scale - 1) * k;
}

/** How visible the desk scene is at a moment — it fades out under the board. */
export function sceneOpacity(t: number): number {
  return 1 - clamp01((t - NIGHT_SCENE_OUT.at) / NIGHT_SCENE_OUT.duration);
}

// --- The Sunday chapter ---------------------------------------------------------------------------

/** The envelope's arrival. */
export const SUNDAY_ENV_IN = Object.freeze({ at: 0, duration: 1 });

/** The flap opening — the one shape morph on the page. */
export const SUNDAY_FLAP = Object.freeze({
  at: 0.9,
  duration: 0.5,
  /** The open flap, folded back over the top edge. */
  d: 'M40 120 l320 -140 l320 140',
});

/** The letter rising out of it, with depth. */
export const SUNDAY_LETTER_IN = Object.freeze({ at: 1.1, duration: 1.2 });

/** The envelope falling back behind the letter. */
export const SUNDAY_ENV_BACK = Object.freeze({ at: 1.2, duration: 1 });

/** The tail the chapter holds on, so the note is read before it releases. */
export const SUNDAY_TAIL = 0.5;

/** The Sunday timeline's full length in seconds. */
export const SUNDAY_TOTAL = SUNDAY_LETTER_IN.at + SUNDAY_LETTER_IN.duration + SUNDAY_TAIL;

/** How far the flap has opened at a moment: 0 shut, 1 folded back. */
export function flapOpen(t: number): number {
  return clamp01((t - SUNDAY_FLAP.at) / SUNDAY_FLAP.duration);
}

/** How far the letter has risen at a moment, on the ease it rises with. */
export function letterRise(t: number): number {
  return power2Out(clamp01((t - SUNDAY_LETTER_IN.at) / SUNDAY_LETTER_IN.duration));
}

// --- Entry beats (what the observers do) ----------------------------------------------------------

/** Where a section's reveal fires: its top crossing 72% of the viewport. */
export const REVEAL_START_FRACTION = 0.72;

/** Where a tile springs in. */
export const TILE_START_FRACTION = 0.78;

/** Where the film's lasso begins to draw. */
export const FILM_START_FRACTION = 0.7;

/** GSAP's `start` string for a fraction — kept in one place so the numbers above are the source. */
export function startAt(fraction: number): string {
  return `top ${Math.round(fraction * 100)}%`;
}

/**
 * Whether a box has crossed its trigger line. The same test the observers make, written down so
 * the thresholds are checked rather than trusted.
 */
export function entered(top: number, viewport: number, fraction: number): boolean {
  if (!(viewport > 0)) return true;
  return top <= viewport * fraction;
}

/**
 * The beat the reader is on, given which sections are intersecting. The last one to enter wins,
 * and a frame with nothing intersecting keeps the beat it had — the page never forgets where it is.
 */
export function nextBeat(
  current: string | null,
  entries: readonly { id: string; visible: boolean }[],
): string | null {
  let beat = current;
  for (const entry of entries) {
    if (entry.visible) beat = entry.id;
  }
  return beat;
}
