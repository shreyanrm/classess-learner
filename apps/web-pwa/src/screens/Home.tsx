'use client';

/**
 * The home — the day as one walkable thread (Concept B, productionised). Vidya arrives first
 * (swoop → land → typed greeting, once per session), then the page IS the journey: a machined
 * bezier drawn down the canvas with data-driven stops that each route somewhere real. Vidya
 * sits on the thread beside the current stop; the chat bar lives beneath the thread's start;
 * the aurora doors wait at the thread's end.
 */

import { useVidyaBus, VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { learner } from '../data/catalog';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { SendIcon, SparkIcon, WaveformIcon } from '../ui/icons';
import { AuroraButton, cascade, fluidSpace, fluidType, Kbd, MagneticButton, rise } from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { useVidyaVoice } from '../vidya/voice';
import { deriveStops } from './home/stops';
import { Thread } from './home/Thread';

function greeting(name: string): string {
  const h = new Date().getHours();
  const part =
    h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

const CAPS = {
  fontSize: fluidType.eyebrow,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(18,19,22,0.36)',
} as const;

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
  const progress = useProgress();
  const { publishPage } = useVidyaBus();
  const [draft, setDraft] = useState('');
  const [voiceNote, setVoiceNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voice = useVidyaVoice({ setMood });

  // The day, derived from real state — every stop routes somewhere real.
  const { stops, currentIndex } = useMemo(() => deriveStops(progress), [progress]);

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

  useEffect(() => {
    publishPage({
      route: 'home',
      state: { title: 'today', intent: 'walk the day', stops: stops.map((s) => s.title) },
    });
  }, [publishPage, stops]);

  const voiceOn =
    voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting';
  const toggleVoice = () => {
    if (voiceOn) return voice.stop();
    void voice.start().then((state) => {
      if (state === 'unavailable') {
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

  const now = new Date();
  const dateLine = `today · ${now
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toLowerCase()
    .replace(/,/g, '')}`;

  const currentKind = stops[currentIndex]?.kind;
  const vidyaLine = busy
    ? 'thinking…'
    : currentKind === 'continue'
      ? 'right where we left it'
      : 'I marked today’s walk for you';

  // Vidya, on the journey — the Thread seats her beside the current stop.
  const vidyaNode = (
    <motion.div
      initial={firstVisit ? { x: '30vw', y: '-70vh', rotate: 16, opacity: 0 } : false}
      animate={{
        x: ['30vw', '12vw', '-2vw', '0vw'],
        y: ['-70vh', '-36vh', '-5vh', '0vh'],
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
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
    >
      <VidyaBody size={96} mood={busy ? 'thinking' : mood} gaze="pointer" label="Vidya" />
      <div
        style={{
          fontFamily: 'Caveat, cursive',
          fontSize: 20,
          fontWeight: 600,
          color: 'rgba(18,19,22,0.58)',
          textAlign: 'center',
          lineHeight: 1.15,
          maxWidth: 126,
        }}
      >
        {vidyaLine}
      </div>
    </motion.div>
  );

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* beneath the global AppHeader — nothing at the top edge */}
      <motion.div
        variants={cascade}
        initial="hidden"
        animate={landed ? 'show' : 'hidden'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `calc(64px + ${fluidSpace.lg}) ${fluidSpace.gutter} 0`,
        }}
      >
        {/* the trailhead — date, greeting, and her hand */}
        <motion.div variants={rise} style={CAPS}>
          {dateLine}
        </motion.div>
        <motion.h1
          variants={rise}
          style={{
            margin: `${fluidSpace.sm} 0 0`,
            fontSize: fluidType.display,
            fontWeight: 300,
            letterSpacing: '-0.03em',
            color: '#121316',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {greetingText.slice(0, greetShown)}
          {greetShown < greetingText.length && landed && (
            <span style={{ color: '#989AA4' }}>|</span>
          )}
        </motion.h1>
        <motion.div
          variants={rise}
          style={{
            marginTop: 8,
            fontFamily: 'Caveat, cursive',
            fontSize: 'clamp(19px, 1.6vw, 24px)',
            color: 'rgba(18,19,22,0.58)',
          }}
        >
          the day is a walk, not a list
        </motion.div>

        {conversation.length > 0 && (
          <div
            ref={scrollRef}
            style={{
              width: '100%',
              maxWidth: 640,
              maxHeight: '32vh',
              overflowY: 'auto',
              marginTop: fluidSpace.md,
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
                  fontSize: fluidType.body,
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
              <div style={{ color: 'var(--clss-ink-500)', fontSize: fluidType.small }}>
                Vidya is thinking…
              </div>
            )}
          </div>
        )}

        {/* the chat bar — a calm block beneath the thread's start */}
        <motion.form
          variants={rise}
          onSubmit={submit}
          style={{
            width: '100%',
            maxWidth: 560,
            marginTop: fluidSpace.md,
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
              onMouseEnter={(e) => {
                if (!voiceOn) e.currentTarget.style.color = '#121316';
              }}
              onMouseLeave={(e) => {
                if (!voiceOn) e.currentTarget.style.color = '#989AA4';
              }}
            >
              <WaveformIcon active={voiceOn} size={19} />
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
          <div style={{ marginTop: 8, color: 'var(--clss-ink-500)', fontSize: fluidType.small }}>
            voice arrives with a key
          </div>
        )}

        {/* learn-something-cool chips */}
        <motion.div
          variants={rise}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: fluidSpace.sm,
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
                minHeight: 44,
                border: 'none',
                background: '#F1F1F5',
                color: '#121316',
                borderRadius: 3,
                padding: '10px 18px',
                fontSize: fluidType.small,
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
      </motion.div>

      {/* the day, drawn — one thread, stops on it, Vidya walking it */}
      <div style={{ marginTop: fluidSpace.md }}>
        <Thread
          stops={stops}
          currentIndex={currentIndex}
          vidya={vidyaNode}
          onGo={(route) => router.navigate(route)}
        />
      </div>

      {/* the thread's end — wander beyond today */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: fluidSpace.md,
          padding: `0 ${fluidSpace.gutter} ${fluidSpace.sm}`,
        }}
      >
        <div style={CAPS}>wander beyond today</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'learn' })}
            style={{ minWidth: 170 }}
            flashDelay={firstVisit ? 1.6 : undefined}
          >
            Learn
          </AuroraButton>
          <AuroraButton
            size="lg"
            onClick={() => router.navigate({ name: 'practice' })}
            style={{ minWidth: 170 }}
            flashDelay={firstVisit ? 1.95 : undefined}
          >
            Practice
          </AuroraButton>
        </div>
      </div>

      <div
        style={{
          padding: `${fluidSpace.md} 0 18px`,
          color: 'var(--clss-ink-300)',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Kbd>⌘K</Kbd> Anything, anywhere
      </div>
    </div>
  );
}
