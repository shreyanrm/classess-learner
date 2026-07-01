'use client';

import { frost, hairline, ink, paper, radius, space, typeScale, zIndex } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { MOLTEN } from './identity';
import { VidyaPresence } from './VidyaPresence';

export interface VidyaTurn {
  id: string;
  role: 'user' | 'vidya';
  text: ReactNode;
}

export interface VidyaPanelProps {
  open: boolean;
  onClose: () => void;
  turns: VidyaTurn[];
  onSend?: (text: string) => void;
  /** Voice-listening state — renders the buttery gooey metaballs. */
  listening?: boolean;
  onToggleVoice?: () => void;
}

/** The buttery gooey metaballs of the voice-listening state. Soft and organic, never hard rings. */
function ListeningMetaballs({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const gooId = useId().replace(/:/g, '');
  const balls = [
    { base: 14, r: 7 },
    { base: 32, r: 9 },
    { base: 50, r: 7 },
  ];
  return (
    <svg width={64} height={28} role="img" aria-label="Listening" style={{ display: 'block' }}>
      <defs>
        <filter id={`goo-${gooId}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
      <g filter={`url(#goo-${gooId})`} fill={MOLTEN.base}>
        {balls.map((b, i) => (
          <motion.circle
            key={b.base}
            cy={14}
            r={b.r}
            initial={{ cx: b.base }}
            animate={
              reduced || !active ? { cx: b.base } : { cx: [b.base, b.base + 6, b.base - 4, b.base] }
            }
            transition={
              reduced || !active
                ? { duration: 0 }
                : { duration: 1.1 + i * 0.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            }
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * VidyaPanel — on tap she morphs open into a frosted floating panel (not a full-screen drawer) that
 * holds the transcript and the input. Text and voice. Depth is frost, never a shadow.
 */
export function VidyaPanel({
  open,
  onClose,
  turns,
  onSend,
  listening = false,
  onToggleVoice,
}: VidyaPanelProps) {
  const [draft, setDraft] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !onSend) return;
    onSend(text);
    setDraft('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          aria-label="Vidya"
          initial={{ opacity: 0, y: 12, scale: 0.98, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 12, scale: 0.98, filter: 'blur(10px)' }}
          transition={{ duration: 0.3, ease: [0, 0, 0, 1] }}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 'min(380px, calc(100vw - 32px))',
            maxHeight: 'min(560px, calc(100vh - 48px))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: zIndex.panel,
            borderRadius: radius.panel,
            border: `1px solid ${hairline.onPaper}`,
            background: frost.onPaper,
            backdropFilter: `blur(${frost.blur})`,
            WebkitBackdropFilter: `blur(${frost.blur})`,
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space[1],
              padding: `${space[1]}px ${space[2]}px`,
              borderBottom: `1px solid ${hairline.onPaper}`,
            }}
          >
            <VidyaPresence size={32} mood={listening ? 'listening' : 'idle'} />
            <span style={{ fontWeight: 600, color: ink[900] }}>Vidya</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                marginLeft: 'auto',
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: ink[500],
                padding: space.half,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: space[2],
              display: 'flex',
              flexDirection: 'column',
              gap: space[1],
            }}
          >
            {turns.map((turn) => (
              <div
                key={turn.id}
                style={{
                  alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: `${space[1]}px ${space[2]}px`,
                  borderRadius: radius.md,
                  fontSize: typeScale.body.size,
                  lineHeight: typeScale.body.lineHeight,
                  background: turn.role === 'user' ? ink[900] : paper,
                  color: turn.role === 'user' ? paper : ink[900],
                  border:
                    turn.role === 'user'
                      ? '1px solid transparent'
                      : `1px solid ${hairline.onPaper}`,
                }}
              >
                {turn.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={submit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space[1],
              padding: space[1],
              borderTop: `1px solid ${hairline.onPaper}`,
            }}
          >
            {listening ? (
              <div
                style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: space[1] }}
              >
                <ListeningMetaballs active={listening} />
              </div>
            ) : (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask Vidya"
                aria-label="Message to Vidya"
                style={{
                  flex: 1,
                  border: `1px solid ${hairline.onPaper}`,
                  borderRadius: radius.sm,
                  padding: `${space[1]}px ${space[1]}px`,
                  fontSize: typeScale.body.size,
                  background: paper,
                  color: ink[900],
                }}
              />
            )}
            {onToggleVoice && (
              <button
                type="button"
                onClick={onToggleVoice}
                aria-pressed={listening}
                aria-label={listening ? 'Stop voice' : 'Speak to Vidya'}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: listening ? MOLTEN.base : ink[700],
                  padding: space.half,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect
                    x="7.5"
                    y="2.5"
                    width="5"
                    height="10"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4.5 9a5.5 5.5 0 0 0 11 0M10 14.5V17"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
