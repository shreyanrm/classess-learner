'use client';

import { ink, zIndex } from '@wobo/config';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { EASE, SEC } from './motion-tokens';
import type { MotionBaseProps } from './types';
import { useReducedMotion } from './use-reduced-motion';

// --- spotlight ----------------------------------------------------------------------------------

export interface SpotlightProps extends MotionBaseProps {
  /** When true, focus pulls to this element and the surroundings dim behind a tonal scrim. */
  active: boolean;
  /** Scrim opacity (tone, never a shadow). */
  dim?: number;
}

/**
 * spotlight — focus pulls to one element; the surroundings recede behind a tonal scrim (no shadow).
 * Calm equivalent: the scrim still fades in (focus is meaningful) but the lifted element does not scale.
 */
export function Spotlight({ active, dim = 0.42, children, className, style }: SpotlightProps) {
  const reduced = useReducedMotion();
  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: dim }}
            exit={{ opacity: 0 }}
            transition={{ duration: SEC.standard, ease: EASE.standard }}
            style={{
              position: 'fixed',
              inset: 0,
              background: ink[900],
              pointerEvents: 'none',
              zIndex: zIndex.modal,
            }}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={className}
        animate={{ scale: active && !reduced ? 1.02 : 1 }}
        transition={{ duration: SEC.standard, ease: EASE.decelerate }}
        style={{ position: 'relative', zIndex: active ? zIndex.modal + 1 : 'auto', ...style }}
      >
        {children}
      </motion.div>
    </>
  );
}

// --- shared tilt --------------------------------------------------------------------------------

function useTilt(max: number, gyro: boolean, reduced: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const springConfig = { stiffness: 220, damping: 22, mass: 0.6 };
  const sx = useSpring(mvX, springConfig);
  const sy = useSpring(mvY, springConfig);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);

  const onPointerMove = (event: ReactPointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mvX.set((event.clientX - rect.left) / rect.width - 0.5);
    mvY.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const reset = () => {
    mvX.set(0);
    mvY.set(0);
  };

  useEffect(() => {
    if (!gyro || reduced || typeof window === 'undefined') return;
    const handler = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;
      mvX.set(Math.max(-0.5, Math.min(0.5, gamma / 45)));
      mvY.set(Math.max(-0.5, Math.min(0.5, (beta - 45) / 45)));
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [gyro, reduced, mvX, mvY]);

  return { ref, sx, sy, rotateX, rotateY, onPointerMove, reset };
}

// --- tilt-3D ------------------------------------------------------------------------------------

export interface Tilt3DProps extends MotionBaseProps {
  /** Maximum tilt in degrees (kept small). */
  max?: number;
  /** Perspective depth in px. */
  perspective?: number;
  /** Enable device-orientation (gyro) tilt where supported. */
  gyro?: boolean;
}

/**
 * tilt-3D — a subtle parallax tilt on interactive cards, driven by pointer or gyro, small angles.
 * Calm equivalent: no tilt at all (static element).
 */
export function Tilt3D({
  max = 8,
  perspective = 800,
  gyro = false,
  children,
  className,
  style,
}: Tilt3DProps) {
  const reduced = useReducedMotion();
  const { ref, rotateX, rotateY, onPointerMove, reset } = useTilt(max, gyro, reduced);

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      style={{ perspective, ...style }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  );
}

// --- spotlight × tilt (showpiece) ---------------------------------------------------------------

export interface SpotlightTiltProps extends Tilt3DProps {}

/**
 * spotlight × tilt — the merged hero treatment: the card tilts to the pointer while a soft light
 * glare tracks across it. Reserve for featured cards and key moments.
 * Calm equivalent: static, no tilt, no glare.
 */
export function SpotlightTilt({
  max = 9,
  perspective = 900,
  gyro = false,
  children,
  className,
  style,
}: SpotlightTiltProps) {
  const reduced = useReducedMotion();
  const { ref, sx, sy, rotateX, rotateY, onPointerMove, reset } = useTilt(max, gyro, reduced);
  const [hovered, setHovered] = useState(false);
  const glareX = useTransform(sx, [-0.5, 0.5], [100, 0]);
  const glareY = useTransform(sy, [-0.5, 0.5], [100, 0]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.22), transparent 45%)`;

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onPointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        reset();
      }}
      style={{ perspective, ...style }}
    >
      <motion.div style={{ position: 'relative', rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        {children}
        <motion.div
          aria-hidden
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: SEC.standard, ease: EASE.standard }}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: 'inherit',
            mixBlendMode: 'screen',
            backgroundImage: glare,
          }}
        />
      </motion.div>
    </div>
  );
}
