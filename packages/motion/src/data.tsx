'use client';

import { ink, radius } from '@wobo/config';
import { animate, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { countUpValue, formatNumber } from './internal/count-up';
import { selectMotion } from './internal/reduced-motion';
import { EASE, SEC } from './motion-tokens';
import type { MotionBaseProps } from './types';
import { useReducedMotion } from './use-reduced-motion';

// --- count-up -----------------------------------------------------------------------------------

export interface CountUpProps extends Omit<MotionBaseProps, 'children'> {
  /** The real number to count to. */
  to: number;
  from?: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** BCP-47 locale for grouping separators. */
  locale?: string;
  /** Plays when true; defaults to true. */
  active?: boolean;
}

/**
 * count-up — a real number animates to its value (mastery %, streak, capacity). Stepping and
 * rounding go through the pure `countUpValue` helper; framer-motion only drives the eased clock.
 * Calm equivalent: the final value appears immediately.
 */
export function CountUp({
  to,
  from = 0,
  durationMs,
  decimals = 0,
  prefix,
  suffix,
  locale,
  active = true,
  className,
  style,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const target = Number.isFinite(to) ? to : 0;
  const sec = (durationMs ?? SEC.standard * 1000) / 1000;
  const format = (value: number) => formatNumber(value, { decimals, locale, prefix, suffix });

  const [display, setDisplay] = useState(() => format(reduced ? target : from));

  useEffect(() => {
    // Inline formatNumber (a stable import) so the effect has no reactive function dependency.
    const render = (value: number) =>
      setDisplay(formatNumber(value, { decimals, locale, prefix, suffix }));
    if (reduced || !active) {
      render(target);
      return;
    }
    render(from);
    const controls = animate(0, 1, {
      duration: sec,
      ease: EASE.standard,
      onUpdate: (t) => render(countUpValue(from, target, t, decimals)),
    });
    return () => controls.stop();
  }, [active, reduced, from, target, decimals, sec, prefix, suffix, locale]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}

// --- spring-bars --------------------------------------------------------------------------------

export interface SpringBarProps extends Omit<MotionBaseProps, 'children'> {
  /** Current value. */
  value: number;
  /** Value at 100%. */
  max?: number;
  /** Earned color of the fill. Omit to keep the bar monochrome (color is earned). */
  accent?: string;
  heightPx?: number;
  trackColor?: string;
  /** Accessible label for the progress. */
  label?: string;
}

/**
 * spring-bars — a progress/mastery bar settles to its value with a single calm spring (bounce 0,
 * no overshoot). Fill is monochrome until a subject accent is passed.
 * Calm equivalent: a short tween, no spring dynamics.
 */
export function SpringBar({
  value,
  max = 1,
  accent,
  heightPx = 8,
  trackColor = ink[100],
  label,
  className,
  style,
}: SpringBarProps) {
  const reduced = useReducedMotion();
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const transition = selectMotion(
    reduced,
    { type: 'spring' as const, bounce: 0, visualDuration: SEC.standard },
    { duration: SEC.micro, ease: EASE.standard },
  );

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      style={{
        width: '100%',
        height: heightPx,
        background: trackColor,
        borderRadius: radius.jelly,
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: ratio }}
        transition={transition}
        style={{
          height: '100%',
          width: '100%',
          transformOrigin: 'left center',
          background: accent ?? ink[700],
          borderRadius: 'inherit',
        }}
      />
    </div>
  );
}
