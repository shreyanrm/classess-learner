'use client';

/**
 * The home — radically minimal (DESIGN.md §7). On landing the learner sees almost nothing:
 * Vidya expanded into a full conversation, a did-you-know whisper top right, the you affordance
 * top left, and two doors. That emptiness is the premium signal.
 */

import { VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { learner } from '../data/catalog';
import { useRouter } from '../shell/router';
import { MicBloomIcon, SendIcon, SparkIcon } from '../ui/icons';
import { AuroraButton, cascade, Kbd, MagneticButton, rise } from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { useVidyaVoice } from '../vidya/voice';

// did-you-know moved into the AppHeader — it owns all top chrome now

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
  const [voiceNote, setVoiceNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voice = useVidyaVoice({ setMood });
  // The opening — once per session, Vidya arrives before anything else exists.
  const [firstVisit] = useState(() => sessionStorage.getItem('clss-home-opened') !== '1');
  const [landed, setLanded] = useState(!firstVisit);
  const [greetShown, setGreetShown] = useState(!firstVisit ? 999 : 0);
  const greetingText = greeting(learner.name);
  useEffect(() => {
    if (!landed || greetShown >= greetingText.length) return;
    const t = setInterval(() => setGreetShown((n) => n + 1), 28);
    return () => clearInterval(t);
  }, [landed, greetShown, greetingText.length]);
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
      {/* Vidya, front door */}
      <motion.div
        variants={cascade}
        initial="hidden"
        animate={landed ? 'show' : 'hidden'}
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
        <motion.div
          initial={firstVisit ? { x: '36vw', y: '-62vh', rotate: 16, opacity: 0 } : false}
          animate={{
            x: ['36vw', '10vw', '-3vw', '0vw'],
            y: ['-62vh', '-30vh', '-5vh', '0vh'],
            rotate: [16, 9, -7, 0],
            opacity: [0, 1, 1, 1],
          }}
          transition={
            firstVisit
              ? { duration: 1.5, times: [0, 0.45, 0.8, 1], ease: [0.3, 0.9, 0.4, 1] }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (!landed) {
              setLanded(true);
              sessionStorage.setItem('clss-home-opened', '1');
              setMood('celebrate');
              window.setTimeout(() => setMood('idle'), 1100);
            }
          }}
        >
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
          {greetingText.slice(0, greetShown)}
          {greetShown < greetingText.length && landed && (
            <span style={{ color: '#989AA4' }}>|</span>
          )}
        </motion.div>
        <motion.div
          variants={rise}
          style={{ marginTop: 10, color: '#5C5E66', fontSize: '0.98rem' }}
        >
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
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setMood('listening')}
              onBlur={() => setMood('idle')}
              placeholder="Talk to Vidya…"
              style={{
                flex: 1,
                height: 52,
                padding: '0 52px 0 18px',
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
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                display: 'grid',
                placeItems: 'center',
                border: 'none',
                background: 'transparent',
                color: voiceOn ? '#FF5A1F' : '#989AA4',
                cursor: 'pointer',
                transition: 'color 0.25s ease',
              }}
              onMouseEnter={(e) => {
                if (!voiceOn) e.currentTarget.style.color = '#121316';
              }}
              onMouseLeave={(e) => {
                if (!voiceOn) e.currentTarget.style.color = '#989AA4';
              }}
            >
              <MicBloomIcon active={voiceOn} size={19} />
            </button>
          </div>
          {/* the ask affordance exists only once there is something to ask */}
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
            flashDelay={firstVisit ? 1.1 : undefined}
          >
            Learn
          </AuroraButton>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'practice' })}
            style={{ minWidth: 170 }}
            flashDelay={firstVisit ? 1.45 : undefined}
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
