'use client';

/**
 * The conversation — one page where only chat happens. It is the same never-ending thread the
 * docked Vidya carries everywhere: scroll up and the past pages itself in (the archive loads
 * lazily, WhatsApp-style); type below and she answers from wherever you actually are. Her ink
 * belongs on the other screens — here she speaks in regular type, person to person.
 */

import { useRegisterTarget, useVidyaBus, VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from '../shell/router';
import { SendIcon, WaveformIcon } from '../ui/icons';
import { fluidType, MagneticButton } from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { TurnAttachments } from '../vidya/paths';
import { MuteButton } from '../vidya/speech';
import { useVidyaVoice } from '../vidya/voice';
import { Whisper } from './Learn';

export function ChatScreen() {
  const router = useRouter();
  const { turns, ask, busy, mood, setMood, hasOlder, loadOlder } = useVidyaChat();
  const bus = useVidyaBus();
  const [draft, setDraft] = useState('');
  const [voiceNote, setVoiceNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // The chat page is the one full-screen route that used to publish nothing — so the bus kept the
  // last content screen's page/curriculum/canvas, and she would answer about a page already left.
  // She publishes herself here: the conversation IS the screen, and the course layers are cleared.
  const threadRef = useRegisterTarget<HTMLDivElement>('chat-thread', {
    kind: 'conversation',
    label: 'the conversation on screen',
    getSceneState: () => ({
      turns: turns.slice(-6).map((t) => ({ role: t.role, text: t.text.slice(0, 120) })),
    }),
  });
  useEffect(() => {
    bus.publishPage({
      route: 'chat',
      state: { title: 'conversation', intent: 'talk', turnCount: turns.length },
    });
    bus.publishCurriculum({});
    bus.publishCanvas(undefined);
  }, [bus, turns.length]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // scroll bookkeeping: keep the reader's place when the past prepends, follow the newest line
  const restore = useRef<{ height: number; top: number } | null>(null);
  const lastLen = useRef(turns.length);
  const voice = useVidyaVoice({ setMood });
  const voiceOn =
    voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Arrive at the newest line, instantly.
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
        background: 'var(--clss-card)',
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
          <div style={{ fontWeight: 600, color: 'var(--clss-ink)', lineHeight: 1.1 }}>Vidya</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--clss-ink-faint)' }}>
            {busy ? 'thinking…' : 'one conversation, always'}
          </div>
        </div>
        <MuteButton />
      </div>

      {/* the thread — the page's one scroll, the past paging in above */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}
      >
        <div
          ref={threadRef}
          style={{
            maxWidth: 680,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            paddingBottom: 8,
          }}
        >
          {!hasOlder && (
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'Caveat, cursive',
                fontSize: 19,
                color: 'color-mix(in srgb, var(--clss-ink) 45%, transparent)',
                padding: '18px 0 6px',
              }}
            >
              where we began
            </div>
          )}
          {/* her words sit on the page itself — the outline belongs to the learner's side only */}
          {turns.map((t) =>
            t.role === 'user' ? (
              <div
                key={t.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '78%',
                  padding: '11px 16px',
                  borderRadius: 'var(--clss-radius-md)',
                  fontSize: fluidType.body,
                  lineHeight: 1.6,
                  background: 'var(--clss-ink)',
                  color: 'var(--clss-on-ink)',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {t.text}
              </div>
            ) : (
              <div
                key={t.id}
                style={{
                  alignSelf: 'flex-start',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: '94%',
                    padding: '2px 2px',
                    fontSize: fluidType.body,
                    lineHeight: 1.7,
                    color: 'var(--clss-ink)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {t.text}
                </div>
                {/* the five paths land in the thread itself — sims, drawings, action cards */}
                {t.extras && <TurnAttachments turn={t} />}
              </div>
            ),
          )}
          {busy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: 'var(--clss-ink-faint)',
                fontSize: fluidType.small,
                padding: '2px 4px',
              }}
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
          borderTop: '1px solid var(--clss-tonal)',
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
              border: '1px solid var(--clss-card-border)',
              borderRadius: 3,
              outline: 'none',
              background: 'var(--clss-card)',
              color: 'var(--clss-ink)',
              transition: 'border-color 0.2s ease',
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = 'var(--clss-faint)';
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = 'var(--clss-card-border)';
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
              color: voiceOn ? '#FF5A1F' : 'var(--clss-ink-faint)',
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
            color: 'var(--clss-ink-faint)',
            fontSize: fluidType.small,
          }}
        >
          voice arrives with a key
        </div>
      )}
    </div>
  );
}
