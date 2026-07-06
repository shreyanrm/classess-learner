'use client';

/**
 * Onboarding — Vidya-first (DESIGN.md §4). Blank paper; she bounces in, learns your name and
 * where you are in school, and a door draws itself open. Four beats, one intention each, calm
 * typed lines, spring transitions. The single pigment moment is the ultramarine wash when the
 * page becomes yours. Skippable without guilt — the account moment can complete later from You.
 */

import { useRegisterTarget, useVidyaBus, VidyaBody, type VidyaMood } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ONBOARDED_KEY } from '../App';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { MagneticButton } from '../ui/kit';
import { GradeBoardPicker } from './you/GradeBoardPicker';
import { boardName, boardSeeded, saveProfile } from './you/profile';

const TOTAL_STEPS = 4;
const spring = { type: 'spring', stiffness: 320, damping: 30 } as const;

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
      },
    });
  }, [bus, beat, name, grade, boardId]);

  const finalName = name.trim() || 'Aanya';

  const stepDone = (step: 'door_choice' | 'age_grade' | 'aha', index: number) => {
    sdk.events.record('onboarding.step.completed.v1', {
      step,
      step_index: index,
      total_steps: TOTAL_STEPS,
    });
  };

  const finish = () => {
    if (grade && boardId) saveProfile({ name: finalName, grade, boardId });
    stepDone('aha', 3);
    award('account'); // +50, blooms on home
    localStorage.setItem(ONBOARDED_KEY, '1');
    router.replace({ name: 'home' });
  };

  const skip = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    router.replace({ name: 'home' });
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
            onClick={() => setBeat((b) => Math.max(0, b - 1))}
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
                  setBeat(3);
                }}
                style={{ minWidth: 170, justifyContent: 'center' }}
              >
                that's me
              </MagneticButton>
            </motion.div>
          )}

          {/* ---- beat four: the door opens ---- */}
          {beat === 3 && (
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

      {/* skip — a door out, no guilt, nothing awarded until it completes from You */}
      {beat < 3 && (
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
