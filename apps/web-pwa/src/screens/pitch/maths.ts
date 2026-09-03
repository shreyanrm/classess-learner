/**
 * The arithmetic behind the three things a visitor can try on the pitch pages, pure so it is
 * tested without a browser and so each page's component only holds state and handlers:
 *
 *   · the colour-half puzzle (/for-students): which cells are lit, the loop Wobo draws around
 *     what was coloured, and what it says;
 *   · turn the ray (/for-students): the ray's rotation, the arc, the degree label's place, the
 *     square that appears at a right angle, and the line under it;
 *   · drag the point (/how-it-works): the graph's own coordinates, the clamp, the check against
 *     y = 2x + 1 at x = 3, and what Wobo says when the point is close.
 *
 * Every number and every word is the prototype's (design/prototypes/site-students.html,
 * site-how.html).
 */

// --- colour half the square ----------------------------------------------------------------------

/** What Wobo calls a count of coloured cells that is not half. */
export const PUZZLE_WORDS = [
  'nothing yet',
  "that's a quarter",
  '',
  "that's three quarters",
  "that's the whole thing",
] as const;

export const PUZZLE_LINES = {
  start: 'tap the cells, then check',
  none: 'colour something first',
  half: "that's half. nice.",
  close: 'close. go again.',
} as const;

/** The loop around the bounding box of the selected cells, in the 2×2 grid's own units. */
export function loopFor(selected: readonly number[]): string {
  const pos: readonly (readonly [number, number])[] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const xs = selected.map((i) => pos[i]?.[0] ?? 0);
  const ys = selected.map((i) => pos[i]?.[1] ?? 0);
  const x0 = Math.min(...xs) * 102 - 4;
  const x1 = Math.max(...xs) * 102 + 100;
  const y0 = Math.min(...ys) * 102 - 4;
  const y1 = Math.max(...ys) * 102 + 100;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = (x1 - x0) / 2 + 14;
  const ry = (y1 - y0) / 2 + 14;
  return `M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.35}, ${cx + rx} ${cy - ry * 1.35}, ${cx + rx} ${cy} S${cx - rx * 0.9} ${cy + ry * 1.4}, ${cx - rx - 6} ${cy + 8}`;
}

export interface PuzzleVerdict {
  line: string;
  win: boolean;
  /** The loop and its caption, when Wobo rings what was coloured. */
  ring: { d: string; text: string } | null;
}

/** Check the coloured cells. */
export function checkPuzzle(lit: readonly boolean[]): PuzzleVerdict {
  const selected = lit.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (selected.length === 2) return { line: PUZZLE_LINES.half, win: true, ring: null };
  if (selected.length === 0) return { line: PUZZLE_LINES.none, win: false, ring: null };
  const word = PUZZLE_WORDS[selected.length] ?? '';
  return {
    line: PUZZLE_LINES.close,
    win: false,
    ring: { d: loopFor(selected), text: `${word}, not half` },
  };
}

// --- turn the ray ----------------------------------------------------------------------------------

export const ANGLE_MIN = 10;
export const ANGLE_MAX = 170;
export const ANGLE_START = 38;

export const ANGLE_LINES = {
  turn: 'turn it',
  close: 'so close',
  right: "there. that's a right angle. nailed it.",
} as const;

export interface AngleView {
  /** The ray's rotation about the vertex. */
  transform: string;
  /** The degree label. */
  deg: string;
  /** The dashed arc from the base line to the ray. */
  arc: string;
  /** Exactly a right angle, give or take two degrees. */
  ok: boolean;
  label: { x: number; y: number };
  line: string;
}

/** Everything the drawing shows for an angle, in the prototype's own geometry (vertex 40,190). */
export function angleView(a: number): AngleView {
  const r = 60;
  const x = 40 + r * Math.cos((-a * Math.PI) / 180);
  const y = 190 + r * Math.sin((-a * Math.PI) / 180);
  const ok = Math.abs(a - 90) <= 2;
  const line = ok
    ? ANGLE_LINES.right
    : Math.abs(a - 90) <= 8
      ? ANGLE_LINES.close
      : ANGLE_LINES.turn;
  return {
    transform: `rotate(${-a} 40 190)`,
    deg: `${a}°`,
    arc: `M${40 + r} 190 A${r} ${r} 0 ${a > 180 ? 1 : 0} 0 ${x.toFixed(1)} ${y.toFixed(1)}`,
    ok,
    label: {
      x: 40 + (r + 34) * Math.cos((-a * Math.PI) / 360),
      y: 190 + (r + 34) * Math.sin((-a * Math.PI) / 360),
    },
    line,
  };
}

// --- drag the point onto y = 2x + 1 ----------------------------------------------------------------

/** graph x 0..6 → px 50..410 (60 per unit); y 0..8 → px 260..20 (30 per unit). */
export const graphX = (x: number): number => 50 + x * 60;
export const graphY = (y: number): number => 260 - y * 30;

export const POINT_START = { px: 200, py: 200 } as const;
export const TARGET = { x: 3, y: 7 } as const;

export const POINT_LINES = {
  drag: 'drag the dot',
  win: "(3, 7). that's it. nailed it.",
  slide: 'x should be 3, so slide along first',
  compute: "x is right. now what's 2 × 3 + 1?",
} as const;

export interface Placed {
  px: number;
  py: number;
  x: number;
  y: number;
  label: string;
}

/** Clamp a pixel position to the graph and read the point it names. */
export function place(px: number, py: number): Placed {
  const cx = Math.max(50, Math.min(410, px));
  const cy = Math.max(20, Math.min(260, py));
  const x = (cx - 50) / 60;
  const y = (260 - cy) / 30;
  return { px: cx, py: cy, x, y, label: `(${x.toFixed(1)}, ${y.toFixed(1)})` };
}

export interface PointVerdict {
  ok: boolean;
  line: string;
  /** Snapped onto the target when it is close enough. */
  point: Placed;
  /** The dashed line from where the point is to where it should be, and the ring around it. */
  gap: string | null;
  ring: string | null;
}

/** Check a placed point against (3, 7). */
export function checkPoint(p: Placed): PointVerdict {
  const ok = Math.abs(p.x - TARGET.x) <= 0.25 && Math.abs(p.y - TARGET.y) <= 0.4;
  const tx = graphX(TARGET.x);
  const ty = graphY(TARGET.y);
  if (ok) return { ok, line: POINT_LINES.win, point: place(tx, ty), gap: null, ring: null };
  const why = Math.abs(p.x - TARGET.x) > 0.25 ? POINT_LINES.slide : POINT_LINES.compute;
  return {
    ok,
    line: `close. ${why}`,
    point: p,
    gap: `M${p.px} ${p.py} L${tx} ${ty}`,
    ring: `M${tx - 22} ${ty} a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0`,
  };
}
