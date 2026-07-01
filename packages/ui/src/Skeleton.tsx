'use client';

import { radius } from '@classess/config';
import { useClssStyles } from './internal/styles';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  radiusPx?: number;
  className?: string;
}

/** Skeleton — a tonal shimmer placeholder (calm, monochrome). Stops animating under reduced motion. */
export function Skeleton({
  width = '100%',
  height = 16,
  circle = false,
  radiusPx,
  className,
}: SkeletonProps) {
  useClssStyles();
  return (
    <span
      aria-hidden="true"
      className={['clss-skeleton', className].filter(Boolean).join(' ')}
      style={{
        display: 'block',
        width,
        height,
        borderRadius: circle ? radius.jelly : (radiusPx ?? radius.sm),
      }}
    />
  );
}
