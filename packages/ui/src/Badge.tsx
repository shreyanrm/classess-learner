'use client';

import { ink, paper, radius, space, typeScale } from '@classess/config';
import type { ReactNode } from 'react';

export type BadgeVariant = 'solid' | 'outline' | 'quiet';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  /** An earned accent (e.g. a mastered subject's colour). Omit to stay monochrome. */
  accent?: string;
}

/** Badge — a small, calm label. Monochrome by default; an accent is used only when earned. */
export function Badge({ children, variant = 'quiet', accent }: BadgeProps) {
  const color = accent ?? ink[900];
  const styles = {
    solid: { background: color, color: paper, border: '1px solid transparent' },
    outline: { background: 'transparent', color, border: `1px solid ${accent ?? ink[300]}` },
    quiet: { background: ink[100], color: ink[700], border: '1px solid transparent' },
  }[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: typeScale.caption.size,
        fontWeight: 500,
        lineHeight: 1,
        padding: `${space.half}px ${space[1]}px`,
        borderRadius: radius.sm,
        ...styles,
      }}
    >
      {children}
    </span>
  );
}
