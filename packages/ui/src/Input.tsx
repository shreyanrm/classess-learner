'use client';

import type { InputHTMLAttributes } from 'react';
import { FieldFrame, useFieldA11y } from './internal/field';
import { FOCUSABLE, useClssStyles } from './internal/styles';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string;
  label?: string;
  hint?: string;
  /** Error message — also sets aria-invalid and a heavier border (never colour alone). */
  error?: string;
}

/**
 * Input — a calm text field with a hairline border and a 2px radius. Handles hover / focus /
 * disabled / error. The error reads as text + aria-invalid + a thicker monochrome border.
 */
export function Input({ id, label, hint, error, className, ...rest }: InputProps) {
  useClssStyles();
  const { fieldId, describedBy, invalid } = useFieldA11y(id, error, hint);
  return (
    <FieldFrame fieldId={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        className={['clss-field', FOCUSABLE, className].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </FieldFrame>
  );
}
