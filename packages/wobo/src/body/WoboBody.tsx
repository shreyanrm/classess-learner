'use client';

/**
 * WoboBody — the character rig, v2: the ink visor wobot (owner call, 2026-09-02).
 *
 * A near-black body carrying a white visor in light; the tones invert in dark. Her eyes are
 * ultramarine in both and are the only pigment on the screen. A half-pixel hairline in the opposite
 * tone keeps her legible over any content. An ultramarine-tipped pen, held in a mitt, appears only
 * while she is drawing. No shadows, 3 px radius elsewhere in the product, one hit of pigment here.
 *
 * Twenty expressions and fifteen behaviours live in `expressions.ts` and `behaviours.ts`; the idle
 * scheduler in `idle.ts`; the gaze maths in `tracking.ts`; her tones in `palette.ts`. This file is
 * only the rig: one animation frame loop over spring channels writing SVG attributes, so a full
 * cast of her costs one rAF and no React renders per frame.
 *
 * Contract: the props of v1 all still work — `mood` takes the legacy mood vocabulary as well as the
 * new expression names, so no consumer had to change.
 */

import { useReducedMotion } from '@classess/motion';
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
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
import { channel, type SpringChannel, set as setChannel, step } from './spring';
import { leanOffset, type Point, resolveLookTarget, type TrackRect } from './tracking';

// The rig's public surface — consumers import these from `@classess/wobo` alongside the component.
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
export {
  baseInForce,
  IDLE_STAGE_NAMES,
  IDLE_THRESHOLDS,
  type IdleStage,
  idleClock,
  idleStageFor,
  idleStageName,
} from './idle';
export { RIG_CLASS, RIG_DARK, RIG_LIGHT, type RigTones } from './palette';
export {
  resolveLookTarget,
  type TrackRect,
  trackPoint,
  trackRect,
} from './tracking';

export interface WoboBodyProps {
  /** Diameter in px — her head fills the box, the pen and her sparks may overflow it. */
  size?: number;
  /**
   * Her state. Takes the twenty expression names and, unchanged from v1, the legacy mood
   * vocabulary (`celebrate`, `correct`, `waiting`, `hint`, `oops`, …), which maps onto them.
   */
  mood?: WoboMood | WoboExpression;
  /**
   * What is in focus — a rectangle in viewport coordinates or the element itself. She looks here,
   * always, and only falls back to the pointer when nothing is in focus.
   */
  focus?: TrackRect | Element | null;
  /** Pin her gaze: each axis -1..1, or 'pointer' to insist on the cursor. */
  gaze?: { x: number; y: number } | 'pointer';
  /** For 'explaining': the direction she gestures toward, in radians (0 = right). */
  gestureAngle?: number;
  /**
   * Epoch milliseconds (`Date.now()`) of the last learner input anywhere in the app. Her idle life
   * runs off this: a glance at 4 s, bored at 12 s, a yawn or a sigh at 20 s, dozing at 35 s, and a
   * startle when it moves again. Her own interactions count too, so this only ever needs to be
   * passed by a surface that knows about input she cannot see.
   */
  idleSince?: number;
  /** Play a behaviour. Change `behaviourKey` to replay the same one. */
  behaviour?: WoboBehaviour | null;
  behaviourKey?: string | number;
  /** Let the learner pick her up and carry her; she stretches toward the throw and settles. */
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

// --- Her geometry, in rig units (the prototype's space) -------------------------------------------

/** The square the head fills; the pen, the spark and the z's overflow it deliberately. */
const VIEW_BOX = '26 17 98 98';
const VIEW_SIZE = 98;
const HEAD = { cx: 75, cy: 66, r: 42 } as const;
/** She squashes and rotates about her base, not her middle — that is where the weight is. */
const PIVOT = { x: 75, y: 108 } as const;
const VISOR = { x: 41, y: 50, w: 68, h: 30, rx: 15 } as const;
const EYE_GAP = 13;
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
  lastTouch: number;
  blink: number;
  blinkPhase: number;
  nextBlink: number;
  doubleBlink: boolean;
  focusRect: TrackRect | null;
  focusAt: number;
  ch: Channels;
}

function newState(now: number): RigState {
  return {
    base: 'idle',
    announced: 'idle',
    temp: null,
    tempUntil: 0,
    beh: null,
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
    lastTouch: now,
    blink: 0,
    blinkPhase: 0,
    nextBlink: now + 2200,
    doubleBlink: false,
    focusRect: null,
    focusAt: 0,
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
  /** The loop names her state without re-rendering on every frame. */
  const announce = useRef(setAnnounced);
  announce.current = setAnnounced;

  const rootRef = useRef<HTMLElement | null>(null);
  const setRoot = (el: HTMLElement | null) => {
    rootRef.current = el;
  };
  const outerRef = useRef<SVGGElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const groundRef = useRef<SVGEllipseElement | null>(null);
  const eyeLRef = useRef<SVGPathElement | null>(null);
  const eyeRRef = useRef<SVGPathElement | null>(null);
  const narrowRef = useRef<SVGRectElement | null>(null);
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
  const p = useRef({
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
  });
  p.current = {
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
  };

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
    groundRef.current?.setAttribute('rx', String(round(26 * c.sx.value)));

    const ex = HEAD.cx - EYE_GAP + lookX * 0.36;
    const ex2 = HEAD.cx + EYE_GAP + lookX * 0.36;
    const ey = HEAD.cy - 0.5 + lookY * 0.32;
    paintEye(eyeLRef.current, 0, eyeSig.current, ex, ey, spec.left, S.blink, now);
    paintEye(eyeRRef.current, 1, eyeSig.current, ex2, ey, spec.right, S.blink, now);

    if (narrowRef.current) narrowRef.current.style.display = spec.narrow ? '' : 'none';

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
    S.blink = 0;
    S.temp = null;
    S.beh = null;
    S.base = base;
    paint.current(0);
  }, [reduced, base, size, focus, gaze, gestureAngle]);

  // --- The frame loop: one rAF for her whole body, no React render per frame ---------------------
  useEffect(() => {
    const S = stateRef.current;
    if (!S || reduced) return;

    let raf = 0;
    const onPointerMove = (e: PointerEvent) => {
      S.pointer = { x: e.clientX, y: e.clientY };
      S.pointerAt = performance.now();
      if (S.drag) {
        S.drag.x = e.clientX - S.drag.ox;
        S.drag.y = e.clientY - S.drag.oy;
        // A carry, not a poke, once she has actually travelled.
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

      // Idle life. Her own touches count as input, as does anything the app tells us about.
      //
      // And she is not idle while she has something to do. Idleness is measured from LEARNER input
      // — a tap, a key, a scroll — and speaking is none of those, so a learner listening to a
      // two-minute explanation watched her get bored at 13 s, yawn at 21 s and fall asleep at 36 s
      // while she was still talking. Anything the app asks her to BE keeps her clock alive.
      const lastInput = idleClock(
        props.base,
        Math.max(S.lastTouch, idleSinceToPerf(props.idleSince, now)),
        now,
      );
      if (props.base !== 'idle') S.lastTouch = now;
      const stage = idleStageFor(now - lastInput);
      if (stage !== S.idleStage) {
        const event = idleTransition(S.idleStage, stage);
        S.idleStage = stage;
        if (event?.expression) {
          if (stage === 0) {
            S.temp = event.expression === 'idle' ? null : event.expression;
            S.tempUntil = event.expression === 'idle' ? 0 : now + 700;
          } else {
            S.base = event.expression;
          }
        }
        if (event?.behaviour) playRef.current(event.behaviour, now);
        if (stage === 0) S.glance = null;
      }
      if (glancesAt(stage) && now > S.glanceUntil) {
        S.glance = nextGlanceTarget();
        S.glanceUntil = now + nextGlanceDelay();
        if (Math.random() < 0.15) S.doubleBlink = true;
        if (Math.random() < 0.08) playRef.current('stretch', now);
      }
      // The expression the app asked for is what she IS; her idle life only colours it while she
      // has nothing else to do. Applying it only at stage 0 meant a base she was handed mid-doze
      // was discarded until the learner touched the screen.
      S.base = baseInForce(S.base, props.base, stage);
      // Her idle life changes what she IS, so it changes what she is announced as.
      if (S.base !== S.announced) {
        S.announced = S.base;
        announce.current(S.base);
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
      const pointerLive = S.pointer && now - S.pointerAt < POINTER_LIVE_MS ? S.pointer : null;
      const [tlx, tly] = resolveLookTarget({
        self,
        focus: S.focusRect,
        gaze: pinned,
        pointer: pointerLive,
        glance: S.glance,
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
      }
      const restful = S.base === 'idle' || S.base === 'sleepy' || S.base === 'bored';
      if (spec.breathe || restful) {
        tsy *= 1 + Math.sin(now / (S.base === 'sleepy' ? 1900 : 1200)) * 0.018;
      }
      if (spec.sway) trot += Math.sin(now / 900) * 3;
      if (spec.bounce) tdy = -Math.abs(Math.sin(now / 260)) * 10;
      if (spec.chest) {
        tsx = 1.06;
        tsy = 1.03;
        tdy = -3;
      }
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
  // wakes her: an app that starts explaining while she dozes gets her awake, not snoring.
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
    playRef.current('tap', now);
    tempRef.current('happy', 650, now);
  };

  const onPointerLeave = () => {
    const S = stateRef.current;
    if (!S) return;
    S.hover = false;
    if (S.held) return; // a drift off her body must not cancel a live hold
    finishPress();
  };

  // The browser turns Enter and Space on a real button into a click, so this only plays the
  // choreography — the tap itself arrives through onClick, once.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    touch();
    const now = performance.now();
    playRef.current('tap', now);
    tempRef.current('happy', 650, now);
  };

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
      if (S) S.hover = true;
      touch();
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
      <g ref={outerRef}>
        {/* Not a shadow — a flat tonal contact patch in her own ink, the only thing grounding her. */}
        <ellipse
          ref={groundRef}
          cx={PIVOT.x}
          cy={112}
          rx={26}
          ry={3.5}
          fill="var(--wr-body)"
          opacity={0.1}
        />
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
          <rect
            x={VISOR.x}
            y={VISOR.y}
            width={VISOR.w}
            height={VISOR.h}
            rx={VISOR.rx}
            fill="var(--wr-visor)"
          />
          <path ref={eyeLRef} d="" fill="var(--wr-eye)" strokeLinecap="round" />
          <path ref={eyeRRef} d="" fill="var(--wr-eye)" strokeLinecap="round" />
          {/* Concentration: the visor narrows to a slit. */}
          <rect
            ref={narrowRef}
            x={VISOR.x}
            y={VISOR.y}
            width={VISOR.w}
            height={9}
            fill="var(--wr-body)"
            opacity={0.85}
            style={{ display: 'none' }}
          />
          {/* The mitt and the ultramarine-tipped pen — out only while she draws. */}
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

  // Tappable, she is a real button: the browser gives her focus, Enter, Space and the right role
  // for free. Otherwise she is an image that names herself and the state she is in.
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
 * `idleSince` arrives on the wall clock (`Date.now()`); the loop runs on the monotonic clock. This
 * converts, and treats a missing or future value as "no opinion" so a surface that does not track
 * input never accidentally keeps her awake or puts her to sleep.
 */
function idleSinceToPerf(idleSince: number | undefined, now: number): number {
  if (idleSince === undefined || !Number.isFinite(idleSince)) return Number.NEGATIVE_INFINITY;
  const wall = Date.now();
  return now - Math.max(0, wall - idleSince);
}
