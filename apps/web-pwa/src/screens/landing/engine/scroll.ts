/**
 * The scroll substrate — inertia under the wheel, and one clock for every scrubbed timeline.
 *
 * Lenis smooths the scroll and GSAP's ScrollTrigger reads from it; the two are joined by driving
 * Lenis from GSAP's ticker and pushing every Lenis scroll event into `ScrollTrigger.update`. That
 * single-clock arrangement is what stops a pinned chapter from shearing away from the page under
 * fast wheel input.
 *
 * Two properties this module exists to guarantee:
 *
 *  · reduced motion is a real OFF SWITCH. No Lenis instance, no ticker callback, no smoothing —
 *    the page scrolls natively and the chapters lay themselves out at their end state;
 *  · leaving the route leaves NOTHING behind. Only the triggers created after this handle started
 *    are killed, the ticker callback is removed, Lenis is destroyed, and GSAP's lag smoothing goes
 *    back to its default — so the rest of the app is exactly as it was before the landing page.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { type Disposer, prefersReducedMotion, safeWindow } from './env';

/** How much of the gap Lenis closes each frame. Slow enough to feel like weight, not like lag. */
export const LENIS_LERP = 0.09;

/** GSAP's own defaults, restored on teardown so the landing page cannot change the whole app. */
const LAG_SMOOTHING_DEFAULT = [500, 33] as const;

let registered = false;

/** Register ScrollTrigger exactly once, and only where there is a document to register against. */
export function registerScrollTrigger(): void {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export interface ScrollOptions {
  win?: Window;
  /** Force the off-switch — used by tests and by the reduced-motion path. */
  reduced?: boolean;
  /** Start the page at the top, as the prototype does. */
  toTop?: boolean;
}

export interface ScrollHandle {
  /** The Lenis instance, or null under reduced motion. */
  lenis: Lenis | null;
  /** True when the whole engine is in its still, no-motion mode. */
  reduced: boolean;
  /** Re-measure every trigger — call after fonts land or the layout changes height. */
  refresh(): void;
  /** Adopt a disposer that must run when the route unmounts. */
  own(dispose: Disposer): void;
  /** Kill everything this handle started. */
  destroy(): void;
}

/**
 * Start the scroll engine. Safe to call where there is no window: the handle comes back inert and
 * every method on it is a no-op.
 */
export function startScroll(options: ScrollOptions = {}): ScrollHandle {
  const win = options.win ?? safeWindow();
  const reduced = options.reduced ?? prefersReducedMotion(win);
  const owned: Disposer[] = [];

  if (!win) {
    return {
      lenis: null,
      reduced: true,
      refresh() {},
      own(dispose) {
        owned.push(dispose);
      },
      destroy() {
        for (const dispose of owned.splice(0).reverse()) dispose();
      },
    };
  }

  registerScrollTrigger();

  // Only triggers born after this line are ours to kill.
  const before = new Set(ScrollTrigger.getAll());

  const previousRestoration = win.history.scrollRestoration;
  if ('scrollRestoration' in win.history) win.history.scrollRestoration = 'manual';
  if (options.toTop !== false) win.scrollTo(0, 0);

  let lenis: Lenis | null = null;
  let tick: ((time: number) => void) | null = null;

  if (!reduced) {
    lenis = new Lenis({ lerp: LENIS_LERP, smoothWheel: true });
    const instance = lenis;
    const update = () => ScrollTrigger.update();
    instance.on('scroll', update);
    tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  return {
    lenis,
    reduced,
    refresh() {
      ScrollTrigger.refresh();
    },
    own(dispose) {
      owned.push(dispose);
    },
    destroy() {
      for (const dispose of owned.splice(0).reverse()) dispose();
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      lenis?.destroy();
      lenis = null;
      for (const trigger of ScrollTrigger.getAll()) {
        if (!before.has(trigger)) trigger.kill();
      }
      gsap.ticker.lagSmoothing(LAG_SMOOTHING_DEFAULT[0], LAG_SMOOTHING_DEFAULT[1]);
      if ('scrollRestoration' in win.history) win.history.scrollRestoration = previousRestoration;
    },
  };
}
