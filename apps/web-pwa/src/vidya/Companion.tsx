'use client';

/**
 * The docked Vidya (DESIGN.md §4) — she flies in on every page, hovers on her light beam at the
 * bottom right, and one tap opens her full-height drawer on the right. Her words arrive in her
 * own hand — Caveat, written letter by letter. Her canvas ink lives in the overlay and fades;
 * nothing she draws is saved.
 */

import { VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from '../shell/router';
import { CloseIcon, SendIcon, WaveformIcon } from '../ui/icons';
import { useVidyaChat } from './chat';
import { FlyingVidya } from './Flight';
import { useVidyaVoice } from './voice';

/** Her hand: letter-by-letter reveal for the newest line she speaks. */
function Handwritten({ text, animate }: { text: string; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [text, animate]);
  return (
    <span
      style={{
        fontFamily: "'Caveat', cursive",
        fontSize: '1.3rem',
        lineHeight: 1.35,
        color: 'var(--clss-ink-900)',
      }}
    >
      {text.slice(0, shown)}
      {shown < text.length && <span style={{ opacity: 0.4 }}>✎</span>}
    </span>
  );
}

export function VidyaCompanion() {
  const { turns, ask, busy, mood, setMood } = useVidyaChat();
  const { route } = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [voiceNote, setVoiceNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voice = useVidyaVoice({ setMood });
  const voiceOn =
    voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting';

  const lastVidyaId = [...turns].reverse().find((t) => t.role === 'vidya')?.id;

  const toggleVoice = () => {
    if (voiceOn) return voice.stop();
    void voice.start().then((landed) => {
      if (landed === 'unavailable') {
        setVoiceNote(true);
        window.setTimeout(() => setVoiceNote(false), 3000);
      }
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: length/open ARE the triggers — scroll on new turns and on expand
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, open, busy]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void ask(text);
  };

  return (
    <>
      {!open && (
        <FlyingVidya
          routeKey={route.name}
          mood={busy ? 'thinking' : mood}
          onTap={() => setOpen(true)}
        />
      )}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '104%' }}
            animate={{ x: 0 }}
            exit={{ x: '104%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(420px, 94vw)',
              zIndex: 'var(--clss-z-panel)' as unknown as number,
              background: 'var(--clss-frost-on-paper)',
              backdropFilter: 'blur(var(--clss-frost-blur))',
              WebkitBackdropFilter: 'blur(var(--clss-frost-blur))',
              borderLeft: '0.5px solid var(--clss-hairline-on-paper-strong)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '0.5px solid var(--clss-hairline-on-paper)',
              }}
            >
              <VidyaBody
                size={46}
                mood={busy ? 'thinking' : open ? 'listening' : mood}
                gaze="pointer"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--clss-ink-900)', lineHeight: 1.1 }}>
                  Vidya
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clss-ink-500)' }}>
                  {busy ? 'Thinking…' : 'Watching this page with you'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--clss-ink-500)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  lineHeight: 1,
                  padding: 6,
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div
              ref={scrollRef}
              style={{
                overflowY: 'auto',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
              }}
            >
              {turns.map((t) =>
                t.role === 'user' ? (
                  <div
                    key={t.id}
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '85%',
                      padding: '8px 13px',
                      borderRadius: 'var(--clss-radius-md)',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      background: 'var(--clss-ink-900)',
                      color: 'var(--clss-paper)',
                    }}
                  >
                    {t.text}
                  </div>
                ) : (
                  <div key={t.id} style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
                    <Handwritten text={t.text} animate={t.id === lastVidyaId && t.id !== 'seed'} />
                  </div>
                ),
              )}
              {busy && (
                <span
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: '1.2rem',
                    color: 'var(--clss-ink-500)',
                  }}
                >
                  …
                </span>
              )}
            </div>

            <form
              onSubmit={submit}
              style={{
                display: 'flex',
                gap: 8,
                padding: 14,
                borderTop: '0.5px solid var(--clss-hairline-on-paper)',
                alignItems: 'center',
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setMood('listening')}
                onBlur={() => setMood('idle')}
                placeholder="Ask or do anything…"
                style={{
                  flex: 1,
                  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  borderRadius: 'var(--clss-radius-sm)',
                  padding: '10px 12px',
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  background: 'var(--clss-paper)',
                  color: 'var(--clss-ink-900)',
                }}
              />
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={voiceOn ? 'Stop voice' : 'Talk by voice'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: voiceOn ? 'var(--clss-ink-900)' : 'var(--clss-ink-500)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  padding: '0 2px',
                  whiteSpace: 'nowrap',
                }}
              >
                <WaveformIcon active={voiceOn} size={17} />
              </button>
              {/* the ask affordance exists only once there is something to ask */}
              <AnimatePresence initial={false}>
                {draft.trim() && (
                  <motion.button
                    key="ask"
                    type="submit"
                    disabled={busy}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    style={{
                      border: 'none',
                      background: 'var(--clss-ink-900)',
                      color: 'var(--clss-paper)',
                      borderRadius: 'var(--clss-radius-sm)',
                      padding: '10px 14px',
                      cursor: busy ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <SendIcon size={13} /> ask
                  </motion.button>
                )}
              </AnimatePresence>
            </form>
            {voiceNote && (
              <div
                style={{
                  padding: '0 14px 10px',
                  color: 'var(--clss-ink-500)',
                  fontSize: '0.78rem',
                }}
              >
                voice arrives with a key
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
