'use client';

/**
 * The chrome kit — the only building blocks screens may use for chrome (DESIGN.md §2, §3, §5).
 * Ink on paper, 0.5px hairlines, 3px corners, no shadows. One hit of pigment per view: the
 * `pigment` button variant is ultramarine and a view may render at most one.
 *
 * Micro-interaction character lives here once: magnetic buttons, tactile press, butter easing.
 */

import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from 'react';

export const inkText: CSSProperties = { color: 'var(--clss-ink-900)' };

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: '0.72rem',
        letterSpacing: '0.14em',
        color: 'var(--clss-ink-500)',
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hairline({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        height: 1,
        transform: 'scaleY(0.5)',
        background: 'var(--clss-hairline-on-paper-strong)',
        ...style,
      }}
    />
  );
}

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
  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      style={{
        background: 'var(--clss-paper)',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 'var(--clss-radius-sm)',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export type ButtonVariant = 'primary' | 'quiet' | 'pigment' | 'ghost';

const BUTTON_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--clss-ink-900)',
    color: 'var(--clss-paper)',
    border: '0.5px solid var(--clss-ink-900)',
  },
  quiet: {
    background: 'var(--clss-paper)',
    color: 'var(--clss-ink-900)',
    border: '0.5px solid var(--clss-hairline-on-paper-strong)',
  },
  pigment: {
    background: 'var(--clss-ultramarine)',
    color: 'var(--clss-paper)',
    border: '0.5px solid var(--clss-ultramarine)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--clss-ink-500)',
    border: '0.5px solid transparent',
  },
};

/**
 * MagneticButton — cursor-attracted within a small radius, subtle and physical (DESIGN.md §5).
 * The pull is capped at 5px so it reads as weight, never as a gimmick.
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
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 320, damping: 22 });
  const y = useSpring(my, { stiffness: 320, damping: 22 });

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el || disabled) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      mx.set(Math.max(-5, Math.min(5, dx * 0.12)));
      my.set(Math.max(-5, Math.min(5, dy * 0.12)));
    },
    [mx, my, disabled],
  );
  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  const pad = size === 'lg' ? '14px 28px' : size === 'sm' ? '7px 14px' : '10px 20px';
  const font = size === 'lg' ? '1.05rem' : size === 'sm' ? '0.85rem' : '0.95rem';

  return (
    <motion.button
      ref={ref}
      aria-label={ariaLabel}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      style={{
        ...BUTTON_STYLES[variant],
        x,
        y,
        padding: pad,
        fontSize: font,
        fontFamily: 'inherit',
        fontWeight: 500,
        borderRadius: 'var(--clss-radius-sm)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

/** A quiet keyboard-hint chip (command palette affordance). */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: '0.7rem',
        padding: '2px 6px',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 'var(--clss-radius-sm)',
        color: 'var(--clss-ink-500)',
      }}
    >
      {children}
    </span>
  );
}

/**
 * TiltCard — spotlight + tilt, blended and subtle (owner directive). The card leans toward the
 * cursor (capped at 3.5°) while a soft light pool follows it. Premium, never a gimmick.
 */
export function TiltCard({
  children,
  onClick,
  style,
  spotlight = 'rgba(13,13,16,0.05)',
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
  const rotateX = useSpring(rx, { stiffness: 260, damping: 24 });
  const rotateY = useSpring(ry, { stiffness: 260, damping: 24 });
  const [lit, setLit] = useState(false);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry.set((px - 0.5) * 7);
      rx.set((0.5 - py) * 7);
      sx.set(px * 100);
      sy.set(py * 100);
    },
    [rx, ry, sx, sy],
  );
  const onLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
    setLit(false);
  }, [rx, ry]);

  const spot = useMotionTemplate`radial-gradient(220px circle at ${sx}% ${sy}%, ${spotlight}, transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setLit(true)}
      onPointerLeave={onLeave}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        background: 'var(--clss-paper)',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 'var(--clss-radius-sm)',
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

/**
 * AuroraButton — for the product's hero doors only. A quiet button until the cursor arrives;
 * then a spectral gradient flows around its border and through its label. One per intention.
 */
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
  const pad = size === 'lg' ? '15px 30px' : '10px 20px';
  const font = size === 'lg' ? '1.08rem' : '0.95rem';
  const aurora =
    'conic-gradient(from var(--clss-aurora-angle, 0deg), #1F35E0, #CC1E7A, #FF5A1F, #66B300, #0FA3B1, #1F35E0)';
  return (
    <motion.button
      onPointerEnter={() => setLit(true)}
      onPointerLeave={() => setLit(false)}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      style={{
        position: 'relative',
        padding: pad,
        fontSize: font,
        fontWeight: 550,
        fontFamily: 'inherit',
        color: 'var(--clss-ink-900)',
        background: 'var(--clss-paper)',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 'var(--clss-radius-sm)',
        cursor: 'pointer',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* the flowing border */}
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
          inset: -60,
          background: aurora,
          filter: 'blur(18px)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {/* the paper core keeps the button readable — the aurora lives at its rim */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 1.5,
          background: 'var(--clss-paper)',
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

/** A sound-wave mic — seven rounded bars; they dance while she listens. */
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
          animate={
            active
              ? { scaleY: [h, Math.min(1, h + 0.45), h * 0.7, h] }
              : { scaleY: h }
          }
          transition={
            active
              ? { duration: 0.7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: i * 0.08 }
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

/** Her four-point spark, as an icon. */
export function SparkIcon({ size = 12, color = 'var(--clss-ultramarine)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden style={{ display: 'block' }}>
      <path
        d="M7 0.5 C7.9 4 8.9 5 12.5 7 C8.9 9 7.9 10 7 13.5 C6.1 10 5.1 9 1.5 7 C5.1 5 6.1 4 7 0.5 Z"
        fill={color}
      />
    </svg>
  );
}
