'use client';

/**
 * WoboBody — the character rig, v2: the ink visor wobot (owner call, 2026-09-02).
 *
 * A near-black body carrying a white visor in light; the tones invert in dark. Wobo's eyes are
 * ultramarine in both and are the only pigment on the screen. A half-pixel hairline in the opposite
 * tone keeps Wobo legible over any content. An ultramarine-tipped pen, held in a mitt, appears only
 * while Wobo is drawing. No shadows, 3 px radius elsewhere in the product, one hit of pigment here.
 *
 * Twenty-two expressions and twenty behaviours live in `expressions.ts` and `behaviours.ts`; the
 * twelve SCENES that compose them in `scenes.ts`; the idle scheduler in `idle.ts`; the gaze maths in
 * `tracking.ts`; Wobo's tones in `palette.ts`. This file is only the rig: one animation frame loop
 * over spring channels writing SVG attributes, so a full cast of Wobo's costs one rAF and no React
 * renders per frame.
 *
 * Contract: the props of v1 all still work — `mood` takes the legacy mood vocabulary as well as the
 * new expression names, so no consumer had to change.
 */

import { useReducedMotion } from '@wobo/motion';
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { WoboMood } from '../identity';
import { behaviourSpec, sampleBehaviour, type WoboBehaviour } from './behaviours';
import {
  type EyeSpec,
  expressionFor,
  expressionSpec,
  eyeGeometry,
  type WoboExpression,
} from './expressions';
import { GROUND_GEOMETRY, groundMark } from './ground';
import {
  baseInForce,
  dozing,
  glancesAt,
  type IdleStage,
  idleClock,
  idleStageFor,
  idleTransition,
  nextGlanceDelay,
  nextGlanceTarget,
} from './idle';
import { ensureRigStyles, RIG_BODY_OPACITY, RIG_CLASS } from './palette';
import {
  AWAY_LOOK,
  isNight,
  pointerAttention,
  pointerReengages,
  resolveScene,
  resolveSceneLook,
  type SceneBeat,
  SLEEPY_QUIET_MS,
  sceneBeatsBetween,
  sceneFrame,
  sceneHaptic,
  sceneInterrupts,
  sceneSpec,
  sleepyFromClock,
  type WoboScene,
} from './scenes';
import { channel, type SpringChannel, set as setChannel, step } from './spring';
import {
  leanOffset,
  lookOffset,
  type Point,
  resolveLookTarget,
  type TrackRect,
  trackRect,
} from './tracking';

// The rig's public surface — consumers import these from `@wobo/wobo` alongside the component.
export {
  BEHAVIOUR_NAMES,
  BEHAVIOURS,
  type BehaviourSpec,
  behaviourSpec,
  isBehaviour,
  sampleBehaviour,
  type WoboBehaviour,
} from './behaviours';
export {
  EXPRESSION_NAMES,
  EXPRESSIONS,
  type ExpressionSpec,
  EYE_RADIUS,
  type EyeKind,
  type EyeSpec,
  expressionFor,
  expressionNote,
  expressionSpec,
  eyeGeometry,
  isExpression,
  MOOD_TO_EXPRESSION,
  type WoboExpression,
} from './expressions';
export { GROUND_GEOMETRY, GROUND_PATCH_MAX_SIZE, type GroundMark, groundMark } from './ground';
export {
  baseInForce,
  IDLE_STAGE_NAMES,
  IDLE_THRESHOLDS,
  type IdleStage,
  idleClock,
  idleStageFor,
  idleStageName,
} from './idle';
export { displayName } from './names';
export { RIG_CLASS, RIG_DARK, RIG_LIGHT, type RigTones } from './palette';
export {
  AWAY_LOOK,
  clockScene,
  isNight,
  isScene,
  NIGHT_HOURS,
  noticedTarget,
  POINTER_ATTENTION,
  POINTER_REENGAGE_PX,
  type PointerAttention,
  pointerAttention,
  pointerReengages,
  resolveScene,
  resolveSceneLook,
  SCENE_NAMES,
  SCENES,
  type SceneBeat,
  type SceneCue,
  type SceneFrame,
  type SceneLook,
  type SceneSpec,
  SLEEPY_QUIET_MS,
  sceneBeatsBetween,
  sceneFrame,
  sceneHaptic,
  sceneInterrupts,
  sceneNote,
  sceneSpec,
  scenesForCue,
  sleepyFromClock,
  type WoboScene,
} from './scenes';
export {
  resolveLookTarget,
  type TrackRect,
  trackPoint,
  trackRect,
} from './tracking';

export interface WoboBodyProps {
  /** Diameter in px — Wobo's head fills the box, the pen and Wobo's sparks may overflow it. */
  size?: number;
  /**
   * Wobo's state. Takes the twenty expression names and, unchanged from v1, the legacy mood
   * vocabulary (`celebrate`, `correct`, `waiting`, `hint`, `oops`, …), which maps onto them.
   */
  mood?: WoboMood | WoboExpression;
  /**
   * What is in focus — a rectangle in viewport coordinates or the element itself. Wobo looks here,
   * always, and only falls back to the pointer when nothing is in focus.
   */
  focus?: TrackRect | Element | null;
  /** Pin Wobo's gaze: each axis -1..1, or 'pointer' to insist on the cursor. */
  gaze?: { x: number; y: number } | 'pointer';
  /** For 'explaining': the direction Wobo gestures toward, in radians (0 = right). */
  gestureAngle?: number;
  /**
   * Epoch milliseconds (`Date.now()`) of the last learner input anywhere in the app. Wobo's idle life
   * runs off this: a glance at 4 s, bored at 12 s, a yawn or a sigh at 20 s, dozing at 35 s, and a
   * startle when it moves again. Wobo's own interactions count too, so this only ever needs to be
   * passed by a surface that knows about input Wobo cannot see.
   */
  idleSince?: number;
  /** Play a behaviour. Change `behaviourKey` to replay the same one. */
  behaviour?: WoboBehaviour | null;
  behaviourKey?: string | number;
  /**
   * Play a SCENE — a short piece of acting, named. This is what the board's `action` events cue:
   * anything `resolveScene` understands ('peek', 'gotIt', 'yes', 'no', 'hello', …). Change
   * `sceneKey` to replay the same one. Unknown names cue nothing rather than the wrong thing.
   */
  scene?: WoboScene | string | null;
  sceneKey?: string | number;
  /**
   * What the scene is ABOUT — the element `notice` glances at, for instance. A rectangle in viewport
   * coordinates or the element itself.
   */
  sceneTarget?: TrackRect | Element | null;
  /**
   * Override the clock. Left alone, Wobo reads the learner's own local time and gets sleepy at
   * night once the learner has also gone quiet; pass `false` to keep Wobo bright at 2 a.m.
   */
  night?: boolean;
  /** Let the learner pick Wobo up and carry Wobo; Wobo stretches toward the throw and settles. */
  draggable?: boolean;
  onTap?: () => void;
  /** Fires on the second of two quick presses; the hop and the celebration play either way. */
  onDoubleTap?: () => void;
  /** Push-to-talk: fires when a press crosses the hold threshold (a poke stays a poke below it). */
  onHoldStart?: () => void;
  /** Push-to-talk: fires on release/cancel after a hold began — the utterance is complete. */
  onHoldEnd?: () => void;
  /** How long a press must be held before it becomes push-to-talk rather than a poke (ms). */
  holdThresholdMs?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

// --- Wobo's geometry, in rig units (the prototype's space) -------------------------------------------

/** The square the head fills; the pen, the spark and the z's overflow it deliberately. */
const VIEW_BOX = '26 17 98 98';
const VIEW_SIZE = 98;
const HEAD = { cx: 75, cy: 66, r: 42 } as const;
/** Wobo squashes and rotates about Wobo's base, not Wobo's middle — that is where the weight is. */
const PIVOT = { x: 75, y: 108 } as const;
const VISOR = { x: 41, y: 50, w: 68, h: 30, rx: 15 } as const;
const EYE_GAP = 13;
/** How far each edge of the visor closes in for 'focused'. Two of these, top and bottom. */
const NARROW_BAND = 6;
const DOUBLE_TAP_MS = 320;
const POINTER_LIVE_MS = 4000;
const FOCUS_RECT_TTL_MS = 120;
/** How far a press must travel before it is a carry rather than a poke. */
const CARRY_SLOP_PX = 6;

const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Write one eye. The path data changes every frame (the gaze moves); the paint mode only changes
 * when the shape kind does, so the signature guard keeps that off the hot path.
 */
function paintEye(
  el: SVGPathElement | null,
  slot: 0 | 1,
  sig: [string, string],
  cx: number,
  cy: number,
  eye: EyeSpec,
  blink: number,
  now: number,
): void {
  if (!el) return;
  const g = eyeGeometry(cx, cy, eye, blink, now);
  el.setAttribute('d', g.d);
  const next = `${g.filled}|${g.strokeWidth}`;
  if (sig[slot] === next) return;
  sig[slot] = next;
  el.setAttribute('fill', g.filled ? 'var(--wr-eye)' : 'none');
  el.setAttribute('stroke', g.filled ? 'none' : 'var(--wr-eye)');
  el.setAttribute('stroke-width', g.filled ? '0' : String(g.strokeWidth));
}

function isRect(v: TrackRect | Element | null | undefined): v is TrackRect {
  return !!v && typeof (v as TrackRect).width === 'number';
}

interface Channels {
  sx: SpringChannel;
  sy: SpringChannel;
  rot: SpringChannel;
  dx: SpringChannel;
  dy: SpringChannel;
  lookX: SpringChannel;
  lookY: SpringChannel;
  pen: SpringChannel;
  spark: SpringChannel;
  zz: SpringChannel;
  /** The hover brighten: a halo of the visor's own tone, 0..1. Never a shadow, never a new colour. */
  glow: SpringChannel;
}

/** A scene in flight: which one, when it started, and how far its beats have been fired. */
interface SceneRun {
  name: WoboScene;
  start: number;
  fired: number;
}

interface DragState {
  ox: number;
  oy: number;
  x: number;
  y: number;
  px: number;
  py: number;
  moved: boolean;
  startX: number;
  startY: number;
}

interface RigState {
  base: WoboExpression;
  /** The last expression handed to the accessible name — so we only re-render when it changes. */
  announced: WoboExpression;
  temp: WoboExpression | null;
  tempUntil: number;
  beh: { name: WoboBehaviour; start: number } | null;
  scene: SceneRun | null;
  idleStage: IdleStage;
  glance: [number, number] | null;
  glanceUntil: number;
  hover: boolean;
  pressed: boolean;
  pressAt: number;
  held: boolean;
  didHold: boolean;
  lastTapAt: number;
  drag: DragState | null;
  pointer: Point | null;
  pointerAt: number;
  /** When Wobo started following this cursor, and where it was when Wobo last took an interest. */
  pointerSince: number;
  pointerAnchor: Point | null;
  /** Set once when Wobo loses interest in the cursor, so the look-away plays exactly once. */
  droppedPointer: boolean;
  /** The local clock, re-read once a minute rather than sixty times a second. */
  night: boolean;
  nightAt: number;
  nightCued: boolean;
  lastTouch: number;
  blink: number;
  blinkPhase: number;
  nextBlink: number;
  doubleBlink: boolean;
  focusRect: TrackRect | null;
  focusAt: number;
  sceneRect: TrackRect | null;
  sceneRectAt: number;
  ch: Channels;
}

function newState(now: number): RigState {
  return {
    base: 'idle',
    announced: 'idle',
    temp: null,
    tempUntil: 0,
    beh: null,
    scene: null,
    idleStage: 0,
    glance: null,
    glanceUntil: 0,
    hover: false,
    pressed: false,
    pressAt: 0,
    held: false,
    didHold: false,
    lastTapAt: 0,
    drag: null,
    pointer: null,
    pointerAt: 0,
    pointerSince: now,
    pointerAnchor: null,
    droppedPointer: false,
    night: false,
    nightAt: Number.NEGATIVE_INFINITY,
    nightCued: false,
    lastTouch: now,
    blink: 0,
    blinkPhase: 0,
    nextBlink: now + 2200,
    doubleBlink: false,
    focusRect: null,
    focusAt: 0,
    sceneRect: null,
    sceneRectAt: 0,
    ch: {
      sx: channel(1),
      sy: channel(1),
      rot: channel(0),
      dx: channel(0),
      dy: channel(0),
      lookX: channel(0),
      lookY: channel(0),
      pen: channel(0),
      spark: channel(0),
      zz: channel(0),
      glow: channel(0),
    },
  };
}

export function WoboBody({
  size = 88,
  mood = 'idle',
  focus = null,
  gaze,
  gestureAngle,
  idleSince,
  behaviour = null,
  behaviourKey,
  scene = null,
  sceneKey,
  sceneTarget = null,
  night,
  draggable = false,
  onTap,
  onDoubleTap,
  onHoldStart,
  onHoldEnd,
  holdThresholdMs = 300,
  label = 'Wobo',
  className,
  style,
}: WoboBodyProps) {
  const reduced = useReducedMotion();
  const base = expressionFor(mood);
  /** Only the base expression is announced; a 650 ms grin is not news for a screen reader. */
  const [announced, setAnnounced] = useState<WoboExpression>(base);
  /** The loop names Wobo's state without re-rendering on every frame. */
  const announce = useRef(setAnnounced);
  announce.current = setAnnounced;

  const rootRef = useRef<HTMLElement | null>(null);
  const setRoot = (el: HTMLElement | null) => {
    rootRef.current = el;
  };
  const outerRef = useRef<SVGGElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  // One ref for either grounding mark (ellipse or line), so a callback ref rather than two.
  const groundRef = useRef<SVGGraphicsElement | null>(null);
  const setGround = (el: SVGGraphicsElement | null) => {
    groundRef.current = el;
  };
  const eyeLRef = useRef<SVGPathElement | null>(null);
  const eyeRRef = useRef<SVGPathElement | null>(null);
  const narrowRef = useRef<SVGGElement | null>(null);
  const glowRef = useRef<SVGRectElement | null>(null);
  const penRef = useRef<SVGGElement | null>(null);
  const sparkRef = useRef<SVGGElement | null>(null);
  const zzRef = useRef<SVGGElement | null>(null);
  const zzARef = useRef<SVGTextElement | null>(null);
  const zzBRef = useRef<SVGTextElement | null>(null);
  const eyeSig = useRef<[string, string]>(['', '']);

  const stateRef = useRef<RigState | null>(null);
  if (stateRef.current === null) {
    stateRef.current = newState(typeof performance === 'undefined' ? 0 : performance.now());
    stateRef.current.base = base;
  }

  /** Live props for the frame loop — it reads these, so a prop change never restarts the loop. */
  const liveProps = {
    size,
    base,
    focus,
    gaze,
    gestureAngle,
    idleSince,
    reduced,
    onHoldStart,
    onHoldEnd,
    holdThresholdMs,
    draggable,
    sceneTarget,
    night,
  };
  const p = useRef(liveProps);
  p.current = liveProps;

  useEffect(() => {
    ensureRigStyles();
  }, []);

  // --- Painting: the only place attributes are written ------------------------------------------
  const paint = useRef((now: number) => {
    const S = stateRef.current;
    if (!S) return;
    const c = S.ch;
    const spec = expressionSpec(S.temp ?? S.base);
    const lookX = c.lookX.value;
    const lookY = c.lookY.value;

    outerRef.current?.setAttribute(
      'transform',
      `translate(${round(c.dx.value)} ${round(c.dy.value)})`,
    );
    bodyRef.current?.setAttribute(
      'transform',
      `translate(${PIVOT.x} ${PIVOT.y}) scale(${round(c.sx.value)} ${round(c.sy.value)}) rotate(${round(c.rot.value)}) translate(${-PIVOT.x} ${-PIVOT.y})`,
    );
    // The grounding mark widens with Wobo, whichever mark it is: the patch by its radius, the
    // hairline by its two ends, so a squash still lands on a floor that is the right size.
    const ground = groundRef.current;
    if (ground?.tagName === 'ellipse') {
      ground.setAttribute('rx', String(round(GROUND_GEOMETRY.patch.rx * c.sx.value)));
    } else if (ground) {
      const half = round(GROUND_GEOMETRY.hairline.halfWidth * c.sx.value);
      ground.setAttribute('x1', String(GROUND_GEOMETRY.cx - half));
      ground.setAttribute('x2', String(GROUND_GEOMETRY.cx + half));
    }

    const ex = HEAD.cx - EYE_GAP + lookX * 0.36;
    const ex2 = HEAD.cx + EYE_GAP + lookX * 0.36;
    const ey = HEAD.cy - 0.5 + lookY * 0.32;
    paintEye(eyeLRef.current, 0, eyeSig.current, ex, ey, spec.left, S.blink, now);
    paintEye(eyeRRef.current, 1, eyeSig.current, ex2, ey, spec.right, S.blink, now);

    if (narrowRef.current) narrowRef.current.style.display = spec.narrow ? '' : 'none';

    // The hover brighten: a halo of the visor's OWN tone spreading behind it. Not a shadow, not a
    // second pigment, not a glow colour Wobo does not own — the visor simply reads brighter.
    const glow = c.glow.value;
    if (glowRef.current) {
      glowRef.current.style.opacity = String(round(Math.max(0, glow) * 0.2));
      glowRef.current.style.display = glow > 0.02 ? '' : 'none';
      glowRef.current.setAttribute(
        'transform',
        `translate(${VISOR.x + VISOR.w / 2} ${VISOR.y + VISOR.h / 2}) scale(${round(1 + glow * 0.14)}) translate(${-(VISOR.x + VISOR.w / 2)} ${-(VISOR.y + VISOR.h / 2)})`,
      );
    }

    const pen = c.pen.value;
    if (penRef.current) {
      penRef.current.style.opacity = String(round(Math.max(0, pen)));
      penRef.current.style.display = pen > 0.02 ? '' : 'none';
      penRef.current.setAttribute(
        'transform',
        `translate(${round((1 - pen) * 14)} ${round((1 - pen) * 14)}) scale(${round(0.6 + 0.4 * pen)})`,
      );
    }
    const spark = c.spark.value;
    if (sparkRef.current) {
      sparkRef.current.style.opacity = String(round(Math.max(0, spark)));
      sparkRef.current.style.display = spark > 0.02 ? '' : 'none';
      sparkRef.current.setAttribute(
        'transform',
        `translate(${HEAD.cx} ${HEAD.cy}) scale(${round(0.6 + spark)}) translate(${-HEAD.cx} ${-HEAD.cy})`,
      );
    }
    const zz = c.zz.value;
    if (zzRef.current) {
      zzRef.current.style.opacity = String(round(Math.max(0, zz)));
      zzRef.current.style.display = zz > 0.02 ? '' : 'none';
      zzARef.current?.setAttribute('y', String(round(34 - zz * 10)));
      zzBRef.current?.setAttribute('y', String(round(24 - zz * 14)));
    }
  });

  // --- Behaviour and expression helpers used by both the loop and the handlers -------------------
  const playRef = useRef((name: WoboBehaviour, now: number) => {
    const S = stateRef.current;
    if (!S || p.current.reduced) return;
    S.beh = { name, start: now };
    const spec = behaviourSpec(name);
    if (spec.expression) {
      S.temp = spec.expression;
      S.tempUntil = now + spec.dur;
    }
  });
  const tempRef = useRef((name: WoboExpression, ms: number, now: number) => {
    const S = stateRef.current;
    // Reduced motion means no loop is running to clear a temporary face, and no flicker either.
    if (!S || p.current.reduced) return;
    S.temp = name;
    S.tempUntil = now + ms;
    if (expressionSpec(name).spark) setChannel(S.ch.spark, 1);
  });

  // --- Scenes: the acting layer. A scene owns Wobo for its length, firing each beat once. ---------
  /**
   * Apply one beat. The expression is held for the rest of the scene rather than for a fixed
   * window, so the last beat of a scene is what Wobo wears until the scene ends.
   */
  const beatRef = useRef((beat: SceneBeat, run: SceneRun, now: number) => {
    const S = stateRef.current;
    if (!S) return;
    if (beat.expression) {
      S.temp = beat.expression;
      S.tempUntil = run.start + sceneSpec(run.name).dur;
      if (expressionSpec(beat.expression).spark) setChannel(S.ch.spark, 1);
    }
    if (beat.behaviour) playRef.current(beat.behaviour, now);
  });

  /**
   * Cue a scene by name. Free text is resolved through the registry's aliases, so a board action
   * saying 'yes' plays the nod and a board action saying nonsense plays nothing at all.
   */
  const cueRef = useRef((name: string | null | undefined, now: number) => {
    const S = stateRef.current;
    if (!S) return null;
    const resolved = resolveScene(name);
    if (!resolved) return null;
    // The registry decides who wins. Re-cueing the SAME scene always restarts it — a second tap is
    // a second reaction — but a quiet scene never stomps a loud one that is already playing.
    if (S.scene && S.scene.name !== resolved && !sceneInterrupts(resolved, S.scene.name)) {
      return null;
    }
    // Reduced motion still takes the scene's FINAL face — the meaning, without the choreography.
    if (p.current.reduced) {
      const last = sceneSpec(resolved).beats.at(-1);
      if (last?.expression) {
        S.base = last.expression;
        S.announced = last.expression;
        announce.current(last.expression);
        paint.current(0);
      }
      return resolved;
    }
    S.scene = { name: resolved, start: now, fired: -1 };
    const first = sceneSpec(resolved).beats[0];
    if (first) {
      beatRef.current(first, S.scene, now);
      S.scene.fired = first.at;
    }
    const haptic = sceneHaptic(resolved);
    if (haptic > 0 && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      // A haptic-length tick, not a buzz: the reaction is felt on the same beat it is seen.
      try {
        navigator.vibrate(haptic);
      } catch {
        // vibration blocked by policy — the visual reaction stands on its own
      }
    }
    return resolved;
  });

  // --- Reduced motion: no idle life, no bounces, no loop. One instant paint per state change. ----
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus/gaze are read live, not captured
  useEffect(() => {
    const S = stateRef.current;
    if (!S || !reduced) return;
    const spec = expressionSpec(base);
    setChannel(S.ch.sx, 1);
    setChannel(S.ch.sy, 1);
    setChannel(S.ch.rot, spec.tilt);
    setChannel(S.ch.dx, spec.lean * 0.6);
    setChannel(S.ch.dy, 0);
    const target = resolveLookTarget({
      self: rootRef.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: size, height: size },
      focus: isRect(focus) ? focus : focus ? focus.getBoundingClientRect() : null,
      gaze: gaze && gaze !== 'pointer' ? gaze : null,
      expressionLook: spec.look ?? null,
    });
    setChannel(S.ch.lookX, target[0]);
    setChannel(S.ch.lookY, target[1]);
    setChannel(S.ch.pen, spec.pen ? 1 : 0);
    // The aha still marks itself, but it sits at rest instead of frozen mid-burst.
    setChannel(S.ch.spark, spec.spark ? 0.35 : 0);
    setChannel(S.ch.zz, 0);
    setChannel(S.ch.glow, 0);
    S.blink = 0;
    S.temp = null;
    S.beh = null;
    S.scene = null;
    S.base = base;
    paint.current(0);
  }, [reduced, base, size, focus, gaze, gestureAngle]);

  // --- The frame loop: one rAF for Wobo's whole body, no React render per frame ---------------------
  useEffect(() => {
    const S = stateRef.current;
    if (!S || reduced) return;

    let raf = 0;
    const onPointerMove = (e: PointerEvent) => {
      const at = { x: e.clientX, y: e.clientY };
      const t = performance.now();
      // A cursor that jumps somewhere genuinely new wins Wobo's interest back; a drift does not,
      // or Wobo could never lose interest at all and would track the pointer like a camera.
      if (pointerReengages(S.pointerAnchor, at) || t - S.pointerAt > POINTER_LIVE_MS) {
        S.pointerAnchor = at;
        S.pointerSince = t;
        S.droppedPointer = false;
      }
      S.pointer = at;
      S.pointerAt = t;
      if (S.drag) {
        S.drag.x = e.clientX - S.drag.ox;
        S.drag.y = e.clientY - S.drag.oy;
        // A carry, not a poke, once Wobo has actually travelled.
        if (
          Math.abs(e.clientX - S.drag.startX) > CARRY_SLOP_PX ||
          Math.abs(e.clientY - S.drag.startY) > CARRY_SLOP_PX
        ) {
          S.drag.moved = true;
        }
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const tick = () => {
      const now = performance.now();
      const props = p.current;
      const c = S.ch;
      const unitsPerPx = VIEW_SIZE / Math.max(1, props.size);

      // Idle life. Wobo's own touches count as input, as does anything the app tells us about.
      //
      // And Wobo is not idle while Wobo has something to do. Idleness is measured from LEARNER input
      // — a tap, a key, a scroll — and speaking is none of those, so a learner listening to a
      // two-minute explanation watched Wobo get bored at 13 s, yawn at 21 s and fall asleep at 36 s
      // while Wobo was still talking. Anything the app asks Wobo to BE keeps Wobo's clock alive.
      const lastInput = idleClock(
        props.base,
        Math.max(S.lastTouch, idleSinceToPerf(props.idleSince, now)),
        now,
      );
      if (props.base !== 'idle') S.lastTouch = now;
      const stage = idleStageFor(now - lastInput);

      // The learner's own clock, read once a minute. Night alone is not enough: Wobo only shows it
      // once the learner has gone quiet too, so a learner working hard at midnight is not yawned at.
      if (now - S.nightAt > 60_000) {
        S.nightAt = now;
        S.night = props.night ?? isNight(new Date());
        if (!S.night) S.nightCued = false;
      }
      // `S.nightAt` is on the monotonic clock, so the WALL clock is read above and kept as a
      // boolean; the rule itself lives in scenes.ts and is called with it, never rebuilt here.
      const sleepyNow = props.base === 'idle' && sleepyFromClock(S.night, now - lastInput) !== null;
      if (sleepyNow && !S.nightCued && !S.scene) {
        S.nightCued = true;
        cueRef.current('sleepy', now);
      }
      if (!sleepyNow && now - lastInput < SLEEPY_QUIET_MS) S.nightCued = false;

      if (stage !== S.idleStage) {
        const event = idleTransition(S.idleStage, stage);
        const rising = stage > S.idleStage;
        S.idleStage = stage;
        if (event?.expression) {
          if (stage === 0) {
            S.temp = event.expression === 'idle' ? null : event.expression;
            S.tempUntil = event.expression === 'idle' ? 0 : now + 700;
          } else {
            S.base = event.expression;
          }
        }
        // Crossing into the yawning stage plays the whole stretch-and-yawn SCENE rather than the
        // bare body track, so the face and the body agree about being tired. Once, on the crossing
        // — a stretch that repeated every couple of seconds would be a tic, not tiredness.
        if (rising && stage === 3 && props.base === 'idle') cueRef.current('stretch', now);
        else if (event?.behaviour) playRef.current(event.behaviour, now);
        if (stage === 0) S.glance = null;
      }
      if (glancesAt(stage) && now > S.glanceUntil) {
        S.glance = nextGlanceTarget();
        S.glanceUntil = now + nextGlanceDelay();
        if (Math.random() < 0.15) S.doubleBlink = true;
        if (Math.random() < 0.08) playRef.current('stretch', now);
      }
      // At night, boredom reads as sleepiness — the same quiet, a different reason for it.
      if (S.night && stage >= 2 && S.base === 'bored' && props.base === 'idle') S.base = 'sleepy';
      // The expression the app asked for is what Wobo IS; Wobo's idle life only colours it while Wobo
      // has nothing else to do. Applying it only at stage 0 meant a base Wobo was handed mid-doze
      // was discarded until the learner touched the screen.
      S.base = baseInForce(S.base, props.base, stage);
      // Wobo's idle life changes what Wobo IS, so it changes what Wobo is announced as.
      if (S.base !== S.announced) {
        S.announced = S.base;
        announce.current(S.base);
      }

      // The scene in flight. Beats fire exactly once however uneven the frame times are, and the
      // scene releases Wobo the moment its duration runs out.
      let sceneLook: readonly [number, number] | 'pointer' | null = null;
      if (S.scene) {
        const run = S.scene;
        const elapsed = now - run.start;
        for (const beat of sceneBeatsBetween(run.name, run.fired, elapsed)) {
          beatRef.current(beat, run, now);
          run.fired = beat.at;
        }
        const frame = sceneFrame(run.name, elapsed);
        if (frame.done) {
          S.scene = null;
          S.temp = null;
        } else if (frame.beat) {
          sceneLook = resolveSceneLook(frame.beat.look, {
            pointer: null,
            target: sceneRectLook(S, props, rootRef.current, now),
          });
        }
      }

      if (S.temp && now > S.tempUntil) S.temp = null;
      const spec = expressionSpec(S.temp ?? S.base);

      // Gaze. Focus wins; then a pinned gaze or the gesture direction; then the pointer.
      const self = rootRef.current?.getBoundingClientRect() ?? {
        x: 0,
        y: 0,
        width: props.size,
        height: props.size,
      };
      if (props.focus) {
        if (isRect(props.focus)) S.focusRect = props.focus;
        else if (now - S.focusAt > FOCUS_RECT_TTL_MS) {
          S.focusRect = props.focus.getBoundingClientRect();
          S.focusAt = now;
        }
      } else {
        S.focusRect = null;
      }
      const pinned: Point | null =
        props.gaze && props.gaze !== 'pointer'
          ? props.gaze
          : props.gestureAngle !== undefined
            ? { x: Math.cos(props.gestureAngle), y: Math.sin(props.gestureAngle) }
            : null;
      // Wobo follows a cursor, then loses interest. Not forever: a wobot that tracks forever is a
      // security camera. Losing interest is a look away and a slow turn, played once.
      const seen = S.pointer && now - S.pointerAt < POINTER_LIVE_MS ? S.pointer : null;
      const attention = seen ? pointerAttention(now - S.pointerSince) : 'engaged';
      if (seen && attention === 'lost' && !S.droppedPointer) {
        S.droppedPointer = true;
        if (!S.focusRect && !pinned) {
          playRef.current('drift', now);
          S.glance = [AWAY_LOOK[0], AWAY_LOOK[1]];
          S.glanceUntil = now + 1200;
        }
      }
      const pointerLive = attention === 'lost' ? null : seen;
      const [tlx, tly] = resolveLookTarget({
        self,
        focus: S.focusRect,
        gaze: pinned,
        pointer: sceneLook === 'pointer' ? (seen ?? pointerLive) : pointerLive,
        glance: sceneLook && sceneLook !== 'pointer' ? sceneLook : S.glance,
        expressionLook: spec.look ?? null,
      });
      step(c.lookX, tlx, 0.14, 0.7);
      step(c.lookY, tly, 0.14, 0.7);

      // Body targets: the pose, plus the living oscillators, plus whatever behaviour is running.
      let tsx = 1;
      let tsy = 1;
      let trot = spec.tilt;
      let tdx = spec.lean * 0.6 + (pointerLive ? leanOffset({ x: c.lookX.value / 44, y: 0 }) : 0);
      let tdy = 0;
      let tpen = spec.pen ? 1 : 0;
      if (S.hover && !S.drag) {
        tsx *= 1.04;
        tsy *= 1.04;
        // Wobo leans a little toward whatever is hovering — the visor brighten's body half.
        trot += c.lookX.value * 0.06;
      }
      const restful = S.base === 'idle' || S.base === 'sleepy' || S.base === 'bored';
      if (spec.breathe || restful) {
        tsy *= 1 + Math.sin(now / (S.base === 'sleepy' ? 1900 : 1200)) * 0.018;
      }
      if (spec.sway) trot += Math.sin(now / 900) * 3;
      if (spec.bounce) tdy = -Math.abs(Math.sin(now / 260)) * 10;
      if (S.drag) {
        tdx = S.drag.x * unitsPerPx;
        tdy = S.drag.y * unitsPerPx;
        const vx = S.drag.x - S.drag.px;
        const vy = S.drag.y - S.drag.py;
        S.drag.px = S.drag.x;
        S.drag.py = S.drag.y;
        trot = Math.max(-18, Math.min(18, vx * 0.9));
        tsy = 1 + Math.min(0.12, Math.abs(vy) * 0.006);
        tsx = 1 - Math.min(0.08, Math.abs(vy) * 0.004);
      }
      if (S.beh) {
        const s = sampleBehaviour(S.beh.name, now - S.beh.start);
        if (s.sx !== null) tsx *= s.sx;
        if (s.sy !== null) tsy *= s.sy;
        if (s.rot !== null) trot += s.rot;
        if (s.dx !== null) tdx += s.dx;
        if (s.dy !== null) tdy += s.dy;
        const bspec = behaviourSpec(S.beh.name);
        if (bspec.pen) tpen = 1;
        if (s.done && !bspec.hold) S.beh = null;
      }

      const dragK = S.drag ? 0.3 : 0.12;
      const dragD = S.drag ? 0.6 : 0.72;
      step(c.sx, tsx, 0.2, 0.65);
      step(c.sy, tsy, 0.2, 0.65);
      step(c.rot, trot, 0.12, 0.72);
      step(c.dx, tdx, dragK, dragD);
      step(c.dy, tdy, S.drag ? 0.3 : 0.14, S.drag ? 0.6 : 0.7);
      step(c.pen, tpen, 0.18, 0.7);
      step(c.spark, 0, 0.04, 0.9);
      step(c.zz, dozing(stage) ? 1 : 0, 0.05, 0.8);
      step(c.glow, S.hover && !S.drag ? 1 : 0, 0.22, 0.66);

      // Blink, and the occasional double.
      if (now > S.nextBlink) {
        S.blinkPhase = 1e-6;
        S.nextBlink = now + 2400 + Math.random() * 3200;
      }
      if (S.blinkPhase > 0) {
        S.blink = Math.sin(Math.min(1, S.blinkPhase) * Math.PI);
        S.blinkPhase += 0.12;
        if (S.blinkPhase >= 1) {
          S.blinkPhase = 0;
          S.blink = 0;
          if (S.doubleBlink) {
            S.doubleBlink = false;
            S.nextBlink = now + 140;
          }
        }
      }

      paint.current(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [reduced]);

  // The base expression the app asked for. A change of state is itself a sign of life, so it also
  // wakes Wobo: an app that starts explaining while Wobo dozes gets Wobo awake, not snoring.
  useEffect(() => {
    const S = stateRef.current;
    if (!S) return;
    S.base = base;
    S.announced = base;
    S.lastTouch = typeof performance === 'undefined' ? 0 : performance.now();
    setAnnounced(base);
    if (expressionSpec(base).spark && !reduced) setChannel(S.ch.spark, 1);
  }, [base, reduced]);

  // A behaviour asked for from outside; `behaviourKey` replays the same one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: behaviourKey exists only to replay
  useEffect(() => {
    if (!behaviour) return;
    playRef.current(behaviour, typeof performance === 'undefined' ? 0 : performance.now());
  }, [behaviour, behaviourKey]);

  // A scene asked for from outside — this is the seam the board's `action` events cue.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sceneKey exists only to replay
  useEffect(() => {
    if (!scene) return;
    cueRef.current(scene, typeof performance === 'undefined' ? 0 : performance.now());
  }, [scene, sceneKey]);

  // --- Input ------------------------------------------------------------------------------------
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const touch = () => {
    const S = stateRef.current;
    if (S) S.lastTouch = performance.now();
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const S = stateRef.current;
    if (!S) return;
    const now = performance.now();
    touch();
    S.pressed = true;
    S.held = false;
    S.didHold = false;
    S.pressAt = now;
    if (p.current.draggable && !reduced) {
      S.drag = {
        ox: e.clientX - S.ch.dx.value / (VIEW_SIZE / Math.max(1, size)),
        oy: e.clientY - S.ch.dy.value / (VIEW_SIZE / Math.max(1, size)),
        x: S.ch.dx.value / (VIEW_SIZE / Math.max(1, size)),
        y: S.ch.dy.value / (VIEW_SIZE / Math.max(1, size)),
        px: 0,
        py: 0,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
      };
      S.drag.px = S.drag.x;
      S.drag.py = S.drag.y;
    }
    if (onHoldStart) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture unsupported (or already released) — the hold still works, just less drag-proof
      }
      clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        const s = stateRef.current;
        if (!s?.pressed || s.drag?.moved) return;
        s.held = true;
        // Hold is listening — the face says the mic is open before the consumer's UI does.
        s.temp = 'listening';
        s.tempUntil = Number.POSITIVE_INFINITY;
        onHoldStart();
      }, holdThresholdMs);
    }
  };

  const finishPress = () => {
    const S = stateRef.current;
    if (!S?.pressed) return;
    const now = performance.now();
    S.pressed = false;
    clearTimeout(holdTimer.current);
    touch();
    const drag = S.drag;
    S.drag = null;
    if (drag?.moved) {
      playRef.current('settle', now);
      S.didHold = true; // a carry is not a tap
      return;
    }
    if (S.held) {
      // It was push-to-talk, not a poke: close the utterance, drop the listening face, and swallow
      // the click the release trails so a talk never also opens the drawer.
      S.held = false;
      S.didHold = true;
      S.temp = null;
      S.tempUntil = 0;
      onHoldEnd?.();
      return;
    }
    if (now - S.lastTapAt < DOUBLE_TAP_MS) {
      S.lastTapAt = 0;
      playRef.current('hop', now);
      tempRef.current('celebrating', 900, now);
      onDoubleTap?.();
      return;
    }
    S.lastTapAt = now;
    // The click reaction the owner asked for: a bounce and a wink, on a haptic-length attack.
    cueRef.current('press', now);
  };

  const onPointerLeave = () => {
    const S = stateRef.current;
    if (!S) return;
    S.hover = false;
    if (S.held) return; // a drift off Wobo's body must not cancel a live hold
    finishPress();
  };

  // The browser turns Enter and Space on a real button into a click, so this only plays the
  // choreography — the tap itself arrives through onClick, once.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    touch();
    cueRef.current('press', performance.now());
  };

  const visorClipId = `wobo-visor-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hair = round((0.5 * VIEW_SIZE) / Math.max(1, size));
  const interactive = !!onTap;
  const shellStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'inline-block',
    padding: 0,
    border: 'none',
    background: 'transparent',
    font: 'inherit',
    color: 'inherit',
    cursor: interactive ? 'pointer' : 'default',
    WebkitTapHighlightColor: 'transparent',
    touchAction: interactive || onHoldStart || draggable ? 'none' : undefined,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    ...style,
  };
  const hooks = {
    className: className ? `${RIG_CLASS} ${className}` : RIG_CLASS,
    onPointerEnter: () => {
      const S = stateRef.current;
      if (!S) return;
      S.hover = true;
      touch();
      // The hover reaction: the visor brightens (the loop's `glow` channel) and Wobo leans in and
      // listens. Cued through the registry so a bench and a surface get the identical beat.
      if (!S.scene) cueRef.current('hover', performance.now());
    },
    onPointerDown,
    onPointerUp: finishPress,
    onPointerLeave,
    onPointerCancel: finishPress,
    onContextMenu: onHoldStart
      ? (e: { preventDefault: () => void }) => e.preventDefault()
      : undefined,
    style: shellStyle,
  };

  const figure = (
    <svg
      viewBox={VIEW_BOX}
      width="100%"
      height="100%"
      role="presentation"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <clipPath id={visorClipId}>
          <rect x={VISOR.x} y={VISOR.y} width={VISOR.w} height={VISOR.h} rx={VISOR.rx} />
        </clipPath>
      </defs>
      <g ref={outerRef}>
        {/* The only thing grounding Wobo, and never a shadow (see ground.ts). Small: a flat tonal
            contact patch in Wobo's own ink. Large: the half-pixel hairline the rest of the system
            grounds everything with, because at hero scale a soft ellipse under a floating orb reads
            as a drop shadow whatever the code calls it. */}
        {groundMark(size) === 'patch' ? (
          <ellipse
            ref={setGround}
            cx={GROUND_GEOMETRY.cx}
            cy={GROUND_GEOMETRY.patch.cy}
            rx={GROUND_GEOMETRY.patch.rx}
            ry={GROUND_GEOMETRY.patch.ry}
            fill="var(--wr-body)"
            opacity={GROUND_GEOMETRY.patch.opacity}
          />
        ) : (
          <line
            ref={setGround}
            x1={GROUND_GEOMETRY.cx - GROUND_GEOMETRY.hairline.halfWidth}
            x2={GROUND_GEOMETRY.cx + GROUND_GEOMETRY.hairline.halfWidth}
            y1={GROUND_GEOMETRY.hairline.cy}
            y2={GROUND_GEOMETRY.hairline.cy}
            stroke="var(--wr-body)"
            strokeWidth={GROUND_GEOMETRY.hairline.strokeWidth}
            opacity={GROUND_GEOMETRY.hairline.opacity}
          />
        )}
        <g ref={bodyRef}>
          <circle
            cx={HEAD.cx}
            cy={HEAD.cy}
            r={HEAD.r}
            fill="var(--wr-body)"
            fillOpacity={RIG_BODY_OPACITY}
            stroke="var(--wr-hair)"
            strokeWidth={hair}
          />
          {/* One soft catchlight on the shell, in the visor tone — never a gradient, never a glow. */}
          <ellipse
            cx={55}
            cy={38}
            rx={8}
            ry={4}
            fill="var(--wr-visor)"
            opacity={0.16}
            transform="rotate(-30 55 38)"
          />
          {/* Hover: the visor's own tone spreads a little behind it, so the visor reads brighter. */}
          <rect
            ref={glowRef}
            x={VISOR.x - 4}
            y={VISOR.y - 4}
            width={VISOR.w + 8}
            height={VISOR.h + 8}
            rx={VISOR.rx + 4}
            fill="var(--wr-visor)"
            opacity={0}
            style={{ display: 'none' }}
          />
          <rect
            x={VISOR.x}
            y={VISOR.y}
            width={VISOR.w}
            height={VISOR.h}
            rx={VISOR.rx}
            fill="var(--wr-visor)"
          />
          {/* The eyes and the concentration slit are clipped to the visor: twelve percent bigger,
              the eyes must never spill onto the shell when the gaze reaches its limit, and the slit
              must take the visor's own rounded corners rather than cutting a square across them. */}
          <g clipPath={`url(#${visorClipId})`}>
            <path ref={eyeLRef} d="" fill="var(--wr-eye)" strokeLinecap="round" />
            <path ref={eyeRRef} d="" fill="var(--wr-eye)" strokeLinecap="round" />
            {/* Concentration: the visor NARROWS to a slit, which means it closes in from both
                edges. A single band across the top did not narrow anything — it laid a dark bar
                over the visor, and 'focused' was the one face out of twenty-two that looked
                damaged. Two bands, equal, so the slit stays centred on the eyes.
                The bands carry the shell's OWN fill opacity, not a made-up 0.85: Wobo's body is 92%
                ink over whatever is behind it, so anything meant to read as the shell closing in
                has to be mixed the same way. At any other value the bands are a third tone, and a
                third tone is a smudge across the visor rather than a visor narrowing. */}
            <g
              ref={narrowRef}
              fill="var(--wr-body)"
              fillOpacity={RIG_BODY_OPACITY}
              style={{ display: 'none' }}
            >
              <rect x={VISOR.x} y={VISOR.y} width={VISOR.w} height={NARROW_BAND} />
              <rect
                x={VISOR.x}
                y={VISOR.y + VISOR.h - NARROW_BAND}
                width={VISOR.w}
                height={NARROW_BAND}
              />
            </g>
          </g>
          {/* The mitt and the ultramarine-tipped pen — out only while Wobo draws. */}
          <g ref={penRef} style={{ display: 'none' }}>
            <circle
              cx={113}
              cy={86}
              r={8}
              fill="var(--wr-body)"
              stroke="var(--wr-hair)"
              strokeWidth={hair}
            />
            <path
              d="M117 82 L131 54"
              stroke="var(--wr-body)"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d="M130 56 L134 48"
              stroke="var(--wr-eye)"
              strokeWidth={5}
              strokeLinecap="round"
            />
          </g>
        </g>
        {/* The aha spark. Ultramarine, scarce, earned (DESIGN.md law 9). */}
        <g ref={sparkRef} fill="var(--wr-eye)" style={{ display: 'none' }}>
          <path d="M115 22 l1.5 4.2 4.2 1.5 -4.2 1.5 -1.5 4.2 -1.5 -4.2 -4.2 -1.5 4.2 -1.5z" />
          <circle cx={35} cy={30} r={1.8} />
          <circle cx={121} cy={46} r={1.4} />
          <circle cx={29} cy={50} r={1.2} />
        </g>
        <g
          ref={zzRef}
          fill="var(--wr-eye)"
          fontFamily="Caveat, cursive"
          fontWeight={600}
          style={{ display: 'none' }}
        >
          <text ref={zzARef} x={115} y={34} fontSize={12}>
            z
          </text>
          <text ref={zzBRef} x={123} y={24} fontSize={9}>
            z
          </text>
        </g>
      </g>
    </svg>
  );

  // Tappable, Wobo is a real button: the browser gives Wobo's focus, Enter, Space and the right role
  // for free. Otherwise Wobo is an image that announces the name and the state Wobo is in.
  if (interactive) {
    return (
      <button
        type="button"
        ref={setRoot}
        aria-label={`${label}, ${announced}`}
        onClick={() => {
          // A hold or a carry trails a click on release — swallow it once.
          const S = stateRef.current;
          if (S?.didHold) {
            S.didHold = false;
            return;
          }
          onTap?.();
        }}
        onKeyDown={onKeyDown}
        {...hooks}
      >
        {figure}
      </button>
    );
  }
  return (
    <div ref={setRoot} role="img" aria-label={`${label}, ${announced}`} {...hooks}>
      {figure}
    </div>
  );
}

/**
 * Where a scene's target sits, as eye offsets in rig units — what `look: 'target'` resolves to.
 * The measurement is cached for a frame or two, because a scene glance is not worth a layout per
 * frame, and `null` (nothing to look at) reads as straight ahead rather than as a guess.
 */
function sceneRectLook(
  S: RigState,
  props: { sceneTarget?: TrackRect | Element | null; size: number },
  root: HTMLElement | null,
  now: number,
): readonly [number, number] | null {
  const target = props.sceneTarget;
  if (!target) {
    S.sceneRect = null;
    return null;
  }
  if (isRect(target)) S.sceneRect = target;
  else if (now - S.sceneRectAt > FOCUS_RECT_TTL_MS) {
    S.sceneRect = target.getBoundingClientRect();
    S.sceneRectAt = now;
  }
  if (!S.sceneRect) return null;
  const self = root?.getBoundingClientRect() ?? {
    x: 0,
    y: 0,
    width: props.size,
    height: props.size,
  };
  return lookOffset(trackRect(self, S.sceneRect));
}

/**
 * `idleSince` arrives on the wall clock (`Date.now()`); the loop runs on the monotonic clock. This
 * converts, and treats a missing or future value as "no opinion" so a surface that does not track
 * input never accidentally keeps Wobo awake or puts Wobo to sleep.
 */
function idleSinceToPerf(idleSince: number | undefined, now: number): number {
  if (idleSince === undefined || !Number.isFinite(idleSince)) return Number.NEGATIVE_INFINITY;
  const wall = Date.now();
  return now - Math.max(0, wall - idleSince);
}
