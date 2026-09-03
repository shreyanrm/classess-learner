'use client';

/**
 * Hands the app's "Reduce motion" switch to framer-motion, which otherwise only listens to the OS.
 * `@wobo/motion` reads the same root attribute on its own; this is the other library's ear.
 */
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMotionPref } from './motion';

export function MotionPrefConfig({ children }: { children: ReactNode }) {
  const reduce = useMotionPref();
  return <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>{children}</MotionConfig>;
}
