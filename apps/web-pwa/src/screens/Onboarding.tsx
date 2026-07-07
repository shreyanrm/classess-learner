'use client';

/**
 * Onboarding — a conversation, not a form (owner directive, 2026-07-07). You meet Vidya: she
 * greets you aloud (voice + typed lines), you answer in a chat-like thread with quick chips, and
 * she gathers your name, AGE (mandatory — drives the age-branch), class + board, and what you're
 * into — the likes framed as "what do you do when you're not studying" so it never feels like
 * data collection. Everything persists to the learner profile AND the mind's interests slot, so
 * her analogies reach for cricket or video games from the very first lesson. In live mode a single
 * sign-in beat is woven into the talk (phone code or Google), never bolted on as a wall. It ends
 * with the page becoming yours — one ultramarine wash — and you step in, where she flies to meet
 * you on home. A keen learner is through in under a minute.
 */

import { useRegisterTarget, useVidyaBus, VidyaBody, type VidyaMood } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ONBOARDED_KEY, SIGNIN_SOURCE_KEY } from '../App';
import { useRouter } from '../shell/router';
import { lifetimeSnapshot, rememberInterests } from '../store/mind';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { Pip, Sprout } from '../ui/cast';
import { fluidSpace, MagneticButton } from '../ui/kit';
import { MuteButton, speakLine } from '../vidya/speech';
import { GradeBoardPicker } from './you/GradeBoardPicker';
import { boardName, boardSeeded, loadProfile, saveProfile } from './you/profile';

/** Survives the Google round-trip in this tab: on return, restore the flow at the ready beat. */
const ONB_RETURN_KEY = 'clss-onb-return';
const spring = { type: 'spring', stiffness: 320, damping: 30 } as const;

/** The ages our grades actually span, offered as one-tap chips (mandatory). */
const AGES = Array.from({ length: 10 }, (_, i) => i + 9); // 9…18

/** Framed as fun, gathered as signal — Vidya's analogies reach for these. */
const LIKES = [
  'cricket',
  'football',
  'video games',
  'music',
  'movies',
  'drawing',
  'reading',
  'space',
  'coding',
  'animals',
  'dancing',
  'food',
];

type Phase = 'name' | 'age' | 'school' | 'likes' | 'auth' | 'ready';

interface Message {
  id: string;
  role: 'vidya' | 'user';
  text: string;
  onDone?: () => void;
}

/** "98765 43210" or "+91 98765 43210" → E.164; bare Indian numbers get +91. */
function normalizePhone(raw: string): string {
  const kept = raw.replace(/[^\d+]/g, '');
  return kept.startsWith('+') ? kept : `+91${kept}`;
}

/** A line that types itself, letter by letter, at a calm pace. */
function TypedLine({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) {
        window.clearInterval(interval);
        window.setTimeout(() => onDoneRef.current?.(), 240);
      }
    }, 30);
    return () => window.clearInterval(interval);
  }, [text]);

  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span style={{ color: 'var(--clss-ink-300)' }}>▏</span>}
    </span>
  );
}

const ghostButton: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--clss-ink-500)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 4,
};

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        border: 'none',
        background: selected ? 'var(--clss-ink-900)' : 'var(--clss-tonal)',
        color: selected ? 'var(--clss-paper)' : 'var(--clss-ink-700)',
        borderRadius: 3,
        padding: '10px 16px',
        fontSize: '0.92rem',
        fontFamily: 'inherit',
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      {label}
    </motion.button>
  );
}

export function Onboarding() {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { award } = useProgress();

  const [messages, setMessages] = useState<Message[]>([]);
  const [promptReady, setPromptReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('name');
  const [mood, setMood] = useState<VidyaMood>('idle');

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  // the sign-in beat (live mode only — mock mode never sees it)
  const liveAuth = !sdk.config.devAuth;
  const [authed, setAuthed] = useState(() => sdk.identity.isAuthenticated());
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [authStage, setAuthStage] = useState<'phone' | 'code'>('phone');
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  const idRef = useRef(0);
  const nid = () => `m${idRef.current++}`;
  const endRef = useRef<HTMLDivElement>(null);
  const finalName = name.trim() || 'Aanya';

  const readyRef = useRegisterTarget<HTMLDivElement>('onb-ready', {
    kind: 'card',
    label: 'the learner page that just became ready',
  });

  // --- the thread's two moves --------------------------------------------------------------------
  /** Vidya speaks a line: it types on screen and plays aloud together. */
  const say = (text: string, onDone?: () => void) => {
    setPromptReady(false);
    setMessages((m) => [
      ...m,
      { id: nid(), role: 'vidya', text, onDone: onDone ?? (() => setPromptReady(true)) },
    ]);
    void speakLine(text);
  };
  const youSaid = (text: string) => setMessages((m) => [...m, { id: nid(), role: 'user', text }]);

  // --- the beats ---------------------------------------------------------------------------------
  const toAge = (who: string) => {
    setPhase('age');
    say(`good to meet you, ${who}. how old are you?`);
  };
  const toSchool = () => {
    setPhase('school');
    say('and where are you in school — which class, and your board?');
  };
  const toLikes = () => {
    setPhase('likes');
    say("last thing, and it's the fun one — when you're not studying, what are you into?");
  };
  const toAuth = () => {
    setPhase('auth');
    say('let me keep this page safe so it follows you to any device — a quick sign in.');
  };
  const toReady = () => {
    setPhase('ready');
    setMood('celebrate');
    say(`that's everything I need. your page is ready, ${finalName}.`);
  };

  // Boot: returning from Google lands at ready; otherwise Vidya opens the conversation.
  const booted = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once boot, guarded by booted ref
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (sessionStorage.getItem(ONB_RETURN_KEY) && sdk.identity.isAuthenticated()) {
      sessionStorage.removeItem(ONB_RETURN_KEY);
      const p = loadProfile();
      setName(p.name);
      setAge(p.age ?? null);
      setGrade(p.grade);
      setBoardId(p.boardId);
      setInterests(p.interests ?? []);
      setAuthed(true);
      setPhase('ready');
      setMood('celebrate');
      say(`welcome back, ${p.name}. your page is ready.`);
      return;
    }
    say('hi — I’m Vidya', () =>
      say('I’m going to learn how you think — my favourite thing. first, what should I call you?'),
    );
  }, [sdk]);

  useEffect(() => {
    bus.publishPage({
      route: 'onboarding',
      state: {
        phase,
        name: name || undefined,
        age: age ?? undefined,
        grade: grade ?? undefined,
        board: boardId ?? undefined,
        interests: interests.length ? interests : undefined,
        signedIn: authed,
      },
    });
  }, [bus, phase, name, age, grade, boardId, interests, authed]);

  // Keep the newest line in view as the thread grows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every thread change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, promptReady, authStage]);

  // --- answers -----------------------------------------------------------------------------------
  const submitName = () => {
    const n = name.trim() || 'Aanya';
    setName(n);
    youSaid(n);
    setMood('celebrate');
    window.setTimeout(() => setMood('idle'), 800);
    toAge(n);
  };
  const pickAge = (a: number) => {
    setAge(a);
    youSaid(`${a}`);
    toSchool();
  };
  const submitSchool = () => {
    if (!grade || !boardId) return;
    youSaid(`${grade} · ${boardName(boardId)}`);
    toLikes();
  };
  const toggleLike = (l: string) =>
    setInterests((xs) => (xs.includes(l) ? xs.filter((x) => x !== l) : [...xs, l]));
  const submitLikes = () => {
    youSaid(interests.length ? interests.join(', ') : 'a bit of everything');
    if (liveAuth && !authed) toAuth();
    else toReady();
  };

  // --- the sign-in beat's moves (live mode) ------------------------------------------------------
  const sendCode = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, '').length < 10) {
      setAuthErr('that number looks short — check it once more');
      return;
    }
    setAuthBusy(true);
    setAuthErr(null);
    setMood('thinking');
    try {
      await sdk.identity.auth.requestPhoneOtp(normalized);
      setAuthStage('code');
      setMood('listening');
    } catch {
      setAuthErr('the code could not go out — check the number and try again');
      setMood('hint');
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyCode = async (candidate: string) => {
    setAuthBusy(true);
    setAuthErr(null);
    setMood('thinking');
    try {
      await sdk.identity.auth.verifyPhoneOtp(normalizePhone(phone), candidate);
      localStorage.setItem(SIGNIN_SOURCE_KEY, 'phone');
      youSaid('signed in');
      setAuthed(true);
      toReady();
    } catch {
      setAuthErr('that code did not match — take another look and try again');
      setMood('oops');
    } finally {
      setAuthBusy(false);
    }
  };

  const withGoogle = async () => {
    // The redirect leaves the page: keep what she has learned so far, mark the return path.
    if (grade && boardId) {
      saveProfile({ name: finalName, grade, boardId, age: age ?? undefined, interests });
    }
    rememberInterests(interests);
    sessionStorage.setItem(ONB_RETURN_KEY, '1');
    localStorage.setItem(SIGNIN_SOURCE_KEY, 'google');
    try {
      await sdk.identity.auth.signInWithGoogle(window.location.origin);
    } catch {
      sessionStorage.removeItem(ONB_RETURN_KEY);
      setAuthErr('Google did not open — the phone code works just as well');
    }
  };

  // --- the finish --------------------------------------------------------------------------------
  const finish = () => {
    if (grade && boardId) {
      saveProfile({ name: finalName, grade, boardId, age: age ?? undefined, interests });
    }
    rememberInterests(interests);
    // Publish the full dossier now (identity + interests) so home greets by name without waiting.
    bus.publishLifetime(lifetimeSnapshot());
    sdk.events.record('onboarding.step.completed.v1', {
      step: 'aha',
      step_index: 0,
      total_steps: 1,
    });
    award('account'); // +50, blooms on home
    localStorage.setItem(ONBOARDED_KEY, '1');
    if (liveAuth) {
      // Rebuild on the real session: providers re-key to auth.uid() and hydrate live.
      window.location.assign('/');
      return;
    }
    router.replace({ name: 'home' });
  };

  const skip = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    router.replace({ name: 'home' });
  };

  const steps: Phase[] = liveAuth
    ? ['name', 'age', 'school', 'likes', 'auth', 'ready']
    : ['name', 'age', 'school', 'likes', 'ready'];
  const stepIndex = steps.indexOf(phase);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 660,
        margin: '0 auto',
        width: '100%',
        padding: `0 ${fluidSpace.gutter}`,
      }}
    >
      {/* her header — she arrives first and stays through the whole talk */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: fluidSpace.md,
          paddingBottom: fluidSpace.sm,
        }}
      >
        <motion.div
          initial={{ scale: 0, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
        >
          <VidyaBody
            size={54}
            mood={mood}
            gaze="pointer"
            label="Vidya"
            onTap={() => {
              setMood('celebrate');
              window.setTimeout(() => setMood('idle'), 1000);
            }}
          />
        </motion.div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--clss-ink-900)' }}>
            Vidya
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {steps.map((s, i) => (
              <span
                key={s}
                style={{
                  width: i === stepIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  transition: 'width 240ms cubic-bezier(0.2,0,0,1), background 240ms',
                  background:
                    i < stepIndex
                      ? 'var(--clss-ink-700)'
                      : i === stepIndex
                        ? 'var(--clss-ultramarine)'
                        : 'var(--clss-hairline-on-paper-strong)',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <MuteButton />
        </div>
      </div>

      {/* the thread — past lines stay, faint; the newest is the live prompt */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: fluidSpace.md,
        }}
      >
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const isVidya = m.role === 'vidya';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={spring}
              style={{
                alignSelf: isVidya ? 'flex-start' : 'flex-end',
                maxWidth: '80%',
                borderRadius: 3,
                padding: '10px 14px',
                fontSize: 'clamp(0.98rem, 0.92rem + 0.4vw, 1.12rem)',
                lineHeight: 1.5,
                background: isVidya ? 'var(--clss-tonal)' : 'var(--clss-ink-900)',
                color: isVidya ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
                // older lines recede so the live prompt reads as current
                opacity: isVidya && !isLast ? 0.55 : 1,
              }}
            >
              {isVidya ? <TypedLine text={m.text} onDone={m.onDone} /> : m.text}
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* the dock — the current beat's single input, revealed once she's finished asking */}
      <div style={{ paddingBottom: fluidSpace.lg, paddingTop: fluidSpace.xs }}>
        <AnimatePresence mode="wait">
          {promptReady && phase === 'name' && (
            <motion.div
              key="d-name"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <input
                // biome-ignore lint/a11y/noAutofocus: the input is this beat's single intention
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setMood('listening')}
                onBlur={() => setMood('idle')}
                onKeyDown={(e) => e.key === 'Enter' && submitName()}
                placeholder="type your name"
                aria-label="your name"
                style={{
                  flex: 1,
                  minWidth: 180,
                  fontSize: '1.15rem',
                  fontFamily: 'inherit',
                  color: 'var(--clss-ink-900)',
                  background: 'var(--clss-tonal)',
                  border: 'none',
                  borderRadius: 3,
                  outline: 'none',
                  padding: '13px 15px',
                }}
              />
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={submitName}
                style={{ minWidth: 120, justifyContent: 'center' }}
              >
                {name.trim() ? `I’m ${name.trim()}` : 'I’m Aanya'}
              </MagneticButton>
            </motion.div>
          )}

          {promptReady && phase === 'age' && (
            <motion.div
              key="d-age"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              {AGES.map((a) => (
                <Chip key={a} label={`${a}`} selected={age === a} onClick={() => pickAge(a)} />
              ))}
            </motion.div>
          )}

          {promptReady && phase === 'school' && (
            <motion.div
              key="d-school"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              <GradeBoardPicker
                grade={grade}
                boardId={boardId}
                onGrade={setGrade}
                onBoard={setBoardId}
              />
              <MagneticButton
                size="lg"
                variant="primary"
                disabled={!grade || !boardId}
                onClick={submitSchool}
                style={{ alignSelf: 'flex-start', minWidth: 140, justifyContent: 'center' }}
              >
                that’s me
              </MagneticButton>
            </motion.div>
          )}

          {promptReady && phase === 'likes' && (
            <motion.div
              key="d-likes"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LIKES.map((l) => (
                  <Chip
                    key={l}
                    label={l}
                    selected={interests.includes(l)}
                    onClick={() => toggleLike(l)}
                  />
                ))}
              </div>
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={submitLikes}
                style={{ alignSelf: 'flex-start', minWidth: 140, justifyContent: 'center' }}
              >
                {interests.length ? 'that’s me' : 'a bit of everything'}
              </MagneticButton>
            </motion.div>
          )}

          {promptReady && phase === 'auth' && (
            <motion.div
              key="d-auth"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {authStage === 'phone' ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => setMood('listening')}
                    onBlur={() => setMood('idle')}
                    onKeyDown={(e) => e.key === 'Enter' && !authBusy && void sendCode()}
                    placeholder="your phone number"
                    aria-label="your phone number"
                    style={{
                      flex: 1,
                      minWidth: 180,
                      fontSize: '1.15rem',
                      fontFamily: 'inherit',
                      color: 'var(--clss-ink-900)',
                      background: 'var(--clss-tonal)',
                      border: 'none',
                      borderRadius: 3,
                      outline: 'none',
                      padding: '13px 15px',
                    }}
                  />
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    disabled={authBusy}
                    onClick={() => void sendCode()}
                    style={{ minWidth: 150, justifyContent: 'center' }}
                  >
                    {authBusy ? 'sending…' : 'text me the code'}
                  </MagneticButton>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    // biome-ignore lint/a11y/noAutofocus: the code is this stage's single intention
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setCode(digits);
                      if (digits.length === 6 && !authBusy) void verifyCode(digits);
                    }}
                    onFocus={() => setMood('listening')}
                    placeholder="6-digit code"
                    aria-label="the six-digit code we texted you"
                    style={{
                      flex: 1,
                      minWidth: 160,
                      fontSize: '1.4rem',
                      letterSpacing: '0.3em',
                      fontFamily: 'inherit',
                      color: 'var(--clss-ink-900)',
                      background: 'var(--clss-tonal)',
                      border: 'none',
                      borderRadius: 3,
                      outline: 'none',
                      padding: '13px 15px',
                    }}
                  />
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    disabled={authBusy || code.length < 6}
                    onClick={() => void verifyCode(code)}
                    style={{ minWidth: 140, justifyContent: 'center' }}
                  >
                    {authBusy ? 'checking…' : 'that’s my code'}
                  </MagneticButton>
                </div>
              )}
              {authErr && (
                <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>{authErr}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, height: 1, background: 'var(--clss-hairline-on-paper)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--clss-ink-300)' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'var(--clss-hairline-on-paper)' }} />
              </div>
              <MagneticButton
                size="md"
                variant="ghost"
                disabled={authBusy}
                onClick={() => void withGoogle()}
                style={{ alignSelf: 'flex-start', minWidth: 190, justifyContent: 'center' }}
              >
                continue with Google
              </MagneticButton>
            </motion.div>
          )}

          {phase === 'ready' && (
            <motion.div
              key="d-ready"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
            >
              <div
                ref={readyRef}
                style={{ position: 'relative', width: '100%', maxWidth: 340, height: 176 }}
              >
                <svg
                  width="100%"
                  height="176"
                  viewBox="0 0 340 176"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <motion.rect
                    x="0.5"
                    y="0.5"
                    width="339"
                    height="175"
                    rx="3"
                    stroke="var(--clss-ink-900)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: [0.2, 0, 0, 1], delay: 0.15 }}
                  />
                </svg>
                {/* the one pigment moment: an ultramarine wash sweeps the page */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, ease: [0.2, 0, 0, 1], delay: 1.1 }}
                  style={{
                    position: 'absolute',
                    inset: 1,
                    borderRadius: 'var(--clss-radius-sm)',
                    background: 'var(--clss-ultramarine-wash)',
                    transformOrigin: 'left',
                  }}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.6 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textAlign: 'center',
                    padding: '0 16px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>
                    {finalName}
                    {age ? ` · ${age}` : ''} · {grade ?? 'Class 8'} ·{' '}
                    {boardId ? boardName(boardId) : 'CBSE'}
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: 'var(--clss-ink-900)',
                    }}
                  >
                    your page is ready
                  </div>
                  {boardId && !boardSeeded(boardId) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--clss-ink-500)' }}>
                      your board’s world arrives with you
                    </div>
                  )}
                </motion.div>
                {/* two of the cast are already waiting inside — the page comes furnished */}
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 1.9 }}
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 3,
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <Sprout size={30} seed={1} />
                  <Pip size={40} mood="delighted" seed={2} />
                </motion.div>
              </div>
              <AnimatePresence>
                {promptReady && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={spring}
                  >
                    <MagneticButton
                      size="lg"
                      variant="primary"
                      onClick={finish}
                      style={{ minWidth: 150, justifyContent: 'center' }}
                    >
                      step in
                    </MagneticButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* skip — a quiet door out, no guilt; live mode keeps the flow (a page needs its owner) */}
        {!liveAuth && phase !== 'ready' && (
          <button
            type="button"
            onClick={skip}
            style={{ ...ghostButton, marginTop: 14, display: 'block' }}
          >
            skip for now
          </button>
        )}
      </div>
    </div>
  );
}
