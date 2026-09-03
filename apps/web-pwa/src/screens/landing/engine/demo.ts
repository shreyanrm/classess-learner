/**
 * The lesson loop — Wobo drawing the proof of Pythagoras, live, on a timer.
 *
 * Every mark on the board carries the window it is drawn in as `data-s`/`data-e` (both in 0..1 of
 * the lesson). Given a phase, a path reveals by `stroke-dashoffset` and a piece of handwriting
 * fades up; the pen is placed at the point on the ACTIVE path at exactly that fraction of its
 * length, which is why the nib appears to be making the line rather than chasing it. When nothing
 * is being drawn the pen fades out, and Wobo's eyes follow the pen the whole time.
 *
 * The same controller drives the hero card (on a 14 s loop with a 3.5 s hold at the end) and the
 * night chapter (scrubbed by scroll instead of by time) — one drawing, two clocks.
 */

import { clamp01, lerp } from './env';
import type { PointerState } from './pointer';

/** How long one pass of the lesson takes. */
export const DEMO_MS = 14000;

/** How long the finished board is held before the loop starts over. */
export const DEMO_HOLD = 3500;

/** How fast the pen closes on the point it should be drawing. */
export const PEN_EASE = 0.35;

/** How fast the pen fades out once the lesson has nothing left to draw. */
export const PEN_FADE = 0.2;

/** The centre the mini Wobo's eyes measure the pen against, in board coordinates. */
export const EYE_ORIGIN = { x: 560, y: 340, reach: 5 } as const;

/** Where the hero loop is at a wall-clock time: 0..1 across the draw, held at 1 through the hold. */
export function demoPhase(time: number, ms = DEMO_MS, hold = DEMO_HOLD): number {
  return clamp01((time % (ms + hold)) / ms);
}

/** Whether the learner's question has been cleared off the board at this phase. */
export function bubbleGone(p: number): boolean {
  return p > 0.12 && p < 0.999;
}

/** One mark's window on the lesson clock. */
export interface StrokeSpan {
  s: number;
  e: number;
}

/** How far through its own window a mark is at a lesson phase. */
export function strokeAmount(p: number, span: StrokeSpan): number {
  return clamp01((p - span.s) / (span.e - span.s));
}

/**
 * The mark being drawn right now, if any. Ties go to the later mark, exactly as the prototype's
 * loop does — when two windows overlap, the pen is on the newer line.
 */
export function activeSpan(
  spans: readonly StrokeSpan[],
  p: number,
): { index: number; k: number } | null {
  let found: { index: number; k: number } | null = null;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (!span) continue;
    const k = strokeAmount(p, span);
    if (k > 0 && k < 1) found = { index: i, k };
  }
  return found;
}

/** Read the spans off a board's marks, in document order. */
export function spansOf(marks: readonly Element[]): StrokeSpan[] {
  return marks.map((el) => ({
    s: Number(el.getAttribute('data-s')),
    e: Number(el.getAttribute('data-e')),
  }));
}

export interface LessonHandle {
  /** Put the board at a phase in 0..1. */
  draw(p: number): void;
  /** Put every mark back to undrawn. */
  reset(): void;
  /** How many marks the board has. */
  readonly count: number;
  /** Where the pen is right now, in the board's own coordinates. */
  penPoint(): { x: number; y: number };
  /**
   * The gaze the pen is asking for, as a -1..1 pair — the shape the character rig takes. This is
   * how the real Wobo watches its own hand: same reading as the drawn eyes, no React render.
   */
  penGaze(): { x: number; y: number };
  /** The pen's box in viewport coordinates, for anything that wants to look AT it. */
  penRect(): DOMRect | null;
}

/**
 * The gaze a board point asks for, as a -1..1 pair measured from the little head's own centre.
 * Pure, so the direction Wobo looks is a tested number rather than a transform read off a screen.
 */
export function penGazeAt(
  x: number,
  y: number,
  origin: { x: number; y: number } = EYE_ORIGIN,
): { x: number; y: number } {
  const dx = x - origin.x;
  const dy = y - origin.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

/**
 * Wire a board up. `root` holds the marks, `pen` is the nib group that travels along them, `wobo`
 * is the little head whose eyes follow it. Any of them missing gives an inert handle, because a
 * board that cannot draw must not throw on a page that is otherwise fine.
 */
export function createLesson(
  root: Element | null,
  pen: SVGGraphicsElement | null,
  wobo: Element | null,
): LessonHandle {
  const marks = root ? [...root.querySelectorAll<SVGGraphicsElement>('[data-s]')] : [];
  if (!marks.length || !pen) {
    return {
      draw() {},
      reset() {},
      count: 0,
      penPoint: () => ({ x: 0, y: 0 }),
      penGaze: () => ({ x: 0, y: 0 }),
      penRect: () => null,
    };
  }

  const lengths = new Map<Element, number>();
  const spans = spansOf(marks);
  const prime = () => {
    for (const el of marks) {
      if (el.tagName === 'path' && typeof (el as SVGPathElement).getTotalLength === 'function') {
        const length = (el as SVGPathElement).getTotalLength();
        lengths.set(el, length);
        el.style.strokeDasharray = String(length);
        el.style.strokeDashoffset = String(length);
      } else {
        el.style.opacity = '0';
      }
    }
  };
  prime();

  const eyes = wobo?.querySelector<SVGGElement>('.eyes') ?? null;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let on = 0;

  return {
    count: marks.length,
    penPoint: () => ({ x: px, y: py }),
    penGaze: () => penGazeAt(px, py),
    penRect: () =>
      typeof pen.getBoundingClientRect === 'function' ? pen.getBoundingClientRect() : null,
    reset() {
      px = 0;
      py = 0;
      tx = 0;
      ty = 0;
      on = 0;
      prime();
      pen.setAttribute('opacity', '0');
    },
    draw(p: number) {
      for (let i = 0; i < marks.length; i++) {
        const el = marks[i];
        const span = spans[i];
        if (!el || !span) continue;
        const k = strokeAmount(p, span);
        const length = lengths.get(el);
        if (length !== undefined) el.style.strokeDashoffset = String(length * (1 - k));
        else el.style.opacity = k > 0 ? String(Math.min(1, k * 1.6)) : '0';
      }

      const active = activeSpan(spans, p);
      const el = active ? marks[active.index] : null;
      if (active && el) {
        on = 1;
        const length = lengths.get(el);
        if (length !== undefined && typeof (el as SVGPathElement).getPointAtLength === 'function') {
          const point = (el as SVGPathElement).getPointAtLength(length * active.k);
          tx = point.x;
          ty = point.y;
        } else if (typeof el.getBBox === 'function') {
          const box = el.getBBox();
          tx = box.x + box.width * active.k;
          ty = box.y + box.height * 0.85;
        }
      } else {
        on = lerp(on, 0, PEN_FADE);
      }

      px = lerp(px, tx, PEN_EASE);
      py = lerp(py, ty, PEN_EASE);
      pen.setAttribute('transform', `translate(${px} ${py})`);
      pen.setAttribute('opacity', on.toFixed(2));

      if (eyes) {
        const gaze = penGazeAt(px, py);
        const reach = EYE_ORIGIN.reach;
        eyes.style.transform = `translate(${gaze.x * reach}px, ${gaze.y * reach}px)`;
      }
    },
  };
}

/** The tilt the product card takes from the pointer, in degrees. Six degrees, both axes. */
export function tiltAngles(
  pointer: PointerState,
  rect: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
): { rx: number; ry: number } {
  if (viewport.width <= 0 || viewport.height <= 0) return { rx: 0, ry: 0 };
  const dx = (pointer.x - (rect.left + rect.width / 2)) / viewport.width;
  const dy = (pointer.y - (rect.top + rect.height / 2)) / viewport.height;
  return { rx: -dy * 6, ry: dx * 6 };
}

/** Apply the tilt to the card. A no-op until the pointer has actually moved. */
export function applyTilt(el: HTMLElement | null, pointer: PointerState, win: Window): void {
  if (!el || !pointer.has) return;
  const rect = el.getBoundingClientRect();
  const { rx, ry } = tiltAngles(pointer, rect, {
    width: win.innerWidth,
    height: win.innerHeight,
  });
  el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
}
