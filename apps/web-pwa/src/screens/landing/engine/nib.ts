/**
 * The pen of light — the landing page's cursor.
 *
 * A solid ultramarine core with a soft halo behind it, easing toward the pointer rather than
 * snapping to it, so the cursor reads as a nib being carried rather than a dot being teleported.
 * It grows over anything the learner can act on and squashes on press, which is the whole of the
 * hover/press language: the pen notices, the pen touches down.
 *
 * Three rules it is held to:
 *
 *  · fine pointers only. A finger has no hover, and hiding the system cursor on a device that has
 *    none would leave a page you cannot see yourself point at;
 *  · reduced motion keeps the native cursor entirely — an eased follow is motion with no meaning;
 *  · the takeover is SCOPED. `cursor: none` lives behind one class on `<body>` which this module
 *    adds on mount and removes on dispose, so every other screen in the app keeps its own cursor
 *    even if this component dies badly.
 */

import {
  type Disposer,
  finePointer,
  lerp,
  prefersReducedMotion,
  safeDocument,
  safeWindow,
} from './env';
import type { PointerState } from './pointer';

/** How fast the nib closes on the pointer each frame. The prototype's pen-of-light easing. */
export const NIB_EASE = 0.55;

/** What counts as something the pen can act on. */
export const NIB_HOVER_SELECTOR = 'a,button,[role=button]';

/** The class that turns the native cursor off. Added to `<body>` for the life of the mount only. */
export const CURSOR_ON_CLASS = 'cursor-on';

/**
 * The class that makes the nib VISIBLE, and the reason it is a second switch.
 *
 * `display` is decided by the device (a fine pointer, no reduced motion) but visibility has to wait
 * for the pointer to actually be somewhere. Until the first move the state is parked at the centre
 * of the viewport with `has: false`, and a nib shown at that moment paints an ultramarine dot in
 * the top-left corner of a page nobody has touched yet — which is exactly what a screenshot of the
 * page at rest caught. The prototype gates the same way (`#nib.on`), so this is the port, not an
 * addition: the pen appears with the first movement and never before it.
 */
export const NIB_VISIBLE_CLASS = 'on';

/**
 * The scoped form of the same switch: `data-cursor="on"` on the landing page's own root, which is
 * what the page's stylesheet keys `cursor: none` off. Scoped rather than global so that every
 * other screen in the app keeps its cursor even while this one is mounted.
 */
export const CURSOR_ON_ATTRIBUTE = 'data-cursor';

export interface NibOptions {
  pointer: PointerState;
  /** The landing route's root. The cursor takeover is marked on this element, not on the app. */
  scope?: HTMLElement | null;
  win?: Window;
  doc?: Document;
  /** Injected so a test can step frames by hand. */
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
  /** Skip the internal loop; the caller will drive `frame()` itself. */
  manual?: boolean;
  ease?: number;
}

export interface NibHandle {
  /** Advance the eased follow by one frame. */
  frame(): void;
  dispose: Disposer;
}

/** The transform the nib wears at a position. Kept pure so the string is a tested value. */
export function nibTransform(x: number, y: number): string {
  return `translate(${x}px,${y}px)`;
}

/**
 * Whether a pointer event landed on something the pen should swell over.
 *
 * Duck-typed rather than `instanceof Element` on purpose: this runs in a unit test with no DOM
 * globals at all, and an `instanceof` against a missing global is a ReferenceError, not a false.
 */
export function isHoverTarget(target: EventTarget | null): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null;
  return typeof el?.closest === 'function' ? !!el.closest(NIB_HOVER_SELECTOR) : false;
}

/**
 * Attach the nib to its element. Returns a handle whose `dispose` removes every listener, cancels
 * the loop and gives the native cursor back — there is no partial teardown.
 */
export function mountNib(el: HTMLElement | null, options: NibOptions): NibHandle {
  const noop: NibHandle = { frame() {}, dispose: () => {} };
  const win = options.win ?? safeWindow();
  const doc = options.doc ?? safeDocument();
  if (!el || !win || !doc) return noop;
  if (!finePointer(win) || prefersReducedMotion(win)) return noop;

  const pointer = options.pointer;
  const ease = options.ease ?? NIB_EASE;
  const raf = options.raf ?? win.requestAnimationFrame.bind(win);
  const caf = options.caf ?? win.cancelAnimationFrame.bind(win);

  let nx = pointer.x;
  let ny = pointer.y;
  let handle = 0;
  let live = true;

  const frame = () => {
    nx = lerp(nx, pointer.x, ease);
    ny = lerp(ny, pointer.y, ease);
    el.style.transform = nibTransform(nx, ny);
    // Latched, never toggled back: once the pen has been carried it stays the cursor for the page,
    // and leaving the document is the `mouseleave` fade below rather than a reset to invisible.
    if (pointer.has) el.classList.add(NIB_VISIBLE_CLASS);
  };

  const over = (event: Event) => el.classList.toggle('hover', isHoverTarget(event.target));
  const down = () => el.classList.add('press');
  const up = () => el.classList.remove('press');
  const leave = () => {
    el.style.opacity = '0';
  };
  const enter = () => {
    el.style.opacity = '1';
  };

  win.addEventListener('pointerover', over, { passive: true });
  win.addEventListener('pointerdown', down, { passive: true });
  win.addEventListener('pointerup', up, { passive: true });
  doc.addEventListener('mouseleave', leave);
  doc.addEventListener('mouseenter', enter);
  doc.body?.classList.add(CURSOR_ON_CLASS);
  options.scope?.setAttribute(CURSOR_ON_ATTRIBUTE, 'on');

  if (!options.manual) {
    const loop = () => {
      if (!live) return;
      frame();
      handle = raf(loop);
    };
    handle = raf(loop);
  }

  return {
    frame,
    dispose() {
      live = false;
      if (handle) caf(handle);
      handle = 0;
      win.removeEventListener('pointerover', over);
      win.removeEventListener('pointerdown', down);
      win.removeEventListener('pointerup', up);
      doc.removeEventListener('mouseleave', leave);
      doc.removeEventListener('mouseenter', enter);
      doc.body?.classList.remove(CURSOR_ON_CLASS);
      options.scope?.removeAttribute(CURSOR_ON_ATTRIBUTE);
      el.classList.remove('hover', 'press', NIB_VISIBLE_CLASS);
      el.style.opacity = '';
      el.style.transform = '';
    },
  };
}
