/**
 * Focus objects — what the learner pointed at (docs/WOBO-PLAN.md §1, docs/WOBO-TASKS.md §5.2).
 *
 * A gesture (a selection, a circle, a hold, a hotkey) resolves against the surface registry into
 * one structured object: which targets are inside it, the text and the numbers it contains, its
 * rect, and the owning surface's state. Never a screenshot of our own UI — we read the registry,
 * so she is never off by one.
 *
 * Everything here is geometry and grammar, unit-tested without a browser. The one window it reads
 * is the page's scroll offset at the moment a focus is made (:func:`pageScroll`), because a rect in
 * viewport pixels is meaningless without knowing where the page was when it was measured.
 */

import type { Rect, ResolvedSurface, SurfaceTarget } from './registry';

export type FocusKind =
  /** A text selection, by mouse or keyboard. */
  | 'selection'
  /** A freehand circle drawn with the cursor. */
  | 'lasso'
  /** The pointer rested on something for a beat. */
  | 'hover'
  /** A long press on touch. */
  | 'longpress'
  /** A two-finger circle on touch. */
  | 'circle'
  /** The hold-to-talk hotkey, with whatever was selected or hovered. */
  | 'hotkey'
  /** A stroke the learner drew on the ink layer. */
  | 'ink';

export interface Point {
  x: number;
  y: number;
}

/**
 * The thing the learner is asking about. `ownerState` is the owning surface's live state, read at
 * code level from the registry — never inferred from pixels.
 */
export interface FocusObject {
  id: string;
  kind: FocusKind;
  targetIds: string[];
  text: string;
  numbers: number[];
  rect: Rect;
  ownerState?: Record<string, unknown>;
  createdAt: number;
  /** The freehand path, simplified, for a lasso, a circle or a learner's stroke. */
  path?: Point[];
  /** The surface the focus sits on, when it resolved to one. */
  surfaceId?: string;
  /**
   * The page's scroll offset at the instant the gesture was made. `rect` is viewport pixels, and
   * viewport pixels go stale the moment the page moves under them — this is what lets the rect be
   * re-derived later (see :func:`focusRectNow`) when there is no registered target to read instead.
   */
  scroll?: Point;
  /**
   * Where the targets under the gesture were when it was made. Re-reading them later says exactly
   * how far this region has travelled, which is a truer answer than the page's scroll offset when
   * the thing moved inside a pane rather than with the page.
   */
  anchorRect?: Rect;
}

/** Longest text a focus carries before the packet budget gets involved. */
export const FOCUS_TEXT_MAX = 600;
/** Most numbers a focus carries; the tail is noise, not evidence. */
export const FOCUS_NUMBER_MAX = 24;
/** Most points a simplified path keeps. */
export const FOCUS_PATH_MAX = 48;

// --- Geometry ------------------------------------------------------------------------------------

export const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** The bounding box of a set of points. */
export function boundsOf(points: readonly Point[]): Rect {
  const first = points[0];
  if (!first) return EMPTY_RECT;
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** True when a point is inside a closed polygon (ray casting, edges inclusive enough for ink). */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const straddles = a.y > point.y !== b.y > point.y;
    if (!straddles) continue;
    const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < x) inside = !inside;
  }
  return inside;
}

/**
 * How closed a freehand path is: the gap between its ends as a fraction of its bounding diagonal.
 * A rough circle scores well under 0.5; a straight line scores far above it.
 */
export function pathClosure(points: readonly Point[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 3) return Number.POSITIVE_INFINITY;
  const bounds = boundsOf(points);
  const diagonal = Math.hypot(bounds.width, bounds.height);
  if (diagonal === 0) return Number.POSITIVE_INFINITY;
  return Math.hypot(last.x - first.x, last.y - first.y) / diagonal;
}

/** A freehand path reads as a circle when it comes back to where it started and encloses area. */
export function isClosedLoop(points: readonly Point[]): boolean {
  const bounds = boundsOf(points);
  if (bounds.width < 16 || bounds.height < 16) return false;
  return pathClosure(points) <= 0.45;
}

/**
 * Radial-distance simplification: keep a point only when it has moved far enough from the last one
 * kept, then always keep the last. Deterministic, cheap, and enough to keep a lasso in the packet.
 */
export function simplifyPath(
  points: readonly Point[],
  tolerance = 6,
  max = FOCUS_PATH_MAX,
): Point[] {
  const first = points[0];
  if (!first) return [];
  const kept: Point[] = [first];
  for (const p of points) {
    const last = kept[kept.length - 1] as Point;
    if (Math.hypot(p.x - last.x, p.y - last.y) >= tolerance) kept.push(p);
  }
  const last = points[points.length - 1] as Point;
  const tail = kept[kept.length - 1] as Point;
  if (tail.x !== last.x || tail.y !== last.y) kept.push(last);
  if (kept.length <= max) return kept;
  // Still too many: keep an even spread plus the ends, so the shape survives the thinning.
  const step = (kept.length - 1) / (max - 1);
  const out: Point[] = [];
  for (let i = 0; i < max; i += 1) {
    const point = kept[Math.round(i * step)];
    if (point) out.push(point);
  }
  return out;
}

// --- Text and numbers ----------------------------------------------------------------------------

const NUMBER_PATTERN = /-?\d[\d,]*(?:\.\d+)?/g;

/**
 * Every number visible in a piece of text, in order, de-duplicated. Thousands separators are
 * understood; a trailing comma is not part of the number. She quotes the learner's own numbers back,
 * so this is read from the screen and never invented.
 */
export function extractNumbers(text: string, max = FOCUS_NUMBER_MAX): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const raw = match[0].replace(/,+$/, '').replace(/,/g, '');
    const value = Number(raw);
    if (!Number.isFinite(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

/** Collapse whitespace and clamp — a focus carries evidence, not a transcript. */
export function normaliseText(text: string, max = FOCUS_TEXT_MAX): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

// --- Building a focus ----------------------------------------------------------------------------

let sequence = 0;

/** Stable, ordered focus ids. Reset between tests through `resetFocusIds`. */
export function nextFocusId(): string {
  sequence += 1;
  return `focus-${sequence}`;
}

export function resetFocusIds(): void {
  sequence = 0;
}

export interface FocusDraft {
  kind: FocusKind;
  rect: Rect;
  targetIds?: string[];
  text?: string;
  path?: readonly Point[];
  surfaceId?: string;
  ownerState?: Record<string, unknown>;
  createdAt?: number;
  /** Overridable for tests; otherwise read off the window at the moment of the gesture. */
  scroll?: Point;
  /** Where the hit targets were at the moment of the gesture. */
  anchorRect?: Rect;
}

/** Where the page is scrolled to right now. Zero everywhere there is no window to ask. */
export function pageScroll(): Point {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.scrollX || 0, y: window.scrollY || 0 };
}

/** Assemble a focus object. Numbers are derived from the text, never passed in. */
export function createFocus(draft: FocusDraft): FocusObject {
  const text = normaliseText(draft.text ?? '');
  const focus: FocusObject = {
    id: nextFocusId(),
    kind: draft.kind,
    targetIds: draft.targetIds ? [...new Set(draft.targetIds)] : [],
    text,
    numbers: extractNumbers(text),
    rect: draft.rect,
    createdAt: draft.createdAt ?? Date.now(),
    scroll: draft.scroll ?? pageScroll(),
  };
  if (draft.anchorRect) focus.anchorRect = draft.anchorRect;
  if (draft.surfaceId) focus.surfaceId = draft.surfaceId;
  if (draft.ownerState && Object.keys(draft.ownerState).length > 0) {
    focus.ownerState = draft.ownerState;
  }
  if (draft.path && draft.path.length > 1) focus.path = simplifyPath(draft.path);
  return focus;
}

/**
 * The owning surface's live state for a focus: the value each hit target publishes, keyed by id.
 * This is the code-level read that makes her exact — the same numbers the component holds.
 */
export function ownerStateOf(
  targets: readonly SurfaceTarget[],
  targetIds: readonly string[],
): Record<string, unknown> {
  const wanted = new Set(targetIds);
  const state: Record<string, unknown> = {};
  for (const target of targets) {
    if (!wanted.has(target.id) || !target.value) continue;
    try {
      const value = target.value();
      if (value !== undefined) state[target.id] = value;
    } catch {
      // A target that throws while being read simply contributes nothing this turn.
    }
  }
  return state;
}

/** The text the hit targets carry, joined in registry order — evidence, in her hands. */
export function textOfTargets(
  targets: readonly SurfaceTarget[],
  targetIds: readonly string[],
): string {
  const wanted = new Set(targetIds);
  const parts: string[] = [];
  for (const target of targets) {
    if (!wanted.has(target.id)) continue;
    let text = '';
    try {
      text = target.text?.() ?? '';
    } catch {
      text = '';
    }
    parts.push(text.trim() || target.label);
  }
  return normaliseText(parts.join(' · '));
}

/** The surface most of the hit targets belong to — the one whose state owns this focus. */
export function owningSurface(
  surfaces: readonly ResolvedSurface[],
  targetIds: readonly string[],
): ResolvedSurface | undefined {
  const wanted = new Set(targetIds);
  let best: ResolvedSurface | undefined;
  let bestCount = 0;
  for (const surface of surfaces) {
    const count = surface.targets.filter((t) => wanted.has(t.id)).length;
    if (count > bestCount) {
      best = surface;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Where the focus is NOW, rather than where it was when the learner made it.
 *
 * docs/BOARD.md §3: "Anchors are resolved at render time and re-resolved on scroll, resize, theme
 * change and layout shift ... it never floats." A `{target}` anchor obeys because the renderer reads
 * a live rect through the registry. A `{focus}` anchor was a frozen snapshot of viewport pixels, so
 * after a 300 px scroll the ring the learner drew round a video frame sat 300 units off the film.
 *
 * Two ways back to the truth, in order of how much they know:
 *   1. the targets under the gesture — their live rects say exactly where the thing went;
 *   2. failing that, the page's own scroll delta since the gesture was made.
 */
export function focusRectNow(
  focus: Pick<FocusObject, 'rect'> &
    Partial<Pick<FocusObject, 'targetIds' | 'scroll' | 'anchorRect'>>,
  opts: { target?: (id: string) => Rect | null; scroll?: Point } = {},
): Rect {
  const rect = plainRect(focus.rect) ?? EMPTY_RECT;
  // The region the learner drew is the region she marks — the targets say how far it has TRAVELLED,
  // they never replace it. Using their union instead drew a ring round the whole page when the loop
  // happened to enclose a container as well as the thing inside it.
  const then = focus.anchorRect ? plainRect(focus.anchorRect) : null;
  const now = opts.target ? anchorRectOf(focus.targetIds ?? [], opts.target) : null;
  if (then && now) {
    return { ...rect, x: rect.x + (now.x - then.x), y: rect.y + (now.y - then.y) };
  }
  // Nothing registered under it (a text selection, a bare region): the page's own scroll is the
  // only honest signal left.
  const wasAt = focus.scroll;
  const isAt = opts.scroll;
  if (wasAt && isAt) {
    return { ...rect, x: rect.x - (isAt.x - wasAt.x), y: rect.y - (isAt.y - wasAt.y) };
  }
  return rect;
}

/** The union of the live rects of these targets — the frame a focus's travel is measured against. */
export function anchorRectOf(
  targetIds: readonly string[],
  lookup: (id: string) => Rect | null,
): Rect | null {
  const boxes: Rect[] = [];
  for (const id of targetIds) {
    const rect = plainRect(lookup(id));
    if (rect && (rect.width > 0 || rect.height > 0)) boxes.push(rect);
  }
  return unionRect(boxes);
}

/**
 * A rect as four own properties, whatever shape it arrived in.
 *
 * `getBoundingClientRect()` returns a `DOMRect`, whose x/y/width/height live on the PROTOTYPE as
 * getters. Spreading one — `{...rect}` — yields `{}`, and every arithmetic on it is `NaN`, which
 * reaches the hand as a path reading `M NaN NaN`: an invisible mark that is still in the DOM. So
 * nothing here spreads a rect it did not build; it reads the four numbers by name. A rect carrying
 * anything but finite numbers is treated as no rect at all, which is the anchor law's own answer:
 * a mark whose target is gone fades out rather than floating.
 */
export function plainRect(rect: Rect | null | undefined): Rect | null {
  if (!rect) return null;
  const { x, y, width, height } = rect;
  if (![x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return { x, y, width, height };
}

function unionRect(rects: readonly Rect[]): Rect | null {
  let out: Rect | null = null;
  for (const r of rects) {
    if (!out) {
      out = { x: r.x, y: r.y, width: r.width, height: r.height };
      continue;
    }
    const x = Math.min(out.x, r.x);
    const y = Math.min(out.y, r.y);
    const right = Math.max(out.x + out.width, r.x + r.width);
    const bottom = Math.max(out.y + out.height, r.y + r.height);
    out = { x, y, width: right - x, height: bottom - y };
  }
  return out;
}

// --- Announcing ----------------------------------------------------------------------------------

const KIND_PHRASE: Record<FocusKind, string> = {
  selection: 'selected',
  lasso: 'circled',
  hover: 'resting on',
  longpress: 'held',
  circle: 'circled',
  hotkey: 'picked',
  ink: 'drawn on',
};

/**
 * What a screen reader says when a focus is made, and what the chip's accessible name describes.
 * Sentence case, no emoji, no exclamation marks — she is calm about it.
 */
export function describeFocus(focus: FocusObject): string {
  const verb = KIND_PHRASE[focus.kind];
  const subject =
    focus.text.length > 0
      ? normaliseText(focus.text, 80)
      : focus.targetIds.length > 0
        ? `${focus.targetIds.length} ${focus.targetIds.length === 1 ? 'thing' : 'things'} on screen`
        : 'a region of the screen';
  return `${verb} ${subject}. Ask Wobo about this.`;
}
