/**
 * Where Wobo looks. Nothing here is placed by pixels in Wobo's own space: a caller hands over a real
 * rectangle on screen — a focus region, a registry target's box, or the pointer as a zero-size
 * rect — and this turns it into a normalised gaze vector and the rig-unit offsets that move Wobo
 * eyes and lean Wobo's head.
 *
 * The rule (BOARD.md §3, wave 5): Wobo tracks what is IN FOCUS; the pointer is only the fallback
 * when nothing is.
 */

export interface TrackRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Full deflection of the eyes, in rig units. */
export const LOOK_REACH = Object.freeze({ x: 44, y: 32 });

/** Full deflection of the head lean, in rig units. */
export const LEAN_REACH = 6;

export function rectCenter(r: TrackRect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/**
 * How far a target has to be before Wobo is looking as hard as Wobo can. It scales with Wobo's own size
 * so a small docked orb does not stare wide-eyed at something just beside it, and never collapses
 * to zero when Wobo has not been laid out yet.
 */
export function lookFalloff(selfWidth: number): number {
  return Math.max(180, (Number.isFinite(selfWidth) ? selfWidth : 0) * 3);
}

/**
 * The normalised gaze vector from Wobo's own box to a point, each axis clamped to -1..1.
 * (0, 0) means Wobo is looking straight ahead.
 */
export function trackPoint(self: TrackRect, target: Point, falloff?: number): Point {
  const c = rectCenter(self);
  const f = falloff ?? lookFalloff(self.width);
  const d = f > 0 ? f : 1;
  return { x: clamp1((target.x - c.x) / d), y: clamp1((target.y - c.y) / d) };
}

/** The same, for a focus region: Wobo looks at the middle of what is in focus. */
export function trackRect(self: TrackRect, target: TrackRect, falloff?: number): Point {
  return trackPoint(self, rectCenter(target), falloff);
}

/** The gaze vector as eye offsets in rig units. */
export function lookOffset(v: Point): [number, number] {
  return [clamp1(v.x) * LOOK_REACH.x, clamp1(v.y) * LOOK_REACH.y];
}

/** The gaze vector as a head lean in rig units — Wobo turns toward what Wobo is looking at. */
export function leanOffset(v: Point): number {
  return clamp1(v.x) * LEAN_REACH;
}

/**
 * Pick what Wobo should look at, in priority order: the focus region, then an explicit gaze the
 * caller pinned, then the pointer (only if it is live), then whatever the idle life or the
 * expression itself wants. This is the whole tracking policy in one pure function.
 */
export function resolveLookTarget(input: {
  self: TrackRect;
  focus?: TrackRect | null;
  gaze?: Point | null;
  pointer?: Point | null;
  glance?: readonly [number, number] | null;
  expressionLook?: readonly [number, number] | null;
}): [number, number] {
  const { self, focus, gaze, pointer, glance, expressionLook } = input;
  if (focus) return lookOffset(trackRect(self, focus));
  if (gaze) return lookOffset(gaze);
  if (pointer) return lookOffset(trackPoint(self, pointer));
  if (glance) return [glance[0], glance[1]];
  if (expressionLook) return [expressionLook[0], expressionLook[1]];
  return [0, 0];
}
