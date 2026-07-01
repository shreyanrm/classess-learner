'use client';

import { frost } from '@classess/config';
import { motion, useInView, type Variants } from 'framer-motion';
import { useRef } from 'react';
import { EASE, SEC } from './motion-tokens';
import type { MotionBaseProps } from './types';
import { useReducedMotion } from './use-reduced-motion';

// --- reveal -------------------------------------------------------------------------------------

export interface RevealProps extends MotionBaseProps {
  /** Rise distance in px. */
  distance?: number;
  delayMs?: number;
  /** Animate only the first time it enters the viewport. */
  once?: boolean;
  /** Override the in-view trigger; when set, controls visibility directly. */
  show?: boolean;
}

/**
 * reveal — content fades and rises in on entrance (the fading reveal after a struggle).
 * Calm equivalent: fade only, no rise.
 */
export function Reveal({
  distance = 12,
  delayMs = 0,
  once = true,
  show,
  children,
  className,
  style,
}: RevealProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: 0.2 });
  const visible = show ?? inView;
  const rise = reduced ? 0 : distance;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: rise }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: rise }}
      transition={{ duration: SEC.standard, ease: EASE.decelerate, delay: delayMs / 1000 }}
    >
      {children}
    </motion.div>
  );
}

// --- stagger ------------------------------------------------------------------------------------

export interface StaggerProps extends MotionBaseProps {
  /** Milliseconds between each child resolving. */
  staggerMs?: number;
  delayMs?: number;
  once?: boolean;
}

/**
 * stagger — a list or grid resolves in sequence, not all at once. Wrap items in `StaggerItem`.
 * Calm equivalent: items fade in together (no sequence, no rise).
 */
export function Stagger({
  staggerMs = 70,
  delayMs = 0,
  once = true,
  children,
  className,
  style,
}: StaggerProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: 0.15 });

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : staggerMs / 1000,
        delayChildren: delayMs / 1000,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends MotionBaseProps {
  /** Rise distance in px. */
  distance?: number;
}

/** A single item inside `Stagger`. Inherits the parent's hidden/show timeline. */
export function StaggerItem({ distance = 12, children, className, style }: StaggerItemProps) {
  const reduced = useReducedMotion();
  const item: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: SEC.standard, ease: EASE.decelerate },
    },
  };
  return (
    <motion.div className={className} style={style} variants={item}>
      {children}
    </motion.div>
  );
}

// --- blur-in ------------------------------------------------------------------------------------

export interface BlurInProps extends MotionBaseProps {
  /** Plays when true; defaults to true. */
  show?: boolean;
  /** Render the frosted backdrop (config frost) behind content — for overlays. */
  frosted?: boolean;
  /** Starting blur in px. */
  blurPx?: number;
  /** Frost surface tone when `frosted`. */
  tone?: 'onPaper' | 'onDark';
}

/**
 * blur-in — frost/defocus resolves into focus, for overlays appearing (pairs with frost depth).
 * Calm equivalent: fade only, no blur, no scale.
 */
export function BlurIn({
  show = true,
  frosted = false,
  blurPx = 12,
  tone = 'onPaper',
  children,
  className,
  style,
}: BlurInProps) {
  const reduced = useReducedMotion();
  const frostStyle = frosted
    ? {
        backdropFilter: `blur(${frost.blur})`,
        WebkitBackdropFilter: `blur(${frost.blur})`,
        background: tone === 'onDark' ? frost.onDark : frost.onPaper,
      }
    : {};

  if (reduced) {
    return (
      <motion.div
        className={className}
        style={{ ...frostStyle, ...style }}
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: SEC.standard, ease: EASE.standard }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      style={{ ...frostStyle, ...style }}
      initial={{ opacity: 0, filter: `blur(${blurPx}px)`, scale: 1.02 }}
      // ponytail: filter blur IS the defocus->focus meaning here; it is GPU-composited.
      animate={
        show
          ? { opacity: 1, filter: 'blur(0px)', scale: 1 }
          : { opacity: 0, filter: `blur(${blurPx}px)`, scale: 1.02 }
      }
      transition={{ duration: SEC.standard, ease: EASE.decelerate }}
    >
      {children}
    </motion.div>
  );
}
