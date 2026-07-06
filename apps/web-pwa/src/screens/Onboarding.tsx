'use client';

/**
 * Onboarding — Vidya-first (DESIGN.md §4). Blank paper; she bounces in, learns your name and
 * where you are in school, and a door draws itself open. One intention per beat, calm typed
 * lines, spring transitions. The single pigment moment is the ultramarine wash when the page
 * becomes yours. In live mode (DEV_AUTH=false) she adds one beat of her own before the door:
 * sign in — phone → code → verified, or Google — introduced warmly, never as an auth wall.
 * Mock mode keeps the four-beat flow and stays skippable without guilt.
 */

import { useRegisterTarget, useVidyaBus, VidyaBody, type VidyaMood } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ONBOARDED_KEY, SIGNIN_SOURCE_KEY } from '../App';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { Pip, Sprout } from '../ui/cast';
import { MagneticButton } from '../ui/kit';
import { GradeBoardPicker } from './you/GradeBoardPicker';
import { boardName, boardSeeded, loadProfile, saveProfile } from './you/profile';

const TOTAL_STEPS = 4;
/** Survives the Google round-trip in this tab: on return, restore the flow at the door beat. */
const ONB_RETURN_KEY = 'clss-onb-return';
const AUTH_BEAT = 3;
const DOOR_BEAT = 4;
const spring = { type: 'spring', stiffness: 320, damping: 30 } as const;

/** "98765 43210" or "+91 98765 43210" → E.164; bare Indian numbers get +91. */
function normalizePhone(raw: string): string {
  const kept = raw.replace(/[^\d+]/g, '');
  return kept.startsWith('+') ? kept : `+91${kept}`;
}

/** A line that types itself, letter by letter, at a calm pace. */
function TypedLine({
  text,
  startDelay = 0,
  onDone,
  style,
}: {
  text: string;
  startDelay?: number;
  onDone?: () => void;
  style?: React.CSSProperties;
}) {
  const [n, setN] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) {
          window.clearInterval(interval);
          window.setTimeout(() => onDoneRef.current?.(), 260);
        }
      }, 34);
    }, startDelay);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [text, startDelay]);

  return (
    <div style={{ minHeight: '1.6em', ...style }}>
      {text.slice(0, n)}
      {n > 0 && n < text.length && <span style={{ color: 'var(--clss-ink-300)' }}>▏</span>}
    </div>
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

export function Onboarding() {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { award } = useProgress();

  const [beat, setBeat] = useState(0);
  const [mood, setMood] = useState<VidyaMood>('idle');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);

  // beat one line choreography
  const [lineOneDone, setLineOneDone] = useState(false);
  const [lineTwoDone, setLineTwoDone] = useState(false);

  // the sign-in beat (live mode only — mock mode never sees it)
  const liveAuth = !sdk.config.devAuth;
  const [authed, setAuthed] = useState(() => sdk.identity.isAuthenticated());
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [authStage, setAuthStage] = useState<'phone' | 'code'>('phone');
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const totalSteps = liveAuth ? TOTAL_STEPS + 1 : TOTAL_STEPS;

  // Returning from Google: the session arrived with the redirect — pick the flow up at the door.
  useEffect(() => {
    if (!sessionStorage.getItem(ONB_RETURN_KEY)) return;
    sessionStorage.removeItem(ONB_RETURN_KEY);
    if (!sdk.identity.isAuthenticated()) return;
    const p = loadProfile();
    setName(p.name);
    setGrade(p.grade);
    setBoardId(p.boardId);
    setAuthed(true);
    setBeat(DOOR_BEAT);
  }, [sdk]);

  const beginRef = useRegisterTarget<HTMLDivElement>('onb-begin', {
    kind: 'button',
    label: 'the door that begins onboarding',
  });
  const readyRef = useRegisterTarget<HTMLDivElement>('onb-ready', {
    kind: 'card',
    label: 'the learner page that just became ready',
  });

  useEffect(() => {
    bus.publishPage({
      route: 'onboarding',
      state: {
        beat,
        name: name || undefined,
        grade: grade ?? undefined,
        board: boardId ?? undefined,
        signedIn: authed,
      },
    });
  }, [bus, beat, name, grade, boardId, authed]);

  const finalName = name.trim() || 'Aanya';

  const stepDone = (step: 'door_choice' | 'age_grade' | 'aha', index: number) => {
    sdk.events.record('onboarding.step.completed.v1', {
      step,
      step_index: index,
      total_steps: totalSteps,
    });
  };

  const finish = () => {
    if (grade && boardId) saveProfile({ name: finalName, grade, boardId });
    stepDone('aha', totalSteps - 1);
    award('account'); // +50, blooms on home
    localStorage.setItem(ONBOARDED_KEY, '1');
    if (liveAuth) {
      // Rebuild the app on the real session: providers re-key to auth.uid() and hydrate live.
      window.location.assign('/');
      return;
    }
    router.replace({ name: 'home' });
  };

  const skip = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    router.replace({ name: 'home' });
  };

  // --- the sign-in beat's moves (live mode) --------------------------------
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
      setAuthed(true);
      setMood('celebrate');
      window.setTimeout(() => setBeat(DOOR_BEAT), 900);
    } catch {
      setAuthErr('that code did not match — take another look and try again');
      setMood('oops');
    } finally {
      setAuthBusy(false);
    }
  };

  const withGoogle = async () => {
    // The redirect leaves the page: keep what she has learned so far, and mark the return path.
    if (grade && boardId) saveProfile({ name: finalName, grade, boardId });
    sessionStorage.setItem(ONB_RETURN_KEY, '1');
    localStorage.setItem(SIGNIN_SOURCE_KEY, 'google');
    try {
      await sdk.identity.auth.signInWithGoogle(window.location.origin);
    } catch {
      sessionStorage.removeItem(ONB_RETURN_KEY);
      setAuthErr('Google did not open — the phone code works just as well');
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px 84px',
      }}
    >
      {/* back — between beats, never out of the flow */}
      <AnimatePresence>
        {beat > 0 && (
          <motion.button
            type="button"
            onClick={() =>
              // an already-signed-in door steps back over the sign-in beat, never into it
              setBeat((b) => Math.max(0, b === DOOR_BEAT && (!liveAuth || authed) ? 2 : b - 1))
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ ...ghostButton, position: 'fixed', top: 20, left: 24 }}
          >
            ← back
          </motion.button>
        )}
      </AnimatePresence>

      {/* Vidya — she arrives first and never leaves */}
      <motion.div
        initial={{ scale: 0, y: 48, opacity: 0 }}
        animate={{ scale: beat === 0 ? 1 : 0.6, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 17, delay: 0.15 }}
        style={{ marginBottom: beat === 0 ? 8 : -14 }}
      >
        <VidyaBody
          size={120}
          mood={mood}
          gaze="pointer"
          label="Vidya"
          onTap={() => {
            setMood('celebrate');
            window.setTimeout(() => setMood('idle'), 1100);
          }}
        />
      </motion.div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <AnimatePresence mode="wait">
          {/* ---- beat one: hello ---- */}
          {beat === 0 && (
            <motion.div
              key="hello"
              initial={{ opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={spring}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                marginTop: 22,
              }}
            >
              <TypedLine
                text="hi — I'm Vidya"
                startDelay={950}
                onDone={() => setLineOneDone(true)}
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--clss-ink-900)',
                  textAlign: 'center',
                }}
              />
              {lineOneDone && (
                <TypedLine
                  text="I'm going to learn how you think. that's my favourite thing to do"
                  startDelay={420}
                  onDone={() => setLineTwoDone(true)}
                  style={{
                    fontSize: '1.02rem',
                    color: 'var(--clss-ink-500)',
                    textAlign: 'center',
                    lineHeight: 1.6,
                    maxWidth: 400,
                  }}
                />
              )}
              <motion.div
                ref={beginRef}
                initial={false}
                animate={{ opacity: lineTwoDone ? 1 : 0, y: lineTwoDone ? 0 : 10 }}
                transition={spring}
                style={{ marginTop: 30, pointerEvents: lineTwoDone ? 'auto' : 'none' }}
              >
                <MagneticButton
                  size="lg"
                  variant="primary"
                  onClick={() => {
                    stepDone('door_choice', 0);
                    setBeat(1);
                  }}
                  style={{ minWidth: 170, justifyContent: 'center' }}
                >
                  let's begin
                </MagneticButton>
              </motion.div>
            </motion.div>
          )}

          {/* ---- beat two: your name ---- */}
          {beat === 1 && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={spring}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                marginTop: 26,
              }}
            >
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--clss-ink-900)',
                }}
              >
                what should I call you
              </div>
              <input
                // biome-ignore lint/a11y/noAutofocus: the input is this beat's single intention
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setMood('listening')}
                onBlur={() => setMood('idle')}
                onKeyDown={(e) => e.key === 'Enter' && setBeat(2)}
                placeholder="Aanya"
                aria-label="your name"
                style={{
                  marginTop: 18,
                  width: '100%',
                  maxWidth: 360,
                  fontSize: '2rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  color: 'var(--clss-ink-900)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  outline: 'none',
                  padding: '6px 4px 12px',
                }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-300)' }}>
                you can change this any time
              </div>
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={() => setBeat(2)}
                style={{ marginTop: 26, minWidth: 170, justifyContent: 'center' }}
              >
                {name.trim() ? `I'm ${name.trim()}` : "I'm Aanya"}
              </MagneticButton>
            </motion.div>
          )}

          {/* ---- beat three: where you are in school ---- */}
          {beat === 2 && (
            <motion.div
              key="school"
              initial={{ opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={spring}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 26,
                marginTop: 26,
              }}
            >
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--clss-ink-900)',
                }}
              >
                where are you in school
              </div>
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
                onClick={() => {
                  stepDone('age_grade', 2);
                  setBeat(liveAuth && !authed ? AUTH_BEAT : DOOR_BEAT);
                }}
                style={{ minWidth: 170, justifyContent: 'center' }}
              >
                that's me
              </MagneticButton>
            </motion.div>
          )}

          {/* ---- the sign-in beat (live mode): her introduction, never an auth wall ---- */}
          {beat === AUTH_BEAT && (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={spring}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                marginTop: 26,
              }}
            >
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--clss-ink-900)',
                }}
              >
                let's make this page truly yours
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--clss-ink-500)',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  maxWidth: 380,
                }}
              >
                sign in once and I'll keep your page safe — it follows you to any device you open
              </div>

              {authStage === 'phone' ? (
                <>
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
                      marginTop: 18,
                      width: '100%',
                      maxWidth: 320,
                      fontSize: '1.4rem',
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      color: 'var(--clss-ink-900)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '0.5px solid var(--clss-hairline-on-paper-strong)',
                      outline: 'none',
                      padding: '6px 4px 12px',
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-300)' }}>
                    we'll text you a six-digit code — your number stays private
                  </div>
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    disabled={authBusy}
                    onClick={() => void sendCode()}
                    style={{ marginTop: 22, minWidth: 190, justifyContent: 'center' }}
                  >
                    {authBusy ? 'sending…' : 'text me the code'}
                  </MagneticButton>
                </>
              ) : (
                <>
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
                    placeholder="······"
                    aria-label="the six-digit code we texted you"
                    style={{
                      marginTop: 18,
                      width: '100%',
                      maxWidth: 240,
                      fontSize: '2rem',
                      fontWeight: 500,
                      letterSpacing: '0.35em',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      color: 'var(--clss-ink-900)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '0.5px solid var(--clss-hairline-on-paper-strong)',
                      outline: 'none',
                      padding: '6px 4px 12px',
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-300)' }}>
                    sent to {normalizePhone(phone)} ·{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStage('phone');
                        setCode('');
                        setAuthErr(null);
                      }}
                      style={{ ...ghostButton, padding: 0, fontSize: '0.85rem' }}
                    >
                      change number
                    </button>
                  </div>
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    disabled={authBusy || code.length < 6}
                    onClick={() => void verifyCode(code)}
                    style={{ marginTop: 22, minWidth: 190, justifyContent: 'center' }}
                  >
                    {authBusy ? 'checking…' : "that's my code"}
                  </MagneticButton>
                </>
              )}

              {authErr && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', marginTop: 6 }}
                >
                  {authErr}
                </motion.div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 20,
                  width: '100%',
                  maxWidth: 320,
                }}
              >
                <span style={{ flex: 1, height: 1, background: 'var(--clss-hairline-on-paper)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--clss-ink-300)' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'var(--clss-hairline-on-paper)' }} />
              </div>
              <MagneticButton
                size="md"
                variant="ghost"
                disabled={authBusy}
                onClick={() => void withGoogle()}
                style={{ marginTop: 4, minWidth: 190, justifyContent: 'center' }}
              >
                continue with Google
              </MagneticButton>
            </motion.div>
          )}

          {/* ---- the last beat: the door opens ---- */}
          {beat === DOOR_BEAT && (
            <motion.div
              key="door"
              initial={{ opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={spring}
              onAnimationComplete={() => setMood('celebrate')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 30,
                marginTop: 30,
              }}
            >
              <div ref={readyRef} style={{ position: 'relative', width: 320, height: 190 }}>
                {/* the hairline door draws itself */}
                <svg
                  width="320"
                  height="190"
                  viewBox="0 0 320 190"
                  fill="none"
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <motion.rect
                    x="0.5"
                    y="0.5"
                    width="319"
                    height="189"
                    rx="3"
                    stroke="var(--clss-ink-900)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.05, ease: [0.2, 0, 0, 1], delay: 0.2 }}
                  />
                </svg>
                {/* the one pigment moment: an ultramarine wash sweeps the page */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, ease: [0.2, 0, 0, 1], delay: 1.25 }}
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
                  transition={{ duration: 0.5, delay: 1.8 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>
                    {finalName} · {grade ?? 'Class 8'} · {boardId ? boardName(boardId) : 'CBSE'}
                  </div>
                  <div
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 500,
                      letterSpacing: '-0.02em',
                      color: 'var(--clss-ink-900)',
                    }}
                  >
                    your page is ready
                  </div>
                  {boardId && !boardSeeded(boardId) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--clss-ink-500)' }}>
                      your board's world arrives with you
                    </div>
                  )}
                </motion.div>
                {/* two of the cast are already waiting inside — the page comes furnished */}
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 2.05 }}
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 3,
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <Sprout size={32} seed={1} />
                  <Pip size={42} mood="delighted" seed={2} />
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 2.1 }}
              >
                <MagneticButton
                  size="lg"
                  variant="primary"
                  onClick={finish}
                  style={{ minWidth: 170, justifyContent: 'center' }}
                >
                  step in
                </MagneticButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* skip — a door out, no guilt, nothing awarded until it completes from You.
          Live mode keeps the flow: the page cannot exist without its owner signed in. */}
      {!liveAuth && beat < AUTH_BEAT && (
        <button
          type="button"
          onClick={skip}
          style={{ ...ghostButton, position: 'fixed', bottom: 22 }}
        >
          skip for now
        </button>
      )}
    </div>
  );
}
