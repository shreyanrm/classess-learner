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
import { AuroraButton, cascade, Kbd, MagneticButton, rise, SparkIcon, WaveformIcon } from '../ui/kit';
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
    h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

const CHIPS: { label: string; prompt: string }[] = [
  {
    label: 'Learn something cool',
    prompt:
      'Tell me something genuinely cool from science or math that most people never learn in school.',
  },
  {
    label: 'Open a rabbit hole',
    prompt: 'Pick a fascinating question connected to what I already know and pull me into it.',
  },
  {
    label: 'What should I do today',
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
        <ClassessLogo height={20} />
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
          ✦ Did you know
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
      <motion.div
        variants={cascade}
        initial="hidden"
        animate="show"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0 6vw',
          gap: 0,
        }}
      >
        <motion.div variants={rise}>
          <VidyaBody size={116} mood={busy ? 'thinking' : mood} gaze="pointer" label="Vidya" />
        </motion.div>
        <motion.div
          variants={rise}
          style={{
            marginTop: 28,
            fontSize: '1.7rem',
            fontWeight: 650,
            color: '#121316',
            letterSpacing: '-0.035em',
          }}
        >
          {greeting(learner.name)}
        </motion.div>
        <motion.div variants={rise} style={{ marginTop: 10, color: '#5C5E66', fontSize: '0.98rem' }}>
          Ask me anything, or take a door
        </motion.div>

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
        <motion.form
          variants={rise}
          onSubmit={submit}
          style={{
            width: '100%',
            maxWidth: 560,
            marginTop: 36,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setMood('listening')}
            onBlur={() => setMood('idle')}
            placeholder="Talk to Vidya…"
            style={{
              flex: 1,
              height: 52,
              padding: '0 18px',
              fontSize: '1rem',
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
            <WaveformIcon active={voiceOn} size={18} />
          </button>
          {draft.trim() && (
            <MagneticButton variant="primary" onClick={() => {}} ariaLabel="Ask Vidya">
              ask
            </MagneticButton>
          )}
        </motion.form>
        {voiceNote && (
          <div style={{ marginTop: 8, color: 'var(--clss-ink-500)', fontSize: '0.8rem' }}>
            voice arrives with a key
          </div>
        )}

        {/* learn-something-cool chips */}
        <motion.div
          variants={rise}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 16,
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                border: 'none',
                background: '#F1F1F5',
                color: '#121316',
                borderRadius: 3,
                padding: '10px 18px',
                fontSize: '0.87rem',
                fontWeight: 550,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.25s ease, transform 0.2s ease, color 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E8E8EE';
                e.currentTarget.style.color = '#1F35E0';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F1F1F5';
                e.currentTarget.style.color = '#121316';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <SparkIcon size={11} /> {c.label}
            </button>
          ))}
        </motion.div>

        {/* the two doors — the product's main features carry the aurora */}
        <motion.div variants={rise} style={{ display: 'flex', gap: 16, marginTop: 56 }}>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'learn' })}
            style={{ minWidth: 170 }}
          >
            Learn
          </AuroraButton>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'practice' })}
            style={{ minWidth: 170 }}
          >
            Practice
          </AuroraButton>
        </motion.div>
      </motion.div>

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
        <Kbd>⌘K</Kbd> Anything, anywhere
      </div>
    </div>
  );
}
