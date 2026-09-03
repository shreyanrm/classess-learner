/**
 * What the plans and gift pages need on top of the shared public shell: the three price cards, the
 * benefits table's ticks, the allowance meter, the consent boxes, and the FAQ.
 *
 * Same laws as everywhere else — hairlines instead of shadows, 3px corners, one hit of pigment per
 * view (here it is the recommended card's border and the primary control, and nothing else).
 */

import { radius } from '@wobo/config';
import { ensureSiteStyles } from '../site/styles';

const STYLE_ID = 'wobo-plans';

const PLANS_CSS = `
.lp-tiers--three { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: none; }
.lp-tier-cadence { color: var(--wobo-ink-300); font-size: 12.5px; margin: 0 0 6px; }
.lp-tier-flag { color: var(--wobo-ultramarine); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; margin: 0 0 10px; text-transform: uppercase; }

/* --- the benefits table --- */
.lp-sr { border: 0; clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
.lp-yes { color: var(--wobo-ultramarine); display: inline-flex; vertical-align: middle; }
.lp-no { background: var(--wobo-hairline-on-paper); display: inline-block; height: 0.5px; vertical-align: middle; width: 14px; }
@media (min-width: 681px) {
  .lp-grid--plans th:not(:first-child), .lp-grid--plans td:not(:first-child) { padding-right: 0; text-align: left; width: 26%; }
}
/* On a phone the table stops being a table: each row becomes a block with its own labels, because
   a benefits table whose answer columns are off the side of the screen answers nothing. */
@media (max-width: 680px) {
  .lp-grid--plans, .lp-grid--plans tbody, .lp-grid--plans tr, .lp-grid--plans td { display: block; width: auto; }
  .lp-grid--plans { min-width: 0; }
  .lp-grid--plans thead { display: none; }
  .lp-grid--plans tr { border-bottom: var(--lp-hair); padding: 14px 0; }
  .lp-grid--plans td { border: 0; padding: 3px 0; }
  .lp-grid--plans td:first-child { color: var(--wobo-ink-900); margin-bottom: 4px; }
  .lp-grid--plans td[data-label] { align-items: baseline; display: flex; gap: 10px; }
  .lp-grid--plans td[data-label]::before {
    color: var(--wobo-ink-300);
    content: attr(data-label);
    font-size: 11.5px;
    letter-spacing: 0.1em;
    min-width: 44px;
    text-transform: uppercase;
  }
}

/* --- the allowance meter --- */
.lp-meter { align-items: center; display: flex; flex-wrap: wrap; gap: 14px 22px; justify-content: space-between; }
.lp-meter-line { color: var(--wobo-ink-700); font-size: 15px; margin: 6px 0 0; }
.lp-meter-track { background: var(--wobo-tonal); border: 0.5px solid var(--wobo-card-border); border-radius: ${radius.sm}px; height: 8px; margin-top: 14px; overflow: hidden; width: 100%; }
.lp-meter-fill { background: var(--wobo-ultramarine); height: 100%; transition: width 320ms cubic-bezier(0.16, 1, 0.3, 1); }

/* --- the consent boxes ---
   These are the two most important controls on the site: a parent ticks them before money moves.
   A native 17px checkbox is a third of the 44px a thumb needs (WOBO-PLAN §18), so the input is
   given the full 44×44 and DRAWS its own 20px box inside that, centred. The visible box is
   unchanged in size; what grew is the part you can hit. The tick is drawn in CSS, not typed as a
   character, for the same reason the benefits table's tick is an SVG: DESIGN.md forbids emoji and
   a screen reader gets the checkbox's own state, not a glyph. */
.lp-consent { display: grid; gap: 10px; margin: 18px 0 22px; max-width: 62ch; }
.lp-check { align-items: start; color: var(--wobo-ink-700); display: grid; font-size: 14.5px; gap: 4px; grid-template-columns: 44px 1fr; line-height: 1.55; }
.lp-check > span { margin-top: 11px; }
.lp-check input {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 0;
  cursor: pointer;
  height: 44px;
  margin: 0;
  position: relative;
  width: 44px;
}
.lp-check input::before {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  content: '';
  height: 20px;
  left: 12px;
  position: absolute;
  top: 12px;
  transition: background 140ms ease, border-color 140ms ease;
  width: 20px;
}
.lp-check input:hover::before { border-color: var(--wobo-ultramarine); }
.lp-check input:checked::before { background: var(--wobo-ultramarine); border-color: var(--wobo-ultramarine); }
/* The tick: two borders of an empty box, turned. */
.lp-check input::after {
  border-bottom: 2px solid var(--wobo-on-ink);
  border-right: 2px solid var(--wobo-on-ink);
  content: '';
  height: 10px;
  left: 20px;
  opacity: 0;
  position: absolute;
  top: 15px;
  transform: rotate(45deg);
  transition: opacity 120ms ease;
  width: 5px;
}
.lp-check input:checked::after { opacity: 1; }
.lp-check input:focus-visible { border-radius: ${radius.sm}px; outline: 2px solid var(--wobo-ultramarine); outline-offset: -10px; }
.lp-btn:disabled { cursor: not-allowed; opacity: 0.42; }

/* --- the FAQ --- */
.lp-faq { border-top: var(--lp-hair); margin-top: 30px; }
.lp-faq-item { border-bottom: var(--lp-hair); display: grid; gap: 8px 32px; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr); padding: 22px 0; }
.lp-faq-item h3 { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
.lp-faq-item .lp-prose { font-size: 14.5px; }
.lp-faq-item .lp-prose p:last-child { margin-bottom: 0; }

/* --- a link inside a quiet footnote still has to look like a link --- */
.lp-note a, .lp-quiet a { color: var(--wobo-ultramarine); text-decoration: underline; text-underline-offset: 3px; }

/* --- a hairline list, for a run of short lines that are not steps --- */
.lp-lines { display: grid; gap: 0; margin: 24px 0 0; max-width: 62ch; padding: 0; }
.lp-lines li { border-top: var(--lp-hair); color: var(--wobo-ink-500); font-size: 15px; line-height: 1.6; list-style: none; padding: 13px 0; }

/* --- the gift page --- */
.lp-gifts { display: grid; gap: 22px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 30px; max-width: 780px; }
.lp-steps-num { counter-reset: step; display: grid; gap: 18px; margin: 26px 0 0; max-width: 62ch; padding: 0; }
.lp-steps-num li { border-top: var(--lp-hair); color: var(--wobo-ink-500); font-size: 15px; line-height: 1.6; list-style: none; padding-top: 14px; }
.lp-steps-num li::before { color: var(--wobo-ink-300); content: counter(step, decimal-leading-zero); counter-increment: step; display: block; font-size: 12px; letter-spacing: 0.1em; margin-bottom: 6px; }
.lp-quiet { border: 0.5px dashed var(--wobo-card-border); border-radius: ${radius.sm}px; color: var(--wobo-ink-300); font-size: 14px; line-height: 1.6; margin-top: 26px; padding: clamp(18px, 2.4vw, 26px); }

@media (max-width: 980px) {
  .lp-tiers--three, .lp-gifts { grid-template-columns: 1fr; }
  .lp-faq-item { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-meter-fill, .lp-check input::before, .lp-check input::after { transition: none; }
}
@media print {
  .lp-consent, .lp-meter-track { break-inside: avoid; }
}
`;

/** Inject the plans stylesheet once, after the shell's. */
export function ensurePlansStyles(): void {
  ensureSiteStyles();
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PLANS_CSS;
  document.head.appendChild(style);
}

ensurePlansStyles();
