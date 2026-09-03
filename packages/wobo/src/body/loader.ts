/**
 * The boot loader's timeline — "the loader is the character" (docs/WOBO-PLAN.md §16).
 *
 * A spinner says nothing. This says: the page you are about to see was drawn, and the thing that
 * drew it is about to introduce itself. A pen crosses the page laying down the FIRST HAIRLINE the
 * product will show — the same half-pixel rule every surface is built out of (DESIGN.md §2) — then
 * lifts, and Wobo's body settles into the orb above it.
 *
 * Under a second, start to finish, because a loader that outstays its welcome is a tax. Pure: the
 * component owns the clock, this owns the curve, so every millisecond is testable.
 */

/** The three phases, in ms. They sum to `LOADER_DURATION`. */
export const LOADER_TIMING = Object.freeze({
  /** The pen crosses the page, drawing the hairline. */
  draw: 420,
  /** The pen lifts off and Wobo settles in, with one overshoot. */
  settle: 380,
  /** A beat at rest before the app takes over, so the arrival is seen and not merely survived. */
  hold: 140,
});

/** Total length of the loader. Under a second, by the owner's rule. */
export const LOADER_DURATION = LOADER_TIMING.draw + LOADER_TIMING.settle + LOADER_TIMING.hold;

export type LoaderPhase = 'drawing' | 'settling' | 'resting';

/** The loader's own unit space. The hairline spans it; Wobo sits on the line, centred. */
export const LOADER_VIEW = Object.freeze({
  width: 240,
  height: 96,
  /** Where the hairline sits, and the x it runs between. */
  lineY: 74,
  lineFrom: 20,
  lineTo: 220,
  /** Where Wobo lands: centred, resting on the line. */
  woboX: 120,
  woboY: 74,
  /** Wobo's diameter as a fraction of the view width, so one number scales the whole thing. */
  woboScale: 0.32,
});

export interface LoaderFrame {
  phase: LoaderPhase;
  /** How much of the hairline is drawn, 0..1. */
  line: number;
  /** The pen tip, in loader units, or null once the pen has gone. */
  pen: { x: number; y: number } | null;
  /** The pen's opacity — it fades as it lifts away. */
  penOpacity: number;
  /** Wobo's scale, 0 until the settle begins, overshooting past 1 before coming to rest. */
  orb: number;
  orbOpacity: number;
  /** True once the whole loader has run. */
  done: boolean;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Fast off the mark, gentle into the stop — the pen accelerating away and easing to the far edge. */
function easeOut(t: number): number {
  const c = clamp01(t);
  return 1 - (1 - c) ** 3;
}

/**
 * The settle: an overshoot that comes back. This is the whole personality of the loader — Wobo
 * arrives with weight rather than fading in, which is the same physical logic the rig's spring uses.
 */
export const LOADER_OVERSHOOT = 1.14;

/**
 * A standard back-out. Its tension `s` peaks the curve at `1 + s / 14.8228`, so scaling by that
 * constant makes LOADER_OVERSHOOT mean exactly what it says: the height of the one overshoot.
 */
const BACK_TENSION_PER_OVERSHOOT = 14.8228;

function easeBack(t: number): number {
  const c = clamp01(t);
  const s = (LOADER_OVERSHOOT - 1) * BACK_TENSION_PER_OVERSHOOT;
  const u = c - 1;
  return u * u * ((s + 1) * u + s) + 1;
}

/** The frame at `elapsedMs`. Everything the loader draws comes out of this one function. */
export function loaderFrame(elapsedMs: number): LoaderFrame {
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const { draw, settle } = LOADER_TIMING;
  const { lineFrom, lineTo, lineY } = LOADER_VIEW;

  if (t < draw) {
    const line = easeOut(t / draw);
    return {
      phase: 'drawing',
      line,
      pen: { x: lineFrom + (lineTo - lineFrom) * line, y: lineY },
      penOpacity: 1,
      orb: 0,
      orbOpacity: 0,
      done: false,
    };
  }

  if (t < draw + settle) {
    const s = clamp01((t - draw) / settle);
    return {
      phase: 'settling',
      line: 1,
      // The pen lifts up and off to the right as Wobo takes its place.
      pen: s < 1 ? { x: lineTo + s * 18, y: lineY - s * 26 } : null,
      penOpacity: 1 - s,
      orb: easeBack(s),
      orbOpacity: clamp01(s * 2.2),
      done: false,
    };
  }

  return {
    phase: 'resting',
    line: 1,
    pen: null,
    penOpacity: 0,
    orb: 1,
    orbOpacity: 1,
    done: t >= LOADER_DURATION,
  };
}

/**
 * The reduced-motion loader: the finished picture, at once. The hairline is already drawn and Wobo
 * is already there — the same composition, without the arrival.
 */
export function loaderRestFrame(): LoaderFrame {
  return {
    phase: 'resting',
    line: 1,
    pen: null,
    penOpacity: 0,
    orb: 1,
    orbOpacity: 1,
    done: true,
  };
}

/**
 * The pen's own shape, in a local space whose origin is the NIB — the point touching the page.
 *
 * Drawn as filled outlines rather than as stroked line segments. The old pen was two round-capped
 * strokes of equal weight, one dark and one ultramarine, which at loader size is a rounded bar with
 * a blue end on it: a progress bar caught mid-fill, on the one screen whose entire argument is that
 * the product is not a progress bar. A pen is a tapered barrel and a nib that comes to a point, and
 * those are two different silhouettes even at twenty pixels.
 *
 * The barrel leans at 28° off vertical here; `WoboLoader` rotates the whole group to the writing
 * angle and tips it further as the pen lifts, so this shape is only ever the pen itself.
 */
export const LOADER_PEN = Object.freeze({
  /** The nib: a slim triangle from the tip up to the ferrule, in the pigment. */
  nib: 'M0 0 L-2.6 -6.2 L2.4 -7.4 Z',
  /** The collar where the nib meets the barrel. */
  ferrule: 'M-2.6 -6.2 L2.4 -7.4 L3.4 -10.6 L-1.6 -9.4 Z',
  /** The barrel: wider at the top than at the shoulder, and closed with a flat end. */
  barrel: 'M-1.6 -9.4 L3.4 -10.6 L6.6 -25.2 L1.2 -26.4 Z',
});

/** The dash pair that draws `line` of the hairline, for `stroke-dasharray`/`stroke-dashoffset`. */
export function loaderDash(line: number): { array: number; offset: number } {
  const length = LOADER_VIEW.lineTo - LOADER_VIEW.lineFrom;
  return { array: length, offset: length * (1 - clamp01(line)) };
}
