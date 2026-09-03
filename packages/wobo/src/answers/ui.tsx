'use client';

/**
 * The chrome every answer kind shares: the frame, the ring Wobo points with, the pointer plumbing
 * that makes a finger, a mouse and a stylus the same input, and the invisible layer of real buttons
 * that makes all of it reachable from a keyboard.
 *
 * The visual language is the app's, not a widget library's (DESIGN.md §2–§3): hairlines instead of
 * shadows, three-pixel corners, ultramarine on the learner's own mark and nowhere else. The ring is
 * drawn with the board's own pen, so when Wobo points at a wrong part the mark is the same hand
 * that writes on the board.
 */

import type { AnswerBox, AnswerHighlight, AnswerPoint } from '@wobo/contracts';
import type { CSSProperties, ReactNode } from 'react';
import { penRng, penStroke } from '../board/pen';

// --- The stylesheet ----------------------------------------------------------------------------------

/**
 * One stylesheet for the whole library, injected by the frame. Everything resolves through the
 * `--wobo-*` tokens, so both themes come for free and no component carries a hex literal. Reduced
 * motion is honoured here rather than in JavaScript: the only motion in the library is a fill
 * transition, and a media query turns it off without a component knowing anything about it.
 */
export const ANSWER_CSS = `
.wobo-answer{
  --wa-ink:var(--wobo-ink-900,#0D0D10);
  --wa-soft:var(--wobo-ink-500,#6E6E76);
  --wa-faint:var(--wobo-ink-300,#72727C);
  --wa-line:var(--wobo-hairline-on-paper,rgba(13,13,16,0.10));
  --wa-line-strong:var(--wobo-hairline-on-paper-strong,rgba(13,13,16,0.18));
  --wa-mark:var(--wobo-ultramarine,#1F35E0);
  --wa-wash:var(--wobo-ultramarine-wash,rgba(31,53,224,0.12));
  --wa-soft-wash:var(--wobo-ultramarine-soft,rgba(31,53,224,0.07));
  --wa-ring:var(--wobo-highlight-ink,#1F35E0);
  --wa-surface:var(--wobo-card,#FFFFFF);
  --wa-tonal:var(--wobo-tonal,#F1F1F5);
  color:var(--wa-ink);
  display:flex;flex-direction:column;gap:16px;
}
.wobo-answer *{box-sizing:border-box}
.wobo-answer-prompt{margin:0;font-size:1.05rem;line-height:1.5;color:var(--wa-ink)}
.wobo-answer-stage{position:relative;width:100%}
.wobo-answer svg{display:block;width:100%;height:auto;touch-action:none;overflow:visible}
.wobo-answer-foot{display:flex;align-items:center;gap:12px;min-height:28px}
.wobo-answer-reset{
  appearance:none;background:none;border:0;padding:4px 2px;margin:0;cursor:pointer;
  font:inherit;font-size:.85rem;color:var(--wa-soft);border-bottom:1px solid var(--wa-line-strong);
}
.wobo-answer-reset[disabled]{opacity:.4;cursor:default}
.wobo-answer-reset:hover:not([disabled]){color:var(--wa-ink)}
.wobo-answer-readout{font-size:.85rem;color:var(--wa-faint)}
.wobo-answer-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.wobo-answer-set{border:0;margin:0;padding:0;min-width:0}

.wobo-answer-part{fill:transparent;stroke:var(--wa-line-strong);stroke-width:1;transition:fill 160ms cubic-bezier(0.2,0,0,1)}
.wobo-answer-part[data-on="true"]{fill:var(--wa-wash);stroke:var(--wa-mark)}
.wobo-answer-rule{fill:none;stroke:var(--wa-line-strong);stroke-width:1}
.wobo-answer-grid{fill:none;stroke:var(--wa-line);stroke-width:.5}
.wobo-answer-ring{fill:none;stroke:var(--wa-ring);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.wobo-answer-mark{fill:var(--wa-mark);stroke:none}
.wobo-answer-stroke{fill:none;stroke:var(--wa-ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.wobo-answer-learner{fill:none;stroke:var(--wa-mark);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
/* Size is set per drawing: a text size is in the SVG's own units, so one number cannot fit
   a hundred-unit figure and a thousand-unit board at once. */
.wobo-answer-label{fill:var(--wa-faint)}

.wobo-answer-canvas{position:relative;width:100%;margin:0 auto}
.wobo-answer-canvas svg{cursor:pointer}
.wobo-answer-layer{position:absolute;inset:0;pointer-events:none}
.wobo-answer-target{
  position:absolute;appearance:none;margin:0;padding:0;border:0;background:none;
  color:transparent;font:inherit;pointer-events:none;border-radius:3px;
}
.wobo-answer-target:focus-visible{outline:2px solid var(--wa-mark);outline-offset:0}

.wobo-answer-btn{
  appearance:none;font:inherit;cursor:pointer;color:var(--wa-ink);
  background:var(--wa-surface);border:1px solid var(--wa-line-strong);border-radius:3px;
  padding:10px 12px;min-height:44px;min-width:44px;transition:background 160ms cubic-bezier(0.2,0,0,1);
}
.wobo-answer-btn:hover{background:var(--wa-tonal)}
.wobo-answer-btn:focus-visible{outline:2px solid var(--wa-mark);outline-offset:2px}
.wobo-answer-btn[aria-checked="true"],.wobo-answer-btn[aria-pressed="true"],.wobo-answer-btn[data-on="true"]{
  border-color:var(--wa-mark);background:var(--wa-soft-wash);
}
.wobo-answer-btn[aria-disabled="true"]{opacity:.45;cursor:default}

.wobo-answer-pad{display:grid;grid-template-columns:repeat(3,minmax(48px,1fr));gap:8px;max-width:260px}
.wobo-answer-keys{display:flex;flex-wrap:wrap;gap:8px}
.wobo-answer-cards{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.wobo-answer-cards[data-axis="horizontal"]{flex-direction:row;flex-wrap:wrap}
.wobo-answer-card{
  display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:48px;cursor:grab;
  background:var(--wa-surface);border:1px solid var(--wa-line-strong);border-radius:3px;
}
.wobo-answer-card[data-dragging="true"]{cursor:grabbing;border-color:var(--wa-mark)}
.wobo-answer-card[aria-selected="true"]{border-color:var(--wa-mark)}
.wobo-answer-card[data-ringed="true"]{outline:1.5px solid var(--wa-ring);outline-offset:2px}
.wobo-answer-rank{font-variant-numeric:tabular-nums;color:var(--wa-faint);min-width:1.4em}
.wobo-answer-columns{display:grid;grid-template-columns:1fr 1fr;gap:32px;position:relative;border:0;margin:0;padding:0;min-width:0}
.wobo-answer-column{display:flex;flex-direction:column;gap:8px}
.wobo-answer-wires{position:absolute;inset:0;pointer-events:none}
.wobo-answer-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:12px;border:0;margin:0;padding:0;min-width:0}
.wobo-answer-option{display:flex;flex-direction:column;gap:8px;align-items:stretch;padding:12px}
.wobo-answer-option-name{font-size:.85rem;color:var(--wa-soft);text-align:left}
.wobo-answer-display{
  min-height:64px;display:flex;align-items:center;justify-content:flex-start;gap:8px;
  padding:8px 12px;border-bottom:1px solid var(--wa-line-strong);
}
@media (prefers-reduced-motion: reduce){
  .wobo-answer-part{transition:none}
  .wobo-answer-btn{transition:none}
}
`;

// --- The frame ---------------------------------------------------------------------------------------

export interface AnswerFrameProps {
  /** The question, when the item carries one on the control rather than above it. */
  prompt?: string;
  /** Read after every move, so a screen-reader user knows what the control now holds. */
  readout: string;
  /** "Start over" is part of the control's contract; "Check" is the host's one primary button. */
  onReset: () => void;
  canReset: boolean;
  children: ReactNode;
}

/**
 * Prompt, control, and the one affordance every kind owes the learner: a way back to the start.
 *
 * The Check button is deliberately NOT here. There is exactly one primary control on the screen and
 * the host owns it, so a page with two answer controls cannot grow two primary buttons.
 */
export function AnswerFrame({
  prompt,
  readout,
  onReset,
  canReset,
  children,
}: AnswerFrameProps): ReactNode {
  return (
    <div className="wobo-answer">
      <style>{ANSWER_CSS}</style>
      {prompt ? <p className="wobo-answer-prompt">{prompt}</p> : null}
      <div className="wobo-answer-stage">{children}</div>
      <div className="wobo-answer-foot">
        <button type="button" className="wobo-answer-reset" onClick={onReset} disabled={!canReset}>
          Start over
        </button>
        <span className="wobo-answer-readout" aria-live="polite">
          {readout}
        </span>
      </div>
    </div>
  );
}

// --- The drawn surface and its keyboard layer ----------------------------------------------------------

/**
 * A drawn figure and the invisible buttons over it.
 *
 * The pointer works on the SVG, which hit-tests with the same geometry the checker uses, so a tap,
 * a drag and a stylus all land on the real shape rather than on a rectangle approximating it. The
 * keyboard and the screen reader work on `<button>` elements laid over that figure: real controls
 * with real roles, `pointer-events: none` so they never intercept the pointer, and no visible box
 * of their own until they are focused.
 *
 * This is the board's own pattern (`renderer.tsx` mounts native controls over the ink) for the same
 * reason: an SVG shape with a `role` bolted on is a widget assistive technology has to be taught,
 * and a button is one it already knows.
 */
export function AnswerCanvas({
  maxWidth,
  children,
  targets,
}: {
  maxWidth?: number;
  children: ReactNode;
  targets?: ReactNode;
}): ReactNode {
  return (
    <div className="wobo-answer-canvas" style={maxWidth ? { maxWidth } : undefined}>
      {children}
      {targets ? <div className="wobo-answer-layer">{targets}</div> : null}
    </div>
  );
}

/** Place a target over a box of the drawing, as a share of the view it is drawn in. */
export function targetStyle(box: AnswerBox, view: AnswerBox): CSSProperties {
  return {
    left: `${((box[0] - view[0]) / view[2]) * 100}%`,
    top: `${((box[1] - view[1]) / view[3]) * 100}%`,
    width: `${(box[2] / view[2]) * 100}%`,
    height: `${(box[3] / view[3]) * 100}%`,
  };
}

/** A square target of `size` view-units centred on a point — for a wedge, a vertex, a marker. */
export function pointTargetStyle(at: AnswerPoint, size: number, view: AnswerBox): CSSProperties {
  return targetStyle([at[0] - size / 2, at[1] - size / 2, size, size], view);
}

// --- Keys ----------------------------------------------------------------------------------------------

/** An item paired with a stable key and the index the state addresses it by. */
export interface Keyed<T> {
  value: T;
  key: string;
  index: number;
}

/**
 * Content-derived keys for a list whose items have no id of their own — dropped points, drawn
 * vertices, rings. Two identical values get a repeat counter, so the keys stay unique without
 * falling back to the array index (which changes meaning the moment a point is removed).
 */
export function keyed<T>(items: readonly T[], of: (item: T) => string): Keyed<T>[] {
  const seen = new Map<string, number>();
  return items.map((value, index) => {
    const base = of(value);
    const repeat = seen.get(base) ?? 0;
    seen.set(base, repeat + 1);
    return { value, index, key: repeat === 0 ? base : `${base}#${repeat}` };
  });
}

// --- Wobo's ring ---------------------------------------------------------------------------------------

/** The clear air the ring keeps off the thing it rings, in the drawing's own units. */
const RING_PAD = 3;

/**
 * A hand-wobbled ring around a box, drawn with the board's own pen so a highlight on a control and
 * a highlight on the board are visibly the same mark.
 */
export function ringPath(box: AnswerBox, seed: string): string {
  const [x, y, w, h] = box;
  const left = x - RING_PAD;
  const top = y - RING_PAD;
  const right = x + w + RING_PAD;
  const bottom = y + h + RING_PAD;
  const corners: AnswerPoint[] = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
  const span = Math.max(w, h) || 1;
  return penStroke(corners, penRng(seed), {
    closed: true,
    wobble: Math.min(2.4, span * 0.02),
    spacing: Math.max(4, span / 8),
  }).d;
}

/** A ring around a point, for a dropped point or a drawn vertex. */
export function ringAt(at: AnswerPoint, radius: number, seed: string): string {
  const points: AnswerPoint[] = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return [at[0] + Math.cos(a) * radius, at[1] + Math.sin(a) * radius];
  });
  return penStroke(points, penRng(seed), {
    closed: true,
    wobble: radius * 0.08,
    spacing: Math.max(2, radius / 3),
  }).d;
}

/** Ring one box inside an SVG. */
export function BoxRing({ box, seed }: { box: AnswerBox; seed: string }): ReactNode {
  return <path className="wobo-answer-ring" d={ringPath(box, seed)} />;
}

/** Ring one point inside an SVG. */
export function PointRing({
  at,
  radius,
  seed,
}: {
  at: AnswerPoint;
  radius: number;
  seed: string;
}): ReactNode {
  return <path className="wobo-answer-ring" d={ringAt(at, radius, seed)} />;
}

/** Pull the highlights of one shape out of a check result. */
export function highlightsOf<K extends AnswerHighlight['on']>(
  result: { highlight: AnswerHighlight[] } | null | undefined,
  on: K,
): Extract<AnswerHighlight, { on: K }>[] {
  if (!result) return [];
  return result.highlight.filter((h): h is Extract<AnswerHighlight, { on: K }> => h.on === on);
}

// --- Pointer plumbing ------------------------------------------------------------------------------------

/**
 * A client point in an SVG's own units.
 *
 * Every SVG in this library is given an `aspect-ratio` equal to its viewBox, so the mapping is a
 * plain linear scale — no `getScreenCTM`, which returns null in a detached tree and cannot be
 * exercised in a unit test.
 */
export function svgPoint(
  el: SVGSVGElement,
  client: { clientX: number; clientY: number },
  view: AnswerBox,
): AnswerPoint {
  const rect = el.getBoundingClientRect();
  const w = rect.width || 1;
  const h = rect.height || 1;
  return [
    view[0] + ((client.clientX - rect.left) / w) * view[2],
    view[1] + ((client.clientY - rect.top) / h) * view[3],
  ];
}
