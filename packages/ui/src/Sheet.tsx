'use client';

import { hairline, ink, radius, space, typeScale, zIndex } from '@classess/config';
import { BlurIn } from '@classess/motion';
import { type CSSProperties, type ReactNode, useEffect } from 'react';
import { IconButton } from './Button';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const CloseIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

function useEscape(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
}

/** The scrim is a real button (accessible close affordance), sitting behind the dialog panel. */
const scrimButton: CSSProperties = {
  position: 'absolute',
  inset: 0,
  border: 0,
  padding: 0,
  margin: 0,
  background: 'rgba(10,10,11,0.32)',
  cursor: 'default',
};

function Header({ title, onClose }: { title?: string; onClose: () => void }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space[2],
      }}
    >
      {title ? (
        <h2 style={{ margin: 0, fontSize: typeScale.h3.size, fontWeight: 600, color: ink[900] }}>
          {title}
        </h2>
      ) : (
        <span />
      )}
      <IconButton icon={CloseIcon} label="Close" size="sm" onClick={onClose} />
    </header>
  );
}

/**
 * Sheet — a bottom sheet overlay (frost + blur-in). Escape, the scrim, and the close button all
 * dismiss it. ponytail: focus is placed on the dialog; a full focus-trap lands with the first real
 * modal flow, add when a surface actually needs trapping.
 */
export function Sheet({ open, onClose, title, children }: OverlayProps) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: zIndex.modal }}>
      <button type="button" aria-label="Close" onClick={onClose} style={scrimButton} />
      <BlurIn
        frosted
        tone="onPaper"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: space[3],
          borderTop: `1px solid ${hairline.onPaper}`,
          borderTopLeftRadius: radius.panel,
          borderTopRightRadius: radius.panel,
        }}
      >
        <div role="dialog" aria-modal="true" aria-label={title}>
          <Header title={title} onClose={onClose} />
          {children}
        </div>
      </BlurIn>
    </div>
  );
}

/** Modal — a centred dialog (frost + blur-in). Same close affordances as Sheet. */
export function Modal({ open, onClose, title, children }: OverlayProps) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space[2],
      }}
    >
      <button type="button" aria-label="Close" onClick={onClose} style={scrimButton} />
      <BlurIn
        frosted
        tone="onPaper"
        style={{
          position: 'relative',
          width: 'min(520px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: space[3],
          border: `1px solid ${hairline.onPaper}`,
          borderRadius: radius.panel,
        }}
      >
        <div role="dialog" aria-modal="true" aria-label={title}>
          <Header title={title} onClose={onClose} />
          {children}
        </div>
      </BlurIn>
    </div>
  );
}
