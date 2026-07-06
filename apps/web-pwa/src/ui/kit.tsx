'use client';

/**
 * The chrome kit — the design system, second cut. Designed, not assembled:
 * a cool near-white canvas, white surfaces with soft 16px corners and real padding,
 * one button system (solid ink · tonal · ghost), one type scale, one spacing rhythm.
 * Every element sits on the same grid and the same baseline. No wireframe borders,
 * no floating fragments, no arbitrary gaps. Cool neutrals only — never warm.
 */

import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from 'react';

// --- The surface language (cool neutrals) ----------------------------------------------------------
export const surface = {
  page: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E9E9EE',
  cardHover: '#FCFCFE',
  tonal: '#F1F1F5',
  tonalHover: '#E8E8EE',
  ink: '#121316',
  inkSoft: '#5C5E66',
  inkFaint: '#989AA4',
  radius: { card: 3, control: 3, pill: 3 },
} as const;

export const inkText: CSSProperties = { color: surface.ink };

/** Page titles: one committed scale. */
export const titleType: CSSProperties = {
  margin: 0,
  fontSize: '1.9rem',
  fontWeight: 650,
  letterSpacing: '-0.035em',
  color: surface.ink,
  lineHeight: 1.15,
};

export const subtitleType: CSSProperties = {
  fontSize: '0.95rem',
  color: surface.inkSoft,
  lineHeight: 1.55,
};

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: '0.78rem',
        fontWeight: 550,
        letterSpacing: '0.01em',
        color: surface.inkFaint,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hairline({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: surface.cardBorder, ...style }} />;
}

// --- Cards ----------------------------------------------------------------------------------------
export function Card({
  children,
  style,
  onClick,
  interactive = Boolean(onClick),
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      onClick={onClick}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      style={{
        background: interactive && hover ? surface.cardHover : surface.card,
        border: `1px solid ${surface.cardBorder}`,
        borderRadius: surface.radius.card,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background 0.25s ease, border-color 0.25s ease',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// --- The one button system -------------------------------------------------------------------------
export type ButtonVariant = 'primary' | 'quiet' | 'pigment' | 'ghost';

const BUTTON_LOOK: Record<ButtonVariant, { bg: string; bgHover: string; color: string }> = {
  primary: { bg: surface.ink, bgHover: '#26272C', color: '#FFFFFF' },
  quiet: { bg: surface.tonal, bgHover: surface.tonalHover, color: surface.ink },
  pigment: { bg: '#1F35E0', bgHover: '#1A2DC4', color: '#FFFFFF' },
  ghost: { bg: 'transparent', bgHover: surface.tonal, color: surface.inkSoft },
};

/**
 * MagneticButton — the house button. Solid, tonal, or ghost; a capped 4px magnetic pull on
 * hover; tonal press. Heights are fixed per size so rows of buttons always align.
 */
export function MagneticButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [hover, setHover] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 320, damping: 24 });
  const y = useSpring(my, { stiffness: 320, damping: 24 });

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el || disabled) return;
      const r = el.getBoundingClientRect();
      mx.set(Math.max(-4, Math.min(4, (e.clientX - (r.left + r.width / 2)) * 0.08)));
      my.set(Math.max(-4, Math.min(4, (e.clientY - (r.top + r.height / 2)) * 0.08)));
    },
    [mx, my, disabled],
  );
  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
    setHover(false);
  }, [mx, my]);

  const height = size === 'lg' ? 50 : size === 'sm' ? 34 : 42;
  const padX = size === 'lg' ? 28 : size === 'sm' ? 14 : 20;
  const font = size === 'lg' ? '1rem' : size === 'sm' ? '0.85rem' : '0.92rem';
  const look = BUTTON_LOOK[variant];

  return (
    <motion.button
      ref={ref}
      aria-label={ariaLabel}
      onPointerMove={onMove}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={onLeave}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      style={{
        background: hover && !disabled ? look.bgHover : look.bg,
        color: look.color,
        border: 'none',
        x,
        y,
        height,
        padding: `0 ${padX}px`,
        fontSize: font,
        fontFamily: 'inherit',
        fontWeight: 550,
        borderRadius: surface.radius.control,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        lineHeight: 1,
        transition: 'background 0.2s ease',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

/** A quiet keyboard-hint chip. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: '0.7rem',
        fontWeight: 550,
        padding: '3px 7px',
        background: surface.tonal,
        borderRadius: 3,
        color: surface.inkSoft,
      }}
    >
      {children}
    </span>
  );
}

// --- TiltCard — spotlight + tilt, subtle -----------------------------------------------------------
export function TiltCard({
  children,
  onClick,
  style,
  spotlight = 'rgba(18,19,22,0.045)',
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  spotlight?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useMotionValue(50);
  const sy = useMotionValue(50);
  const rotateX = useSpring(rx, { stiffness: 260, damping: 26 });
  const rotateY = useSpring(ry, { stiffness: 260, damping: 26 });
  const [lit, setLit] = useState(false);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry.set((px - 0.5) * 5);
      rx.set((0.5 - py) * 5);
      sx.set(px * 100);
      sy.set(py * 100);
    },
    [rx, ry, sx, sy],
  );
  const onLeaveTilt = useCallback(() => {
    rx.set(0);
    ry.set(0);
    setLit(false);
  }, [rx, ry]);

  const spot = useMotionTemplate`radial-gradient(240px circle at ${sx}% ${sy}%, ${spotlight}, transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setLit(true)}
      onPointerLeave={onLeaveTilt}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        background: surface.card,
        border: `1px solid ${surface.cardBorder}`,
        borderRadius: surface.radius.card,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: spot,
          opacity: lit ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </motion.div>
  );
}

// --- AuroraButton — hero doors only ----------------------------------------------------------------
export function AuroraButton({
  children,
  onClick,
  size = 'lg',
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: 'md' | 'lg';
  style?: CSSProperties;
}) {
  const [lit, setLit] = useState(false);
  const height = size === 'lg' ? 54 : 42;
  const font = size === 'lg' ? '1.05rem' : '0.95rem';
  const aurora = 'conic-gradient(from 0deg, #1F35E0, #CC1E7A, #FF5A1F, #66B300, #0FA3B1, #1F35E0)';
  return (
    <motion.button
      onPointerEnter={() => setLit(true)}
      onPointerLeave={() => setLit(false)}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        position: 'relative',
        height,
        padding: '0 34px',
        fontSize: font,
        fontWeight: 600,
        fontFamily: 'inherit',
        color: surface.ink,
        background: surface.card,
        border: `1px solid ${surface.cardBorder}`,
        borderRadius: 3,
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <motion.span
        aria-hidden
        animate={lit ? { opacity: 1, rotate: 360 } : { opacity: 0, rotate: 0 }}
        transition={
          lit
            ? {
                opacity: { duration: 0.25 },
                rotate: { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'linear' },
              }
            : { duration: 0.3 }
        }
        style={{
          position: 'absolute',
          inset: -70,
          background: aurora,
          filter: 'blur(20px)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 2,
          background: surface.card,
          borderRadius: 2,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'relative',
          background: lit ? 'linear-gradient(90deg, #1F35E0, #CC1E7A, #FF5A1F)' : 'none',
          WebkitBackgroundClip: lit ? 'text' : undefined,
          backgroundClip: lit ? 'text' : undefined,
          WebkitTextFillColor: lit ? 'transparent' : undefined,
          transition: 'all 0.25s ease',
        }}
      >
        {children}
      </span>
    </motion.button>
  );
}

// --- Icons ------------------------------------------------------------------------------------------
export function WaveformIcon({ active = false, size = 18 }: { active?: boolean; size?: number }) {
  const bars = [0.3, 0.55, 0.9, 0.5, 0.9, 0.55, 0.3];
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.12, height: size }}
    >
      {bars.map((h, i) => (
        <motion.span
          key={`${i}-${h}`}
          animate={active ? { scaleY: [h, Math.min(1, h + 0.45), h * 0.7, h] } : { scaleY: h }}
          transition={
            active
              ? {
                  duration: 0.7,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                  delay: i * 0.08,
                }
              : { type: 'spring', stiffness: 300, damping: 24 }
          }
          style={{
            width: Math.max(2, size * 0.13),
            height: size,
            borderRadius: 999,
            background: 'currentColor',
            transformOrigin: '50% 50%',
          }}
        />
      ))}
    </span>
  );
}

export function SparkIcon({ size = 12, color = '#1F35E0' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden style={{ display: 'block' }}>
      <path
        d="M7 0.5 C7.9 4 8.9 5 12.5 7 C8.9 9 7.9 10 7 13.5 C6.1 10 5.1 9 1.5 7 C5.1 5 6.1 4 7 0.5 Z"
        fill={color}
      />
    </svg>
  );
}

// --- Entrance choreography ---------------------------------------------------------------------------
/** Parent variants: children cascade in on staggered springs. */
export const cascade = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
} as const;

/** Child variants: rise, settle, and come into focus. */
export const rise = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 230, damping: 26, mass: 0.9 },
  },
} as const;

/** One-off reveal for elements outside a cascade. */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 230, damping: 26, mass: 0.9, delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
