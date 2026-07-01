'use client';

import { hairline, ink, paper, radius, space, typeScale } from '@classess/config';
import { BlurIn } from '@classess/motion';
import type { ReactNode } from 'react';
import { IconButton } from './Button';

export interface ToastProps {
  title: string;
  description?: string;
  action?: ReactNode;
  onDismiss?: () => void;
}

const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Toast — a calm, transient status message. Copy stays plain and certain (no exclamation marks).
 * A frosted panel with a hairline; depth is frost and tone, never a shadow.
 */
export function Toast({ title, description, action, onDismiss }: ToastProps) {
  return (
    <BlurIn frosted tone="onPaper">
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: space[1],
          minWidth: 260,
          maxWidth: 420,
          padding: space[2],
          border: `1px solid ${hairline.onPaper}`,
          borderRadius: radius.md,
          background: paper,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: ink[900] }}>{title}</div>
          {description && (
            <div
              style={{ marginTop: space.half, fontSize: typeScale.caption.size, color: ink[500] }}
            >
              {description}
            </div>
          )}
          {action && <div style={{ marginTop: space[1] }}>{action}</div>}
        </div>
        {onDismiss && <IconButton icon={CloseIcon} label="Dismiss" size="sm" onClick={onDismiss} />}
      </div>
    </BlurIn>
  );
}
