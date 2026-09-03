/**
 * The landing page's stylesheet, as one token-driven string injected once.
 *
 * Why a stylesheet and not inline styles like the rest of the app: this page needs media queries,
 * `:hover`, `::selection`, `prefers-reduced-motion` and a `cursor: none` that keys off an attribute
 * on the document root, and inline styles can express none of those. It is scoped under `.lp` so it
 * cannot leak into a product screen, and every colour, radius and hairline is a `--wobo-*` token,
 * so dark mode is free and no hex is written twice (DESIGN.md §2).
 *
 * The design laws it holds: no shadows (depth is hairlines and tonal steps), 3px corners, one hit
 * of pigment — ultramarine on the emphasis word, the primary control, the nib and the field, and
 * nowhere else.
 */

import { fontFamily, radius } from '@wobo/config';

const STYLE_ID = 'wobo-landing';

export const LANDING_CSS = `
.lp {
  --lp-gutter: clamp(20px, 5vw, 72px);
  --lp-max: 1200px;
  --lp-hair: 0.5px solid var(--wobo-hairline-on-paper);
  /* Transparent on purpose: the ink field is mounted in the body ahead of this element, so the
     page colour has to come from the body underneath it (main.tsx paints --wobo-page there). An
     opaque background here would hide the field completely. */
  background: transparent;
  color: var(--wobo-ink-900);
  font-family: ${fontFamily.system};
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}
.lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
.lp a { color: inherit; text-decoration: none; }

/* --- the ink field, behind everything ---
   Lives in the body as its FIRST child (see Landing.tsx), so it is fixed to the viewport rather
   than to the app's transformed screen wrapper, and so it paints before the app does. z-index 0
   and NOT -1: index.html paints a background on the html element itself, so the body's page colour
   is an ordinary block background that would cover anything painted behind it, and the field would
   never be seen. At 0, first in the body, the field paints above that colour and below every pixel
   of the app — which is what it has to do for a board to be an opaque board. */
.lp-field {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
}
.lp-body { position: relative; z-index: 1; }

/* --- the ink cursor --- */
.lp-trail { position: fixed; inset: 0; pointer-events: none; z-index: 1100; }
.lp-nib {
  position: fixed;
  left: 0;
  top: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--wobo-ultramarine);
  pointer-events: none;
  opacity: 0;
  z-index: 1101;
  transition: width 140ms ease, height 140ms ease, opacity 200ms ease;
}
.lp-nib[data-hot='on'] { width: 22px; height: 22px; opacity: 0.85; }
:root[data-ink-cursor='on'] .lp, :root[data-ink-cursor='on'] .lp * { cursor: none; }

/* --- shared shapes --- */
.lp-wrap { margin: 0 auto; max-width: var(--lp-max); padding-inline: var(--lp-gutter); width: 100%; }
.lp-section { padding-block: clamp(56px, 8vw, 112px); }
.lp-section--tonal { background: var(--wobo-tonal); border-block: var(--lp-hair); }
.lp-reveal { transition: opacity 620ms cubic-bezier(0.16, 1, 0.3, 1), transform 620ms cubic-bezier(0.16, 1, 0.3, 1); will-change: opacity, transform; }
/* The hero's kicker — the page's positioning line, and the only one of its kind left.
   It is NOT an eyebrow: the five section eyebrows were deleted, because each said in a label what
   the h2 under it already said in a sentence (WOBO-PLAN §15), and every one of them was set in the
   uppercase-with-tracking that every landing page in the category uses. This one carries a claim
   nothing else on the page makes, so it stays — in sentence case, at the 14px readable floor the
   responsive harness holds the rest of the app to (tests/helpers/proof.ts). */
.lp-kicker {
  color: var(--wobo-ink-500);
  font-size: 14.5px;
  font-weight: 500;
  margin: 0 0 16px;
}
.lp-h2 { font-size: clamp(26px, 3.4vw, 42px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 14px; max-width: 22ch; }
.lp-lead { color: var(--wobo-ink-500); font-size: clamp(15px, 1.2vw, 17px); line-height: 1.6; margin: 0; max-width: 60ch; }
.lp-hand { color: var(--wobo-ultramarine); font-family: ${fontFamily.handwritten}; font-size: 23px; line-height: 1.2; }

/* --- controls --- */
.lp-btn {
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
  /* 44px is the thumb floor the responsive harness enforces on every other screen (§18); the
     padding alone landed this at 42, which is a rule the front door was breaking. */
  min-height: 44px;
  padding: 11px 20px;
  transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.lp-btn:hover { background: var(--wobo-ink-hover); }
.lp-btn:active { transform: translateY(1px); }
.lp-btn--pigment { background: var(--wobo-ultramarine); color: #fff; }
.lp-btn--pigment:hover { background: var(--wobo-ultramarine-hover); }
.lp-btn--ghost { background: transparent; border-color: var(--wobo-card-border); color: var(--wobo-ink-900); }
.lp-btn--ghost:hover { background: var(--wobo-tonal); }

/* --- nav --- */
.lp-nav {
  align-items: center;
  backdrop-filter: blur(var(--wobo-frost-blur));
  background: var(--wobo-frost-on-paper);
  border-bottom: var(--lp-hair);
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding-block: 14px;
  position: sticky;
  top: 0;
  z-index: 40;
}
.lp-nav-inner { align-items: center; display: flex; gap: 20px; justify-content: space-between; }
/* The mark is a link home, so it is a target as well as a picture: 44px tall like every other one. */
.lp-mark { align-items: center; display: inline-flex; min-height: 44px; }
.lp-nav-links { color: var(--wobo-ink-500); display: flex; font-size: 14px; gap: 24px; }
.lp-nav-links a { align-items: center; display: inline-flex; justify-content: center; min-height: 44px; min-width: 44px; white-space: nowrap; }
.lp-nav-links a:hover { color: var(--wobo-ink-900); }
.lp-nav-right { align-items: center; display: flex; gap: 10px; }

/* --- hero --- */
.lp-hero { align-items: center; display: grid; gap: clamp(28px, 5vw, 56px); grid-template-columns: 1.05fr 0.95fr; padding-block: clamp(40px, 7vw, 84px); }
.lp-h1 { font-size: clamp(38px, 6.4vw, 74px); font-weight: 700; letter-spacing: -0.04em; line-height: 1.0; margin: 0 0 20px; }
.lp-h1 span { display: block; }
.lp-h1 .lp-wake { color: var(--wobo-ink-300); font-family: ${fontFamily.handwritten}; font-size: 0.62em; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 6px; }
.lp-h1 em { color: var(--wobo-ultramarine); font-style: normal; }
.lp-hero p { color: var(--wobo-ink-500); font-size: clamp(16px, 1.3vw, 19px); line-height: 1.55; margin: 0 0 26px; max-width: 46ch; }
.lp-cta { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; }
.lp-cta small { color: var(--wobo-ink-500); font-size: 14px; }
.lp-stage { align-items: center; display: flex; justify-content: center; min-height: 300px; position: relative; }
.lp-stage-aside { color: var(--wobo-ink-500); font-family: ${fontFamily.handwritten}; font-size: 24px; left: 58%; position: absolute; top: 14%; }

/* --- a board in its frame ---
   The background is opaque on purpose: a board you can see the page through is not a board. It is
   the one surface on this page that must hide the ink field completely. */
.lp-frame { background: var(--wobo-card); border: var(--lp-hair); border-radius: ${radius.sm}px; overflow: hidden; }
.lp-frame-bar { align-items: center; border-bottom: var(--lp-hair); color: var(--wobo-ink-300); display: flex; font-size: 14px; gap: 8px; justify-content: space-between; padding: 9px 14px; }
.lp-frame-bar b { color: var(--wobo-ink-900); font-weight: 600; }
.lp-board { height: clamp(240px, 34vw, 380px); position: relative; width: 100%; }
.lp-board > * { inset: 0; position: absolute; }

/* --- how Wobo teaches --- */
.lp-steps { display: grid; gap: clamp(36px, 5vw, 64px); margin-top: clamp(32px, 4vw, 56px); }
.lp-step { align-items: center; display: grid; gap: clamp(20px, 3vw, 44px); grid-template-columns: 1fr 1.15fr; }
.lp-step:nth-child(even) .lp-step-text { order: 2; }
.lp-step-index { color: var(--wobo-ink-300); font-size: 12px; font-variant-numeric: tabular-nums; letter-spacing: 0.1em; margin-bottom: 10px; }
.lp-step h3 { font-size: clamp(19px, 1.7vw, 23px); font-weight: 600; letter-spacing: -0.02em; margin: 0 0 8px; }
.lp-step p { color: var(--wobo-ink-500); font-size: 15px; line-height: 1.6; margin: 0 0 10px; max-width: 42ch; }

/* --- the demo --- */
.lp-demo { display: grid; gap: clamp(22px, 3vw, 40px); grid-template-columns: 360px 1fr; align-items: start; }
.lp-asks { display: flex; flex-direction: column; gap: 8px; margin: 22px 0 14px; }
/* Selection here is an INK hairline and a change of weight, never pigment. A few hundred pixels to
   the right, ultramarine is the ink the board is drawn in — the sacred use — and a blue border on a
   button beside it teaches the eye that the pigment means two different things (DESIGN.md §2). */
.lp-ask {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  color: var(--wobo-ink-700);
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  min-height: 44px;
  padding: 12px 14px;
  text-align: left;
  transition: border-color 160ms ease, color 160ms ease;
}
.lp-ask:hover { border-color: var(--wobo-hairline-on-paper-strong); color: var(--wobo-ink-900); }
.lp-ask[aria-pressed='true'] { border-color: var(--wobo-ink-900); color: var(--wobo-ink-900); font-weight: 600; }
.lp-note { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.55; margin: 12px 0 0; max-width: 52ch; }

/* --- boards --- */
.lp-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
.lp-chip { border: 0.5px solid var(--wobo-card-border); border-radius: ${radius.sm}px; color: var(--wobo-ink-500); font-size: 14px; padding: 8px 12px; }
.lp-chip--more { border-color: var(--wobo-ultramarine); color: var(--wobo-ultramarine); }

/* --- promises --- */
.lp-cards { display: grid; gap: 22px; grid-template-columns: repeat(3, 1fr); margin-top: 34px; }
.lp-card { border-top: var(--lp-hair); padding-top: 18px; }
.lp-card h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 8px; }
.lp-card p { color: var(--wobo-ink-500); font-size: 14.5px; line-height: 1.6; margin: 0; }

/* --- plans ---
   ONE hit of pigment in this section, and it is the filled button on the tier a visitor can
   actually act on today. The Plus card is bounded by the same hairline as Free — a second
   ultramarine edge around the card we cannot sell was two blue things shouting at each other, with
   the loud one on the wrong card (DESIGN.md §2).
   The price note sits UNDER the list rather than under the price: only one tier has one, and above
   the list it started the two cards' bullets at different heights. Below it, the lists line up and
   the buttons still land together on 'margin-top: auto'. */
.lp-tiers { display: grid; gap: 22px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 32px; max-width: 780px; }
.lp-tier { border: 0.5px solid var(--wobo-card-border); border-radius: ${radius.sm}px; display: flex; flex-direction: column; padding: 26px; }
.lp-tier h3 { font-size: 17px; font-weight: 600; margin: 0; }
.lp-price { font-size: clamp(24px, 2.6vw, 32px); font-weight: 600; letter-spacing: -0.03em; margin: 12px 0 0; }
.lp-price[data-placeholder='true'] { color: var(--wobo-ink-300); }
.lp-price-note { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.5; margin: 0 0 18px; }
.lp-tier ul { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.75; margin: 18px 0 22px; padding-left: 18px; }
.lp-tier .lp-btn { margin-top: auto; }

/* --- closing + footer --- */
.lp-closing { text-align: center; }
.lp-closing .lp-h2 { margin-inline: auto; }
.lp-closing .lp-lead { margin-inline: auto; }
.lp-closing .lp-cta { justify-content: center; margin-top: 24px; }
.lp-footer { align-items: center; border-top: var(--lp-hair); color: var(--wobo-ink-500); display: flex; flex-wrap: wrap; font-size: 14px; gap: 14px; justify-content: space-between; padding-block: 28px; }
.lp-footer-links { display: flex; flex-wrap: wrap; gap: 18px; }
.lp-footer-links a { align-items: center; display: inline-flex; justify-content: center; min-height: 44px; min-width: 44px; }
.lp-footer-links a:hover { color: var(--wobo-ink-900); }

/* --- device agnostic (WOBO-PLAN §18): composed per breakpoint, not scaled --- */
@media (max-width: 980px) {
  .lp-hero, .lp-step, .lp-demo { grid-template-columns: 1fr; }
  .lp-step:nth-child(even) .lp-step-text { order: 0; }
  .lp-cards { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 680px) {
  /* The four anchors do NOT disappear here. Four of the page's six sections are only reachable
     through them, and a phone is the device most learners arrive on (WOBO-PLAN §18). They drop to
     a second row inside the bar and scroll sideways — an 'overflow-x: auto' scroller, which is a
     surface a thumb already knows, not a drawer to be opened. The row is hairline-separated from
     the bar above it so the two rows never read as one wrapped mess. */
  .lp-nav { padding-block: 10px 0; }
  .lp-nav-inner { flex-wrap: wrap; row-gap: 0; }
  .lp-nav-links {
    border-top: var(--lp-hair);
    flex: 1 0 100%;
    gap: 22px;
    margin-inline: calc(var(--lp-gutter) * -1);
    order: 3;
    overflow-x: auto;
    padding-inline: var(--lp-gutter);
    scrollbar-width: none;
  }
  /* The links must not shrink, or the row squeezes them into each other instead of scrolling: the
     nowrap keeps each label whole while its box overlaps its neighbour, which looks like a bug and
     is one. */
  .lp-nav-links a { flex: 0 0 auto; }
  .lp-nav-links::-webkit-scrollbar { display: none; }
  .lp-cards, .lp-tiers { grid-template-columns: 1fr; }
  .lp-stage-aside { left: auto; right: 4%; top: 4%; }
  .lp-footer { align-items: flex-start; flex-direction: column; gap: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-reveal { transition: none; }
  .lp-nib, .lp-trail { display: none; }
  .lp-btn, .lp-ask, .lp-nib { transition: none; }
}
`;

/** Inject the stylesheet once per document. Idempotent, and it never removes itself: the page is
 * lazily chunked, so a learner who comes back to it should not pay for a second parse. */
export function ensureLandingStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = LANDING_CSS;
  document.head.appendChild(style);
}
