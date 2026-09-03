'use client';

/**
 * The ink cursor — the pointer becomes Wobo's pen.
 *
 * A small ultramarine nib follows the pointer and leaves a trail that fades over about half a
 * second, so moving across the page feels like drawing on it. It is the one piece of pure
 * brand-delight chrome on this page, and it is held to the same rules as everything else:
 *
 *  · touch devices keep the native behaviour — there is no pointer to replace, and hiding the
 *    system cursor on a device that has none would be nothing but a hidden text caret;
 *  · `prefers-reduced-motion` keeps the native cursor, because a trail is motion with no meaning;
 *  · a fine pointer that has not moved yet gets nothing drawn, so the very first paint is clean;
 *  · focus rings are untouched. Nothing here listens to the keyboard, sets `outline`, or moves
 *    focus, so a keyboard learner sees the app's normal `:focus-visible` ring on every control.
 *
 * The trail is one canvas repainted from a short array of recent points. It is cleared and the loop
 * is dropped the moment the component unmounts, and the native cursor comes back with it.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** How long a point of the trail lives, in ms. */
export const TRAIL_LIFE_MS = 520;

/** The nib's width where the pen is, tapering to nothing at the tail. */
export const TRAIL_WIDTH_PX = 5;

export interface TrailPoint {
  x: number;
  y: number;
  /** `performance.now()` when the pointer was here. */
  t: number;
}

export interface CursorEnvironment {
  /** A coarse pointer (finger, stylus without hover) — the native behaviour is correct. */
  coarse: boolean;
  reducedMotion: boolean;
}

/** Whether the ink cursor may take over the pointer at all. */
export function inkCursorAllowed(env: CursorEnvironment): boolean {
  return !env.coarse && !env.reducedMotion;
}

/** Read the environment from the browser. Safe to call where there is no window. */
export function readCursorEnvironment(): CursorEnvironment {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { coarse: true, reducedMotion: true };
  }
  return {
    coarse: !window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/** Drop everything older than one trail life. Pure, and the reason the array never grows. */
export function pruneTrail(points: TrailPoint[], now: number, life = TRAIL_LIFE_MS): TrailPoint[] {
  return points.filter((p) => now - p.t < life);
}

/** How dark a segment of the trail is at a given age. Linear: ink lifting off paper. */
export function trailAlpha(age: number, life = TRAIL_LIFE_MS): number {
  if (life <= 0) return 0;
  const t = age / life;
  return t <= 0 ? 1 : t >= 1 ? 0 : 1 - t;
}

/** How wide the pen is at a given age — the tail tapers to a hair. */
export function trailWidth(age: number, life = TRAIL_LIFE_MS, width = TRAIL_WIDTH_PX): number {
  return 0.6 + trailAlpha(age, life) * width;
}

/**
 * Paint one frame of the trail. Split out from the loop so the geometry can be exercised without a
 * browser, and so the loop itself stays four lines long.
 */
export function paintTrail(
  ctx: CanvasRenderingContext2D,
  points: readonly TrailPoint[],
  now: number,
  ink: string,
  size: { width: number; height: number },
  life = TRAIL_LIFE_MS,
): void {
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const age = now - b.t;
    const alpha = trailAlpha(age, life);
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = ink;
    ctx.lineWidth = trailWidth(age, life);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * The component. It renders two fixed layers — the trail canvas and the nib — and sets
 * `data-ink-cursor` on the page root, which is what the stylesheet keys `cursor: none` off. That
 * attribute is removed on unmount, so leaving the landing page always restores the real cursor
 * even if this component dies badly.
 */
export function InkCursor({ ink }: { ink: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nibRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nib = nibRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !nib || !ctx) return;

    const root = document.documentElement;
    root.setAttribute('data-ink-cursor', 'on');

    let points: TrailPoint[] = [];
    let raf = 0;
    let moved = false;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (!moved) {
        moved = true;
        nib.style.opacity = '1';
      }
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (points.length > 96) points = points.slice(-96);
      nib.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    };

    // The nib fattens over anything the learner can act on — the pen noticing a control.
    const onOver = (e: Event) => {
      const el = e.target instanceof Element ? e.target.closest('a, button, input, summary') : null;
      nib.dataset.hot = el ? 'on' : 'off';
    };

    const tick = () => {
      const now = performance.now();
      points = pruneTrail(points, now);
      paintTrail(ctx, points, now, ink, { width: window.innerWidth, height: window.innerHeight });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('resize', resize);
      root.removeAttribute('data-ink-cursor');
    };
  }, [ink]);

  // Both layers are portalled into the body for the same reason the ink field is: the app wraps
  // every screen in an element with `will-change: transform`, which becomes the containing block
  // for `position: fixed` children — inside it, the trail canvas would size itself to the whole
  // document and the nib would drift from the pointer by exactly the scroll offset.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      <canvas ref={canvasRef} className="lp-trail" aria-hidden />
      <div ref={nibRef} className="lp-nib" data-hot="off" aria-hidden />
    </>,
    document.body,
  );
}
