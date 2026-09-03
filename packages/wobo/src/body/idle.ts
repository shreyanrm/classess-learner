/**
 * Her idle life — what she does when nobody is talking to her. A pure scheduler: given how long it
 * has been since the last learner input, it says which stage she is in and what fires on entering
 * it. The component owns the clock; this owns the rules, so they can be tested exactly.
 *
 * She is never frozen and never nags: idle life is expression and body only, never a prompt.
 */

import type { WoboBehaviour } from './behaviours';
import type { WoboExpression } from './expressions';

export type IdleStage = 0 | 1 | 2 | 3 | 4;

/** Milliseconds of quiet before each stage begins. */
export const IDLE_THRESHOLDS = Object.freeze({
  glancing: 4_000,
  bored: 12_000,
  yawning: 20_000,
  dozing: 35_000,
});

export const IDLE_STAGE_NAMES = Object.freeze([
  'awake',
  'glancing',
  'bored',
  'yawning',
  'dozing',
] as const);

export type IdleStageName = (typeof IDLE_STAGE_NAMES)[number];

export function idleStageFor(quietMs: number): IdleStage {
  if (quietMs >= IDLE_THRESHOLDS.dozing) return 4;
  if (quietMs >= IDLE_THRESHOLDS.yawning) return 3;
  if (quietMs >= IDLE_THRESHOLDS.bored) return 2;
  if (quietMs >= IDLE_THRESHOLDS.glancing) return 1;
  return 0;
}

export function idleStageName(stage: IdleStage): IdleStageName {
  return IDLE_STAGE_NAMES[stage];
}

/** Only stages 1 and 2 wander their eyes about; asleep she does not, awake she has a job. */
export function glancesAt(stage: IdleStage): boolean {
  return stage === 1 || stage === 2;
}

/** Z's float above her only once she is properly dozing. */
export function dozing(stage: IdleStage): boolean {
  return stage === 4;
}

export interface IdleEvent {
  /** The expression to settle into, if the stage change calls for one. */
  expression?: WoboExpression;
  /** A one-shot behaviour to play on entering the stage. */
  behaviour?: WoboBehaviour;
}

/**
 * What happens when she crosses from one stage to another. `random` is injected so the yawn-or-sigh
 * coin flip is deterministic in tests.
 *
 * Waking is the interesting one: coming back from bored or deeper she startles, which is why the
 * rule lives here rather than in a click handler.
 */
export function idleTransition(
  from: IdleStage,
  to: IdleStage,
  random: () => number = Math.random,
): IdleEvent | null {
  if (from === to) return null;
  if (to < from) {
    // She was woken. From bored or deeper that is a start; from a glance it is nothing.
    return from >= 2 ? { expression: 'surprised', behaviour: 'startle' } : { expression: 'idle' };
  }
  if (to === 2) return { expression: 'bored' };
  if (to === 3) return { behaviour: random() < 0.5 ? 'yawn' : 'sigh' };
  if (to === 4) return { expression: 'sleepy' };
  return null;
}

/** How long she holds one glance before choosing another spot to look at. */
/**
 * When her idle clock was last reset.
 *
 * Idleness is measured from LEARNER input — a tap, a key, a scroll — and she is not idle while she
 * has something to do. Speaking, drawing, listening and thinking are none of the four input events,
 * so without this a learner sat through a two-minute explanation watching her get bored, yawn and
 * fall asleep while she was still talking.
 */
export function idleClock(base: string, lastInput: number, now: number): number {
  return base === 'idle' ? lastInput : now;
}

/**
 * The base expression in force this frame. The app's answer is what she IS; her idle life only
 * colours it while she has nothing else to do — so a base handed to her mid-doze takes effect at
 * once rather than waiting for the learner to touch the screen.
 */
export function baseInForce<T extends string>(held: T, asked: T, stage: IdleStage): T {
  if (held === asked) return held;
  return stage === 0 || asked !== 'idle' ? asked : held;
}

export function nextGlanceDelay(random: () => number = Math.random): number {
  return 900 + random() * 1800;
}

/** Where she glances, in rig units. A wander, not a stare. */
export function nextGlanceTarget(random: () => number = Math.random): [number, number] {
  return [(random() - 0.5) * 44, (random() - 0.5) * 26];
}
