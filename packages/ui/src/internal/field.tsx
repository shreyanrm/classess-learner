'use client';

import { ink, space, typeScale } from '@classess/config';
import type { ReactNode } from 'react';
import { useId } from 'react';

/**
 * Shared a11y wiring + visual frame for the text controls (Input, TextArea, Select). Keeps the
 * label/hint/error layout and the aria-describedby / aria-invalid bookkeeping in one place so the
 * three fields stay consistent and accessible. Error is conveyed by text + role, never colour alone.
 */
export interface FieldA11y {
  fieldId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export function useFieldA11y(idProp: string | undefined, error?: string, hint?: string): FieldA11y {
  const auto = useId();
  const fieldId = idProp ?? auto;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return { fieldId, describedBy, invalid: Boolean(error) };
}

export interface FieldFrameProps {
  fieldId: string;
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FieldFrame({ fieldId, label, hint, error, children }: FieldFrameProps) {
  return (
    <div style={{ display: 'grid', gap: space.half }}>
      {label && (
        <label
          htmlFor={fieldId}
          style={{
            fontSize: typeScale.caption.size,
            fontWeight: 500,
            color: ink[700],
          }}
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span
          id={`${fieldId}-error`}
          role="alert"
          style={{ fontSize: typeScale.caption.size, color: ink[900], fontWeight: 500 }}
        >
          {error}
        </span>
      ) : hint ? (
        <span id={`${fieldId}-hint`} style={{ fontSize: typeScale.caption.size, color: ink[500] }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
