'use client';

/**
 * The chrome kit — the only building blocks screens may use for chrome (DESIGN.md §2, §3, §5).
 * Ink on paper, 0.5px hairlines, 3px corners, no shadows. One hit of pigment per view: the
 * `pigment` button variant is ultramarine and a view may render at most one.
 *
 * Micro-interaction character lives here once: magnetic buttons, tactile press, butter easing.
 */

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { type CSSProperties, type ReactNode, useCallback, useRef } from 'react';

export const inkText: CSSProperties = { color: 'var(--clss-ink-900)' };

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: '0.72rem',
        letterSpacing: '0.14em',
        textTransform: 'lowercase',
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
  return <div style={{ height: 1, transform: 'scaleY(0.5)', background: 'var(--clss-hairline-on-paper-strong)', ...style }} />;
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
  primary: { background: 'var(--clss-ink-900)', color: 'var(--clss-paper)', border: '0.5px solid var(--clss-ink-900)' },
  quiet: { background: 'var(--clss-paper)', color: 'var(--clss-ink-900)', border: '0.5px solid var(--clss-hairline-on-paper-strong)' },
  pigment: { background: 'var(--clss-ultramarine)', color: 'var(--clss-paper)', border: '0.5px solid var(--clss-ultramarine)' },
  ghost: { background: 'transparent', color: 'var(--clss-ink-500)', border: '0.5px solid transparent' },
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
