'use client';

import type { TextareaHTMLAttributes } from 'react';
import { FieldFrame, useFieldA11y } from './internal/field';
import { FOCUSABLE, useClssStyles } from './internal/styles';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id?: string;
  label?: string;
  hint?: string;
  /** Error message — also sets aria-invalid and a heavier border (never colour alone). */
  error?: string;
}

/**
 * TextArea — the multi-line sibling of Input. Hairline border, 2px radius, vertical resize only,
 * same hover / focus / disabled / error handling.
 */
export function TextArea({ id, label, hint, error, className, rows = 4, ...rest }: TextAreaProps) {
  useClssStyles();
  const { fieldId, describedBy, invalid } = useFieldA11y(id, error, hint);
  return (
    <FieldFrame fieldId={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        rows={rows}
        className={['clss-field', FOCUSABLE, className].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </FieldFrame>
  );
}
