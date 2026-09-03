/**
 * The pure geometry every answer kind shares: how a figure is cut into parts, and how a freehand
 * path is read back as a segment, an angle or a shape.
 *
 * Nothing here touches React or the DOM, which is the whole point — the same partition the control
 * draws is the partition `check` counts, and the brain can run either half server-side. Where the
 * board already has a helper (`distance`, `polylineLength`, `pointInPolygon`) this file calls it
 * rather than growing a second copy that can drift.
 */

import type { AnswerBox, AnswerFigure, AnswerPoint } from '@wobo/contracts';
import { distance, polylineLength } from '../board/pen';
import { boundsOf, type Point, pathClosure, pointInPolygon } from '../focus';

/** The default box a figure is laid out in: a hundred-unit square, scaled by whoever draws it. */
export const FIGURE_BOX: AnswerBox = [0, 0, 100, 100];

/** One numbered part of a partitioned figure, ready to draw and ready to hit-test. */
export interface PartGeometry {
  index: number;
  /** The part's outline as an SVG path, in the figure's own box units. */
  d: string;
  /** Where a ring, a label or Wobo's pen should land. */
  center: AnswerPoint;
  /** The part's bounding box — what a keyboard focus ring and a highlight use. */
  box: AnswerBox;
}

const toPoint = (p: AnswerPoint): Point => ({ x: p[0], y: p[1] });
const round = (n: number): number => Math.round(n * 1000) / 1000;

/** How many parts this figure has. The one definition — the control and the checker share it. */
export function partCount(figure: AnswerFigure): number {
  return figure.shape === 'grid' ? figure.rows * figure.cols : figure.parts;
}

/**
 * A grid cell's corner, as a share of its shorter side: the prototype tiles a 110px cell at 14px
 * (design/prototypes/app-v1.html, `.grid4 button`), so the cells read as rounded tiles on an ink
 * ground rather than as graph paper (DESIGN.md §2: nothing sharp).
 */
export const GRID_CORNER = 14 / 110;

function rectPart(
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  corner = 0,
): PartGeometry {
  const r = round(Math.min(corner, w / 2, h / 2));
  const d =
    r > 0
      ? [
          `M ${round(x + r)} ${round(y)}`,
          `H ${round(x + w - r)}`,
          `A ${r} ${r} 0 0 1 ${round(x + w)} ${round(y + r)}`,
          `V ${round(y + h - r)}`,
          `A ${r} ${r} 0 0 1 ${round(x + w - r)} ${round(y + h)}`,
          `H ${round(x + r)}`,
          `A ${r} ${r} 0 0 1 ${round(x)} ${round(y + h - r)}`,
          `V ${round(y + r)}`,
          `A ${r} ${r} 0 0 1 ${round(x + r)} ${round(y)}`,
          'Z',
        ].join(' ')
      : `M ${round(x)} ${round(y)} H ${round(x + w)} V ${round(y + h)} H ${round(x)} Z`;
  return {
    index,
    d,
    center: [round(x + w / 2), round(y + h / 2)],
    box: [round(x), round(y), round(w), round(h)],
  };
}

/**
 * The parts of a figure, in reading order: left-to-right then top-to-bottom on a grid, clockwise
 * from twelve on a pie, left-to-right on a bar or a number line.
 *
 * A number line's parts are the intervals BETWEEN its ticks, drawn as a band sitting on the rule —
 * shading "one third" on a line means shading an interval, not a tick.
 */
export function figureParts(figure: AnswerFigure, box: AnswerBox = FIGURE_BOX): PartGeometry[] {
  const [bx, by, bw, bh] = box;
  if (figure.shape === 'grid') {
    const w = bw / figure.cols;
    const h = bh / figure.rows;
    const corner = Math.min(w, h) * GRID_CORNER;
    const out: PartGeometry[] = [];
    for (let r = 0; r < figure.rows; r++) {
      for (let c = 0; c < figure.cols; c++) {
        out.push(rectPart(r * figure.cols + c, bx + c * w, by + r * h, w, h, corner));
      }
    }
    return out;
  }
  if (figure.shape === 'bar') {
    const w = bw / figure.parts;
    // A bar is a band, not a square: a third of the box's height, centred, so it reads as a bar.
    const h = bh / 3;
    const y = by + (bh - h) / 2;
    return Array.from({ length: figure.parts }, (_, i) => rectPart(i, bx + i * w, y, w, h));
  }
  if (figure.shape === 'number_line') {
    const w = bw / figure.parts;
    const h = bh / 5;
    const y = by + bh / 2 - h;
    return Array.from({ length: figure.parts }, (_, i) => rectPart(i, bx + i * w, y, w, h));
  }
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const r = Math.min(bw, bh) / 2;
  const slice = (Math.PI * 2) / figure.parts;
  return Array.from({ length: figure.parts }, (_, i) => {
    // Clockwise from twelve o'clock, so "the first slice" is the one a learner points at first.
    const a0 = -Math.PI / 2 + i * slice;
    const a1 = a0 + slice;
    const p0: AnswerPoint = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
    const p1: AnswerPoint = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
    const large = slice > Math.PI ? 1 : 0;
    const mid = a0 + slice / 2;
    const d = `M ${round(cx)} ${round(cy)} L ${round(p0[0])} ${round(p0[1])} A ${round(r)} ${round(r)} 0 ${large} 1 ${round(p1[0])} ${round(p1[1])} Z`;
    return {
      index: i,
      d,
      center: [round(cx + Math.cos(mid) * r * 0.6), round(cy + Math.sin(mid) * r * 0.6)],
      box: [
        round(Math.min(cx, p0[0], p1[0])),
        round(Math.min(cy, p0[1], p1[1])),
        round(Math.abs(Math.max(cx, p0[0], p1[0]) - Math.min(cx, p0[0], p1[0]))),
        round(Math.abs(Math.max(cy, p0[1], p1[1]) - Math.min(cy, p0[1], p1[1]))),
      ],
    };
  });
}

/** The part under a pointer, or null in the gaps. Grid, bar and line hit-test as boxes; a pie by angle. */
export function partAt(
  figure: AnswerFigure,
  point: AnswerPoint,
  box: AnswerBox = FIGURE_BOX,
): number | null {
  if (figure.shape === 'pie') {
    const [bx, by, bw, bh] = box;
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const r = Math.min(bw, bh) / 2;
    const dx = point[0] - cx;
    const dy = point[1] - cy;
    if (Math.hypot(dx, dy) > r) return null;
    // atan2 measures from three o'clock; the figure starts at twelve.
    const a = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 4) % (Math.PI * 2);
    return Math.min(figure.parts - 1, Math.floor((a / (Math.PI * 2)) * figure.parts));
  }
  for (const part of figureParts(figure, box)) {
    const [x, y, w, h] = part.box;
    if (point[0] >= x && point[0] <= x + w && point[1] >= y && point[1] <= y + h) return part.index;
  }
  return null;
}

// --- Axes ------------------------------------------------------------------------------------------

/** Snap a value onto a step. A step of zero (or less) is continuous and passes straight through. */
export function snap(value: number, step: number, origin = 0): number {
  if (!(step > 0)) return value;
  return origin + Math.round((value - origin) / step) * step;
}

/** Keep a value inside its axis. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Snap and clamp together — what every drag and every arrow key ends with. */
export function settle(value: number, min: number, max: number, step: number): number {
  return clamp(snap(value, step, min), min, max);
}

/**
 * The tolerance a placed point is judged with: whatever the spec asked for, else half a snap step
 * so a snapped point can only be right or plainly wrong, else 1% of the extent when continuous.
 */
export function axisTolerance(min: number, max: number, step: number, given?: number): number {
  if (given !== undefined) return given;
  if (step > 0) return step / 2;
  return Math.abs(max - min) * 0.01 || 1e-6;
}

// --- Freehand paths ---------------------------------------------------------------------------------

/**
 * Ramer–Douglas–Peucker: drop every point that is within `epsilon` of the line its neighbours
 * make. Unlike the radial thinning in `focus.ts` (which exists to fit a lasso into a packet) this
 * keeps CORNERS, which is exactly what reading an angle or a polygon back out of ink needs.
 */
export function rdp(points: readonly AnswerPoint[], epsilon: number): AnswerPoint[] {
  if (points.length < 3) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return points.slice();
  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (!p) continue;
    const d = pointToSegment(p, first, last);
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  if (worst <= epsilon) return [first, last];
  const head = rdp(points.slice(0, index + 1), epsilon);
  const tail = rdp(points.slice(index), epsilon);
  return [...head.slice(0, -1), ...tail];
}

/** Perpendicular distance from a point to a segment (to the nearer end when it falls outside). */
export function pointToSegment(p: AnswerPoint, a: AnswerPoint, b: AnswerPoint): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distance(p, a);
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1);
  return distance(p, [a[0] + dx * t, a[1] + dy * t]);
}

/**
 * Thin a path down to `want` vertices by raising the RDP tolerance until it fits. Twenty-four
 * halvings is far past the precision a hand can hold, and it never loops for ever.
 */
export function reduceToVertices(points: readonly AnswerPoint[], want: number): AnswerPoint[] {
  if (points.length <= want) return points.slice();
  const bounds = boundsOf(points.map(toPoint));
  let hi = Math.max(bounds.width, bounds.height) || 1;
  let lo = 0;
  let best = rdp(points, hi);
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const tried = rdp(points, mid);
    if (tried.length > want) {
      lo = mid;
    } else {
      best = tried;
      hi = mid;
      if (tried.length === want) break;
    }
  }
  return best;
}

/** The interior angle at `v`, in degrees, between the rays to `a` and to `b`. */
export function angleAt(a: AnswerPoint, v: AnswerPoint, b: AnswerPoint): number {
  const ax = a[0] - v[0];
  const ay = a[1] - v[1];
  const bx = b[0] - v[0];
  const by = b[1] - v[1];
  const na = Math.hypot(ax, ay);
  const nb = Math.hypot(bx, by);
  if (na === 0 || nb === 0) return 0;
  const cos = clamp((ax * bx + ay * by) / (na * nb), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

/** How far a path is from being straight: 1 is a ruler, 1.2 is a visible bow. */
export function straightness(points: readonly AnswerPoint[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return Number.POSITIVE_INFINITY;
  const chord = distance(first, last);
  if (chord === 0) return Number.POSITIVE_INFINITY;
  return polylineLength(points.slice()) / chord;
}

/** A lasso reads as a loop when it comes back to where it started around some enclosed area. */
export function isLasso(points: readonly AnswerPoint[]): boolean {
  if (points.length < 3) return false;
  const bounds = boundsOf(points.map(toPoint));
  if (bounds.width <= 0 && bounds.height <= 0) return false;
  return pathClosure(points.map(toPoint)) <= 0.45;
}

/** True when a point falls inside a freehand loop. The loop is closed for the test, as ink is. */
export function insideLoop(point: AnswerPoint, loop: readonly AnswerPoint[]): boolean {
  return pointInPolygon(toPoint(point), loop.map(toPoint));
}

/** The centre of a box — where a part is tested against a lasso. */
export function boxCenter(box: AnswerBox): AnswerPoint {
  return [box[0] + box[2] / 2, box[1] + box[3] / 2];
}

/**
 * A convex hull of the given boxes' corners, as a loop. This is the keyboard path for a lasso: a
 * learner who cannot draw one still produces the same kind of state the pointer produces, so
 * `check` has exactly one thing to read.
 */
export function hullOf(boxes: readonly AnswerBox[]): AnswerPoint[] {
  const pts: AnswerPoint[] = [];
  for (const [x, y, w, h] of boxes) {
    pts.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
  }
  if (pts.length < 3) return pts;
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: AnswerPoint, a: AnswerPoint, b: AnswerPoint): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (source: AnswerPoint[]): AnswerPoint[] => {
    const out: AnswerPoint[] = [];
    for (const p of source) {
      while (out.length >= 2) {
        const a = out[out.length - 2];
        const b = out[out.length - 1];
        if (!a || !b || cross(a, b, p) > 0) break;
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(pts), ...half(pts.slice().reverse())];
}
