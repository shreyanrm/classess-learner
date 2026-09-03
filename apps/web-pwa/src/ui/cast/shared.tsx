'use client';

/**
 * The cast — shared construction (the illustration system's skeleton).
 *
 * Ten rules, inherited from the character catalog and kept law here:
 * one construction · minimal faces (two dots, one curve) · flat, never gradient ·
 * paint is identity · no markers · one prop, one idea · soft corners everywhere ·
 * idle, never busy · shared baseline · built to extend.
 *
 * Every figure sits on the same ground line with a soft contact shadow, blinks every
 * few seconds, and breathes on a slow 3–4s loop. Motion always halts for
 * prefers-reduced-motion. Wobo is not in this file — the cast are Wobo's world, never Wobo.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// --- paint (brand-kit rich hues + our accents; molten is Wobo's alone) -----------------------
export const PAINT = {
  grass: '#1CA363',
  violet: '#6D4AE0',
  magenta: '#D6196F',
  amber: '#E8881A',
  sky: '#39A0DE',
  gold: '#DFA21F',
  rose: '#E0518A',
  mint: '#13B5A0',
  coral: '#E2674A',
  slate: '#5B6473',
  silver: '#9AA0AA',
  ultramarine: '#1F35E0',
} as const;

/** The face ink — warm near-black, softer than chrome ink, straight from the catalog. */
export const FACE_INK = '#241F1B';
/** The shared contact shadow under every grounded figure. */
export const GROUND_FILL = 'rgba(18,19,22,0.06)';

export type Mood = 'happy' | 'curious' | 'sleepy' | 'delighted' | 'neutral';

export function hexWash(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// --- the shared baseline -----------------------------------------------------------------------
export function Ground({ cx = 60, cy = 122, rx = 32 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={5} fill={GROUND_FILL} />;
}

// --- idle motion (slow loops; life, never noise) -------------------------------------------------
type IdleProps = { children: ReactNode; animate?: boolean; delay?: number; duration?: number };

/** Gentle vertical float — the default heartbeat. */
export function Bob({ children, animate = true, delay = 0, duration = 3.6 }: IdleProps) {
  const still = useReducedMotion() || !animate;
  return (
    <motion.g
      animate={still ? undefined : { y: [0, -4, 0] }}
      transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.g>
  );
}

/** Whole figure rocks from its base — plants, flags, sprouts. */
export function Sway({
  children,
  animate = true,
  delay = 0,
  duration = 4.4,
  origin = '60px 110px',
}: IdleProps & { origin?: string }) {
  const still = useReducedMotion() || !animate;
  return (
    <motion.g
      animate={still ? undefined : { rotate: [-2.5, 2.5, -2.5] }}
      transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay }}
      style={{ transformOrigin: origin, transformBox: 'view-box' }}
    >
      {children}
    </motion.g>
  );
}

/** Quick lift + tilt — bees and butterflies. */
export function Flutter({ children, animate = true, delay = 0 }: IdleProps) {
  const still = useReducedMotion() || !animate;
  return (
    <motion.g
      animate={still ? undefined : { y: [0, -6, 0], rotate: [-4, 4, -4] }}
      transition={{ duration: 1.9, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.g>
  );
}

/** Slow rise + tilt — sparks, bulbs, planets hovering. */
export function Float({ children, animate = true, delay = 0, duration = 4.4 }: IdleProps) {
  const still = useReducedMotion() || !animate;
  return (
    <motion.g
      animate={still ? undefined : { y: [0, -6, 0], rotate: [0, 5, 0] }}
      transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.g>
  );
}

// --- the face kit: two dots and one curve --------------------------------------------------------
export function Eyes({
  lx,
  rx,
  y,
  r = 3,
  mood = 'happy',
  color = FACE_INK,
  glint = true,
  animate = true,
  seed = 0,
}: {
  lx: number;
  rx: number;
  y: number;
  r?: number;
  mood?: Mood;
  color?: string;
  glint?: boolean;
  animate?: boolean;
  seed?: number;
}) {
  const still = useReducedMotion() || !animate;
  if (mood === 'sleepy') {
    const d = (x: number) => `M ${x - r - 1} ${y} q ${r + 1} ${r + 1.5} ${2 * (r + 1)} 0`;
    return (
      <g stroke={color} strokeWidth={2.2} strokeLinecap="round" fill="none">
        <path d={d(lx)} />
        <path d={d(rx)} />
      </g>
    );
  }
  if (mood === 'delighted') {
    const d = (x: number) => `M ${x - r - 1} ${y + 1} q ${r + 1} ${-r - 2.5} ${2 * (r + 1)} 0`;
    return (
      <g stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <path d={d(lx)} />
        <path d={d(rx)} />
      </g>
    );
  }
  return (
    <motion.g
      animate={still ? undefined : { scaleY: [1, 1, 0.12, 1] }}
      transition={{
        duration: 4.2,
        times: [0, 0.92, 0.96, 1],
        repeat: Number.POSITIVE_INFINITY,
        delay: 0.4 + seed * 0.7,
      }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <circle cx={lx} cy={y} r={r} fill={color} />
      <circle cx={rx} cy={y} r={r} fill={color} />
      {glint && (
        <>
          <circle cx={lx + r * 0.4} cy={y - r * 0.4} r={r * 0.32} fill="#FFFFFF" />
          <circle cx={rx + r * 0.4} cy={y - r * 0.4} r={r * 0.32} fill="#FFFFFF" />
        </>
      )}
      {mood === 'curious' && (
        <path
          d={`M ${rx - 4.5} ${y - r - 6} q 4.5 -3 9 0`}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </motion.g>
  );
}

export function Mouth({
  cx,
  y,
  mood = 'happy',
  color = FACE_INK,
  w = 12,
}: {
  cx: number;
  y: number;
  mood?: Mood;
  color?: string;
  w?: number;
}) {
  const h = w / 2;
  if (mood === 'curious') {
    return <circle cx={cx} cy={y + 1} r={w * 0.24} fill="none" stroke={color} strokeWidth={2} />;
  }
  const d =
    mood === 'delighted'
      ? `M ${cx - h} ${y - 1} Q ${cx} ${y + h + 1} ${cx + h} ${y - 1}`
      : mood === 'happy'
        ? `M ${cx - h} ${y} q ${h} ${h * 0.8} ${w} 0`
        : mood === 'sleepy'
          ? `M ${cx - h * 0.7} ${y + 1} h ${w * 0.7}`
          : `M ${cx - h * 0.6} ${y + 1} h ${w * 0.6}`;
  return <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />;
}

/** Soft rose cheeks — warmth on any face. */
export function Cheeks({ lx, rx, y, r = 4 }: { lx: number; rx: number; y: number; r?: number }) {
  return (
    <g fill={PAINT.rose} opacity={0.18}>
      <circle cx={lx} cy={y} r={r} />
      <circle cx={rx} cy={y} r={r} />
    </g>
  );
}

/** A four-point spark — the floating motif that says "an idea just landed". */
export function Spark({
  cx,
  cy,
  s = 8,
  color = PAINT.gold,
  animate = true,
  delay = 0,
}: {
  cx: number;
  cy: number;
  s?: number;
  color?: string;
  animate?: boolean;
  delay?: number;
}) {
  return (
    <Float animate={animate} delay={delay}>
      <path
        d={`M ${cx} ${cy - s} l ${s * 0.28} ${s * 0.72} L ${cx + s} ${cy} l ${-s * 0.72} ${s * 0.28} L ${cx} ${cy + s} l ${-s * 0.28} ${-s * 0.72} L ${cx - s} ${cy} l ${s * 0.72} ${-s * 0.28} Z`}
        fill={color}
      />
    </Float>
  );
}

/** Every figure shares one canvas: 120 wide, 130 tall, baseline at y=122. */
export function Figure({
  size = 96,
  label,
  flip = false,
  children,
}: {
  size?: number;
  label?: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={size * (130 / 120)}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}>{children}</g>
    </svg>
  );
}

/** Common props for every member of the cast. */
export interface CastFigureProps {
  size?: number;
  mood?: Mood;
  animate?: boolean;
  flip?: boolean;
  /** Stagger seed so no two figures blink or bob in sync. */
  seed?: number;
}

/** Common props for every world prop. */
export interface WorldPropProps {
  size?: number;
  animate?: boolean;
  seed?: number;
}
