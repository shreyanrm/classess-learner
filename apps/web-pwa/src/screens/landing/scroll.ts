/**
 * Scroll-driven motion for the landing page.
 *
 * The rule this module exists to enforce: a section is ALWAYS legible. Nothing on this page starts
 * at `opacity: 0` waiting for an observer to rescue it — a learner on a browser with no
 * IntersectionObserver, a crawler, a printed page, or a screenshot taken before the loop starts
 * would all get a blank page. Sections rest at `REST_OPACITY` and settle to 1 with a small rise, so
 * the worst case is a page that is slightly quiet rather than a page that is empty.
 *
 * Reduced motion skips the observer entirely and marks everything settled on the first render.
 */

import { type RefObject, useEffect, useRef, useState } from 'react';

/** How visible an unsettled section is. High enough to read, low enough for the settle to register. */
export const REST_OPACITY = 0.72;

/** How far an unsettled section sits below its resting place, in px. */
export const REST_RISE = 14;

/**
 * How far a box has come into view: 0 while it is still below the fold, 1 once its top has passed
 * the trigger line. Pure, so the settle threshold is a tested number rather than a guessed one.
 */
export function revealAmount(top: number, height: number, viewport: number): number {
  if (viewport <= 0) return 1;
  const trigger = viewport * 0.86;
  const travel = Math.max(1, Math.min(height, viewport * 0.4));
  return clamp01((trigger - top) / travel);
}

export function clamp01(v: number): number {
  // A NaN measurement (an element with no box yet) reads as "not revealed"; an infinite one is
  // simply far past the trigger, which is fully revealed.
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The style a section wears at a given reveal amount. */
export function revealStyle(amount: number): { opacity: number; transform: string } {
  const t = clamp01(amount);
  return {
    opacity: REST_OPACITY + (1 - REST_OPACITY) * t,
    transform: `translate3d(0, ${(REST_RISE * (1 - t)).toFixed(2)}px, 0)`,
  };
}

/**
 * True once the element has been seen. One-way on purpose: a section that settles and then
 * scrolls away must not un-settle, or scrolling back up reads as the page forgetting itself.
 */
export function useSettled<T extends Element>(): {
  ref: RefObject<T | null>;
  settled: boolean;
} {
  const ref = useRef<T | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSettled(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setSettled(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -14% 0px', threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, settled };
}

/**
 * Whether an element is on screen right now, both ways. This is the one that gates work — the
 * WebGL field and a board that is drawing — so it has to be able to say "no" again.
 */
export function useOnScreen<T extends Element>(
  margin = '200px',
): { ref: RefObject<T | null>; onScreen: boolean } {
  const ref = useRef<T | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setOnScreen(entry.isIntersecting);
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin]);

  return { ref, onScreen };
}

/**
 * Whether the reader is still in the first `screens` viewport-heights of the page.
 *
 * This is what gates the ink field. The field is fixed to the viewport, so an intersection
 * observer would say "on screen" forever; what actually matters is whether anyone is still looking
 * at the part of the page where the field is the subject. Past the fold-and-a-bit the reader is
 * inside the board sections, the field is behind tonal bands, and the frame budget belongs to the
 * hand instead.
 */
export function nearTop(scrollY: number, viewport: number, screens = 2): boolean {
  if (!Number.isFinite(scrollY) || !Number.isFinite(viewport) || viewport <= 0) return true;
  return scrollY < viewport * screens;
}

/** `nearTop` against the live window, kept current on scroll and resize. */
export function useNearTop(screens = 2): boolean {
  const [near, setNear] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => setNear(nearTop(window.scrollY, window.innerHeight, screens));
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [screens]);
  return near;
}

/** True while the document is hidden — a background tab animates nothing. */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const read = () => setVisible(document.visibilityState !== 'hidden');
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, []);
  return visible;
}
