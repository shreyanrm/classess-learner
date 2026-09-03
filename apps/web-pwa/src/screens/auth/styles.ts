/**
 * The shapes the public pages need that the landing page does not have: a form.
 *
 * The landing stylesheet is the visual parent and is IMPORTED, never copied — `.lp`, `.lp-wrap`,
 * `.lp-btn`, `.lp-h2`, `.lp-lead`, `.lp-hand`, `.lp-note`, `.lp-nav` and the footer all come from
 * there, so these pages inherit the page rhythm, the type scale, the button and the breakpoints for
 * free, and a change to the landing page carries here without anybody remembering to make it.
 *
 * What is added here is only what a form needs and a marketing page never did: a field, a label, a
 * row of provider doors, a rule with a word in it, the consent tick, and an error line. Same laws —
 * one pigment, 3px corners, half-pixel hairlines, no shadows.
 */

import { fontFamily, radius } from '@wobo/config';

const STYLE_ID = 'wobo-auth';

export const AUTH_CSS = `
/* The column. Narrow on purpose: one screen, one intention. */
.wa { margin: 0 auto; max-width: 420px; padding-block: clamp(32px, 6vw, 72px); width: 100%; }
.wa-head { display: grid; justify-items: center; text-align: center; }
.wa-hand { color: var(--wobo-ultramarine); font-family: ${fontFamily.handwritten}; font-size: 24px; line-height: 1.2; margin-top: 10px; }
.wa-title { font-size: clamp(25px, 3.6vw, 33px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; margin: 8px 0 10px; }
.wa-body { color: var(--wobo-ink-500); font-size: 15px; line-height: 1.6; margin: 0; max-width: 40ch; }

/* The doors, one per line so a thumb never misses and the labels stay readable at 360. */
.wa-doors { display: grid; gap: 8px; margin-top: 28px; }
.wa-door {
  align-items: center;
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  color: var(--wobo-ink-900);
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 14.5px;
  font-weight: 500;
  gap: 10px;
  justify-content: center;
  min-height: 48px;
  padding: 12px 16px;
  transition: border-color 160ms ease, background 160ms ease;
  width: 100%;
}
.wa-door:hover:not(:disabled) { background: var(--wobo-tonal); border-color: var(--wobo-hairline-on-paper-strong); }
.wa-door:disabled { cursor: not-allowed; opacity: 0.55; }
.wa-door svg { flex-shrink: 0; }
/* The honest line under a door that is not open. It is not an error, so it never carries alarm. */
.wa-shut { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.5; margin: -2px 0 4px; text-align: center; }
/* The same line standing alone inside the form, where it replaces a field rather than explaining
   the control above it, and needs the room a field would have taken. */
.wa-shut--field { margin: 2px 0 18px; text-align: left; }

/* A rule with a word in it. */
.wa-or { align-items: center; color: var(--wobo-ink-500); display: flex; font-size: 14px; gap: 12px; margin: 22px 0; }
.wa-or::before, .wa-or::after { background: var(--wobo-hairline-on-paper); content: ''; flex: 1; height: 0.5px; }

/* Fields. */
.wa-field { display: grid; gap: 6px; margin-bottom: 14px; }
.wa-label { color: var(--wobo-ink-700); font-size: 14px; font-weight: 500; }
.wa-input {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  color: var(--wobo-ink-900);
  font: inherit;
  font-size: 15px;
  min-height: 48px;
  padding: 12px 14px;
  transition: border-color 160ms ease;
  width: 100%;
}
.wa-input:hover { border-color: var(--wobo-hairline-on-paper-strong); }
.wa-input:focus { border-color: var(--wobo-ultramarine); outline: none; }
.wa-input::placeholder { color: var(--wobo-ink-300); }
.wa-hint { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.55; }
.wa-textarea { min-height: 132px; resize: vertical; }

/* The consent tick. Never pre-ticked; the two pages it names are real links. */
.wa-consent { align-items: flex-start; display: flex; gap: 10px; margin: 18px 0 6px; }
/* The consent tick is the control a minor's parent has to hit. 18px is a third of the 44px a
   thumb needs (WOBO-PLAN §18), so the input takes the full 44x44 and draws its own 20px box
   inside it — the same box, a target you can actually hit. */
.wa-consent input {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 0;
  cursor: pointer;
  flex-shrink: 0;
  height: 44px;
  margin: -11px 0 0 -12px;
  position: relative;
  width: 44px;
}
.wa-consent input::before {
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
.wa-consent input:hover::before { border-color: var(--wobo-ultramarine); }
.wa-consent input:checked::before { background: var(--wobo-ultramarine); border-color: var(--wobo-ultramarine); }
.wa-consent input::after {
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
.wa-consent input:checked::after { opacity: 1; }
.wa-consent input:focus-visible { border-radius: ${radius.sm}px; outline: 2px solid var(--wobo-ultramarine); outline-offset: -10px; }
.wa-consent label { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.55; padding-block: 11px; }
.wa-consent a { color: var(--wobo-ink-900); text-decoration: underline; text-underline-offset: 2px; }

/* What a parent will be told, before an address is asked for. */
.wa-parent {
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  margin: 18px 0;
  padding: 16px;
}
.wa-parent h2 { font-size: 15px; font-weight: 600; margin: 0 0 6px; }
.wa-parent p { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
.wa-parent p:last-child { margin-bottom: 0; }

/* One line, only when there is something to say. Ultramarine is the brand, not an alarm, so a
   problem is stated in ink and marked by position, never by turning the screen red. */
.wa-error { color: var(--wobo-ink-900); font-size: 14px; line-height: 1.55; margin: 14px 0 0; }
.wa-error::before { color: var(--wobo-ultramarine); content: '— '; }

.wa-submit { margin-top: 20px; width: 100%; }
.wa-switch { color: var(--wobo-ink-500); font-size: 14px; margin-top: 26px; text-align: center; }
.wa-switch button {
  background: none;
  border: 0;
  color: var(--wobo-ink-900);
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* A slim header for a page that has no sections to point at: the wordmark and the other door.
   The landing nav's four anchors belong to the landing page and would be dead here. */
.wa-top { align-items: center; display: flex; gap: 16px; justify-content: space-between; padding-block: 18px; }
/* The wordmark is the way back to the front page. At 68x27 it was a target a thumb misses. */
.wa-home { align-items: center; display: inline-flex; min-height: 44px; min-width: 44px; }
/* A sign-in page has a skip link too: its header is short, but "short" is not "none", and a
   keyboard visitor should reach the first field without walking the wordmark and the other door. */
.wa-skip {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  color: var(--wobo-ink-900);
  left: 12px;
  padding: 12px 16px;
  position: fixed;
  top: -80px;
  transition: top 140ms ease;
  z-index: 60;
}
.wa-skip:focus { top: 12px; }

/* The accessibility floor on the two doors (WOBO-PLAN §18). The landing footer is imported here
   as it is everywhere else, and it sets its own line and links below the floor for a page people
   skim; a door is a page people read, so it is raised in this scope rather than forked. */
.wa-page .lp-footer { align-items: center; font-size: 14px; }
.wa-page .lp-footer-links { column-gap: 18px; row-gap: 0; }
.wa-page .lp-footer-links a { align-items: center; display: inline-flex; justify-content: center; min-height: 44px; min-width: 44px; }
.wa-page .lp-btn { min-height: 44px; }

@media (prefers-reduced-motion: reduce) {
  .wa-door, .wa-input, .wa-skip, .wa-consent input::before, .wa-consent input::after { transition: none; }
}
`;

/** Inject once per document. Idempotent. */
export function ensureAuthStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = AUTH_CSS;
  document.head.appendChild(style);
}
