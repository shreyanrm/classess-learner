'use client';

/**
 * The conversation — one page where only chat happens. It is the same never-ending thread the
 * docked Vidya carries everywhere: scroll up and the past pages itself in (the archive loads
 * lazily, WhatsApp-style); type below and she answers from wherever you actually are. Her ink
 * belongs on the other screens — here she speaks in regular type, person to person.
 */

import { VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from '../shell/router';
import { SendIcon, WaveformIcon } from '../ui/icons';
import { fluidType, MagneticButton } from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { useVidyaVoice } from '../vidya/voice';
import { Whisper } from './Learn';

export function ChatScreen() {
  const router = useRouter();
  const { turns, ask, busy, mood, setMood, hasOlder, loadOlder } = useVidyaChat();
  const [draft, setDraft] = useState('');
  const [voiceNote, setVoiceNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // scroll bookkeeping: keep the reader's place when the past prepends, follow the newest line
  const restore = useRef<{ height: number; top: number } | null>(null);
  const lastLen = useRef(turns.length);
  const voice = useVidyaVoice({ setMood });
  const voiceOn =
    voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting';

  const lastVidyaId = [...turns].reverse().find((t) => t.role === 'vidya')?.id;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Arrive at the newest line, instantly.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restore.current) {
      // older turns prepended — hold the exact line the reader was on
      el.scrollTop = el.scrollHeight - restore.current.height + restore.current.top;
      restore.current = null;
    } else if (turns.length > lastLen.current) {
      // a new turn arrived — follow it down only if the reader is already near the bottom
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
      if (nearBottom) el.scrollTop = el.scrollHeight;
    }
    lastLen.current = turns.length;
  }, [turns]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !hasOlder || restore.current) return;
    if (el.scrollTop < 80) {
      restore.current = { height: el.scrollHeight, top: el.scrollTop };
      loadOlder();
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void ask(text);
  };

  const toggleVoice = () => {
    if (voiceOn) return voice.stop();
    void voice.start().then((state) => {
      if (state === 'unavailable') {
        setVoiceNote(true);
        window.setTimeout(() => setVoiceNote(false), 3000);
      }
    });
  };

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 64,
        background: '#FFFFFF',
      }}
    >
      <Whisper onClick={() => router.back()}>◦ back</Whisper>

      {/* her presence — small, alive, above the thread */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '10px 0 6px',
        }}
      >
        <VidyaBody size={44} mood={busy ? 'thinking' : mood} gaze="pointer" label="Vidya" />
        <div>
          <div style={{ fontWeight: 600, color: '#121316', lineHeight: 1.1 }}>Vidya</div>
          <div style={{ fontSize: '0.75rem', color: '#989AA4' }}>
            {busy ? 'thinking…' : 'one conversation, always'}
          </div>
        </div>
      </div>

      {/* the thread — the page's one scroll, the past paging in above */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {!hasOlder && (
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'Caveat, cursive',
                fontSize: 19,
                color: 'rgba(18,19,22,0.45)',
                padding: '18px 0 6px',
              }}
            >
              where we began
            </div>
          )}
          {turns.map((t) => (
            <div
              key={t.id}
              style={{
                alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '84%',
                padding: '10px 14px',
                borderRadius: 'var(--clss-radius-md)',
                fontSize: fluidType.body,
                lineHeight: 1.55,
                background: t.role === 'user' ? '#121316' : '#FFFFFF',
                color: t.role === 'user' ? '#FFFFFF' : '#121316',
                border: t.role === 'user' ? 'none' : '1px solid #E9E9EE',
                whiteSpace: 'pre-wrap',
              }}
            >
              {t.text}
            </div>
          ))}
          {busy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#989AA4', fontSize: fluidType.small, padding: '2px 4px' }}
            >
              Vidya is thinking…
            </motion.div>
          )}
        </div>
      </div>

      {/* the bar — same hand as the home door: mic inside, ask appears once there is something */}
      <form
        onSubmit={submit}
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '12px 20px calc(16px + env(safe-area-inset-bottom))',
          borderTop: '1px solid #F1F1F5',
          maxWidth: 760,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setMood('listening')}
            onBlur={() => setMood('idle')}
            placeholder="Talk to Vidya…"
            style={{
              flex: 1,
              height: 52,
              padding: '0 52px 0 18px',
              fontSize: fluidType.body,
              fontFamily: 'inherit',
              border: '1px solid #E9E9EE',
              borderRadius: 3,
              outline: 'none',
              background: '#FFFFFF',
              color: '#121316',
              transition: 'border-color 0.2s ease',
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = '#B9BBC6';
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = '#E9E9EE';
            }}
          />
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={voiceOn ? 'Stop voice' : 'Talk by voice'}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              background: 'transparent',
              color: voiceOn ? '#FF5A1F' : '#989AA4',
              cursor: 'pointer',
              transition: 'color 0.25s ease',
            }}
          >
            <WaveformIcon active={voiceOn} size={19} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {draft.trim() && (
            <motion.span
              key="ask"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              style={{ display: 'inline-flex' }}
            >
              <MagneticButton variant="primary" onClick={() => {}} ariaLabel="Ask Vidya">
                <SendIcon size={13} /> ask
              </MagneticButton>
            </motion.span>
          )}
        </AnimatePresence>
      </form>
      {voiceNote && (
        <div
          style={{
            textAlign: 'center',
            paddingBottom: 10,
            color: '#989AA4',
            fontSize: fluidType.small,
          }}
        >
          voice arrives with a key
        </div>
      )}
    </div>
  );
}
