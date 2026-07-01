'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';
import { FieldFrame, useFieldA11y } from './internal/field';
import { FOCUSABLE, useClssStyles } from './internal/styles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  /** Convenience options; or pass <option> children directly. */
  options?: SelectOption[];
  children?: ReactNode;
}

/**
 * Select — the native <select> (the accessible, keyboardable default) given the calm field skin: a
 * hairline border, a 2px radius, and a quiet monochrome chevron. Handles hover / focus / disabled /
 * error like the other fields.
 */
export function Select({
  id,
  label,
  hint,
  error,
  options,
  children,
  className,
  ...rest
}: SelectProps) {
  useClssStyles();
  const { fieldId, describedBy, invalid } = useFieldA11y(id, error, hint);
  return (
    <FieldFrame fieldId={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        className={['clss-field', FOCUSABLE, className].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </FieldFrame>
  );
}
