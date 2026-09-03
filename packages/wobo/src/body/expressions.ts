/**
 * Wobo's twenty expressions — the face half of the character rig (owner-approved prototype,
 * 2026-09-02). Pure data and pure geometry so the table and every eye shape are testable without a
 * browser; `WoboBody.tsx` is the only thing that draws them.
 *
 * Nothing here is placed by pixels: every number is in the rig's own 150 x 124 unit space, which the
 * component maps onto whatever size it is asked for.
 */

import type { WoboMood } from '../identity';

/** The shapes an eye can take. Blink borrows `closed`, so it is not a separate expression. */
export type EyeKind =
  | 'dot'
  | 'wide'
  | 'half'
  | 'dash'
  | 'equals'
  | 'arc'
  | 'sad'
  | 'closed'
  | 'wink'
  | 'scan';

export interface EyeSpec {
  kind: EyeKind;
  /** Size multiplier on the shapes that scale (dot, wide, arc). */
  scale?: number;
}

export interface ExpressionSpec {
  left: EyeSpec;
  right: EyeSpec;
  /** Head tilt in degrees. */
  tilt: number;
  /** How far Wobo leans toward what Wobo is talking about, in rig units. */
  lean: number;
  /**
   * What Wobo would say in this state, if the surface wants a whisper. Wobo's voice: sentence case, no
   * emoji, no exclamation marks (WOBO.md). The rig never draws it — a surface may.
   */
  note: string;
  /** Where Wobo looks when nothing else claims Wobo's gaze, in rig units [x, y]. */
  look?: readonly [number, number];
  /** A single spark, only for the aha. */
  spark?: boolean;
  /** The mitt and the ultramarine-tipped pen come out only while Wobo is drawing. */
  pen?: boolean;
  /**
   * Choreography flags — free under the Wobo-cute licence, all suppressed by reduced motion.
   *
   * None of them may change Wobo's SIZE at rest. `bounce` and `sway` move Wobo, `breathe` scales by
   * under two percent on a cycle that returns to 1; a flag that parked Wobo six percent larger for
   * as long as a face was worn lived here once, and it made one of the twenty-two faces a visibly
   * bigger character than the others. That is the `puff` behaviour now.
   */
  bounce?: boolean;
  sway?: boolean;
  breathe?: boolean;
  /** The visor narrows to a slit — concentration. */
  narrow?: boolean;
}

/** The twenty. Order is the order Wobo was designed in, and the order the icon sheet uses. */
export const EXPRESSIONS = {
  idle: { left: { kind: 'dot' }, right: { kind: 'dot' }, tilt: 0, lean: 0, note: '' },
  listening: {
    left: { kind: 'wide', scale: 1.12 },
    right: { kind: 'wide', scale: 1.12 },
    tilt: 4,
    lean: 6,
    note: 'go on',
  },
  thinking: {
    left: { kind: 'dash' },
    right: { kind: 'dash' },
    tilt: -5,
    lean: -4,
    note: 'hmm',
    look: [-6, -8],
  },
  computing: {
    left: { kind: 'equals' },
    right: { kind: 'equals' },
    tilt: 0,
    lean: 0,
    note: 'checking that',
  },
  aha: {
    left: { kind: 'wide', scale: 1.3 },
    right: { kind: 'wide', scale: 1.3 },
    tilt: 0,
    lean: 0,
    note: 'oh',
    spark: true,
  },
  explaining: {
    left: { kind: 'dot', scale: 0.95 },
    right: { kind: 'dot', scale: 0.95 },
    tilt: 3,
    lean: 8,
    note: 'see this part',
    look: [10, 4],
  },
  drawing: {
    left: { kind: 'dot', scale: 0.9 },
    right: { kind: 'dot', scale: 0.9 },
    tilt: 6,
    lean: 10,
    note: '',
    pen: true,
    look: [14, 10],
  },
  celebrating: {
    left: { kind: 'arc' },
    right: { kind: 'arc' },
    tilt: 0,
    lean: 0,
    note: 'you did it',
    bounce: true,
  },
  encouraging: {
    left: { kind: 'arc', scale: 0.8 },
    right: { kind: 'arc', scale: 0.8 },
    tilt: 2,
    lean: 3,
    note: 'nearly there',
  },
  curious: {
    left: { kind: 'dot', scale: 1.15 },
    right: { kind: 'dash' },
    tilt: 8,
    lean: 2,
    note: 'wait, what?',
  },
  peeking: {
    left: { kind: 'wide', scale: 1.18 },
    right: { kind: 'dot', scale: 0.78 },
    tilt: 12,
    lean: 9,
    note: '',
    look: [16, 2],
  },
  surprised: {
    left: { kind: 'wide', scale: 1.45 },
    right: { kind: 'wide', scale: 1.45 },
    tilt: 0,
    lean: -3,
    note: '',
  },
  wink: { left: { kind: 'dot' }, right: { kind: 'wink' }, tilt: -3, lean: 0, note: '' },
  supportive: {
    left: { kind: 'sad' },
    right: { kind: 'sad' },
    tilt: 3,
    lean: 4,
    note: 'that one was hard',
  },
  bored: {
    left: { kind: 'half' },
    right: { kind: 'half' },
    tilt: 2,
    lean: -2,
    note: '',
    sway: true,
    look: [0, 4],
  },
  sleepy: {
    left: { kind: 'closed' },
    right: { kind: 'closed' },
    tilt: 3,
    lean: 0,
    note: 'rest is part of learning',
    breathe: true,
  },
  loading: { left: { kind: 'scan' }, right: { kind: 'scan' }, tilt: 0, lean: 0, note: '' },
  proud: {
    left: { kind: 'arc', scale: 0.9 },
    right: { kind: 'arc', scale: 0.9 },
    tilt: -2,
    lean: -2,
    note: '',
  },
  shy: {
    left: { kind: 'dot', scale: 0.8 },
    right: { kind: 'dot', scale: 0.8 },
    tilt: 6,
    lean: -6,
    note: '',
    look: [-8, 6],
  },
  focused: {
    left: { kind: 'dot', scale: 0.85 },
    right: { kind: 'dot', scale: 0.85 },
    tilt: 0,
    lean: 5,
    note: '',
    narrow: true,
  },
  happy: {
    left: { kind: 'arc', scale: 0.9 },
    right: { kind: 'arc', scale: 0.9 },
    tilt: 0,
    lean: 0,
    note: '',
  },
  greeting: {
    left: { kind: 'wide', scale: 1.16 },
    right: { kind: 'wide', scale: 1.16 },
    tilt: -7,
    lean: 5,
    note: 'hello',
    look: [0, -6],
  },
} as const satisfies Record<string, ExpressionSpec>;

export type WoboExpression = keyof typeof EXPRESSIONS;

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as WoboExpression[];

export function isExpression(name: string): name is WoboExpression {
  return Object.hasOwn(EXPRESSIONS, name);
}

/**
 * The legacy mood vocabulary (identity.ts) mapped onto the new faces, so every existing consumer
 * keeps working unchanged while new callers can name an expression directly.
 */
export const MOOD_TO_EXPRESSION: Readonly<Record<WoboMood, WoboExpression>> = Object.freeze({
  idle: 'idle',
  thinking: 'thinking',
  listening: 'listening',
  correct: 'happy',
  celebrate: 'celebrating',
  waiting: 'loading',
  hint: 'encouraging',
  explaining: 'explaining',
  resting: 'sleepy',
  oops: 'supportive',
});

/** Resolve whatever a caller passed — a mood, an expression, or nonsense — to a real face. */
export function expressionFor(name: WoboMood | WoboExpression | undefined): WoboExpression {
  if (!name) return 'idle';
  if (isExpression(name)) return name;
  return MOOD_TO_EXPRESSION[name as WoboMood] ?? 'idle';
}

export function expressionSpec(name: WoboMood | WoboExpression | undefined): ExpressionSpec {
  return EXPRESSIONS[expressionFor(name)];
}

/** Wobo's whisper for a state, if the surface wants one. Empty means Wobo says nothing. */
export function expressionNote(name: WoboMood | WoboExpression | undefined): string {
  return expressionSpec(name).note;
}

// --- Eye geometry -------------------------------------------------------------------------------

/**
 * The radius the rig was drawn at, before the owner's "bigger eyes" call on 2026-09-02. Kept as a
 * named constant so the growth below is a fact in code rather than a number nobody can check.
 */
export const EYE_RADIUS_BASE = 7.4;

/** The owner asked for eyes twelve percent bigger. Every metric of the face grows by this, not
 * just the pupil — a bigger dot inside the same lids would have read as a different character. */
export const EYE_GROWTH = 1.12;

const n = (v: number) => Math.round(v * 100) / 100;

/** Scale one of the rig's original face metrics by the growth factor. */
const g = (v: number) => n(v * EYE_GROWTH);

/** Eye radius in rig units. */
export const EYE_RADIUS = g(EYE_RADIUS_BASE);

/** Half-width of the stroked lid shapes (dash, arc, closed, wink, sad, equals). */
export const EYE_LID_HALF = g(7);

/** Past this much of a blink the lids have met, whatever the expression was doing. */
export const BLINK_CLOSED_AT = 0.85;

export interface EyeGeometry {
  /** SVG path data in rig units. */
  d: string;
  /** Filled shapes (dot, wide, half, scan) versus stroked ones (the lid and brow shapes). */
  filled: boolean;
  /** Stroke width in rig units; 0 when the shape is filled. */
  strokeWidth: number;
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0Z`;
}

/**
 * The shape of one eye. `blink` is 0..1 (a full lid sweep); past `BLINK_CLOSED_AT` every kind
 * borrows the closed lid. `timeMs` only matters for `scan`, which sweeps.
 */
export function eyeGeometry(
  cx: number,
  cy: number,
  eye: EyeSpec,
  blink = 0,
  timeMs = 0,
): EyeGeometry {
  const s = eye.scale ?? 1;
  const kind: EyeKind = blink > BLINK_CLOSED_AT ? 'closed' : eye.kind;
  const R = EYE_RADIUS;
  const L = EYE_LID_HALF;
  switch (kind) {
    case 'dot':
      return { d: circlePath(cx, cy, R * s), filled: true, strokeWidth: 0 };
    case 'wide':
      return { d: ellipsePath(cx, cy, R * s, (R + g(1.6)) * s), filled: true, strokeWidth: 0 };
    case 'half':
      return {
        d: `M${n(cx - L)} ${n(cy + g(1))}A${n(R)} ${n(R)} 0 0 0 ${n(cx + L)} ${n(cy + g(1))}Z`,
        filled: true,
        strokeWidth: 0,
      };
    case 'dash':
      return { d: `M${n(cx - L)} ${n(cy)}h${n(L * 2)}`, filled: false, strokeWidth: g(5.2) };
    case 'equals':
      return {
        d: `M${n(cx - L)} ${n(cy - g(3.5))}h${n(L * 2)}M${n(cx - L)} ${n(cy + g(3.5))}h${n(L * 2)}`,
        filled: false,
        strokeWidth: g(3.6),
      };
    case 'arc':
      return {
        d: `M${n(cx - L)} ${n(cy + g(3))}Q${n(cx)} ${n(cy - g(8) * s)} ${n(cx + L)} ${n(cy + g(3))}`,
        filled: false,
        strokeWidth: g(5.2),
      };
    case 'sad':
      return {
        d: `M${n(cx - L)} ${n(cy - g(2))}Q${n(cx)} ${n(cy + g(6))} ${n(cx + L)} ${n(cy - g(2))}`,
        filled: false,
        strokeWidth: g(5),
      };
    case 'closed':
      return {
        d: `M${n(cx - L)} ${n(cy + g(1))}Q${n(cx)} ${n(cy + g(5))} ${n(cx + L)} ${n(cy + g(1))}`,
        filled: false,
        strokeWidth: g(4.6),
      };
    case 'wink':
      return {
        d: `M${n(cx - L)} ${n(cy + g(2))}Q${n(cx)} ${n(cy - g(4))} ${n(cx + L)} ${n(cy + g(2))}`,
        filled: false,
        strokeWidth: g(5),
      };
    case 'scan':
      return {
        d: circlePath(cx + Math.sin(timeMs / 180) * g(6), cy, g(5)),
        filled: true,
        strokeWidth: 0,
      };
  }
}
