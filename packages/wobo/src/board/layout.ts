/**
 * The layout engine (docs/BOARD.md §7, WOBO-TASKS 5.4) — she gives layout *hints*; this places the
 * objects so nothing collides.
 *
 * Two jobs. Labels: a written note beside a shape goes to the first side that is free, with a real
 * margin, never on top of the thing it names. Flow: a derivation written line by line fills the
 * board in reading order, and when the board fills, the camera follows instead of the ink piling up.
 *
 * All pure, all in board units.
 */

import { type BoardFrame, type BoardRect, boardHeight, boxesOverlap, unionBox } from './anchors';
import { BOARD_UNITS } from './schema';

/** The clear space a label keeps from what it names, in board units. */
export const LABEL_MARGIN = 10;
/** The clear space two placed objects keep from each other. */
export const OBJECT_GAP = 14;
/** The board's own breathing room — the screen breathes (DESIGN.md §2). */
export const BOARD_PADDING = 28;

export interface Size {
  w: number;
  h: number;
}

/** The whole board as a box, for a surface of this frame. */
export function boardArea(frame: BoardFrame): BoardRect {
  return { x: 0, y: 0, w: BOARD_UNITS, h: boardHeight(frame) };
}

function contains(area: BoardRect, box: BoardRect): boolean {
  return (
    box.x >= area.x &&
    box.y >= area.y &&
    box.x + box.w <= area.x + area.w &&
    box.y + box.h <= area.y + area.h
  );
}

function clashes(box: BoardRect, occupied: BoardRect[], gap: number): boolean {
  return occupied.some((o) => boxesOverlap(box, o, gap));
}

/** The candidate positions for a label around what it names, in the order a tutor would try them. */
function labelCandidates(anchor: BoardRect, size: Size, margin: number): BoardRect[] {
  const midY = anchor.y + anchor.h / 2 - size.h / 2;
  const midX = anchor.x + anchor.w / 2 - size.w / 2;
  return [
    { x: anchor.x + anchor.w + margin, y: midY, ...size },
    { x: midX, y: anchor.y - margin - size.h, ...size },
    { x: midX, y: anchor.y + anchor.h + margin, ...size },
    { x: anchor.x - margin - size.w, y: midY, ...size },
    { x: anchor.x + anchor.w + margin, y: anchor.y - margin - size.h, ...size },
    { x: anchor.x + anchor.w + margin, y: anchor.y + anchor.h + margin, ...size },
  ];
}

/**
 * Place a label beside what it names: the first side that is inside the board and clear of
 * everything already drawn. If every side is taken, it goes to the right and is pushed down until
 * it is clear — a tutor writing in the margin, never over the working.
 */
export function placeLabel(
  anchor: BoardRect,
  size: Size,
  occupied: BoardRect[] = [],
  area?: BoardRect,
  margin = LABEL_MARGIN,
): BoardRect {
  const bounds = area ?? { x: 0, y: 0, w: BOARD_UNITS, h: Number.POSITIVE_INFINITY };
  for (const candidate of labelCandidates(anchor, size, margin)) {
    if (contains(bounds, candidate) && !clashes(candidate, occupied, margin * 0.5))
      return candidate;
  }
  const fallback: BoardRect = {
    x: Math.min(anchor.x + anchor.w + margin, bounds.x + bounds.w - size.w),
    y: anchor.y,
    ...size,
  };
  let guard = 0;
  while (clashes(fallback, occupied, margin * 0.5) && guard++ < 200) {
    fallback.y += size.h + margin;
  }
  return fallback;
}

/**
 * Nudge already-sized boxes apart, keeping their reading order. Each box moves down (never up, so
 * a derivation stays in the order it was written) until it clears everything placed before it.
 */
export function avoidCollisions(boxes: BoardRect[], gap = OBJECT_GAP): BoardRect[] {
  const placed: BoardRect[] = [];
  for (const box of boxes) {
    const next = { ...box };
    let guard = 0;
    while (clashes(next, placed, gap) && guard++ < 400) {
      const blocker = placed.find((o) => boxesOverlap(next, o, gap));
      if (!blocker) break;
      next.y = blocker.y + blocker.h + gap;
    }
    placed.push(next);
  }
  return placed;
}

/**
 * Lay a sequence of sized items out in reading order inside an area: left to right, wrapping to a
 * new row when the row is full. A derivation, a row of cards, a table of terms.
 */
export function flowRows(items: Size[], area: BoardRect, gap = OBJECT_GAP): BoardRect[] {
  const out: BoardRect[] = [];
  let x = area.x;
  let y = area.y;
  let rowHeight = 0;
  for (const item of items) {
    if (x > area.x && x + item.w > area.x + area.w) {
      x = area.x;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    out.push({ x, y, w: item.w, h: item.h });
    x += item.w + gap;
    rowHeight = Math.max(rowHeight, item.h);
  }
  return out;
}

/** The box every drawn thing fits inside — what the camera has to show. */
export function contentBounds(boxes: BoardRect[], padding = BOARD_PADDING): BoardRect | null {
  const union = unionBox(boxes.filter((b) => Number.isFinite(b.x) && Number.isFinite(b.y)));
  if (!union) return null;
  return {
    x: union.x - padding,
    y: union.y - padding,
    w: union.w + padding * 2,
    h: union.h + padding * 2,
  };
}

export interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

export const RESTING_CAMERA: Camera = { zoom: 1, panX: 0, panY: 0 };

/**
 * The camera that shows `bounds` on this surface. She never zooms in past life size — a board that
 * is half full stays half full rather than blowing one line up to fill the screen — and it only
 * pans as far as it has to. This is the auto-scroll-and-zoom of a board that is filling up.
 */
export function fitCamera(
  bounds: BoardRect | null,
  frame: BoardFrame,
  opts?: { minZoom?: number },
): Camera {
  if (!bounds) return RESTING_CAMERA;
  const viewH = boardHeight({ ...frame, zoom: 1 });
  const minZoom = opts?.minZoom ?? 0.35;
  const needed = Math.min(BOARD_UNITS / Math.max(bounds.w, 1), viewH / Math.max(bounds.h, 1));
  const zoom = Math.max(minZoom, Math.min(1, needed));
  const shownW = BOARD_UNITS / zoom;
  const shownH = viewH / zoom;
  const panX = bounds.w >= shownW ? bounds.x : bounds.x - (shownW - bounds.w) / 2;
  const panY = bounds.h >= shownH ? bounds.y : bounds.y - (shownH - bounds.h) / 2;
  return { zoom, panX, panY };
}

/** True when the ink has outgrown the resting view and the camera has to move. */
export function needsCamera(bounds: BoardRect | null, frame: BoardFrame): boolean {
  if (!bounds) return false;
  const viewH = boardHeight({ ...frame, zoom: 1 });
  return (
    bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.w > BOARD_UNITS || bounds.y + bounds.h > viewH
  );
}
