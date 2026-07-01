import { vidyaMolten } from '@classess/config';

/**
 * Vidya's identity is LOCKED (docs/02-DESIGN/02-vidya.md). This module encodes it so the lock is a
 * fact in code, not a note in a doc. Choreography is free (the Vidya-cute license) — identity is not.
 *
 * You MAY NOT change: her colour (molten only), her form (a single round squircle jelly), her matte
 * surface, her two eyes, or the existence of the flame-glow beneath her (it replaces any drop shadow
 * and always exists). Everything below is frozen and asserted by tests.
 */
export const VIDYA_IDENTITY = Object.freeze({
  form: 'round_squircle_jelly',
  surface: 'matte',
  colorFamily: 'molten',
  color: vidyaMolten, // #FF4D1A — molten only, reserved for her alone
  eyes: 2,
  flame: 'always', // the flame-glow beneath her always exists and flickers
} as const);

/** The molten palette Vidya is rendered in. Shades of the #FF4D1A family only. */
export const MOLTEN = Object.freeze({
  core: '#FF9A5A',
  base: vidyaMolten,
  deep: '#D93A10',
  glowInner: 'rgba(255, 128, 64, 0.92)',
  glowMid: 'rgba(255, 77, 26, 0.55)',
  glowOuter: 'rgba(255, 77, 26, 0)',
} as const);

/**
 * Vidya's mood — the page chooses it, and it drives her reactions and her flame. This is the license
 * surface: pages pick the mood that fits the moment; her identity never changes with it.
 */
export type VidyaMood =
  | 'idle' // present, gently breathing
  | 'thinking' // leaning toward the learner's working
  | 'listening' // buttery gooey metaballs (voice)
  | 'correct' // a small squish of approval
  | 'celebrate' // a celebratory bob on a mastered node
  | 'waiting' // quietly dimmed to an ember
  | 'hint'; // flame flickers brighter as a hint escalates

/**
 * The flame is expressive (per the license): it may lean, trail, flare, calm to an ember, or flicker
 * brighter. It may never stop existing. A mood implies a default flame; a page can override it.
 */
export type FlameState = 'steady' | 'lean' | 'trail' | 'flare' | 'ember' | 'brighten';

export function flameForMood(mood: VidyaMood): FlameState {
  switch (mood) {
    case 'thinking':
      return 'lean';
    case 'listening':
      return 'trail';
    case 'correct':
    case 'celebrate':
      return 'flare';
    case 'waiting':
      return 'ember';
    case 'hint':
      return 'brighten';
    default:
      return 'steady';
  }
}
