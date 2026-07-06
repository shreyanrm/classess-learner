'use client';

/**
 * The docked Vidya (DESIGN.md §4) — present and watching on every surface except home, one tap
 * from expanding into her frosted panel, laying ink over the current screen, executing actions.
 */

import { VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useVidyaChat } from './chat';

export function VidyaCompanion() {
  const { turns, ask, busy, mood, setMood } = useVidyaChat();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void ask(text);
  };

  return (
    <div style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 'var(--clss-z-vidyaPresence)' as unknown as number }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'absolute',
              left: 0,
              bottom: 84,
              width: 'min(360px, calc(100vw - 40px))',
              background: 'var(--clss-frost-on-paper)',
              backdropFilter: 'blur(var(--clss-frost-blur))',
              WebkitBackdropFilter: 'blur(var(--clss-frost-blur))',
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 'var(--clss-radius-panel)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'min(480px, 70vh)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                borderBottom: '0.5px solid var(--clss-hairline-on-paper)',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--clss-ink-900)' }}>Vidya</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ border: 'none', background: 'transparent', color: 'var(--clss-ink-500)', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
              >
                close
              </button>
            </div>
            <div ref={scrollRef} style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {turns.map((t) => (
                <div
                  key={t.id}
                  style={{
                    alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 'var(--clss-radius-md)',
                    fontSize: '0.92rem',
                    lineHeight: 1.5,
                    background: t.role === 'user' ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
                    color: t.role === 'user' ? 'var(--clss-paper)' : 'var(--clss-ink-900)',
                    border: t.role === 'user' ? 'none' : '0.5px solid var(--clss-hairline-on-paper)',
                  }}
                >
                  {t.text}
                </div>
              ))}
              {busy && (
                <div style={{ color: 'var(--clss-ink-500)', fontSize: '0.85rem' }}>Vidya is thinking…</div>
              )}
            </div>
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '0.5px solid var(--clss-hairline-on-paper)' }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setMood('listening')}
                onBlur={() => setMood('idle')}
                placeholder="ask or do anything…"
                style={{
                  flex: 1,
                  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  borderRadius: 'var(--clss-radius-sm)',
                  padding: '9px 12px',
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  background: 'var(--clss-paper)',
                  color: 'var(--clss-ink-900)',
                }}
              />
              <button
                type="submit"
                disabled={busy}
                style={{
                  border: 'none',
                  background: 'var(--clss-ink-900)',
                  color: 'var(--clss-paper)',
                  borderRadius: 'var(--clss-radius-sm)',
                  padding: '9px 14px',
                  cursor: busy ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              >
                ask
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <VidyaBody
        size={64}
        mood={open ? mood : busy ? 'thinking' : mood}
        gaze="pointer"
        onTap={() => setOpen((o) => !o)}
        label={open ? 'Close Vidya' : 'Talk to Vidya'}
      />
    </div>
  );
}
