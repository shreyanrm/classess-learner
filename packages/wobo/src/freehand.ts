/**
 * freehand — Wobo's pen. Pure geometry that turns a target's real rect into hand-drawn SVG `d`
 * strings: wavy underlines, rough double-pass circles, hand arrowheads, brackets, ticks, swipes.
 *
 * Two laws live here:
 *  1. The wobble is SEEDED from stable identity (targetId, mark, level) — never from age/tick — so a
 *     mark is frozen the moment it's born and does NOT shimmer at 60fps. Re-call every frame is fine;
 *     same seed in => byte-identical `d` out.
 *  2. Paths are built to the target's ACTUAL width/height, in rect-local coordinates (0..w, 0..h,
 *     overshoot allowed to go slightly negative / past w,h). The overlay never scales them, so the
 *     pen nib stays a constant width — a circle round a short word never squashes into an ellipse.
 *
 * ponytail: ~40 lines of mulberry32 + jitter instead of rough.js/seedrandom — smaller than the dep
 * and gives direct control of the draw-on. self-check in test/freehand.test.ts.
 */

export type Mark = 'underline' | 'circle' | 'arrow' | 'bracket' | 'check' | 'crossOut' | 'lookHere';

/** FNV-1a → 32-bit unsigned. Stable across runs; identity in, seed out. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic 0..1 stream from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The rng for one mark, seeded only from its stable identity. */
export function inkRng(id: string, mark: string, level: string): () => number {
  return mulberry32(hashSeed(id, mark, level));
}

type Pt = [number, number];
type Rng = () => number;

/** Signed jitter in ±amp. */
const j = (rng: Rng, amp: number): number => (rng() * 2 - 1) * amp;
const f = (n: number): string => (Math.round(n * 10) / 10).toString();

/** A smooth (quadratic-through-midpoints) curve through points — reads as one flowing hand stroke. */
function smooth(pts: Pt[]): string {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'} ${f(p[0])} ${f(p[1])}`).join(' ');
  const first = pts[0] as Pt;
  let d = `M ${f(first[0])} ${f(first[1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i] as Pt;
    const nx = pts[i + 1] as Pt;
    const mx = (p[0] + nx[0]) / 2;
    const my = (p[1] + nx[1]) / 2;
    d += ` Q ${f(p[0])} ${f(p[1])} ${f(mx)} ${f(my)}`;
  }
  const last = pts[pts.length - 1] as Pt;
  return `${d} L ${f(last[0])} ${f(last[1])}`;
}

/** A wavy hand line under the word, overshooting both ends. */
export function underlinePath(w: number, h: number, rng: Rng): string {
  const n = Math.max(6, Math.round(w / 22));
  const y0 = h + 3 + j(rng, 1);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -3 + (w + 6) * t;
    const bow = Math.sin(t * Math.PI) * 1.4; // slight sag in the middle
    pts.push([x, y0 + bow + j(rng, 1.6)]);
  }
  return smooth(pts);
}

/** A rough circle: two overlapping jittered loops with a small overshoot tail. */
export function circlePath(w: number, h: number, rng: Rng): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 + 10;
  const ry = h / 2 + 8;
  const start = rng() * Math.PI * 2;
  const turns = 2.15; // double pass + overshoot
  const steps = Math.max(28, Math.round(turns * 22));
  const drift = j(rng, 2); // the two passes don't perfectly overlap
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = start + t * turns * Math.PI * 2;
    const wob = 1 + j(rng, 0.06);
    pts.push([
      cx + Math.cos(ang) * rx * wob + drift * t + j(rng, 1.2),
      cy + Math.sin(ang) * ry * wob + j(rng, 1.2),
    ]);
  }
  return smooth(pts);
}

/** An arrow pointing at the target from the upper-left: jittered shaft + a two-stroke hand head. */
export function arrowPath(w: number, h: number, rng: Rng): string {
  const tip: Pt = [-2 + j(rng, 1), h * 0.45 + j(rng, 2)];
  const start: Pt = [-Math.max(48, w * 0.5), -Math.max(18, h * 0.35)];
  const mid: Pt = [(start[0] + tip[0]) / 2 + j(rng, 6), (start[1] + tip[1]) / 2 + j(rng, 6)];
  const shaft = smooth([start, mid, tip]);
  // Head: two short barbs off the tip, opening back up-left toward the shaft.
  const len = 12;
  const b1: Pt = [tip[0] - len + j(rng, 1.5), tip[1] - len * 0.5 + j(rng, 1.5)];
  const b2: Pt = [tip[0] - len * 0.4 + j(rng, 1.5), tip[1] - len + j(rng, 1.5)];
  const head = `M ${f(b1[0])} ${f(b1[1])} L ${f(tip[0])} ${f(tip[1])} L ${f(b2[0])} ${f(b2[1])}`;
  return `${shaft} ${head}`;
}

/** A vertical bracket hugging the left edge, with a hand nub at its waist. */
export function bracketPath(_w: number, h: number, rng: Rng): string {
  const x = -8 + j(rng, 1);
  const pts: Pt[] = [
    [x + 5 + j(rng, 1), -2 + j(rng, 1.5)],
    [x + j(rng, 1), h * 0.25 + j(rng, 2)],
    [x - 4 + j(rng, 1), h * 0.5 + j(rng, 1.5)], // the nub
    [x + j(rng, 1), h * 0.75 + j(rng, 2)],
    [x + 5 + j(rng, 1), h + 2 + j(rng, 1.5)],
  ];
  return smooth(pts);
}

/** A hand checkmark sitting over the right of the target. */
export function checkPath(w: number, h: number, rng: Rng): string {
  const s = Math.min(Math.max(Math.min(w, h), 22), 40);
  const ox = w - s * 0.9;
  const oy = h / 2 - s / 2;
  const pts: Pt[] = [
    [ox + j(rng, 1.2), oy + s * 0.55 + j(rng, 1.2)],
    [ox + s * 0.35 + j(rng, 1.2), oy + s * 0.9 + j(rng, 1.2)],
    [ox + s + j(rng, 1.5), oy + j(rng, 1.5)],
  ];
  return smooth(pts);
}

/** Two jittered strokes struck through the target — a scratch-out. */
export function crossOutPath(w: number, h: number, rng: Rng): string {
  const line = (y0: number, y1: number): string =>
    smooth([
      [-3 + j(rng, 1), y0 + j(rng, 1.5)],
      [w * 0.5 + j(rng, 3), (y0 + y1) / 2 + j(rng, 2)],
      [w + 3 + j(rng, 1), y1 + j(rng, 1.5)],
    ]);
  return `${line(h * 0.35, h * 0.6)} ${line(h * 0.62, h * 0.38)}`;
}

/** A small "look here" tick — a mini arrow pointing in at the target's top-left. */
export function lookHerePath(w: number, h: number, rng: Rng): string {
  const tip: Pt = [w * 0.08 + j(rng, 1.5), h * 0.2 + j(rng, 1.5)];
  const start: Pt = [-16 + j(rng, 2), -16 + j(rng, 2)];
  const shaft = smooth([
    start,
    [(start[0] + tip[0]) / 2 + j(rng, 3), (start[1] + tip[1]) / 2],
    tip,
  ]);
  const b1: Pt = [tip[0] - 9 + j(rng, 1), tip[1] - 2 + j(rng, 1)];
  const b2: Pt = [tip[0] - 2 + j(rng, 1), tip[1] - 9 + j(rng, 1)];
  return `${shaft} M ${f(b1[0])} ${f(b1[1])} L ${f(tip[0])} ${f(tip[1])} L ${f(b2[0])} ${f(b2[1])}`;
}

const BUILDERS: Record<Mark, (w: number, h: number, rng: Rng) => string> = {
  underline: underlinePath,
  circle: circlePath,
  arrow: arrowPath,
  bracket: bracketPath,
  check: checkPath,
  crossOut: crossOutPath,
  lookHere: lookHerePath,
};

/** Build the `d` for any mark, sized to the rect and seeded from identity. */
export function markPath(mark: Mark, w: number, h: number, rng: Rng): string {
  return BUILDERS[mark](w, h, rng);
}

/**
 * A highlighter swipe — one fat marker drag across the region. The overlay strokes this at a wide,
 * low-opacity, round-cap width so it reads as a whiteboard highlighter, not a UI selection box.
 */
export function highlighterSwipe(w: number, h: number, rng: Rng): string {
  const y = h / 2 + j(rng, h * 0.08);
  const n = Math.max(4, Math.round(w / 40));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([-4 + (w + 8) * t, y + Math.sin(t * Math.PI) * 1.5 + j(rng, h * 0.06)]);
  }
  return smooth(pts);
}

/** Seeded note tilt in ±3deg — a margin scrawl, not a level caption. */
export function noteRotation(rng: Rng): number {
  return Math.round(j(rng, 3) * 10) / 10;
}
