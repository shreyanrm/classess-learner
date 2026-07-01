'use client';

import { ink, space, typeScale } from '@classess/config';
import { SpringBar } from '@classess/motion';

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Earned accent for the fill; omit to keep it monochrome. */
  accent?: string;
  label?: string;
  /** Show the percentage on the right of the label row. */
  showValue?: boolean;
  heightPx?: number;
}

/** ProgressBar — a labelled spring-bar. The fill settles with one calm spring (no bounce). */
export function ProgressBar({
  value,
  max = 1,
  accent,
  label,
  showValue = false,
  heightPx,
}: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.half }}>
      {(label || showValue) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: typeScale.caption.size,
            color: ink[700],
          }}
        >
          <span>{label}</span>
          {showValue && <span>{pct}%</span>}
        </div>
      )}
      <SpringBar value={value} max={max} accent={accent} heightPx={heightPx} label={label} />
    </div>
  );
}
