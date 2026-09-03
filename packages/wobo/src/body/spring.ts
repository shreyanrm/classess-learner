/**
 * The one spring the rig uses. A critically-ish damped integrator: acceleration toward the target,
 * velocity decayed by the damping factor. Weight, overshoot and settle come out of it for free,
 * which is why every channel on the rig — scale, rotation, position, gaze, the pen, the spark —
 * runs through this single function rather than a pile of easing curves.
 */

export interface SpringChannel {
  value: number;
  velocity: number;
}

export function channel(value = 0): SpringChannel {
  return { value, velocity: 0 };
}

/**
 * Advance one channel one frame toward `target`.
 *
 * @param k stiffness, 0..1 — how hard it pulls
 * @param d damping, 0..1 — how much velocity survives a frame; lower settles sooner, higher wobbles
 */
export function step(c: SpringChannel, target: number, k = 0.12, d = 0.72): void {
  c.velocity = (c.velocity + (target - c.value) * k) * d;
  c.value += c.velocity;
}

/** Snap a channel to a value with no motion — reduced motion, and first paint. */
export function set(c: SpringChannel, value: number): void {
  c.value = value;
  c.velocity = 0;
}
