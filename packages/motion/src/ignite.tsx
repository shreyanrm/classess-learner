'use client';

import { duration, radius } from '@classess/config';
import { motion } from 'framer-motion';
import { EASE, SEC } from './motion-tokens';
import type { MotionBaseProps } from './types';
import { useReducedMotion } from './use-reduced-motion';

export interface IgniteProps extends MotionBaseProps {
  /** The earned content-color this concept ignites into (a @classess/config accent hex). */
  accent: string;
  /** Plays when true; defaults to true so a freshly mounted concept ignites once. */
  active?: boolean;
  /** The point of mastery the bloom radiates from, in percent of the box. */
  origin?: { x: number; y: number };
  /** Total duration in ms. Clamped to the signature band (600–900). */
  durationMs?: number;
  onComplete?: () => void;
}

const COLD_FILTER = 'grayscale(1) saturate(0.35)';
const LIT_FILTER = 'grayscale(0) saturate(1)';

/**
 * ignite — the primary signature. A concept floods from monochrome to its content-color: the
 * surface desaturates at rest, then a bloom of `accent` radiates from the point of mastery while a
 * soft warm light pulse passes over it, settling into full color. The emotional payload of the app.
 *
 * Calm equivalent: a plain grayscale -> color cross-fade, no bloom, no pulse, no scale.
 */
export function Ignite({
  accent,
  active = true,
  origin = { x: 50, y: 50 },
  durationMs,
  onComplete,
  children,
  className,
  style,
}: IgniteProps) {
  const reduced = useReducedMotion();
  const ms = Math.min(900, Math.max(600, durationMs ?? duration.signature));
  const sec = ms / 1000;
  const { x, y } = origin;

  return (
    <div
      className={className}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: radius.sm, ...style }}
    >
      <motion.div
        style={{ position: 'relative', zIndex: 1 }}
        initial={{ filter: COLD_FILTER }}
        animate={{ filter: active ? LIT_FILTER : COLD_FILTER }}
        // ponytail: filter (not transform/opacity) is the literal meaning of ignite — desaturation.
        // It is GPU-composited; the decorative layers below stay transform/opacity only.
        transition={{
          duration: reduced ? SEC.standard : sec,
          ease: reduced ? EASE.standard : EASE.decelerate,
        }}
        onAnimationComplete={() => {
          if (active) onComplete?.();
        }}
      >
        {children}
      </motion.div>

      {active && !reduced && (
        <>
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              pointerEvents: 'none',
              borderRadius: 'inherit',
              background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,248,238,0.9) 0%, transparent 55%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: sec, ease: EASE.standard, times: [0, 0.32, 1] }}
          />
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              pointerEvents: 'none',
              borderRadius: 'inherit',
              mixBlendMode: 'screen',
              transformOrigin: `${x}% ${y}%`,
              background: `radial-gradient(circle at ${x}% ${y}%, ${accent} 0%, ${accent} 10%, transparent 60%)`,
            }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1, 1.18], opacity: [0, 0.7, 0] }}
            transition={{ duration: sec, ease: EASE.emphasized, times: [0, 0.45, 1] }}
          />
        </>
      )}
    </div>
  );
}
