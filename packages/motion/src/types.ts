import type { CSSProperties, ReactNode } from 'react';

/** Shared base for primitives that wrap arbitrary content. */
export interface MotionBaseProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}
