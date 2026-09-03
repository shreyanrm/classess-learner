/**
 * THE public site's stylesheet — /about, /help and every article, the legal set, /plans, /gift and
 * /contact. One sheet, one id, one layer over the landing page's own.
 *
 * It used to be two. `site/styles.ts` and `legal/SiteShell.tsx` each injected a `<style>` element
 * under the SAME id (`wobo-site`) with DIFFERENT rules, and both guarded on
 * `getElementById(STYLE_ID)` — so whichever public page a visitor opened first won, and every page
 * from the other half rendered with no stylesheet at all for the rest of the session. Walking
 * /about → /plans through the footer stripped the plans page of its document column, its cards,
 * its table and its skip link. One sheet is the fix; it is also why there is now one shell.
 *
 * The site pages render inside `.lp`, so every shape the landing page defines (the wrap, the
 * section rhythm, the eyebrow, the headings, the buttons, the frost on the top bar, the frame
 * around a board) is inherited rather than restated. Everything here is what the landing page has
 * no equivalent for: long-form prose, a document column, a breadcrumb, a search field, an article
 * list, tables, the plain-words box, print rules, and the one drawn mark on the About hero.
 *
 * Same laws, because they are the app's and not this page's (DESIGN.md §2): one pigment,
 * ultramarine, spent on the drawn underline, the search field's focus and the ink marks and
 * nowhere else; no shadows — depth is a half-pixel hairline and a tonal step; 3px corners;
 * sentence case. Every colour is a `--wobo-*` token, so dark mode costs nothing.
 *
 * The last block is the ACCESSIBILITY FLOOR (WOBO-PLAN §18): nothing a public page renders drops
 * below 14px of body copy or 44×44 of tap target. It is written once, here, scoped to `.st`, so
 * every public page rises together and no page forks the landing sheet to fix itself.
 */

import { fontFamily, radius } from '@wobo/config';
import { ensureLandingStyles } from '../landing/styles';

const STYLE_ID = 'wobo-site';

export const SITE_CSS = `
/* --- the page ------------------------------------------------------------------------------- */
/* A short page (the checkout state, a contact page) must still put its footer at the bottom of the
   window rather than halfway up it with dead space underneath. */
.st-page { display: flex; flex-direction: column; min-height: 100vh; padding-bottom: 8px; }
.st-page > main { flex: 1 0 auto; }
.st-main:focus { outline: none; }

.st-nav-links a[aria-current='page'] { color: var(--wobo-ink-900); }

.st-skip {
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
.st-skip:focus { top: 12px; }

/* --- long-form prose (the /about and /help tree) --------------------------------------------- */
.st-doc { color: var(--wobo-ink-700); font-size: 15.5px; line-height: 1.72; max-width: 66ch; }
/* The rhythm goes on the elements themselves rather than on an adjacent-sibling universal rule: a
   class-plus-element selector outranks a class-plus-universal one whatever the order, so the
   sibling rule would lose and every paragraph would run into the next. The first-child rule then
   outranks both and clears the top. */
.st-doc p, .st-doc ul, .st-doc ol, .st-doc blockquote, .st-doc hr { margin: 17px 0 0; }
.st-doc > :first-child { margin-top: 0; }
/* Two runs of prose in a row, or a bordered aside and then more prose, keep the same rhythm as two
   paragraphs would — the reader cannot see where one React element stopped and the next began. */
.st-doc + .st-doc, .st-honesty + .st-doc { margin-top: 20px; }
.st-doc h2 {
  color: var(--wobo-ink-900);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 30px 0 0;
}
.st-doc h3 { color: var(--wobo-ink-900); font-size: 15px; font-weight: 600; margin: 24px 0 0; }
.st-doc ul, .st-doc ol { padding-left: 20px; }
.st-doc li + li { margin-top: 9px; }
.st-doc li::marker { color: var(--wobo-ink-300); }
.st-doc strong { color: var(--wobo-ink-900); font-weight: 600; }
.st-doc code {
  background: var(--wobo-tonal);
  border-radius: ${radius.sm}px;
  font-size: 0.92em;
  padding: 1px 5px;
}
.st-doc a { border-bottom: 0.5px solid var(--wobo-ultramarine); color: var(--wobo-ultramarine); }
.st-doc blockquote {
  border-left: 0.5px solid var(--wobo-card-border);
  color: var(--wobo-ink-500);
  padding-left: 16px;
}

/* An unfilled hole in the reviewed copy. Shown, never invented: a page that says it does not yet
   know its own registered name is honest; one that makes a name up is not. The two parsers each
   have a name for it and both draw the same gap. */
.st-slot, .lp-blank {
  border-bottom: 0.5px dashed var(--wobo-card-border);
  color: var(--wobo-ink-300);
  font-size: 0.94em;
  font-style: normal;
  padding: 0 3px;
}

/* The first line of a help article — a complete answer on its own. */
.st-lead {
  color: var(--wobo-ink-900);
  font-size: clamp(17px, 1.5vw, 20px);
  font-weight: 500;
  line-height: 1.5;
  margin: 0 0 22px;
  max-width: 44ch;
}

/* --- breadcrumbs ---------------------------------------------------------------------------- */
.st-crumbs, .lp-crumb {
  align-items: center;
  color: var(--wobo-ink-300);
  display: flex;
  flex-wrap: wrap;
  font-size: 14px;
  gap: 4px;
  margin: 0 0 18px;
}
.st-crumbs a:hover, .lp-crumb a:hover { color: var(--wobo-ink-900); }
.st-crumbs span[aria-hidden], .lp-crumb span[aria-hidden] { color: var(--wobo-ink-300); padding-inline: 6px; }
.st-crumbs b { color: var(--wobo-ink-500); font-weight: 400; }

/* --- the help index ------------------------------------------------------------------------- */
.st-search { margin-top: 10px; max-width: 460px; position: relative; }
.st-search input {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  color: var(--wobo-ink-900);
  font: inherit;
  font-size: 15px;
  padding: 14px 46px 14px 14px;
  width: 100%;
}
.st-search input::placeholder { color: var(--wobo-ink-300); }
/* The browser's own clear affordance would sit under ours and give the field two of them. */
.st-search input::-webkit-search-cancel-button { appearance: none; display: none; }
.st-search input:hover { border-color: var(--wobo-hairline-on-paper-strong); }
.st-search-clear {
  align-items: center;
  background: none;
  border: 0;
  color: var(--wobo-ink-300);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 14px;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
}
.st-search-clear:hover { color: var(--wobo-ink-900); }
.st-count { color: var(--wobo-ink-500); font-size: 14px; margin: 12px 0 0; }
.st-search-label { display: block; margin-top: 26px; }

.st-groups { display: grid; gap: 22px 26px; grid-template-columns: repeat(3, 1fr); margin-top: 6px; }
.st-group { border-top: var(--lp-hair); display: flex; flex-direction: column; padding-top: 18px; }
.st-group h2 { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin: 14px 0 6px; }
.st-group p { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.6; margin: 0 0 14px; }
.st-mark { color: var(--wobo-ultramarine); display: block; height: 26px; }

.st-list { display: flex; flex-direction: column; }
.st-list a {
  align-items: center;
  border-top: var(--lp-hair);
  color: var(--wobo-ink-700);
  display: flex;
  flex-wrap: wrap;
  font-size: 14.5px;
  min-height: 44px;
  padding: 11px 0;
  transition: color 160ms ease, padding-left 160ms ease;
}
.st-list a:first-child { border-top: 0; }
.st-list a:hover { color: var(--wobo-ultramarine); padding-left: 4px; }
.st-list a[aria-current='page'] { color: var(--wobo-ink-900); font-weight: 600; }
.st-list small { color: var(--wobo-ink-500); display: block; font-size: 14px; margin-top: 3px; width: 100%; }

/* --- search results ------------------------------------------------------------------------- */
.st-results { display: flex; flex-direction: column; margin-top: 6px; }
.st-result {
  border-top: var(--lp-hair);
  display: block;
  padding: 16px 0;
  transition: padding-left 160ms ease;
}
.st-result:hover { padding-left: 4px; }
.st-result b { color: var(--wobo-ink-900); display: block; font-size: 15.5px; font-weight: 600; }
.st-result span { color: var(--wobo-ink-500); display: block; font-size: 14px; line-height: 1.55; margin-top: 5px; }
.st-result em { color: var(--wobo-ink-300); display: block; font-size: 14px; font-style: normal; letter-spacing: 0.08em; margin-bottom: 6px; text-transform: uppercase; }
.st-empty { color: var(--wobo-ink-500); font-size: 15px; line-height: 1.6; margin-top: 26px; max-width: 52ch; }

/* --- an article ----------------------------------------------------------------------------- */
.st-article { display: grid; gap: clamp(28px, 5vw, 64px); grid-template-columns: minmax(0, 1fr) 260px; }
.st-aside { align-self: start; position: sticky; top: 84px; }
.st-aside h2 { color: var(--wobo-ink-300); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; margin: 0 0 12px; text-transform: uppercase; }
.st-aside + .st-aside { margin-top: 30px; }
.st-ask { border-top: var(--lp-hair); margin-top: 30px; padding-top: 22px; }
.st-ask p { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.6; margin: 0 0 14px; }
.st-next { border-top: var(--lp-hair); margin-top: 34px; padding-top: 20px; }
.st-next span { color: var(--wobo-ink-300); display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; margin-bottom: 8px; text-transform: uppercase; }
.st-next a { color: var(--wobo-ink-900); font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
.st-next a:hover { color: var(--wobo-ultramarine); }

/* --- about ---------------------------------------------------------------------------------- */
.st-hero { padding-block: clamp(44px, 7vw, 88px) clamp(22px, 3vw, 34px); }
.st-hero .lp-h1 { max-width: 12ch; }
/* A reference page announces itself; it does not sell. */
.st-hero--doc .lp-h1 { font-size: clamp(30px, 4vw, 50px); max-width: 16ch; }
/* Sits under a hero that has already opened the page, so it does not open it a second time. */
.st-section--flush { padding-top: clamp(22px, 3vw, 34px); }
/* The one drawn mark on the page: Wobo underlines the headline as the page settles. It is a stroke
   of the same ink the field and the nib use, drawn by dash offset rather than by a script. */
.st-underline { display: block; height: 14px; margin: 2px 0 22px; max-width: 320px; overflow: visible; width: 62%; }
.st-underline path {
  animation: st-draw 900ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
  fill: none;
  stroke: var(--wobo-ultramarine);
  stroke-dasharray: 340;
  stroke-linecap: round;
  stroke-width: 3;
}
@keyframes st-draw { from { stroke-dashoffset: 340; } to { stroke-dashoffset: 0; } }

.st-pull {
  border-left: 0.5px solid var(--wobo-ultramarine);
  color: var(--wobo-ink-900);
  font-size: clamp(19px, 2.2vw, 26px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.35;
  margin: 30px 0 0;
  max-width: 30ch;
  padding-left: 20px;
}
.st-split { display: grid; gap: clamp(26px, 4vw, 56px); grid-template-columns: 1fr 1fr; align-items: start; }
.st-points { counter-reset: st-point; display: grid; gap: 26px; grid-template-columns: 1fr 1fr; list-style: none; margin: 32px 0 0; padding: 0; }
.st-points li { border-top: var(--lp-hair); padding-top: 16px; }
.st-points li::before {
  color: var(--wobo-ink-300);
  content: '0' counter(st-point);
  counter-increment: st-point;
  display: block;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
.st-points p { color: var(--wobo-ink-500); font-size: 14.5px; line-height: 1.6; margin: 0; }
.st-points strong { color: var(--wobo-ink-900); display: block; font-weight: 600; margin-bottom: 5px; }
.st-honesty { border: 0.5px solid var(--wobo-card-border); border-radius: ${radius.sm}px; color: var(--wobo-ink-500); font-size: 14px; line-height: 1.6; margin-top: 26px; max-width: 60ch; padding: 18px 20px; }
/* A board is a board, not a banner: held to a width a drawing composes at, and labelled, because a
   live demonstration nobody can name is a shape in a box. */
.st-board { margin-top: 26px; max-width: 760px; }
.st-board-cap { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.6; margin: 12px 0 0; max-width: 60ch; }
.st-contact { color: var(--wobo-ink-500); font-size: 14px; line-height: 1.7; }
.st-contact a { border-bottom: 0.5px solid var(--wobo-card-border); }
.st-contact a:hover { border-bottom-color: var(--wobo-ultramarine); color: var(--wobo-ultramarine); }
.st-contact-links { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 14px; }
.st-hand-note { font-family: ${fontFamily.handwritten}; }

/* --- the document surfaces (legal, plans, gift) ---------------------------------------------- */
.lp-head { padding-block: clamp(28px, 5vw, 56px) 0; }
.lp-head .lp-h1x {
  font-size: clamp(30px, 4.6vw, 54px);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.04;
  margin: 0 0 14px;
  max-width: 20ch;
}

/* --- a hairline card, the one container shape these pages use --- */
.lp-panel {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: ${radius.sm}px;
  padding: clamp(18px, 2.4vw, 26px);
}
.lp-panel--pigment { border-color: var(--wobo-ultramarine); }
.lp-panel h3 { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 8px; }
.lp-panel p { color: var(--wobo-ink-500); font-size: 14.5px; line-height: 1.62; margin: 0; }
.lp-mark { color: var(--wobo-ink-300); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }

/* --- prose: the shape reviewed copy renders into --- */
.lp-prose { color: var(--wobo-ink-700); font-size: 15.5px; line-height: 1.68; max-width: 68ch; }
.lp-prose h2 { font-size: clamp(19px, 2vw, 24px); font-weight: 600; letter-spacing: -0.02em; margin: 44px 0 12px; scroll-margin-top: 84px; }
.lp-prose h3 { font-size: 16.5px; font-weight: 600; margin: 28px 0 8px; scroll-margin-top: 84px; }
.lp-prose h2:first-child, .lp-prose h3:first-child { margin-top: 0; }
.lp-prose p { margin: 0 0 14px; }
.lp-prose ul, .lp-prose ol { margin: 0 0 16px; padding-left: 20px; }
.lp-prose li { margin-bottom: 7px; }
.lp-prose strong { color: var(--wobo-ink-900); font-weight: 600; }
.lp-prose a { color: var(--wobo-ultramarine); text-underline-offset: 3px; text-decoration: underline; }
.lp-prose code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
.lp-prose hr { border: 0; border-top: var(--lp-hair); margin: 34px 0; }
.lp-scroll { -webkit-overflow-scrolling: touch; margin: 0 0 18px; overflow-x: auto; }
.lp-grid { border-collapse: collapse; font-size: 14.5px; min-width: 100%; width: max-content; }
.lp-grid th, .lp-grid td { border-bottom: var(--lp-hair); padding: 11px 16px 11px 0; text-align: left; vertical-align: top; }
.lp-grid th { color: var(--wobo-ink-300); font-size: 11.5px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
.lp-grid td { color: var(--wobo-ink-500); }
.lp-grid td:first-child { color: var(--wobo-ink-900); }

/* --- the plain-words box: a hairline card, never a coloured panel --- */
.lp-plain {
  border: 0.5px solid var(--wobo-card-border);
  border-left: 2px solid var(--wobo-ultramarine);
  border-radius: ${radius.sm}px;
  margin: 0 0 30px;
  padding: clamp(18px, 2.4vw, 26px);
}
.lp-plain p { color: var(--wobo-ink-700); font-size: 15.5px; line-height: 1.66; margin: 0 0 12px; }
.lp-plain p:last-child { margin-bottom: 0; }
.lp-plain .lp-hand { display: block; margin-bottom: 10px; }

/* --- the document column and its contents --- */
.lp-doc { display: grid; gap: clamp(26px, 4vw, 56px); grid-template-columns: 220px minmax(0, 1fr); padding-block: clamp(26px, 4vw, 44px) clamp(56px, 8vw, 96px); }
.lp-toc { align-self: start; position: sticky; top: 78px; }
.lp-toc ol { list-style: none; margin: 10px 0 0; padding: 0; }
.lp-toc li { border-top: var(--lp-hair); }
.lp-toc a { align-items: center; color: var(--wobo-ink-500); display: flex; font-size: 14px; line-height: 1.4; min-height: 44px; padding: 9px 0; }
.lp-toc a:hover { color: var(--wobo-ultramarine); }
.lp-meta { color: var(--wobo-ink-500); display: flex; flex-wrap: wrap; font-size: 14px; gap: 6px 18px; margin: 0 0 22px; }
.lp-meta b { color: var(--wobo-ink-900); font-weight: 500; }

/* --- lists of links (the legal index) --- */
.lp-rows { border-top: var(--lp-hair); margin-top: 28px; }
.lp-row { align-items: baseline; border-bottom: var(--lp-hair); display: grid; gap: 6px 24px; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(0, 0.9fr); padding: 18px 0; transition: color 160ms ease; }
.lp-row:hover .lp-row-title { color: var(--wobo-ultramarine); }
.lp-row-title { font-size: 16.5px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
.lp-row-what { color: var(--wobo-ink-500); font-size: 14.5px; line-height: 1.6; margin: 0; }
.lp-row-who { color: var(--wobo-ink-500); font-size: 14px; margin: 0; }

/* --- /contact ---------------------------------------------------------------------------------
   A form that composes a message for the visitor's own mail app, beside every address it could go
   to. The column shape is a CLASS and not an inline style, so the breakpoint below can flatten it:
   an inline style would outrank the media query and leave a 300px sidebar on a 360px phone. */
.lp-doc--contact { grid-template-columns: minmax(0, 1fr) 300px; }
.ct-field { margin: 0 0 22px; max-width: 46ch; }
.ct-label { color: var(--wobo-ink-500); display: block; font-size: 14px; margin: 0 0 8px; }
.ct-input {
  background: var(--wobo-card);
  border: 0.5px solid var(--wobo-card-border);
  border-radius: 3px;
  color: var(--wobo-ink-900);
  font: inherit;
  font-size: 15px;
  min-height: 44px;
  padding: 12px 14px;
  width: 100%;
}
.ct-input:hover { border-color: var(--wobo-hairline-on-paper-strong); }
.ct-textarea { line-height: 1.6; min-height: 180px; resize: vertical; }
.ct-mail { align-items: center; color: var(--wobo-ultramarine); display: inline-flex; min-height: 44px; }
.ct-what { color: var(--wobo-ink-500); display: block; font-size: 14px; line-height: 1.55; }

/* --- device agnostic (WOBO-PLAN §18) --------------------------------------------------------- */
@media (max-width: 980px) {
  .st-article, .st-split, .st-points, .lp-doc--contact { grid-template-columns: 1fr; }
  .st-groups { grid-template-columns: 1fr 1fr; }
  .st-aside { position: static; }
  .lp-doc { grid-template-columns: 1fr; }
  .lp-toc { position: static; }
  .lp-row { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  /* The landing bar hides its links below 680px because they are anchors into the page under it.
     On a public page they are the ONLY way from one document to another, so they wrap onto a
     second row instead of disappearing. This is the public site's mobile navigation. */
  .st .lp-nav .lp-wrap { flex-wrap: wrap; row-gap: 8px; }
  .st .lp-nav-links { column-gap: 18px; display: flex; flex-wrap: wrap; font-size: 14px; order: 3; row-gap: 0; width: 100%; }
  .st .lp-nav-right .lp-btn--ghost { display: none; }
  .st-groups { grid-template-columns: 1fr; }
  .st-underline { width: 78%; }
  .st-doc { font-size: 15px; }
}
@media (prefers-reduced-motion: reduce) {
  .st-underline path { animation: none; stroke-dashoffset: 0; }
  .st-list a, .st-result, .st-search input, .st-skip, .lp-row { transition: none; }
}

/* --- print: a legal page has to survive being printed and filed ------------------------------ */
@media print {
  .lp-nav, .lp-footer, .lp-toc, .lp-trail, .lp-nib, .st-skip, .lp-field, .lp-print-hide { display: none !important; }
  .lp { background: #fff; color: #000; }
  .lp-doc { display: block; padding: 0; }
  .lp-prose, .st-doc { max-width: none; }
  .lp-prose h2, .lp-prose h3 { break-after: avoid; }
  .lp-prose p, .lp-prose li, .lp-plain { break-inside: avoid; }
  .lp-plain, .lp-panel { border: 1px solid #000; }
  /* A section that was never scrolled into view still rests at REST_OPACITY, and Reveal writes
     that as an INLINE style — so without !important a printed /plans or /gift comes out of the
     printer grey and shifted down the page. Printing has no scroll and no viewport to settle
     against, so every section prints settled. */
  .lp-reveal { opacity: 1 !important; transform: none !important; }
}

/* --- the accessibility floor (WOBO-PLAN §18) -------------------------------------------------
   Written once, scoped to the public shell, so raising it raises every public page at the same
   time. The landing sheet sets several of these below the floor for its own reasons; a public
   document page is read, not skimmed, and overrides them here rather than forking the sheet. */
.st .lp-note, .st .lp-cta small, .st .lp-footer, .st .lp-price-note, .st .lp-tier-cadence,
.st .lp-eyebrow, .st .lp-chip { font-size: 14px; }
.st .lp-eyebrow, .st .lp-mark { letter-spacing: 0.12em; }
.st .lp-btn { min-height: 44px; }
/* Every standalone link in the chrome is a thumb target, not a word in a sentence. Inline links
   inside prose are deliberately excluded: they are read, and padding them would break the line. */
.st .lp-nav-links a, .st .lp-footer-links a, .st .st-crumbs a, .st .lp-crumb a, .st .lp-home,
.st .st-contact-links a, .st .st-next a {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  min-height: 44px;
  /* Both dimensions: a four-letter link ("Gift", "Terms") clears 44px of height and still leaves
     a 35px-wide target, which is the half of the rule that actually gets missed by a thumb. */
  min-width: 44px;
}
.st .lp-footer { align-items: center; }
.st .lp-footer-links { column-gap: 18px; row-gap: 0; }
`;

/**
 * Inject the landing stylesheet and this one, once per document, in that order.
 *
 * The order is the point: this sheet overrides a handful of landing declarations and both are
 * plain `<style>` elements, so the landing sheet has to be in the document first whether the
 * visitor arrived here from the landing page or straight from a bookmark.
 */
export function ensureSiteStyles(): void {
  if (typeof document === 'undefined') return;
  ensureLandingStyles();
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SITE_CSS;
  document.head.appendChild(style);
}
