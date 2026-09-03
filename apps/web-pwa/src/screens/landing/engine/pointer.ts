/**
 * The pointer, tracked once for the whole landing page.
 *
 * Four things follow the pointer here — the nib, the ribbon, the magnetic buttons and the tilt on
 * the product card — and every one of them wants the same reading in the same frame. So there is
 * exactly ONE listener and one mutable state object, handed out by reference count: the first
 * consumer starts the tracking, the last one to leave stops it. A route change therefore cannot
 * leave a listener behind, and two consumers cannot disagree about where the pointer is.
 *
 * Touch is ignored on purpose, exactly as the prototype does. A finger has no hover, so a trail
 * behind it is a smear rather than a pen, and the nib would sit under the finger unseen.
 */

import { type Disposer, safeWindow } from './env';

/** Where the pointer is, whether it has ever moved, whether it is pressed, and when it last moved. */
export interface PointerState {
  x: number;
  y: number;
  /** False until the first real move — nothing is drawn before the learner touches the page. */
  has: boolean;
  /** True between `pointerdown` and `pointerup`. The nib presses on this. */
  down: boolean;
  /** `performance.now()` of the last move. The "moving timestamp". */
  movedAt: number;
}

/** The slice of `window` the tracker needs. A test passes a fake with the same shape. */
export interface PointerHost {
  addEventListener(type: string, handler: EventListener, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, handler: EventListener, options?: EventListenerOptions): void;
  innerWidth: number;
  innerHeight: number;
}

export interface TrackOptions {
  host?: PointerHost;
  /** Injected clock, so ageing can be tested without waiting. */
  now?: () => number;
}

/** A fresh state, parked at the centre of the viewport so the first frame has somewhere to be. */
export function createPointerState(width = 0, height = 0): PointerState {
  return { x: width * 0.5, y: height * 0.5, has: false, down: false, movedAt: 0 };
}

/**
 * Attach the listeners. Returns the disposer that removes every one of them — there is no other
 * way to stop it, on purpose.
 */
export function trackPointer(state: PointerState, options: TrackOptions = {}): Disposer {
  const host = options.host ?? (safeWindow() as PointerHost | undefined);
  if (!host) return () => {};
  const now = options.now ?? (() => performance.now());

  const move = (event: Event) => {
    const e = event as PointerEvent;
    if (e.pointerType === 'touch') return;
    state.x = e.clientX;
    state.y = e.clientY;
    state.has = true;
    state.movedAt = now();
  };
  const down = (event: Event) => {
    if ((event as PointerEvent).pointerType === 'touch') return;
    state.down = true;
  };
  const up = () => {
    state.down = false;
  };

  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerdown', down, { passive: true });
  host.addEventListener('pointerup', up, { passive: true });
  host.addEventListener('pointercancel', up, { passive: true });
  return () => {
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerdown', down);
    host.removeEventListener('pointerup', up);
    host.removeEventListener('pointercancel', up);
  };
}

/** True when the pointer has not moved for `ms`. The ribbon stops feeding on an idle pointer. */
export function pointerIdle(state: PointerState, now: number, ms = 1200): boolean {
  if (!state.has) return true;
  return now - state.movedAt > ms;
}

/** The vector from a box centre to the pointer, with its length. Used by magnets and by the eyes. */
export function vectorTo(
  state: PointerState,
  cx: number,
  cy: number,
): { dx: number; dy: number; d: number } {
  const dx = state.x - cx;
  const dy = state.y - cy;
  return { dx, dy, d: Math.hypot(dx, dy) || 1 };
}

// --- The shared, reference-counted tracker -------------------------------------------------------

let shared: PointerState | null = null;
let sharedStop: Disposer | null = null;
let refs = 0;

/** How many consumers hold the shared pointer. Exported so a leak is a failing test, not a bug. */
export function pointerRefCount(): number {
  return refs;
}

/**
 * Borrow the page's pointer. The first call starts tracking; the release returned by the last
 * holder stops it. Releasing twice is harmless.
 */
export function acquirePointer(options: TrackOptions = {}): {
  state: PointerState;
  release: Disposer;
} {
  const host = options.host ?? (safeWindow() as PointerHost | undefined);
  if (!shared) {
    shared = createPointerState(host?.innerWidth ?? 0, host?.innerHeight ?? 0);
    sharedStop = trackPointer(shared, options);
  }
  refs++;
  const state = shared;
  let released = false;
  return {
    state,
    release() {
      if (released) return;
      released = true;
      refs = Math.max(0, refs - 1);
      if (refs === 0) {
        sharedStop?.();
        sharedStop = null;
        shared = null;
      }
    },
  };
}
