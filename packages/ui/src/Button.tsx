'use client';

import { Magnetic, Ripple } from '@classess/motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { FOCUSABLE, useClssStyles } from './internal/styles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy, and blocks activation. */
  loading?: boolean;
  /** Optional leading element (an icon). */
  leading?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

/** A small monochrome spinner — slows (never stops) under reduced motion via the base stylesheet. */
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="clss-spinner"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Button — primary / secondary / ghost. Monochrome by brand law (colour is earned by mastery, never
 * used to make a button shout). The primary action is magnetic: it gently attracts the pointer.
 * Every press gives a monochrome ripple. Handles hover / focus / active / disabled / loading.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leading,
  disabled,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  useClssStyles();
  const inert = disabled || loading;

  const button = (
    <Ripple style={{ display: 'inline-flex', borderRadius: 2 }}>
      <button
        type={type}
        className={[`clss-btn clss-btn--${variant} clss-btn--${size}`, FOCUSABLE, className]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        aria-busy={loading || undefined}
        // Guard activation while loading without losing the disabled-vs-busy distinction.
        onClick={inert ? undefined : onClick}
        {...rest}
      >
        {loading ? <Spinner /> : leading}
        {children != null && <span>{children}</span>}
      </button>
    </Ripple>
  );

  // Magnetic only when the primary action is actually actionable.
  return variant === 'primary' && !inert ? <Magnetic>{button}</Magnetic> : button;
}

export interface IconButtonProps extends Omit<ButtonProps, 'leading' | 'children'> {
  /** Required: the icon element. */
  icon: ReactNode;
  /** Required for screen readers — names the action, sentence case. */
  label: string;
}

/**
 * IconButton — a square, label-only-for-AT button. Ghost by default (chrome stays quiet).
 */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  onClick,
  ...rest
}: IconButtonProps) {
  useClssStyles();
  const inert = disabled || loading;
  const sizeClass = size === 'sm' ? 'clss-iconbtn--sm' : '';

  return (
    <Ripple style={{ display: 'inline-flex', borderRadius: 2 }}>
      <button
        type={type}
        aria-label={label}
        title={label}
        className={[`clss-btn clss-btn--${variant} clss-iconbtn`, sizeClass, FOCUSABLE, className]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        aria-busy={loading || undefined}
        onClick={inert ? undefined : onClick}
        {...rest}
      >
        {loading ? <Spinner /> : icon}
      </button>
    </Ripple>
  );
}
