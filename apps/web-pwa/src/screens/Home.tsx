'use client';

/**
 * The home — radically minimal (DESIGN.md §7). On landing the learner sees almost nothing:
 * Vidya expanded into a full conversation, a did-you-know whisper top right, the you affordance
 * top left, and two doors. That emptiness is the premium signal.
 */

import { VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { learner } from '../data/catalog';
import { useRouter } from '../shell/router';
import { AuroraButton, Kbd, MagneticButton } from '../ui/kit';
import { ClassessLogo } from '../ui/Logo';
import { useVidyaChat } from '../vidya/chat';
import { useVidyaVoice } from '../vidya/voice';

/** Genuinely surprising, calm, sentence case. Rotates every single day. */
const DID_YOU_KNOW: string[] = [
  'a white tiger has stripes on its skin, not just its fur',
  'a day on Venus lasts longer than its entire year',
  'honey found in Egyptian tombs is still edible after three thousand years',
  'lightning is about five times hotter than the surface of the sun',
  'octopuses have three hearts, and their blood is blue',
  'sound travels about four times faster underwater than in air',
  'sharks existed on Earth before trees did',
  'bananas are berries, but strawberries are not',
  'the Eiffel Tower grows about fifteen centimetres taller every summer',
  'hot water can sometimes freeze faster than cold water',
  'there are more possible chess games than atoms in the observable universe',
  'a teaspoon of neutron star material would weigh about a billion tonnes',
  'your bones are about five times stronger than steel of the same weight',
  'the human brain runs on roughly the power of a dim light bulb',
];

function todaysFact(): string {
  const day = Math.floor(Date.now() / 86400000);
  return DID_YOU_KNOW[day % DID_YOU_KNOW.length] as string;
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const part =
    h < 5 ? 'good night' : h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : 'good evening';
  return `${part}, ${name.toLowerCase()}`;
}

const CHIPS: { label: string; prompt: string }[] = [
  {
    label: 'learn something cool',
    prompt:
      'Tell me something genuinely cool from science or math that most people never learn in school.',
  },
  {
    label: 'open a rabbit hole',
    prompt: 'Pick a fascinating question connected to what I already know and pull me into it.',
  },
  {
    label: 'what should I do today',
    prompt: 'Look at where I am and tell me the one best thing to work on right now.',
  },
];

export function Home() {
  const router = useRouter();
  const { turns, ask, busy, mood, setMood } = useVidyaChat();
  const [draft, setDraft] = useState('');
  const [factOpen, setFactOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fact = useMemo(todaysFact, []);
  const voice = useVidyaVoice({ setMood });
  const voiceOn =
    voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting';

  const toggleVoice = () => {
    if (voiceOn) return voice.stop();
    void voice.start().then((landed) => {
      if (landed === 'unavailable') {
        setVoiceNote(true);
        window.setTimeout(() => setVoiceNote(false), 3000);
      }
    });
  };

  // Only the conversation the learner actually started — the seed line renders as her greeting.
  const conversation = turns.filter((t) => t.id !== 'seed');

  // biome-ignore lint/correctness/useExhaustiveDependencies: the length IS the trigger — scroll on each new turn
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void ask(text);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 24px',
      }}
    >
      {/* the wordmark — quiet, top centre */}
      <div style={{ position: 'fixed', top: 16, left: 22 }}>
        <ClassessLogo height={14} />
      </div>

      {/* did you know — top right, fresh every day */}
      <div style={{ position: 'fixed', top: 58, right: 24, textAlign: 'right', maxWidth: 300 }}>
        <button
          type="button"
          onClick={() => setFactOpen((o) => !o)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--clss-ink-500)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 4,
          }}
        >
          ✦ did you know
        </button>
        <AnimatePresence>
          {factOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
              style={{
                marginTop: 8,
                padding: '12px 14px',
                background: 'var(--clss-paper)',
                border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                borderRadius: 'var(--clss-radius-sm)',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                color: 'var(--clss-ink-700)',
                textAlign: 'left',
              }}
            >
              {fact}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vidya, front door */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 620,
          gap: 0,
        }}
      >
        <VidyaBody size={116} mood={busy ? 'thinking' : mood} gaze="pointer" label="Vidya" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{
            marginTop: 22,
            fontSize: '1.35rem',
            fontWeight: 500,
            color: 'var(--clss-ink-900)',
            letterSpacing: '-0.02em',
          }}
        >
          {greeting(learner.name)}
        </motion.div>
        <div style={{ marginTop: 6, color: 'var(--clss-ink-500)', fontSize: '0.95rem' }}>
          ask me anything, or take a door
        </div>

        {conversation.length > 0 && (
          <div
            ref={scrollRef}
            style={{
              width: '100%',
              maxHeight: '32vh',
              overflowY: 'auto',
              marginTop: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '2px 4px',
            }}
          >
            {conversation.map((t) => (
              <div
                key={t.id}
                style={{
                  alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: 'var(--clss-radius-md)',
                  fontSize: '0.95rem',
                  lineHeight: 1.55,
                  background: t.role === 'user' ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
                  color: t.role === 'user' ? 'var(--clss-paper)' : 'var(--clss-ink-900)',
                  border: t.role === 'user' ? 'none' : '0.5px solid var(--clss-hairline-on-paper)',
                }}
              >
                {t.text}
              </div>
            ))}
            {busy && (
              <div style={{ color: 'var(--clss-ink-500)', fontSize: '0.85rem' }}>
                Vidya is thinking…
              </div>
            )}
          </div>
        )}

        {/* the chat bar */}
        <form onSubmit={submit} style={{ width: '100%', marginTop: 26, display: 'flex', gap: 10 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setMood('listening')}
            onBlur={() => setMood('idle')}
            placeholder="talk to Vidya…"
            style={{
              flex: 1,
              padding: '14px 18px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 'var(--clss-radius-sm)',
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
            {voiceOn ? '● listening' : '◦ mic'}
          </button>
          <MagneticButton variant="primary" onClick={() => {}} ariaLabel="Ask Vidya">
            ask
          </MagneticButton>
        </form>
        {voiceNote && (
          <div style={{ marginTop: 8, color: 'var(--clss-ink-500)', fontSize: '0.8rem' }}>
            voice arrives with a key
          </div>
        )}

        {/* learn-something-cool chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => !busy && void ask(c.prompt)}
              style={{
                border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                background: 'var(--clss-paper)',
                color: 'var(--clss-ink-700)',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ✧ {c.label}
            </button>
          ))}
        </div>

        {/* the two doors — the product's main features carry the aurora */}
        <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'learn' })}
            style={{ minWidth: 160 }}
          >
            learn
          </AuroraButton>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'practice' })}
            style={{ minWidth: 160 }}
          >
            practice
          </AuroraButton>
        </div>
      </div>

      <div
        style={{
          paddingBottom: 18,
          color: 'var(--clss-ink-300)',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Kbd>⌘K</Kbd> anything, anywhere
      </div>
    </div>
  );
}
