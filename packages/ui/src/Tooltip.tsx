'use client';

import { ink, paper, radius, space, typeScale, zIndex } from '@classess/config';
import { type CSSProperties, type ReactNode, useId, useState } from 'react';

export interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}

/** Tooltip — a quiet hint on hover or keyboard focus. Describes; never the only source of meaning. */
export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const pos: CSSProperties =
    side === 'top'
      ? { bottom: '100%', marginBottom: space.half }
      : { top: '100%', marginTop: space.half };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a tooltip trigger wrapper; hover/focus are progressive enhancements over the focusable child it describes.
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          role="tooltip"
          id={id}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...pos,
            background: ink[900],
            color: paper,
            fontSize: typeScale.caption.size,
            padding: `${space.half}px ${space[1]}px`,
            borderRadius: radius.sm,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: zIndex.toast,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
