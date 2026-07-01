'use client';

import { frost, hairline, paper, radius, space } from '@classess/config';
import { Tilt3D } from '@classess/motion';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Subtle parallax tilt on pointer (reserve for featured cards). */
  tilt?: boolean;
  /** Frosted surface (overlays only, per the frost rule). */
  frosted?: boolean;
  padded?: boolean;
  children: ReactNode;
}

/** Card — a calm surface. Depth is a hairline and tone, never a shadow. Optionally tilt-capable. */
export function Card({
  tilt = false,
  frosted = false,
  padded = true,
  children,
  style,
  ...rest
}: CardProps) {
  const card = (
    <div
      style={{
        borderRadius: radius.md,
        border: `1px solid ${hairline.onPaper}`,
        background: frosted ? frost.onPaper : paper,
        backdropFilter: frosted ? `blur(${frost.blur})` : undefined,
        WebkitBackdropFilter: frosted ? `blur(${frost.blur})` : undefined,
        padding: padded ? space[2] : 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
  return tilt ? <Tilt3D>{card}</Tilt3D> : card;
}
