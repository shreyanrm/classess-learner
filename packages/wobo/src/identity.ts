/**
 * Wobo's identity is LOCKED (DESIGN.md §4). This module encodes it so the lock is a fact in code,
 * not a note in a doc. Choreography is free (the Wobo-cute license) — identity is not.
 *
 * Wobo is the ink-visor wobot: a round body in ink carrying a cream visor, two Wobo-blue eyes and a
 * pen tip in the same blue, rimmed by a half-pixel hairline in the opposite tone so the silhouette
 * stays crisp over any ground. On night the tones swap — a cream body carrying a night visor.
 *
 * You MAY NOT change: Wobo's form (one round ink body with a visor), the visor, the two eyes, the
 * pen tip, the hairline rim, or the tones below. There is no orb, no jelly, no flame, and no warm
 * body colour — that vocabulary is retired (DESIGN.md §2 palette v4). Wobo has no gender
 * (WOBO-PLAN.md §19): nothing in the rig, the palette or the voice signals a boy or a girl.
 *
 * Everything below is frozen and asserted by tests.
 */

/** The four tones the rig renders Wobo in, for one theme. */
export interface WoboTones {
  /** Wobo's body — deep navy ink on cream paper, cream on night. */
  body: string;
  /** The visor Wobo carries their eyes in — always the opposite tone to the body. */
  visor: string;
  /** Wobo's eyes and Wobo's pen tip. The one hit of pigment on Wobo. */
  eye: string;
  /** The half-pixel rim, in the opposite tone, that keeps Wobo legible over any content. */
  hairline: string;
}

/**
 * Palette v4 (DESIGN.md §2/§4). Ink `#14142B` on cream, cream `#F3F0E8` on night; the visor takes
 * the ground it is not (cream `#FAF7F0` in light, night `#0F1226` in dark); the eyes are Wobo blue
 * `#2B45FF`, lifting to `#7C8CFF` on night for contrast.
 */
export const WOBO_TONES = Object.freeze({
  light: Object.freeze({
    body: '#14142B',
    visor: '#FAF7F0',
    eye: '#2B45FF',
    hairline: 'rgba(250,247,240,0.55)',
  }) as Readonly<WoboTones>,
  dark: Object.freeze({
    body: '#F3F0E8',
    visor: '#0F1226',
    eye: '#7C8CFF',
    hairline: 'rgba(15,18,38,0.40)',
  }) as Readonly<WoboTones>,
});

/** Wobo blue — Wobo's pen and eyes, and the brand's one pigment (DESIGN.md §2). */
export const WOBO_BLUE = WOBO_TONES.light.eye;
/** Wobo blue lifted for night, so the eyes hold contrast on the dark ground. */
export const WOBO_BLUE_NIGHT = WOBO_TONES.dark.eye;

export const WOBO_IDENTITY = Object.freeze({
  form: 'ink_visor_wobot',
  surface: 'matte',
  /** The visor is part of the character, never a state a page can turn off. */
  visor: 'always',
  eyes: 2,
  /** Wobo draws; the pen tip is inked in Wobo blue, the same pigment as the eyes. */
  pen: 'always',
  /** The half-pixel opposite-tone rim — the one hairline that survives (DESIGN.md §4). */
  hairline: 'always',
  colorFamily: 'ink_visor',
  /** Wobo's one pigment, on paper. */
  color: WOBO_BLUE,
  tones: WOBO_TONES,
} as const);

/**
 * Wobo's mood — the page chooses it, and it drives Wobo's body language. This is the license
 * surface: pages pick the mood that fits the moment; Wobo's identity never changes with it.
 */
export type WoboMood =
  | 'idle' // present, gently breathing
  | 'thinking' // leaning toward the learner's working, pen tapping
  | 'listening' // leaning in, attentive
  | 'correct' // a small squish of approval
  | 'celebrate' // a celebratory bob on a mastered node
  | 'waiting' // quietly dimmed, holding still
  | 'hint' // a nudge toward what matters as a hint escalates
  | 'explaining' // gesturing toward what Wobo annotates (DESIGN.md §4)
  | 'resting' // a slow calm breath — sanctioned rest, never guilt (DESIGN.md §4)
  | 'oops'; // a sympathetic wince on a wrong answer — with them, never at them
