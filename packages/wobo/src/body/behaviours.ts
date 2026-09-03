/**
 * Her fifteen behaviours — the body half of the rig. A behaviour is a short set of keyframe tracks
 * over normalised time, sampled with a cosine ease so nothing snaps. Pure, so the tracks and the
 * sampler are testable without a browser.
 *
 * Tracks compose ON TOP of the expression pose: `sx`/`sy` multiply the pose scale, `rot`/`dx`/`dy`
 * add to it. That is what lets a nod ride a lean, or a hop ride a celebration.
 */

export interface BehaviourSpec {
  /** Scale multipliers. */
  sx?: readonly number[];
  sy?: readonly number[];
  /** Additive rotation in degrees and translation in rig units. */
  rot?: readonly number[];
  dx?: readonly number[];
  dy?: readonly number[];
  /** Duration in ms. */
  dur: number;
  /** Hold the last frame instead of releasing back to the pose (shrink parks her). */
  hold?: boolean;
  /** The pen is out for the length of the behaviour. */
  pen?: boolean;
  /** The behaviour carries an expression for its duration. */
  expression?: 'sleepy' | 'bored';
}

export const BEHAVIOURS = {
  tap: { sx: [1.22, 0.86, 1], sy: [0.82, 1.1, 1], dur: 420 },
  nod: { rot: [6, -2, 0], dy: [3, 0], dur: 520 },
  hop: { dy: [-18, 0, -7, 0], sx: [0.9, 1.08, 1], sy: [1.12, 0.94, 1], dur: 720 },
  lean: { rot: [-10, 0], dx: [-8, 0], dur: 900 },
  peek: { dx: [44, -3, 0], rot: [-12, 2, 0], dur: 800 },
  shrink: { sx: [0.55, 0.6], sy: [0.55, 0.6], dy: [24, 24], dur: 600, hold: true },
  grow: { sx: [1.15, 1], sy: [1.15, 1], dur: 500 },
  wiggle: { rot: [-8, 8, -6, 6, -3, 0], dur: 700 },
  yawn: { sy: [1.1, 0.95, 1], rot: [0, 4, 0], dur: 1500, expression: 'sleepy' },
  sigh: { sy: [1.06, 0.97, 1], dy: [-2, 2, 0], dur: 1300, expression: 'bored' },
  shake: { dx: [-5, 5, -4, 4, -2, 0], dur: 520 },
  point: { rot: [8, 6], dx: [6, 4], dur: 400, pen: true },
  startle: { sy: [1.14, 0.94, 1], sx: [0.92, 1.06, 1], dy: [-6, 0], dur: 500 },
  settle: { rot: [4, -3, 2, 0], sy: [0.94, 1.04, 1], dur: 600 },
  stretch: { sy: [1.12, 1], sx: [0.95, 1], rot: [-3, 0], dur: 1100 },
} as const satisfies Record<string, BehaviourSpec>;

export type WoboBehaviour = keyof typeof BEHAVIOURS;

export const BEHAVIOUR_NAMES = Object.keys(BEHAVIOURS) as WoboBehaviour[];

export function isBehaviour(name: string): name is WoboBehaviour {
  return Object.hasOwn(BEHAVIOURS, name);
}

/** The table is const-asserted for the tests; this widens one entry back to the interface. */
export function behaviourSpec(name: WoboBehaviour): BehaviourSpec {
  return BEHAVIOURS[name];
}

/**
 * Sample a keyframe track at progress `p` (0..1), easing each segment with a raised cosine so the
 * joins are smooth. Returns null when the track is absent, which the caller reads as "no opinion".
 */
export function sampleTrack(track: readonly number[] | undefined, p: number): number | null {
  if (!track || track.length === 0) return null;
  if (track.length === 1) return track[0] as number;
  const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
  const segments = track.length - 1;
  const i = Math.min(segments - 1, Math.floor(clamped * segments));
  const q = clamped * segments - i;
  const a = track[i] as number;
  const b = track[i + 1] as number;
  return a + (b - a) * ((1 - Math.cos(q * Math.PI)) / 2);
}

export interface BehaviourSample {
  sx: number | null;
  sy: number | null;
  rot: number | null;
  dx: number | null;
  dy: number | null;
  /** True once the behaviour has run its course and (unless it holds) should be released. */
  done: boolean;
}

/** Sample every track of a behaviour at `elapsed` ms since it started. */
export function sampleBehaviour(name: WoboBehaviour, elapsedMs: number): BehaviourSample {
  const b = BEHAVIOURS[name] as BehaviourSpec;
  const p = b.dur > 0 ? Math.min(1, Math.max(0, elapsedMs / b.dur)) : 1;
  return {
    sx: sampleTrack(b.sx, p),
    sy: sampleTrack(b.sy, p),
    rot: sampleTrack(b.rot, p),
    dx: sampleTrack(b.dx, p),
    dy: sampleTrack(b.dy, p),
    done: p >= 1,
  };
}
