'use client';

import { ink, space, typeScale } from '@classess/config';
import { useId } from 'react';
import { FOCUSABLE, useClssStyles } from './internal/styles';

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Visible label sitting beside the switch. */
  label?: string;
  /** Accessible name when no visible label is shown. */
  'aria-label'?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Toggle — a monochrome switch (on = ink). It is a real <button role="switch">, so Space / Enter
 * toggle it for free. Handles hover / focus / active / disabled; the knob slides under standard
 * motion, and holds still under reduced motion.
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  useClssStyles();
  const auto = useId();
  const switchId = id ?? auto;
  const labelId = label ? `${switchId}-label` : undefined;

  const button = (
    <button
      type="button"
      id={switchId}
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={labelId}
      disabled={disabled}
      className={['clss-toggle', FOCUSABLE, label ? undefined : className]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onChange(!checked)}
    >
      <span className="clss-toggle__knob" aria-hidden="true" />
    </button>
  );

  if (!label) return button;
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: space[1] }}
    >
      {button}
      <label
        id={labelId}
        htmlFor={switchId}
        style={{
          fontSize: typeScale.body.size,
          color: ink[900],
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {label}
      </label>
    </span>
  );
}
