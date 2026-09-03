/**
 * The blinking wordmark — the name, with the two o's as eyes.
 *
 * Wobo's name has two round counters sitting exactly where a pair of eyes would be. So they are a
 * pair of eyes: they blink, they glance, and they follow a cursor, and the rest of the time they are
 * simply the letters. The joke only works if it is never explained, so nothing here moves unless
 * something in the room is happening.
 *
 * TEXT ONLY, deliberately. The owner's logo SVGs are not approved, so not one of them is imported:
 * every letterform below is our own geometry — a geometric, rounded, uniform-stroke construction in
 * the spirit of Poppins, drawn from a small metric table so the proportions are arguable in numbers
 * rather than by eye.
 *
 * Pure: the component owns the clock, this owns the shapes.
 */

/** The one word this draws. The glyph set is W, o and b — the wordmark, not a font. */
export const WORDMARK_TEXT = 'Wobo';

/**
 * The wordmark's own unit space. Cap height 86 on a 100 baseline, x-height 52 — the geometric
 * sans proportions, with the round letters overshooting the baseline very slightly as they must.
 */
export const WORDMARK_METRICS = Object.freeze({
  baseline: 100,
  capTop: 14,
  ascenderTop: 6,
  /** The uniform stroke every letterform is built from. */
  stroke: 13,
  /** Radius of the round letters, centre-line. */
  ring: 26,
  /** Gap between one glyph's right edge and the next glyph's left edge. */
  tracking: 13,
  /** The pupil that sits inside an o. */
  pupil: 8.5,
  /** How close a pupil may come to the inside of its ring before it stops. */
  clearance: 1.5,
});

export type GlyphKind = 'W' | 'o' | 'b';

export interface WordmarkGlyph {
  kind: GlyphKind;
  /** Left edge of the glyph's ink, in wordmark units. */
  x: number;
  /** Advance width of the ink (not counting tracking). */
  width: number;
  /** For the round letters: the centre of the ring — which is to say, the centre of the eye. */
  center?: { x: number; y: number };
  /** True for the two o's, which are the eyes. */
  eye: boolean;
}

const M = WORDMARK_METRICS;
/** The W is the widest glyph; four strokes at the geometric slope. */
const W_WIDTH = 104;
/** A round letter's ink spans the ring plus a stroke. */
const O_WIDTH = M.ring * 2 + M.stroke;
/** The b is a stem plus a bowl; the stem's centre-line sits half a stroke in. */
const B_WIDTH = M.stroke / 2 + M.ring * 2 + M.stroke / 2;

/**
 * Lay the four glyphs out left to right. Returns the glyphs and the total ink width, so a caller
 * can set a viewBox without measuring text — no font metrics, no layout pass, no FOUT.
 */
export function wordmarkGeometry(): { glyphs: WordmarkGlyph[]; width: number; height: number } {
  const glyphs: WordmarkGlyph[] = [];
  let x = 0;
  const ringY = M.baseline - M.ring - M.stroke / 2;

  const push = (kind: GlyphKind) => {
    if (kind === 'W') {
      glyphs.push({ kind, x, width: W_WIDTH, eye: false });
      x += W_WIDTH + M.tracking;
      return;
    }
    if (kind === 'o') {
      glyphs.push({
        kind,
        x,
        width: O_WIDTH,
        center: { x: x + O_WIDTH / 2, y: ringY },
        eye: true,
      });
      x += O_WIDTH + M.tracking;
      return;
    }
    glyphs.push({
      kind,
      x,
      width: B_WIDTH,
      center: { x: x + M.stroke / 2 + M.ring, y: ringY },
      eye: false,
    });
    x += B_WIDTH + M.tracking;
  };

  for (const ch of WORDMARK_TEXT) push(ch as GlyphKind);
  return {
    glyphs,
    width: x - M.tracking,
    height: M.baseline + M.stroke / 2,
  };
}

/** The two eyes, in reading order. Always exactly two — the wordmark is a face or it is nothing. */
export function wordmarkEyes(): WordmarkGlyph[] {
  return wordmarkGeometry().glyphs.filter((g) => g.eye);
}

// --- Letterforms ---------------------------------------------------------------------------------

const n = (v: number) => Math.round(v * 100) / 100;

/**
 * The W: four strokes, the outer pair at the cap height, the middle vertex stopping short of it —
 * the geometric construction, not a pointed serif W.
 */
export function wPath(x: number): string {
  const top = M.capTop;
  const bottom = M.baseline;
  const s = M.stroke / 2;
  const w = W_WIDTH;
  const midTop = top + (bottom - top) * 0.34;
  return [
    `M${n(x + s)} ${n(top)}`,
    `L${n(x + w * 0.27)} ${n(bottom)}`,
    `L${n(x + w / 2)} ${n(midTop)}`,
    `L${n(x + w * 0.73)} ${n(bottom)}`,
    `L${n(x + w - s)} ${n(top)}`,
  ].join('');
}

/** The b: an ascender stem down to the baseline, with the bowl hung off it. */
export function bStemPath(x: number): string {
  return `M${n(x + M.stroke / 2)} ${n(M.ascenderTop)}V${n(M.baseline - M.stroke / 2)}`;
}

/** A ring — the o, and the b's bowl. Centre-line radius, stroked at the uniform weight. */
export function ringPath(cx: number, cy: number, r = M.ring): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`;
}

// --- The eyes ------------------------------------------------------------------------------------

/** How far a pupil may travel from the middle of its ring. */
export const PUPIL_TRAVEL = M.ring - M.stroke / 2 - M.pupil - M.clearance;

/**
 * Where a pupil sits for a gaze vector (each axis -1..1). The vector is clamped by LENGTH, not per
 * axis, so a diagonal glance cannot push a pupil into the letter's own stroke.
 */
export function pupilOffset(gx: number, gy: number): [number, number] {
  const len = Math.hypot(gx, gy);
  if (!Number.isFinite(len) || len === 0) return [0, 0];
  const scale = (Math.min(1, len) / len) * PUPIL_TRAVEL;
  return [n(gx * scale), n(gy * scale)];
}

/**
 * A pupil's shape. Blinking squashes it to a line rather than dropping a lid over it — a lid inside
 * a letter would read as a printing fault, a squash reads as a blink.
 */
export function pupilShape(
  cx: number,
  cy: number,
  blink = 0,
): { cx: number; cy: number; rx: number; ry: number } {
  const b = blink < 0 ? 0 : blink > 1 ? 1 : blink;
  return {
    cx: n(cx),
    cy: n(cy + b * 2),
    rx: n(M.pupil),
    ry: n(M.pupil * (1 - b * 0.92)),
  };
}

// --- The clock the eyes keep ---------------------------------------------------------------------

/** A blink lasts this long, all in. */
export const WORDMARK_BLINK_MS = 170;

/** How long between blinks — a slow, unhurried pair of eyes, never a nervous one. */
export function nextWordmarkBlink(random: () => number = Math.random): number {
  return 3_200 + random() * 4_000;
}

/** The blink curve: 0 at both ends, fully closed in the middle. */
export function wordmarkBlinkAt(elapsedMs: number): number {
  if (elapsedMs <= 0 || elapsedMs >= WORDMARK_BLINK_MS) return 0;
  return Math.sin((elapsedMs / WORDMARK_BLINK_MS) * Math.PI);
}

/** How long between idle glances, and how far a glance wanders. */
export function nextWordmarkGlance(random: () => number = Math.random): {
  delay: number;
  gaze: [number, number];
} {
  return {
    delay: 2_600 + random() * 3_400,
    gaze: [(random() - 0.5) * 1.6, (random() - 0.5) * 1.0],
  };
}

/**
 * The gaze vector from an eye's centre to a point on screen, in the same -1..1 shape the rig uses.
 * `reach` is how far away a point has to be before the eyes are looking as hard as they can.
 */
export function wordmarkGaze(
  eye: { x: number; y: number },
  point: { x: number; y: number },
  reach: number,
): [number, number] {
  const r = reach > 0 ? reach : 1;
  const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);
  return [clamp((point.x - eye.x) / r), clamp((point.y - eye.y) / r)];
}
