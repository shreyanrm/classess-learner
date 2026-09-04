/**
 * The magnetic control — law v5's one motion primitive that a `wk-` component owns (DESIGN.md §0).
 *
 * The INNER span moves, never the box. From design/prototypes/landing-v8.html, in Fable's words:
 * "the jitter in the old build came from translating the element itself: the box moved out from
 * under the pointer, the pointer left, the transform reset, and the box came back — a loop. Moving
 * a child leaves the hit area exactly where it was."
 *
 * One owner per animated property: this rAF lerp is the only thing that writes the span's
 * transform, and `.wk-mag > span` carries no CSS transition (ui.css, ui.test.ts). The tween is
 * driven by pointer state, never created inside a scroll callback.
 *
 * It does nothing at all where the pointer is coarse (a finger cannot hover) or where motion is
 * reduced — the app's own switch (`data-motion="reduce"`) or the OS one.
 */
import { useCallback, useRef } from 'react';

/** The prototype's numbers: how far the span follows the pointer, and how fast it catches up. */
const PULL_X = 0.28;
const PULL_Y = 0.34;
const LERP = 0.18;
/** Below this the span has arrived; stop the loop rather than burn a frame a pixel at a time. */
const REST = 0.05;

const NOOP = () => undefined;

function magnetAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (!window.matchMedia('(pointer: fine)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return document.documentElement.getAttribute('data-motion') !== 'reduce';
}

/**
 * Make `el` magnetic. Returns the teardown; call it when the element goes away.
 * `el` must contain a single `<span>` — that span is what moves.
 */
export function attachMagnet(el: HTMLElement): () => void {
  const inner = el.querySelector('span');
  if (!inner || !magnetAllowed()) return NOOP;

  let raf = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const tick = () => {
    cx += (tx - cx) * LERP;
    cy += (ty - cy) * LERP;
    inner.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
    raf = Math.abs(tx - cx) > REST || Math.abs(ty - cy) > REST ? requestAnimationFrame(tick) : 0;
  };
  const run = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    tx = (e.clientX - (r.left + r.width / 2)) * PULL_X;
    ty = (e.clientY - (r.top + r.height / 2)) * PULL_Y;
    run();
  };
  const onLeave = () => {
    tx = 0;
    ty = 0;
    run();
  };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    if (raf) cancelAnimationFrame(raf);
    inner.style.transform = '';
  };
}

/**
 * The same thing as a ref, for a component:
 *
 *   <button className="wk-btn wk-mag" ref={useMagnet()}><span>Ask</span></button>
 */
export function useMagnet(): (el: HTMLElement | null) => void {
  const detach = useRef<() => void>(NOOP);
  return useCallback((el: HTMLElement | null) => {
    detach.current();
    detach.current = el ? attachMagnet(el) : NOOP;
  }, []);
}
