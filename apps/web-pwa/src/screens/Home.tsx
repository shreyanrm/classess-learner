'use client';

/**
 * The home — the day as one walkable thread (Concept B, productionised). Vidya arrives first
 * (swoop → land → typed greeting, once per session), then the page IS the journey: a machined
 * bezier drawn down the canvas with data-driven stops that each route somewhere real. Vidya
 * sits on the thread beside the current stop; the chat bar lives beneath the thread's start;
 * the aurora doors wait at the thread's end.
 */

import { useRegisterTarget, useVidyaBus, VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../shell/router';
import { loadMind, loadProactivity, proactiveChip } from '../store/mind';
import { useProgress } from '../store/progress';
import { SendIcon, SparkIcon, WaveformIcon } from '../ui/icons';
import { AuroraButton, cascade, fluidSpace, fluidType, Kbd, MagneticButton, rise } from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { useVidyaVoice } from '../vidya/voice';
import { deriveStops } from './home/stops';
import { Thread } from './home/Thread';
import { loadProfile } from './you/profile';

function greeting(name: string): string {
  const h = new Date().getHours();
  const part =
    h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

// Her line under the greeting — one per day (days-since-epoch rotation), never a poster slogan.
const DAILY_LINES = [
  'the day is a walk, not a list',
  'curiosity first — the rest follows',
  'one good question beats ten answers',
  'today bends to the curious',
  'the hard part is only new once',
  'mistakes are just data with feelings',
  'begin anywhere; it all connects',
  'nothing clicks until something snags',
  'confusion is the start of knowing',
  'stay for the aha, not the marks',
  'a little every day outruns a lot someday',
  'questions are doors left ajar',
  'practice makes patterns, not perfect',
  'what you notice, you never lose',
  'thinking slow is still thinking',
  'the good stuff hides one step past easy',
  'today has one idea with your name on it',
  'almost right is halfway home',
  'let the problem talk first',
  'ten quiet minutes can move a mountain',
  'the pencil remembers what the eye forgets',
  'wonder is a muscle — warm it up',
  'every expert was once this lost',
  'small steps count double here',
  'we build the bridge as we cross it',
  'slow is smooth, smooth is fast',
  'follow the itch in the question',
  'learning is remembering forward',
];

const CAPS = {
  fontSize: fluidType.eyebrow,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--clss-ink) 36%, transparent)',
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
  const { ask, busy, mood, setMood } = useVidyaChat();
  const progress = useProgress();
  const { publishPage } = useVidyaBus();
  const [draft, setDraft] = useState('');
  const [voiceNote, setVoiceNote] = useState(false);
  const voice = useVidyaVoice({ setMood });

  // The day, derived from real state — every stop routes somewhere real.
  const { stops, currentIndex } = useMemo(() => deriveStops(progress), [progress]);

  // She reads the day at code level and can point at it: every stop on the thread, and where she
  // has walked the learner to. So "what's on my screen" on home names the real stops, not a box.
  const threadRef = useRegisterTarget<HTMLDivElement>('today-thread', {
    kind: 'journey',
    label: "today's walk — the stops on the thread, each a real door",
    getSceneState: () => ({
      current: stops[currentIndex]?.title,
      stops: stops.map((s) => ({ title: s.title, meta: s.meta, kind: s.kind })),
    }),
  });

  // The proactivity dial (You settings) gates every suggestion — quiet means she waits to be asked.
  const [dial] = useState(() => loadProactivity());
  const chips = useMemo(() => {
    if (dial === 'quiet') return [];
    if (dial !== 'proactive') return CHIPS;
    const extra = proactiveChip(loadMind());
    return extra ? [...CHIPS, extra] : CHIPS;
  }, [dial]);

  // The opening — once per session, Vidya arrives before anything else exists.
  const [firstVisit] = useState(() => sessionStorage.getItem('clss-home-opened') !== '1');
  const [landed, setLanded] = useState(!firstVisit);
  const [greetShown, setGreetShown] = useState(!firstVisit ? 999 : 0);
  // Identity comes from the onboarded profile — the catalog's seed learner is only a fallback.
  const greetingText = greeting(loadProfile().name);
  useEffect(() => {
    if (!landed || greetShown >= greetingText.length) return;
    const t = setInterval(() => setGreetShown((n) => n + 1), 28);
    return () => clearInterval(t);
  }, [landed, greetShown, greetingText.length]);
  // Safety net: if the swoop is ever interrupted (tab hidden, HMR, dropped frame callback),
  // the hero must still land — the page can never stay blank past the swoop's duration.
  useEffect(() => {
    if (landed) return;
    const t = window.setTimeout(() => {
      setLanded(true);
      sessionStorage.setItem('clss-home-opened', '1');
    }, 2200);
    return () => window.clearTimeout(t);
  }, [landed]);

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

  // Starting to talk opens the conversation page — the same never-ending thread she carries.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    router.navigate({ name: 'chat' });
    void ask(text);
  };

  const now = new Date();
  // Just the date — it's obviously today, saying so is noise.
  const dateLine = now
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toLowerCase()
    .replace(/,/g, '');

  const currentKind = stops[currentIndex]?.kind;
  // Under the quiet dial she never volunteers a line — presence without a nudge.
  const vidyaLine = busy
    ? 'thinking…'
    : dial === 'quiet'
      ? 'here when you need me'
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
          color: 'color-mix(in srgb, var(--clss-ink) 58%, transparent)',
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
            color: 'var(--clss-ink)',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {greetingText.slice(0, greetShown)}
          {greetShown < greetingText.length && landed && (
            <span style={{ color: 'var(--clss-ink-faint)' }}>|</span>
          )}
        </motion.h1>
        <motion.div
          variants={rise}
          style={{
            marginTop: 8,
            fontFamily: 'Caveat, cursive',
            fontSize: 'clamp(19px, 1.6vw, 24px)',
            color: 'color-mix(in srgb, var(--clss-ink) 58%, transparent)',
          }}
        >
          {DAILY_LINES[Math.floor(now.getTime() / 86_400_000) % DAILY_LINES.length]}
        </motion.div>

        {/* the chat bar — the door; the conversation itself lives on its own page */}
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
              onMouseEnter={(e) => {
                if (!voiceOn) e.currentTarget.style.color = 'var(--clss-ink)';
              }}
              onMouseLeave={(e) => {
                if (!voiceOn) e.currentTarget.style.color = 'var(--clss-ink-faint)';
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

        {/* learn-something-cool chips — gated by the proactivity dial */}
        {chips.length > 0 && (
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
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  if (busy) return;
                  router.navigate({ name: 'chat' });
                  void ask(c.prompt);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  minHeight: 44,
                  border: 'none',
                  background: 'var(--clss-tonal)',
                  color: 'var(--clss-ink)',
                  borderRadius: 3,
                  padding: '10px 18px',
                  fontSize: fluidType.small,
                  fontWeight: 550,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.25s ease, transform 0.2s ease, color 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--clss-tonal-hover)';
                  e.currentTarget.style.color = 'var(--clss-ultramarine)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--clss-tonal)';
                  e.currentTarget.style.color = 'var(--clss-ink)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <SparkIcon size={11} /> {c.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* the doors, at hand — Learn and Practice reachable before the walk begins */}
        <motion.div
          variants={rise}
          style={{
            display: 'flex',
            gap: 12,
            marginTop: fluidSpace.md,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <AuroraButton
            size="md"
            onClick={() => router.navigate({ name: 'learn' })}
            style={{ minWidth: 132 }}
            flashDelay={firstVisit ? 1.6 : undefined}
          >
            Learn
          </AuroraButton>
          <AuroraButton
            size="md"
            onClick={() => router.navigate({ name: 'practice' })}
            style={{ minWidth: 132 }}
            flashDelay={firstVisit ? 1.75 : undefined}
          >
            Practice
          </AuroraButton>
        </motion.div>
      </motion.div>

      {/* the day, drawn — one thread, stops on it, Vidya walking it */}
      <div ref={threadRef} style={{ marginTop: fluidSpace.md }}>
        <Thread
          stops={stops}
          currentIndex={currentIndex}
          vidya={vidyaNode}
          onGo={(route) => router.navigate(route)}
        />
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
