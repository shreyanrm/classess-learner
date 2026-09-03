'use client';

/**
 * The scroll reveal, as a wrapper.
 *
 * It never hides anything: an unsettled block sits at `REST_OPACITY` with a small rise and settles
 * to its resting place when it comes into view (see `scroll.ts` for why that matters). Reduced
 * motion renders settled on the first paint, so there is no transition and nothing to wait for.
 */

import { useReducedMotion } from '@wobo/motion';
import type { ReactNode } from 'react';
import { REST_OPACITY, REST_RISE, useSettled } from './scroll';

export function Reveal({
  children,
  as: Tag = 'div',
  className,
  id,
}: {
  children: ReactNode;
  as?: 'div' | 'section';
  className?: string;
  id?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, settled } = useSettled<HTMLDivElement>();
  const on = settled || reduced;
  return (
    <Tag
      ref={ref}
      id={id}
      className={className ? `lp-reveal ${className}` : 'lp-reveal'}
      style={{
        opacity: on ? 1 : REST_OPACITY,
        transform: on ? 'none' : `translate3d(0, ${REST_RISE}px, 0)`,
      }}
    >
      {children}
    </Tag>
  );
}
