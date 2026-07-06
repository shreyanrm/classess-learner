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
  /** Eyes: 'open' (ovals, blinkable), 'happy' (∩ arcs), 'closed' (soft content arcs). */
  eyes: 'open' | 'happy' | 'closed';
  eyeOpen: number;
  /** Mouth shape key. */
  mouth: 'smile' | 'grin' | 'calm' | 'hmm' | 'o';
  flame: number;
  flameLean: number;
  /** Spark presence 1 = quiet shimmer, 2 = bright pop. */
  spark: number;
}

const POSES: Record<VidyaMood, Pose> = {
  idle: { wobble: 0.016, speed: 1, breathS: 3.4, breathAmp: 0.014, scaleX: 1, scaleY: 1, lean: 0, lift: 0, droop: 0, eyes: 'open', eyeOpen: 1, mouth: 'smile', flame: 0.55, flameLean: 0, spark: 1 },
  listening: { wobble: 0.05, speed: 1.5, breathS: 2.6, breathAmp: 0.02, scaleX: 1.03, scaleY: 0.95, lean: -4, lift: 1, droop: 0.05, eyes: 'open', eyeOpen: 1.15, mouth: 'o', flame: 0.7, flameLean: 6, spark: 1 },
  thinking: { wobble: 0.01, speed: 0.7, breathS: 2.2, breathAmp: 0.022, scaleX: 0.985, scaleY: 0.985, lean: 2.5, lift: 0, droop: 0, eyes: 'open', eyeOpen: 0.72, mouth: 'hmm', flame: 0.5, flameLean: -8, spark: 1 },
  explaining: { wobble: 0.022, speed: 1.2, breathS: 3, breathAmp: 0.014, scaleX: 1, scaleY: 1.02, lean: 0, lift: -2, droop: 0, eyes: 'open', eyeOpen: 1.05, mouth: 'smile', flame: 0.65, flameLean: 0, spark: 1 },
  correct: { wobble: 0.03, speed: 1.4, breathS: 3, breathAmp: 0.016, scaleX: 1.04, scaleY: 0.97, lean: 0, lift: -1, droop: 0, eyes: 'happy', eyeOpen: 1, mouth: 'grin', flame: 0.9, flameLean: 0, spark: 2 },
  celebrate: { wobble: 0.035, speed: 1.6, breathS: 2.8, breathAmp: 0.018, scaleX: 1, scaleY: 1, lean: 0, lift: -3, droop: 0, eyes: 'happy', eyeOpen: 1, mouth: 'grin', flame: 1, flameLean: 0, spark: 2 },
  waiting: { wobble: 0.007, speed: 0.5, breathS: 4.6, breathAmp: 0.02, scaleX: 1.01, scaleY: 0.985, lean: 0, lift: 1, droop: 0.03, eyes: 'closed', eyeOpen: 0.55, mouth: 'calm', flame: 0.22, flameLean: 0, spark: 0.6 },
  resting: { wobble: 0.006, speed: 0.4, breathS: 5.2, breathAmp: 0.026, scaleX: 1.02, scaleY: 0.975, lean: 1.5, lift: 2, droop: 0.045, eyes: 'closed', eyeOpen: 0.18, mouth: 'calm', flame: 0.18, flameLean: 0, spark: 0.6 },
  hint: { wobble: 0.024, speed: 1.3, breathS: 2.6, breathAmp: 0.016, scaleX: 1, scaleY: 1.025, lean: -2, lift: -2, droop: 0, eyes: 'open', eyeOpen: 1.1, mouth: 'smile', flame: 0.95, flameLean: 0, spark: 2 },
};

const MOUTHS: Record<Pose['mouth'], string> = {
  smile: 'M -7 11 Q 0 17 7 11',
  grin: 'M -9.5 9.5 Q 0 20 9.5 9.5',
  calm: 'M -6 11.5 Q 0 16 6 11.5',
  hmm: 'M -5.5 12.5 Q 0.5 14.5 6.5 11.5',
  o: 'M 0 13.4 m -3.1 0 a 3.1 3.4 0 1 0 6.2 0 a 3.1 3.4 0 1 0 -6.2 0',
};

/** A four-pointed spark — hers alone. */
const SPARK_PATH = 'M 0 -7 C 1.2 -2.4, 2.4 -1.2, 7 0 C 2.4 1.2, 1.2 2.4, 0 7 C -1.2 2.4, -2.4 1.2, -7 0 C -2.4 -1.2, -1.2 -2.4, 0 -7 Z';

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
  const flameState = flameForMood(mood);
  const time = useTime();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ids = useMemo(() => {
    rigSeq += 1;
    return { grad: `vb-g-${rigSeq}`, bloom: `vb-b-${rigSeq}`, soft: `vb-s-${rigSeq}` };
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

  // --- Blink: randomized, alive ------------------------------------------------------------------
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          loop();
        }, 110);
      }, 2600 + Math.random() * 3200);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // --- The pose: springs with weight; celebrate is anticipation → pop → settle --------------------
  const controls = useAnimationControls();
  useEffect(() => {
    if ((mood === 'celebrate' || mood === 'correct') && !reduced) {
      const big = mood === 'celebrate';
      void controls.start({
        scaleX: [1, 1.08, 0.86, 1.1, 0.98, pose.scaleX],
        scaleY: [1, 0.86, 1.16, 0.92, 1.04, pose.scaleY],
        y: [0, 3, big ? -16 : -9, 1, -2, pose.lift],
        rotate: [0, 0, big ? -4 : -2, 2, 0, pose.lean],
        transition: { duration: big ? 0.95 : 0.7, times: [0, 0.18, 0.42, 0.66, 0.84, 1], ease: 'easeOut' },
      });
    } else {
      void controls.start({
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
        y: pose.lift,
        rotate: pose.lean + (mood === 'explaining' && gestureAngle !== undefined ? Math.cos(gestureAngle) * 6 : 0),
        transition: { type: 'spring', stiffness: 240, damping: 17, mass: 1.1 },
      });
    }
  }, [mood, reduced, controls, pose, gestureAngle]);

  // --- The flame: always exists, always flickers (identity law) -----------------------------------
  const flameFlicker = useTransform(time, (ms) => {
    const t = ms / 1000;
    const flick = reduced
      ? 0.5
      : 0.5 + 0.28 * Math.sin(t * 3.1) + 0.16 * Math.sin(t * 7.3 + 1.7) + 0.09 * Math.sin(t * 12.7 + 0.4);
    const base = flameState === 'flare' ? 1 : flameState === 'brighten' ? 0.9 : flameState === 'ember' ? 0.35 : 0.7;
    return Math.max(0.12, Math.min(1, pose.flame * base * (0.75 + 0.4 * flick)));
  });
  const flameScale = useTransform(flameFlicker, (v) => 0.85 + v * 0.4);

  // --- The spark: her golden companion — quiet shimmer, bright on delight -------------------------
  const sparkRotate = useTransform(time, (ms) => (reduced ? 0 : 8 * Math.sin(ms / 1400)));
  const sparkScale = useTransform(time, (ms) => {
    const s = reduced ? 1 : 1 + 0.06 * Math.sin(ms / 700 + 1);
    return s * (pose.spark >= 2 ? 1.25 : pose.spark);
  });

  const eyeH = 12 * Math.min(1, pose.eyeOpen);
  const lidScale = blink ? 0.06 : Math.min(1, pose.eyeOpen);
  const showOpenEyes = pose.eyes === 'open';

  return (
    <motion.div
      ref={rootRef}
      className={className}
      role={onTap ? 'button' : 'img'}
      aria-label={label}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      onKeyDown={onTap ? (e) => (e.key === 'Enter' || e.key === ' ') && onTap() : undefined}
      whileTap={onTap ? { scale: 0.93 } : undefined}
      whileHover={onTap ? { scale: 1.04 } : undefined}
      style={{ width: size, height: size, position: 'relative', display: 'inline-block', cursor: onTap ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' }}
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
      <motion.div animate={controls} style={{ width: '100%', height: '100%', transformOrigin: '50% 78%' }}>
        <motion.div style={{ width: '100%', height: '100%', scale: breath, transformOrigin: '50% 82%' }}>
          <svg viewBox="-50 -50 100 100" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
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
            </defs>

            {/* The matte jelly: gradient body, pink bloom, soft edges. */}
            <g filter={`url(#${ids.soft})`}>
              <motion.path d={path} fill={`url(#${ids.grad})`} />
              <motion.path d={path} fill={`url(#${ids.bloom})`} />
            </g>
            {/* A whisper of top sheen — matte, never glossy. */}
            <ellipse cx={-11} cy={-24} rx={19} ry={11} fill="rgba(255,255,255,0.18)" filter={`url(#${ids.soft})`} />

            {/* Her golden spark — bottom left, hers alone. */}
            <motion.g style={{ x: -36, y: 30, rotate: sparkRotate, scale: sparkScale }}>
              <path d={SPARK_PATH} transform="scale(1.35)" fill={MOLTEN.spark} />
            </motion.g>

            {/* The face. */}
            <motion.g style={{ x: faceX, y: faceY }}>
              {showOpenEyes ? (
                <g fill={MOLTEN.face}>
                  <motion.ellipse
                    cx={-11.5}
                    cy={-5}
                    rx={4.4}
                    ry={eyeH / 2}
                    animate={{ scaleY: lidScale }}
                    transition={{ duration: 0.09 }}
                    style={{ transformOrigin: '-11.5px -5px' }}
                  />
                  <motion.ellipse
                    cx={11.5}
                    cy={-5}
                    rx={4.4}
                    ry={eyeH / 2}
                    animate={{ scaleY: lidScale }}
                    transition={{ duration: 0.09 }}
                    style={{ transformOrigin: '11.5px -5px' }}
                  />
                  {lidScale > 0.3 && (
                    <g fill="rgba(255,255,255,0.85)">
                      <circle cx={-10} cy={-7.6} r={1.5} />
                      <circle cx={13} cy={-7.6} r={1.5} />
                    </g>
                  )}
                </g>
              ) : (
                <g stroke={MOLTEN.face} strokeWidth={4.4} strokeLinecap="round" fill="none">
                  {pose.eyes === 'happy' ? (
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
              {pose.mouth === 'o' ? (
                <path d={MOUTHS.o} fill="none" stroke={MOLTEN.face} strokeWidth={4} strokeLinecap="round" />
              ) : (
                <motion.path
                  d={MOUTHS[pose.mouth]}
                  fill="none"
                  stroke={MOLTEN.face}
                  strokeWidth={4.4}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ d: MOUTHS[pose.mouth] }}
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
