import { woboMolten } from '@wobo/config';

/**
 * Wobo's identity is LOCKED (docs/02-DESIGN/02-wobo.md). This module encodes it so the lock is a
 * fact in code, not a note in a doc. Choreography is free (the Wobo-cute license) — identity is not.
 *
 * You MAY NOT change: Wobo's colour (molten only), Wobo's form (a single round squircle jelly), Wobo's matte
 * surface, Wobo's two eyes, or the existence of the flame-glow beneath Wobo (it replaces any drop shadow
 * and always exists). Everything below is frozen and asserted by tests.
 */
export const WOBO_IDENTITY = Object.freeze({
  form: 'round_squircle_jelly',
  surface: 'matte',
  colorFamily: 'molten',
  color: woboMolten, // #FF5A1F — molten only, reserved for Wobo alone (DESIGN.md §2)
  eyes: 2,
  flame: 'always', // the flame-glow beneath Wobo always exists and flickers
} as const);

/**
 * The molten palette Wobo is rendered in — Wobo's warmth runs from molten orange into a rose-pink
 * bloom (the owner-approved body gradient), with one small golden spark that is Wobo's alone.
 */
export const MOLTEN = Object.freeze({
  core: '#FF9E62',
  base: woboMolten,
  deep: '#D63E07',
  bloom: '#F0619B',
  bloomDeep: '#D8437F',
  spark: '#FFC93C',
  face: '#2A1510',
  glowInner: 'rgba(255, 133, 71, 0.92)',
  glowMid: 'rgba(255, 90, 31, 0.55)',
  glowOuter: 'rgba(255, 90, 31, 0)',
} as const);

/**
 * Wobo's mood — the page chooses it, and it drives Wobo's reactions and Wobo's flame. This is the license
 * surface: pages pick the mood that fits the moment; Wobo's identity never changes with it.
 */
export type WoboMood =
  | 'idle' // present, gently breathing
  | 'thinking' // leaning toward the learner's working
  | 'listening' // buttery gooey metaballs (voice)
  | 'correct' // a small squish of approval
  | 'celebrate' // a celebratory bob on a mastered node
  | 'waiting' // quietly dimmed to an ember
  | 'hint' // flame flickers brighter as a hint escalates
  | 'explaining' // gesturing toward what Wobo annotates (DESIGN.md §4)
  | 'resting' // a slow calm breath — sanctioned rest, never guilt (DESIGN.md §4)
  | 'oops'; // a sympathetic wince on a wrong answer — with them, never at them

/**
 * The flame is expressive (per the license): it may lean, trail, flare, calm to an ember, or flicker
 * brighter. It may never stop existing. A mood implies a default flame; a page can override it.
 */
export type FlameState = 'steady' | 'lean' | 'trail' | 'flare' | 'ember' | 'brighten';

export function flameForMood(mood: WoboMood): FlameState {
  switch (mood) {
    case 'thinking':
      return 'lean';
    case 'listening':
      return 'trail';
    case 'correct':
    case 'celebrate':
      return 'flare';
    case 'waiting':
    case 'resting':
      return 'ember';
    case 'hint':
      return 'brighten';
    case 'explaining':
      return 'lean';
    case 'oops':
      return 'ember';
    default:
      return 'steady';
  }
}
