/**
 * Wobo's scenes — the layer above expressions and behaviours (owner call, 2026-09-02: "more scenes
 * and animation and behaviours and expressions").
 *
 * An expression is a face. A behaviour is a body track. A SCENE is a short piece of acting: a
 * sequence of beats, each of which may change the face, play a body track, and say where Wobo looks.
 * Scenes are what the rest of the product cues by name — the board's `action` events, the idle
 * scheduler, the pointer, the clock — so nothing outside this file has to know which face pairs
 * with which track.
 *
 * Everything here is pure data and pure functions. The rig owns the clock; this owns the rules, so
 * every beat, every threshold and every alias is testable without a browser.
 */

import type { WoboBehaviour } from './behaviours';
import type { WoboExpression } from './expressions';

// --- The contract --------------------------------------------------------------------------------

/**
 * Where a beat sends Wobo's gaze.
 * - a pair, in rig units, is an absolute eye offset
 * - `pointer` hands the gaze back to the cursor
 * - `target` means the thing the scene was cued about (the noticed element)
 * - `away` is a deliberate look-off — losing interest, not looking at nothing
 * - `ahead` re-centres
 */
export type SceneLook = readonly [number, number] | 'pointer' | 'target' | 'away' | 'ahead';

export interface SceneBeat {
  /** Milliseconds from the start of the scene. The first beat is always at 0. */
  at: number;
  expression?: WoboExpression;
  behaviour?: WoboBehaviour;
  look?: SceneLook;
}

/**
 * What cues a scene. This is the vocabulary the rest of the app speaks in, so a surface never
 * reaches for a behaviour name directly.
 */
export type SceneCue =
  | 'action' // the board asked for it (a tutor action, a tool result)
  | 'idle' // the idle scheduler crossed a stage
  | 'pointer' // the cursor did something
  | 'hover' // the cursor is over Wobo
  | 'press' // Wobo was clicked or tapped
  | 'clock' // local time said so
  | 'meeting'; // first meeting, once per learner

export interface SceneSpec {
  cue: SceneCue;
  /** Total length in ms. Never longer than the last beat plus its tail. */
  dur: number;
  beats: readonly SceneBeat[];
  /** Higher wins when two scenes want Wobo at the same moment. */
  priority: number;
  /**
   * Wobo's whisper for the scene, if a surface wants one. Wobo's voice: sentence case, no emoji, no
   * exclamation marks. Empty means Wobo acts without saying anything, which is most of them.
   */
  note: string;
  /**
   * A haptic-like tick on the beat, in ms, where the device supports vibration. Only the two
   * direct-touch reactions carry one — a haptic that fires on its own is a tic, not a reaction.
   */
  haptic?: number;
}

// --- Pointer attention ---------------------------------------------------------------------------

/**
 * How long Wobo will follow a cursor before losing interest. A wobot that tracks forever is a
 * security camera; a wobot that never tracks is furniture.
 */
export const POINTER_ATTENTION = Object.freeze({
  /** Wobo is following, plainly curious. */
  waning: 4_500,
  /** Wobo is still following but has narrowed — the last of the interest. */
  lost: 8_000,
});

export type PointerAttention = 'engaged' | 'waning' | 'lost';

/** Wobo's interest in a cursor that has been moving for `followedMs` without going anywhere new. */
export function pointerAttention(followedMs: number): PointerAttention {
  if (followedMs >= POINTER_ATTENTION.lost) return 'lost';
  if (followedMs >= POINTER_ATTENTION.waning) return 'waning';
  return 'engaged';
}

/**
 * A cursor that jumps somewhere genuinely new wins Wobo's interest back. Small drifts do not —
 * otherwise Wobo could never lose interest at all.
 */
export const POINTER_REENGAGE_PX = 140;

export function pointerReengages(
  from: { x: number; y: number } | null,
  to: { x: number; y: number },
): boolean {
  if (!from) return true;
  return Math.hypot(to.x - from.x, to.y - from.y) >= POINTER_REENGAGE_PX;
}

// --- The twelve ----------------------------------------------------------------------------------

/**
 * The ten scenes the owner named, plus the two direct reactions (hover, press). Order is the order
 * they were asked for, and the order the contact sheet uses.
 */
export const SCENES = {
  /** Leans in from the edge of the orb, has a look, comes back. */
  peek: {
    cue: 'action',
    dur: 1300,
    priority: 40,
    note: '',
    beats: [
      { at: 0, expression: 'peeking', behaviour: 'peek', look: [16, 2] },
      { at: 520, expression: 'curious', look: [8, -2] },
      { at: 980, expression: 'happy', look: 'ahead' },
    ],
  },
  /** A stretch and a yawn after a long quiet. Cued by the idle scheduler, never by a timer here. */
  stretch: {
    cue: 'idle',
    dur: 2100,
    priority: 10,
    note: '',
    beats: [
      { at: 0, expression: 'sleepy', behaviour: 'stretch' },
      { at: 700, expression: 'sleepy', behaviour: 'yawn' },
      { at: 1800, expression: 'bored', look: [0, 4] },
    ],
  },
  /** Follows the cursor with the visor, then loses interest and looks off. */
  followPointer: {
    cue: 'pointer',
    dur: 9600,
    priority: 20,
    note: '',
    beats: [
      { at: 0, expression: 'curious', look: 'pointer' },
      { at: POINTER_ATTENTION.waning, expression: 'focused', look: 'pointer' },
      { at: POINTER_ATTENTION.lost, expression: 'bored', behaviour: 'drift', look: 'away' },
    ],
  },
  /** Notices something new on the page and glances at it. */
  notice: {
    cue: 'action',
    dur: 1500,
    priority: 50,
    note: '',
    beats: [
      { at: 0, expression: 'surprised', behaviour: 'perk', look: 'target' },
      { at: 420, expression: 'curious', look: 'target' },
      { at: 1150, expression: 'idle', look: 'ahead' },
    ],
  },
  /** Thinking, with the pen out, tapping. */
  penTap: {
    cue: 'action',
    dur: 1700,
    priority: 45,
    note: 'hmm',
    beats: [
      { at: 0, expression: 'thinking', behaviour: 'penTap', look: [-6, -8] },
      { at: 950, expression: 'computing', look: [-2, -6] },
      { at: 1450, expression: 'thinking', look: [-6, -8] },
    ],
  },
  /** Got it — the one spark, earned. */
  gotIt: {
    cue: 'action',
    dur: 1300,
    priority: 70,
    note: 'oh',
    beats: [
      { at: 0, expression: 'aha', behaviour: 'bounce', look: 'ahead' },
      { at: 620, expression: 'proud', behaviour: 'puff' },
      { at: 1050, expression: 'happy' },
    ],
  },
  /** The wave, on a first meeting only. */
  wave: {
    cue: 'meeting',
    dur: 1700,
    priority: 80,
    note: 'hello',
    beats: [
      { at: 0, expression: 'greeting', behaviour: 'wave', look: [0, -5] },
      { at: 950, expression: 'happy', look: 'ahead' },
      { at: 1450, expression: 'idle' },
    ],
  },
  /** Yes. */
  nod: {
    cue: 'action',
    dur: 760,
    priority: 60,
    note: '',
    beats: [
      { at: 0, expression: 'happy', behaviour: 'nod' },
      { at: 540, expression: 'idle' },
    ],
  },
  /** No — with the learner, never at them, so the face stays kind while the head disagrees. */
  headShake: {
    cue: 'action',
    dur: 940,
    priority: 60,
    note: 'not quite',
    beats: [
      { at: 0, expression: 'supportive', behaviour: 'shake' },
      { at: 540, expression: 'encouraging' },
    ],
  },
  /** Late, on the learner's own clock. Sanctioned rest, never guilt (DESIGN.md §4). */
  sleepy: {
    cue: 'clock',
    dur: 2800,
    priority: 5,
    note: 'rest is part of learning',
    beats: [
      { at: 0, expression: 'bored', behaviour: 'yawn' },
      { at: 1500, expression: 'sleepy' },
    ],
  },
  /** The cursor is over Wobo: the visor brightens and Wobo leans a little toward it. */
  hover: {
    cue: 'hover',
    dur: 420,
    priority: 30,
    note: '',
    haptic: 0,
    beats: [{ at: 0, expression: 'listening', look: 'pointer' }],
  },
  /** Wobo was tapped: a bounce and a wink, on a haptic-length attack. */
  press: {
    cue: 'press',
    dur: 720,
    priority: 90,
    note: '',
    haptic: 12,
    beats: [
      { at: 0, expression: 'wink', behaviour: 'bounce' },
      { at: 430, expression: 'happy' },
    ],
  },
} as const satisfies Record<string, SceneSpec>;

export type WoboScene = keyof typeof SCENES;

export const SCENE_NAMES = Object.keys(SCENES) as WoboScene[];

export function isScene(name: string): name is WoboScene {
  return Object.hasOwn(SCENES, name);
}

/** The table is const-asserted for the tests; this widens one entry back to the interface. */
export function sceneSpec(name: WoboScene): SceneSpec {
  return SCENES[name];
}

/** Wobo's whisper for a scene, if a surface wants one. Empty means Wobo says nothing. */
export function sceneNote(name: WoboScene): string {
  return SCENES[name].note;
}

/**
 * The haptic tick for a scene, in ms, or 0 for none. Kept here rather than at the call site so a
 * surface can never invent its own buzz.
 */
export function sceneHaptic(name: WoboScene): number {
  return sceneSpec(name).haptic ?? 0;
}

// --- Cueing by name ------------------------------------------------------------------------------

/**
 * The words the rest of the product actually uses. The board's `action` events, a tutor's reply and
 * a bench button all arrive as free text; this is the one place that turns text into a scene.
 */
const ALIASES: Readonly<Record<string, WoboScene>> = Object.freeze({
  greet: 'wave',
  hello: 'wave',
  hi: 'wave',
  welcome: 'wave',
  yes: 'nod',
  ok: 'nod',
  okay: 'nod',
  confirm: 'nod',
  agree: 'nod',
  correct: 'nod',
  no: 'headShake',
  refuse: 'headShake',
  deny: 'headShake',
  disagree: 'headShake',
  wrong: 'headShake',
  aha: 'gotIt',
  gotit: 'gotIt',
  understood: 'gotIt',
  celebrate: 'gotIt',
  think: 'penTap',
  thinking: 'penTap',
  pentap: 'penTap',
  look: 'notice',
  glance: 'notice',
  noticed: 'notice',
  lean: 'peek',
  yawn: 'stretch',
  sleep: 'sleepy',
  night: 'sleepy',
  rest: 'sleepy',
  follow: 'followPointer',
  track: 'followPointer',
  tap: 'press',
  click: 'press',
});

/**
 * Resolve whatever a caller passed — a scene name, an alias, a different case, a spaced phrase, or
 * nonsense — to a real scene. Returns null rather than guessing when nothing matches, so a bad
 * action cues no acting instead of the wrong acting.
 */
export function resolveScene(name: string | null | undefined): WoboScene | null {
  if (!name) return null;
  if (isScene(name)) return name;
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (isScene(key)) return key;
  for (const scene of SCENE_NAMES) {
    if (scene.toLowerCase() === key) return scene;
  }
  return ALIASES[key] ?? null;
}

/** Every scene a given cue can start, in the order they are declared. */
export function scenesForCue(cue: SceneCue): WoboScene[] {
  return SCENE_NAMES.filter((n) => SCENES[n].cue === cue);
}

/**
 * Whether a scene may take Wobo over from one already running. Equal priority does not interrupt —
 * a scene that is playing finishes rather than restarting on a repeated cue.
 */
export function sceneInterrupts(next: WoboScene, running: WoboScene | null): boolean {
  if (!running) return true;
  return SCENES[next].priority > SCENES[running].priority;
}

// --- Playing a scene -----------------------------------------------------------------------------

export interface SceneFrame {
  /** The beat in force, or null before the first one (which cannot happen — beat 0 is at 0). */
  beat: SceneBeat | null;
  /** Index of that beat, or -1. */
  index: number;
  /** True once the scene has run its full duration. */
  done: boolean;
}

/** The beat in force at `elapsedMs`. The last beat holds until the scene's duration runs out. */
export function sceneFrame(name: WoboScene, elapsedMs: number): SceneFrame {
  const beats = SCENES[name].beats as readonly SceneBeat[];
  let index = -1;
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i] as SceneBeat;
    if (beat.at <= elapsedMs) index = i;
    else break;
  }
  return {
    beat: index < 0 ? null : (beats[index] as SceneBeat),
    index,
    done: elapsedMs >= SCENES[name].dur,
  };
}

/**
 * The beats that begin in the half-open window `(fromMs, toMs]` — what a frame loop needs to know
 * so it fires each beat's behaviour exactly once, however uneven the frame times are.
 */
export function sceneBeatsBetween(name: WoboScene, fromMs: number, toMs: number): SceneBeat[] {
  return (SCENES[name].beats as readonly SceneBeat[]).filter((b) => b.at > fromMs && b.at <= toMs);
}

/** Where Wobo looks when Wobo has deliberately stopped looking at you. Off and a little down. */
export const AWAY_LOOK: readonly [number, number] = Object.freeze([-26, 9] as [number, number]);

/** How far a look symbol lands in rig units, given what the rig currently knows. */
export function resolveSceneLook(
  look: SceneLook | undefined,
  context: {
    pointer?: readonly [number, number] | null;
    target?: readonly [number, number] | null;
  },
): readonly [number, number] | 'pointer' | null {
  if (!look) return null;
  if (look === 'ahead') return [0, 0];
  if (look === 'away') return AWAY_LOOK;
  if (look === 'pointer') return context.pointer ?? 'pointer';
  if (look === 'target') return context.target ?? [0, 0];
  return look;
}

// --- The clock -----------------------------------------------------------------------------------

/**
 * When it is late enough for Wobo to get sleepy, on the LEARNER's own clock — the hours are read
 * off a local `Date`, never off a server, so a learner in Chennai and one in Chicago each get their
 * own night.
 */
export const NIGHT_HOURS = Object.freeze({ from: 21, until: 6 });

/** True between 21:00 and 05:59 local. The window wraps midnight, which is why this is a function. */
export function isNight(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= NIGHT_HOURS.from || h < NIGHT_HOURS.until;
}

/** How long the learner must also have been quiet before the night is allowed to show. */
export const SLEEPY_QUIET_MS = 12_000;

/**
 * The rule, stated once: night alone is not enough — Wobo only gets sleepy when the learner has
 * also gone quiet, so a learner working hard at midnight is not yawned at.
 *
 * The rig reads the clock on its own (once a minute, and a surface may override it), so it calls
 * this rather than `clockScene` — one rule, two callers, no second copy of it.
 */
export function sleepyFromClock(night: boolean, quietMs: number): WoboScene | null {
  return night && quietMs >= SLEEPY_QUIET_MS ? 'sleepy' : null;
}

/** The scene the clock cues, if any, for a caller that has a real local `Date` to hand. */
export function clockScene(date: Date = new Date(), quietMs = 0): WoboScene | null {
  return sleepyFromClock(isNight(date), quietMs);
}

// --- Noticing ------------------------------------------------------------------------------------

/**
 * What Wobo glances at when something new arrives: the most recently registered target that Wobo has
 * not already noticed. Ids are compared, not rects, so a re-measure never re-fires the glance.
 */
export function noticedTarget(ids: readonly string[], seen: ReadonlySet<string>): string | null {
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i] as string;
    if (!seen.has(id)) return id;
  }
  return null;
}
