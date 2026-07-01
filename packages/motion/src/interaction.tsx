'use client';

import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { EASE, SEC } from './motion-tokens';
import type { MotionBaseProps } from './types';
import { useReducedMotion } from './use-reduced-motion';

// --- magnetic -----------------------------------------------------------------------------------

export interface MagneticProps extends MotionBaseProps {
  /** Fraction of the pointer offset the element follows (0..1). */
  strength?: number;
}

/**
 * magnetic — a primary action gently attracts the cursor/thumb, following it by a fraction of the
 * offset and springing back on leave. Transform-only.
 * Calm equivalent: no movement.
 */
export function Magnetic({ strength = 0.35, children, className, style }: MagneticProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const springConfig = { stiffness: 200, damping: 18, mass: 0.5 };
  const x = useSpring(mvX, springConfig);
  const y = useSpring(mvY, springConfig);

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mvX.set((event.clientX - cx) * strength);
    mvY.set((event.clientY - cy) * strength);
  };
  const reset = () => {
    mvX.set(0);
    mvY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      style={{ x, y, display: 'inline-block', ...style }}
    >
      {children}
    </motion.div>
  );
}

// --- ripple -------------------------------------------------------------------------------------

interface RippleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
}

export interface RippleProps extends MotionBaseProps {
  /** Defaults to monochrome (inherits text color). Pass an accent only on a surface that earned color. */
  color?: string;
}

/**
 * ripple — tactile feedback radiating from the point of contact, monochrome by default.
 * Calm equivalent: a single quiet opacity flash at the surface, no expanding circle.
 */
export function Ripple({ color = 'currentColor', children, className, style }: RippleProps) {
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const [flash, setFlash] = useState(0);
  const nextId = useRef(0);

  const onPointerDown = (event: ReactPointerEvent) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    if (reduced) {
      setFlash((n) => n + 1);
      return;
    }
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    setRipples((prev) => [...prev, { id: nextId.current++, x, y, size }]);
  };

  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {children}
      <AnimatePresence>
        {reduced
          ? flash > 0 && (
              <motion.span
                key={flash}
                aria-hidden
                initial={{ opacity: 0.12 }}
                animate={{ opacity: 0 }}
                transition={{ duration: SEC.standard, ease: EASE.accelerate }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: color,
                  pointerEvents: 'none',
                }}
              />
            )
          : ripples.map((ripple) => (
              <motion.span
                key={ripple.id}
                aria-hidden
                initial={{ scale: 0, opacity: 0.28 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: SEC.standard, ease: EASE.accelerate }}
                onAnimationComplete={() =>
                  setRipples((prev) => prev.filter((r) => r.id !== ripple.id))
                }
                style={{
                  position: 'absolute',
                  top: ripple.y - ripple.size / 2,
                  left: ripple.x - ripple.size / 2,
                  width: ripple.size,
                  height: ripple.size,
                  borderRadius: '50%',
                  background: color,
                  pointerEvents: 'none',
                }}
              />
            ))}
      </AnimatePresence>
    </div>
  );
}
