/**
 * The stylesheet for the state family — the loader and the six things that can go wrong.
 *
 * Why its own sheet and not the landing page's: these scenes are app chrome, not marketing. A 404
 * can be reached from inside a lesson and the daily-limit page can land over the board, so the
 * scene has to stand on the product's tokens alone rather than on a page shell that assumes a
 * visitor, a hero and a footer. What it does share with the landing page is the law both obey:
 * every colour is a `--wobo-*` token (so both themes are free), corners are 3px, depth is a
 * half-pixel hairline, and nothing carries a shadow.
 *
 * Scoped under `.ws` so it cannot leak into a screen underneath.
 */

import { fontFamily, radius } from '@wobo/config';

const STYLE_ID = 'wobo-states';

export const STATES_CSS = `
.ws {
  --ws-gutter: clamp(20px, 5vw, 56px);
  align-items: center;
  background: var(--wobo-page);
  color: var(--wobo-ink-900);
  display: grid;
  font-family: ${fontFamily.system};
  justify-items: center;
  min-height: 100dvh;
  padding: 32px var(--ws-gutter);
  position: relative;
  width: 100%;
}
.ws *, .ws *::before, .ws *::after { box-sizing: border-box; }

/* The scene: one column, centred, nothing else on the page. DESIGN.md law 1. */
.ws-card { display: grid; justify-items: center; max-width: 560px; text-align: center; width: 100%; }
.ws-art { display: block; height: auto; overflow: visible; width: min(360px, 100%); }
.ws-h1 {
  font-size: clamp(23px, 3.4vw, 31px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 26px 0 8px;
}
.ws-body { color: var(--wobo-ink-500); font-size: 15px; line-height: 1.6; margin: 0; max-width: 42ch; }
.ws-hand {
  color: var(--wobo-ultramarine);
  font-family: ${fontFamily.handwritten};
  font-size: clamp(22px, 3vw, 27px);
  line-height: 1.2;
  min-height: 1.4em;
}
/* A full sentence, so it sits on the 14px body-copy floor (WOBO-PLAN §18) rather than under it. */
.ws-tiny { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.55; margin: 12px 0 0; max-width: 46ch; }
.ws-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 24px; }

/* The two corners: what state this is, and whose product it is. */
.ws-code {
  color: var(--wobo-ink-300);
  font-size: 11px;
  font-weight: 500;
  left: var(--ws-gutter);
  letter-spacing: 0.14em;
  position: absolute;
  text-transform: uppercase;
  top: 24px;
}
.ws-mark { position: absolute; right: var(--ws-gutter); top: 22px; }

/* Controls. Same shapes as everywhere else: 3px, hairline, one pigment on the primary. */
.ws-btn {
  align-items: center;
  background: var(--wobo-ink);
  border: 0.5px solid transparent;
  border-radius: ${radius.sm}px;
  color: var(--wobo-on-ink);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  justify-content: center;
  min-height: 44px;
  padding: 12px 20px;
  text-decoration: none;
  transition: background 180ms ease, border-color 180ms ease;
}
.ws-btn:hover { background: var(--wobo-ink-hover); }
.ws-btn--quiet { background: transparent; border-color: var(--wobo-card-border); color: var(--wobo-ink-900); }
.ws-btn--quiet:hover { background: var(--wobo-tonal); }

/* The ink itself. A path draws itself on; a group fades in behind it. */
.ws-draw {
  animation: ws-draw var(--ws-dur, 1.6s) cubic-bezier(0.5, 0, 0.2, 1) var(--ws-delay, 0s) forwards;
  stroke-dasharray: var(--ws-len, 400);
  stroke-dashoffset: var(--ws-len, 400);
}
@keyframes ws-draw { to { stroke-dashoffset: 0; } }
.ws-fade { animation: ws-fade 600ms ease var(--ws-delay, 0s) forwards; opacity: 0; }
@keyframes ws-fade { to { opacity: 1; } }

/* Each state's one moving idea. Nothing here animates chrome — every one of them is the meaning. */
.ws-sand { animation: ws-sand 4s linear 1.2s infinite; }
@keyframes ws-sand { from { transform: translateY(0); } to { transform: translateY(14px); } }
.ws-turn { animation: ws-turn 4s cubic-bezier(0.6, 0, 0.2, 1) 1.2s infinite; transform-origin: 250px 120px; }
@keyframes ws-turn { 0%, 70% { transform: rotate(0deg); } 85%, 100% { transform: rotate(180deg); } }
.ws-plane { animation: ws-plane 3.2s cubic-bezier(0.4, 0, 0.2, 1) 0.8s infinite; }
@keyframes ws-plane {
  0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
  45% { transform: translate(120px, -30px) rotate(-8deg); }
  60% { transform: translate(150px, -18px) rotate(12deg); }
  100% { opacity: 0; transform: translate(150px, 60px) rotate(40deg); }
}
.ws-spanner { animation: ws-wrench 1.6s ease-in-out 1s infinite; transform-origin: 38px 38px; }
@keyframes ws-wrench { 0%, 100% { transform: rotate(-14deg); } 50% { transform: rotate(14deg); } }
.ws-seal { animation: ws-seal 2.4s ease 1.2s forwards; }
@keyframes ws-seal { to { opacity: 0.18; } }
.ws-spiral { animation: ws-spin 1.4s linear 1.1s 2; }
@keyframes ws-spin { to { transform: rotate(360deg); } }

/* The handwritten line arrives letter by letter, the way a hand writes it. */
.ws-hand span { animation: ws-fade 250ms ease forwards; display: inline-block; opacity: 0; white-space: pre; }

/* A state that happened TO the screen the learner already had covers everything — header, Wobo,
   board — because each scene carries its own wordmark and a second one underneath reads as two
   products at once. */
.ws-full {
  background: var(--wobo-page);
  inset: 0;
  overflow-y: auto;
  position: fixed;
  /* Above everything the app draws, header and docked Wobo included (the token scale tops out at
     1100 for toasts). A state page that let the app's own chrome show through would put two
     wordmarks and a live streak counter on a screen that is telling somebody the day is spent. */
  z-index: 1200;
}

/* The long wait for a generation: the same scene, frosted over whatever the learner was on. */
.ws-overlay {
  backdrop-filter: blur(var(--wobo-frost-blur)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--wobo-frost-blur)) saturate(1.2);
  background: var(--wobo-frost-on-paper);
  inset: 0;
  /* The download centre it is mounted from is pointer-events:none so its toasts never block the
     page; the overlay is a real surface and takes them back. */
  pointer-events: auto;
  position: fixed;
  /* Above the app's chrome, below the state family: a wait is not an outcome. */
  z-index: 1150;
}
.ws-overlay .ws { background: transparent; }

/* Composed per breakpoint (WOBO-PLAN §18), never scaled down. */
@media (max-width: 600px) {
  .ws { padding-top: 64px; }
  .ws-art { width: min(280px, 100%); }
  .ws-row { flex-direction: column; width: 100%; }
  .ws-row .ws-btn { width: 100%; }
}

/* Reduced motion: every drawing rests finished, and nothing loops. The scenes still read — they
   were composed as still pictures first. */
@media (prefers-reduced-motion: reduce) {
  .ws-draw { animation: none; stroke-dashoffset: 0; }
  .ws-fade, .ws-hand span { animation: none; opacity: 1; }
  .ws-sand, .ws-turn, .ws-plane, .ws-spanner, .ws-spiral { animation: none; }
  .ws-seal { animation: none; opacity: 0.18; }
  .ws-btn { transition: none; }
}
`;

/** Inject the stylesheet once per document. Idempotent; never removed (the chunk is lazy). */
export function ensureStateStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STATES_CSS;
  document.head.appendChild(style);
}
