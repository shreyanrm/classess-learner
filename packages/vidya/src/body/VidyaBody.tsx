'use client';

/**
 * VidyaBody — her body, rebuilt from zero (DESIGN.md §4, owner reference 2026-07-06).
 *
 * A soft, round, molten matte-jelly orb: warm orange blooming into rose-pink, diffuse airy edges,
 * two expressive eyes and a real smile, a small golden spark that is hers alone, and the flickering
 * warm glow beneath her that never stops existing. Real physical personality: weight and squash,
 * anticipation before motion, overshoot and settle, constant idle micro-motion.
 *
 * The rig is a props-driven state machine so a Rive rig can replace the internals later without
 * touching any consumer: mood in, body language out.
 */

import { useReducedMotion } from '@classess/motion';
import { motion, useAnimationControls, useSpring, useTime, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flameForMood, MOLTEN, type VidyaMood } from '../identity';

export interface VidyaBodyProps {
  /** Diameter in px. */
  size?: number;
  mood?: VidyaMood;
  /** Where she looks: each axis -1..1, or 'pointer' to follow the cursor. */
  gaze?: { x: number; y: number } | 'pointer';
  /** For 'explaining': the direction she gestures toward, in radians (0 = right). */
  gestureAngle?: number;
  onTap?: () => void;
  label?: string;
  className?: string;
}

/** Body-language parameters per mood — choreography, freely tunable (the Vidya-cute license). */
interface Pose {
  wobble: number;
  speed: number;
  breathS: number;
  breathAmp: number;
  scaleX: number;
  scaleY: number;
  lean: number;
  lift: number;
  droop: number;
  /** Eyes: 'open' (white sclera + wandering pupils), 'happy' (∩ arcs), 'closed' (content arcs). */
  eyes: 'open' | 'happy' | 'closed';
  eyeOpen: number;
  /** Mouth shape key. */
  mouth: 'smile' | 'grin' | 'calm' | 'hmm' | 'o';
  /** Eyebrows — the attitude (Vegas-sphere school of acting). */
  browLift: number;
  browAngle: number;
  /** Extra lift on the left brow only — the raised-eyebrow look. */
  browAsym: number;
  flame: number;
  flameLean: number;
  /** Spark presence 1 = quiet shimmer, 2 = bright pop. */
  spark: number;
}

const POSES: Record<VidyaMood, Pose> = {
  idle: {
    wobble: 0.016,
    speed: 1,
    breathS: 3.4,
    breathAmp: 0.014,
    scaleX: 1,
    scaleY: 1,
    lean: 0,
    lift: 0,
    droop: 0,
    eyes: 'open',
    eyeOpen: 1,
    mouth: 'smile',
    browLift: 13,
    browAngle: -6,
    browAsym: 0,
    flame: 0.55,
    flameLean: 0,
    spark: 1,
  },
  listening: {
    wobble: 0.05,
    speed: 1.5,
    breathS: 2.6,
    breathAmp: 0.02,
    scaleX: 1.03,
    scaleY: 0.95,
    lean: -4,
    lift: 1,
    droop: 0.05,
    eyes: 'open',
    eyeOpen: 1.18,
    mouth: 'o',
    browLift: 16.5,
    browAngle: -11,
    browAsym: 0,
    flame: 0.7,
    flameLean: 6,
    spark: 1,
  },
  thinking: {
    wobble: 0.01,
    speed: 0.7,
    breathS: 2.2,
    breathAmp: 0.022,
    scaleX: 0.985,
    scaleY: 0.985,
    lean: 2.5,
    lift: 0,
    droop: 0,
    eyes: 'open',
    eyeOpen: 0.8,
    mouth: 'hmm',
    browLift: 13.5,
    browAngle: 8,
    browAsym: 4,
    flame: 0.5,
    flameLean: -8,
    spark: 1,
  },
  explaining: {
    wobble: 0.022,
    speed: 1.2,
    breathS: 3,
    breathAmp: 0.014,
    scaleX: 1,
    scaleY: 1.02,
    lean: 0,
    lift: -2,
    droop: 0,
    eyes: 'open',
    eyeOpen: 1.05,
    mouth: 'smile',
    browLift: 14,
    browAngle: -8,
    browAsym: 0,
    flame: 0.65,
    flameLean: 0,
    spark: 1,
  },
  correct: {
    wobble: 0.03,
    speed: 1.4,
    breathS: 3,
    breathAmp: 0.016,
    scaleX: 1.04,
    scaleY: 0.97,
    lean: 0,
    lift: -1,
    droop: 0,
    eyes: 'happy',
    eyeOpen: 1,
    mouth: 'grin',
    browLift: 17,
    browAngle: -12,
    browAsym: 0,
    flame: 0.9,
    flameLean: 0,
    spark: 2,
  },
  celebrate: {
    wobble: 0.035,
    speed: 1.6,
    breathS: 2.8,
    breathAmp: 0.018,
    scaleX: 1,
    scaleY: 1,
    lean: 0,
    lift: -3,
    droop: 0,
    eyes: 'happy',
    eyeOpen: 1,
    mouth: 'grin',
    browLift: 18,
    browAngle: -13,
    browAsym: 0,
    flame: 1,
    flameLean: 0,
    spark: 2,
  },
  waiting: {
    wobble: 0.007,
    speed: 0.5,
    breathS: 4.6,
    breathAmp: 0.02,
    scaleX: 1.01,
    scaleY: 0.985,
    lean: 0,
    lift: 1,
    droop: 0.03,
    eyes: 'open',
    eyeOpen: 0.42,
    mouth: 'calm',
    browLift: 10,
    browAngle: 0,
    browAsym: 0,
    flame: 0.22,
    flameLean: 0,
    spark: 0.6,
  },
  resting: {
    wobble: 0.006,
    speed: 0.4,
    breathS: 5.2,
    breathAmp: 0.026,
    scaleX: 1.02,
    scaleY: 0.975,
    lean: 1.5,
    lift: 2,
    droop: 0.045,
    eyes: 'closed',
    eyeOpen: 0.18,
    mouth: 'calm',
    browLift: 9.5,
    browAngle: -4,
    browAsym: 0,
    flame: 0.18,
    flameLean: 0,
    spark: 0.6,
  },
  hint: {
    wobble: 0.024,
    speed: 1.3,
    breathS: 2.6,
    breathAmp: 0.016,
    scaleX: 1,
    scaleY: 1.025,
    lean: -2,
    lift: -2,
    droop: 0,
    eyes: 'open',
    eyeOpen: 1.1,
    mouth: 'smile',
    browLift: 15,
    browAngle: -6,
    browAsym: 4.5,
    flame: 0.95,
    flameLean: 0,
    spark: 2,
  },
  oops: {
    wobble: 0.02,
    speed: 1.1,
    breathS: 2.4,
    breathAmp: 0.02,
    scaleX: 0.98,
    scaleY: 0.98,
    lean: -1.5,
    lift: 1,
    droop: 0.02,
    eyes: 'open',
    eyeOpen: 0.85,
    mouth: 'hmm',
    browLift: 15,
    browAngle: 14,
    browAsym: 0,
    flame: 0.35,
    flameLean: 0,
    spark: 0.7,
  },
};

const MOUTHS: Record<Pose['mouth'], string> = {
  smile: 'M -7 13 Q 0 19 7 13',
  grin: 'M -9.5 11.5 Q 0 22 9.5 11.5',
  calm: 'M -6 13.5 Q 0 18 6 13.5',
  hmm: 'M -5.5 14.5 Q 0.5 16.5 6.5 13.5',
  o: 'M 0 15 m -3.1 0 a 3.1 3.4 0 1 0 6.2 0 a 3.1 3.4 0 1 0 -6.2 0',
};

/** A four-pointed spark — hers alone. */
const SPARK_PATH =
  'M 0 -7 C 1.2 -2.4, 2.4 -1.2, 7 0 C 2.4 1.2, 1.2 2.4, 0 7 C -1.2 2.4, -2.4 1.2, -7 0 C -2.4 -1.2, -1.2 -2.4, 0 -7 Z';

/** 8 anchor angles + per-point phase/frequency offsets for organic, non-repeating life. */
const N = 8;
const ANCHORS = Array.from({ length: N }, (_, i) => {
  const theta = (i / N) * Math.PI * 2 - Math.PI / 2;
  return { theta, phase: i * 2.399963, freqMul: 0.8 + ((i * 0.618034) % 1) * 0.5 };
});

/** Closed Catmull-Rom → cubic bezier path through the wobbled anchors. */
function jellyPath(tSec: number, pose: Pose, R: number): string {
  const pts = ANCHORS.map(({ theta, phase, freqMul }) => {
    let r = R * (1 + pose.wobble * Math.sin(tSec * 2.2 * pose.speed * freqMul + phase));
    const diag = Math.abs(Math.sin(2 * (theta + Math.PI / 2)));
    r *= 1 + 0.05 * diag;
    const below = Math.max(0, Math.sin(theta));
    r *= 1 + pose.droop * below;
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
  });
  const p = (i: number) => pts[(i + N) % N] as { x: number; y: number };
  let d = `M ${p(0).x.toFixed(2)} ${p(0).y.toFixed(2)}`;
  for (let i = 0; i < N; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

let rigSeq = 0;

export function VidyaBody({
  size = 88,
  mood = 'idle',
  gaze,
  gestureAngle,
  onTap,
  label = 'Vidya',
  className,
}: VidyaBodyProps) {
  const reduced = useReducedMotion();
  const pose = POSES[mood] ?? POSES.idle;
  // Poke: press her back and she springs forward again, face first (the Vidya-cute license).
  // Only the FACE reads the override — the body springs keep targeting the mood pose, so a
  // poke never fights the mood choreography effect.
  const [pokeFace, setPokeFace] = useState<Partial<Pose> | null>(null);
  const pokePressed = useRef(false);
  const pokeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const face: Pose = pokeFace ? { ...pose, ...pokeFace } : pose;
  const flameState = flameForMood(mood);
  const time = useTime();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ids = useMemo(() => {
    rigSeq += 1;
    return {
      grad: `vb-g-${rigSeq}`,
      bloom: `vb-b-${rigSeq}`,
      soft: `vb-s-${rigSeq}`,
      sclera: `vb-e-${rigSeq}`,
      pupil: `vb-p-${rigSeq}`,
    };
  }, []);

  // --- The jelly: per-frame blob path (frozen under reduced motion) ------------------------------
  const path = useTransform(time, (ms) => jellyPath(reduced ? 0 : ms / 1000, pose, 43));

  // --- Breath: composes under the pose springs ---------------------------------------------------
  const breath = useTransform(time, (ms) =>
    reduced ? 1 : 1 + pose.breathAmp * Math.sin(((ms / 1000) * Math.PI * 2) / pose.breathS),
  );

  // --- Gaze: eyes follow a target with springy lag ------------------------------------------------
  const gx = useSpring(0, { stiffness: 170, damping: 20 });
  const gy = useSpring(0, { stiffness: 170, damping: 20 });
  useEffect(() => {
    if (gaze === 'pointer') {
      const onMove = (e: PointerEvent) => {
        const el = rootRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        gx.set(Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / 260)));
        gy.set(Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / 260)));
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      return () => window.removeEventListener('pointermove', onMove);
    }
    if (gaze) {
      gx.set(Math.max(-1, Math.min(1, gaze.x)));
      gy.set(Math.max(-1, Math.min(1, gaze.y)));
      return;
    }
    if (mood === 'thinking') {
      gx.set(-0.5);
      gy.set(-0.6);
    } else if (mood === 'explaining' && gestureAngle !== undefined) {
      gx.set(Math.cos(gestureAngle));
      gy.set(Math.sin(gestureAngle));
    } else {
      gx.set(0);
      gy.set(0);
    }
  }, [gaze, mood, gestureAngle, gx, gy]);
  const faceX = useTransform(gx, (v) => v * 5);
  const faceY = useTransform(gy, (v) => v * 3.6);
  // Pupils travel further than the face — the parallax that makes the gaze feel real.
  const pupilX = useTransform(gx, (v) => v * 2.6);
  const pupilY = useTransform(gy, (v) => v * 2.1);

  // --- Blink: randomized, alive ------------------------------------------------------------------
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(
        () => {
          if (!alive) return;
          setBlink(true);
          setTimeout(() => {
            if (!alive) return;
            setBlink(false);
            loop();
          }, 110);
        },
        2600 + Math.random() * 3200,
      );
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // --- The pose: springs with weight; celebrate is anticipation → pop → settle --------------------
  const controls = useAnimationControls();

  // --- Poke choreography: squash back on press, bouncy comeback on release ------------------------
  const pokeDown = () => {
    pokePressed.current = true;
    clearTimeout(pokeTimer.current);
    setPokeFace({ eyes: 'open', eyeOpen: 1, mouth: 'o', browLift: 3.2 });
    if (!reduced) {
      void controls.start({
        scaleX: pose.scaleX * 1.12,
        scaleY: pose.scaleY * 0.78,
        y: pose.lift + 5,
        transition: { type: 'spring', stiffness: 640, damping: 30 },
      });
    }
  };
  const pokeUp = () => {
    if (!pokePressed.current) return;
    pokePressed.current = false;
    setPokeFace({ eyes: 'happy', mouth: 'grin', browLift: 2.2 });
    if (!reduced) {
      // low damping on purpose — she overshoots forward and wobbles back, delighted
      void controls.start({
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
        y: pose.lift,
        rotate: pose.lean,
        transition: { type: 'spring', stiffness: 340, damping: 8, mass: 0.9 },
      });
    }
    pokeTimer.current = setTimeout(() => setPokeFace(null), 950);
  };
  useEffect(() => () => clearTimeout(pokeTimer.current), []);
  useEffect(() => {
    if ((mood === 'celebrate' || mood === 'correct') && !reduced) {
      const big = mood === 'celebrate';
      // Excited: anticipate, leap, land, and a joyful second bounce.
      void controls.start({
        scaleX: [1, 1.08, 0.86, 1.1, 0.98, 1.05, pose.scaleX],
        scaleY: [1, 0.86, 1.16, 0.92, 1.06, 0.96, pose.scaleY],
        y: [0, 3, big ? -18 : -10, 1, big ? -8 : -4, 0, pose.lift],
        rotate: [0, 0, big ? -5 : -2, 3, big ? 4 : 1, -1, pose.lean],
        transition: {
          duration: big ? 1.15 : 0.8,
          times: [0, 0.14, 0.34, 0.55, 0.72, 0.86, 1],
          ease: 'easeOut',
        },
      });
    } else if (mood === 'oops' && !reduced) {
      // A sympathetic wince — a small recoil and shake, with them, never at them.
      void controls.start({
        x: [0, -5, 4, -2.5, 1, 0],
        scaleY: [1, 0.95, 1, 0.985, 1, pose.scaleY],
        rotate: [0, -2, 2, -1, 0, pose.lean],
        transition: { duration: 0.55, ease: 'easeOut' },
      });
    } else {
      void controls.start({
        x: 0,
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
        y: pose.lift,
        rotate:
          pose.lean +
          (mood === 'explaining' && gestureAngle !== undefined ? Math.cos(gestureAngle) * 6 : 0),
        transition: { type: 'spring', stiffness: 240, damping: 17, mass: 1.1 },
      });
    }
  }, [mood, reduced, controls, pose, gestureAngle]);

  // --- Idle life: every so often she fidgets — a glance, a tiny hop, a wiggle ----------------------
  useEffect(() => {
    if (mood !== 'idle' || reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const fidget = () => {
      timer = setTimeout(
        () => {
          if (!alive) return;
          const act = Math.floor(Math.random() * 3);
          if (act === 0) {
            // a curious glance to one side and back
            const dir = Math.random() > 0.5 ? 0.85 : -0.85;
            gx.set(dir);
            setTimeout(() => alive && gx.set(0), 900);
          } else if (act === 1) {
            // a tiny hop of contentment
            void controls.start({
              y: [pose.lift, pose.lift + 2, pose.lift - 7, pose.lift],
              scaleY: [pose.scaleY, 0.94, 1.05, pose.scaleY],
              transition: { duration: 0.5, ease: 'easeOut' },
            });
          } else {
            // a happy little wiggle
            void controls.start({
              rotate: [pose.lean, pose.lean - 3, pose.lean + 3, pose.lean],
              transition: { duration: 0.6, ease: 'easeInOut' },
            });
          }
          fidget();
        },
        6500 + Math.random() * 7000,
      );
    };
    fidget();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mood, reduced, controls, pose, gx]);

  // --- The flame: always exists, always flickers (identity law) -----------------------------------
  const flameFlicker = useTransform(time, (ms) => {
    const t = ms / 1000;
    const flick = reduced
      ? 0.5
      : 0.5 +
        0.28 * Math.sin(t * 3.1) +
        0.16 * Math.sin(t * 7.3 + 1.7) +
        0.09 * Math.sin(t * 12.7 + 0.4);
    const base =
      flameState === 'flare'
        ? 1
        : flameState === 'brighten'
          ? 0.9
          : flameState === 'ember'
            ? 0.35
            : 0.7;
    return Math.max(0.12, Math.min(1, pose.flame * base * (0.75 + 0.4 * flick)));
  });
  const flameScale = useTransform(flameFlicker, (v) => 0.85 + v * 0.4);

  // --- The spark: her golden companion — quiet shimmer, bright on delight -------------------------
  const sparkRotate = useTransform(time, (ms) => (reduced ? 0 : 8 * Math.sin(ms / 1400)));
  const sparkScale = useTransform(time, (ms) => {
    const s = reduced ? 1 : 1 + 0.06 * Math.sin(ms / 700 + 1);
    return s * (pose.spark >= 2 ? 1.25 : pose.spark);
  });

  const lidScale = blink ? 0.06 : Math.min(1, face.eyeOpen);
  const showOpenEyes = face.eyes === 'open';

  return (
    <motion.div
      ref={rootRef}
      className={className}
      role={onTap ? 'button' : 'img'}
      aria-label={label}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      onKeyDown={onTap ? (e) => (e.key === 'Enter' || e.key === ' ') && onTap() : undefined}
      onPointerDown={pokeDown}
      onPointerUp={pokeUp}
      onPointerLeave={pokeUp}
      onPointerCancel={pokeUp}
      whileHover={onTap ? { scale: 1.04 } : undefined}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        cursor: onTap ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* The flame-glow beneath her — replaces any drop shadow, always present. */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          left: '4%',
          right: '4%',
          top: '30%',
          bottom: '-14%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse 60% 55% at 50% 62%, ${MOLTEN.glowInner} 0%, ${MOLTEN.glowMid} 42%, ${MOLTEN.glowOuter} 78%)`,
          filter: 'blur(10px)',
          opacity: flameFlicker,
          scale: flameScale,
          rotate: pose.flameLean,
          transformOrigin: '50% 70%',
        }}
      />
      {/* The pose (weight, squash, lean) wrapping the breath wrapping the jelly. */}
      <motion.div
        animate={controls}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 78%' }}
      >
        <motion.div
          style={{ width: '100%', height: '100%', scale: breath, transformOrigin: '50% 82%' }}
        >
          <svg
            viewBox="-50 -50 100 100"
            width="100%"
            height="100%"
            role="presentation"
            aria-hidden
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              {/* Molten blooming into rose — her body (owner reference). */}
              <linearGradient id={ids.grad} x1="30%" y1="0%" x2="58%" y2="100%">
                <stop offset="0%" stopColor="#FF9040" />
                <stop offset="42%" stopColor={MOLTEN.base} />
                <stop offset="100%" stopColor={MOLTEN.bloomDeep} />
              </linearGradient>
              <radialGradient id={ids.bloom} cx="46%" cy="70%" r="46%">
                <stop offset="0%" stopColor={MOLTEN.bloom} stopOpacity="0.85" />
                <stop offset="100%" stopColor={MOLTEN.bloom} stopOpacity="0" />
              </radialGradient>
              {/* The airy, diffuse edge. */}
              <filter id={ids.soft} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.4" />
              </filter>
              {/* Subtle-3D eyes: spherical sclera, depth-graded pupil. */}
              <radialGradient id={ids.sclera} cx="46%" cy="42%" r="75%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="88%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F4E9E1" />
              </radialGradient>
              <radialGradient id={ids.pupil} cx="40%" cy="34%" r="80%">
                <stop offset="0%" stopColor="#4A2C20" />
                <stop offset="55%" stopColor={MOLTEN.face} />
                <stop offset="100%" stopColor="#180B07" />
              </radialGradient>
            </defs>

            {/* The matte jelly: gradient body, pink bloom, soft edges. */}
            <g filter={`url(#${ids.soft})`}>
              <motion.path d={path} fill={`url(#${ids.grad})`} />
              <motion.path d={path} fill={`url(#${ids.bloom})`} />
            </g>
            {/* A whisper of top sheen — matte, never glossy. */}
            <ellipse
              cx={-11}
              cy={-24}
              rx={19}
              ry={11}
              fill="rgba(255,255,255,0.18)"
              filter={`url(#${ids.soft})`}
            />

            {/* Her golden spark — bottom left, hers alone. */}
            <motion.g style={{ x: -36, y: 30, rotate: sparkRotate, scale: sparkScale }}>
              <path d={SPARK_PATH} transform="scale(1.35)" fill={MOLTEN.spark} />
            </motion.g>

            {/* The face. */}
            <motion.g style={{ x: faceX, y: faceY }}>
              {/* The eyebrows — the attitude. Springy, independent, expressive. */}
              <motion.path
                d="M -17.5 0 Q -13 -3 -8.5 0"
                fill="none"
                stroke={MOLTEN.face}
                strokeWidth={2.9}
                strokeLinecap="round"
                initial={false}
                animate={{
                  y: -6.5 - face.browLift - face.browAsym,
                  rotate: face.browAngle,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: '-11.5px 0px' }}
              />
              <motion.path
                d="M 8.5 0 Q 13 -3 17.5 0"
                fill="none"
                stroke={MOLTEN.face}
                strokeWidth={2.9}
                strokeLinecap="round"
                initial={false}
                animate={{ y: -6.5 - face.browLift, rotate: -face.browAngle }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: '11.5px 0px' }}
              />
              {showOpenEyes ? (
                <g>
                  {[-13, 13].map((ex) => (
                    <motion.g
                      key={`eye-${ex}`}
                      animate={{ scaleY: lidScale }}
                      transition={{ duration: 0.09 }}
                      style={{ transformOrigin: `${ex}px -4px` }}
                    >
                      {/* Sclera: a soft sphere, not a flat disc. */}
                      <ellipse cx={ex} cy={-4} rx={9.2} ry={9.9} fill={`url(#${ids.sclera})`} />
                      <ellipse
                        cx={ex}
                        cy={-4}
                        rx={9.2}
                        ry={9.9}
                        fill="none"
                        stroke="rgba(42,21,16,0.14)"
                        strokeWidth={0.7}
                      />
                      {/* Pupil: deeper parallax than the face — she is really looking. */}
                      <motion.g style={{ x: pupilX, y: pupilY }}>
                        <circle cx={ex} cy={-4} r={4.8} fill={MOLTEN.face} />
                        <circle cx={ex - 1.6} cy={-5.8} r={1.5} fill="rgba(255,255,255,0.95)" />
                      </motion.g>
                    </motion.g>
                  ))}
                </g>
              ) : (
                <g stroke={MOLTEN.face} strokeWidth={4.4} strokeLinecap="round" fill="none">
                  {face.eyes === 'happy' ? (
                    <>
                      <path d="M -17 -3 Q -11.5 -11 -6 -3" />
                      <path d="M 6 -3 Q 11.5 -11 17 -3" />
                    </>
                  ) : (
                    <>
                      {/* Content, at peace — the reference face. */}
                      <path d="M -17 -5 Q -11.5 -0.5 -6 -5" />
                      <path d="M 6 -5 Q 11.5 -0.5 17 -5" />
                    </>
                  )}
                </g>
              )}
              {/* The smile. */}
              {face.mouth === 'o' ? (
                <path
                  d={MOUTHS.o}
                  fill="none"
                  stroke={MOLTEN.face}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              ) : (
                <motion.path
                  d={MOUTHS[face.mouth]}
                  fill="none"
                  stroke={MOLTEN.face}
                  strokeWidth={4.4}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ d: MOUTHS[face.mouth] }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                />
              )}
            </motion.g>
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
