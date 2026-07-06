'use client';

/**
 * Onboarding — the crown of first impressions, recomposed as "the unlit page": type is the structure,
 * whitespace and hairline rules replace boxes, depth is a soft molten aura (light, never shadow), and
 * colour is earned (the mastered count keeps its subject hue). The door's two ways in are editorial and
 * distinct — a hero guided path with earned light, and a quieter open path below a rule — never twin
 * cards. Vidya's hand appears as her handwritten greeting and one margin note. Behaviour is untouched:
 * the four `step`s, the live vidya.turn greeting + fallback, the diagnostic scoring, and the
 * Constellation finale all work exactly as before.
 */

import {
  accent,
  canvas,
  fontFamily,
  hairline,
  ink,
  molten,
  paper,
  radius,
  space,
  typeScale,
} from '@classess/config';
import type { Sdk } from '@classess/sdk';
import { Button, Input, ProgressBar, Select, useClssStyles } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Constellation } from '../components/Constellation';
import { currentNodeId, learner, masteredCount, subject } from '../mock/appData';
import { type OnboardingStep, useRouter } from '../shell/router';

/** Ease-out signature curve; entrances honour prefers-reduced-motion. */
const EASE = [0.16, 1, 0.3, 1] as const;
const EARNED = accent[subject.accent]; // cobalt — the subject's earned hue

const FALLBACK_GREETING = "Hi — I'm Vidya. Let's find where you are. It only takes a minute.";

const GRADES = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'College / Adult',
];
const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Singapore',
  'Other',
];
const GOAL_EXAMPLES = [
  'Get confident with algebra',
  'Understand, not memorise',
  'Ace my exams',
  'Finally get fractions',
];

type DiagItem =
  | { kind: 'mcq'; prompt: string; options: string[]; answer: string }
  | { kind: 'numeric'; prompt: string; answer: string };

// Three linear-equation warm-ups — the same territory the atom lives in.
const DIAGNOSTIC: DiagItem[] = [
  {
    kind: 'mcq',
    prompt: 'Solve for x:   x + 5 = 12',
    options: ['5', '7', '17', '−7'],
    answer: '7',
  },
  { kind: 'mcq', prompt: 'Solve for x:   2x = 16', options: ['4', '8', '14', '32'], answer: '8' },
  { kind: 'numeric', prompt: 'Solve for x:   3x − 2 = 13', answer: '5' },
];

interface Draft {
  path: 'course' | 'anything' | null;
  ageGroup: 'under18' | 'adult' | null;
  grade: string;
  country: string;
  goal: string;
}

/** A thin rule — the app's structural line, replacing most card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

/** The one soft molten aura per view — earned light, positioned behind a focal block. */
function Aura() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: -60,
        top: -50,
        width: 380,
        height: 280,
        background: `radial-gradient(closest-side, ${molten.soft}, transparent 70%)`,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    />
  );
}

/** A tiny sentence-case section label (never an all-caps eyebrow on every block). */
const labelStyle = { fontSize: typeScale.caption.size, color: ink[500] } as const;

/** Staggered rise on entrance (copied from Today); a no-op when motion is reduced. */
function rise(i: number, reduced: boolean) {
  return reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: i * 0.07, ease: EASE },
      };
}

/**
 * Onboarding — four steps driven by `step`; local sub-state persists across them because the shell
 * keeps this instance mounted (only the prop changes). Vidya greets on the door and celebrates the
 * moment the map first lights.
 */
export function Onboarding({ sdk, step }: { sdk: Sdk; step: OnboardingStep }) {
  useClssStyles(); // ensures the shared .clss-focusable ring exists for the custom controls below
  const bus = useVidyaBus();
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const { publishPage } = bus;

  const [draft, setDraft] = useState<Draft>({
    path: null,
    ageGroup: null,
    grade: learner.grade,
    country: 'India',
    goal: '',
  });
  const [greeting, setGreeting] = useState<string | null>(null);

  // Diagnostic sub-state.
  const [diagIndex, setDiagIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [numericValue, setNumericValue] = useState('');
  const [done, setDone] = useState(false);

  // Targets Vidya can point at (registered at mount, i.e. on the door step where they live).
  const courseRef = useRegisterTarget<HTMLButtonElement>('onb-course', {
    kind: 'control',
    label: 'the Follow a course option',
  });
  const anythingRef = useRegisterTarget<HTMLButtonElement>('onb-anything', {
    kind: 'control',
    label: 'the Learn anything option',
  });

  // publishPage is a stable setter — safe in a mount effect (no bus in deps → no loop).
  useEffect(() => {
    publishPage({ route: 'onboarding', state: { step } });
  }, [publishPage, step]);

  // A live Vidya greeting only when the gateway is on; mock stays with the warm static line.
  useEffect(() => {
    if (step !== 'door' || sdk.config.llmMode !== 'live') return;
    let alive = true;
    sdk.llm
      .invoke(
        'vidya.turn',
        { context: { page: { route: 'onboarding' }, turn: { lastUserInput: '' } } },
        { consentTier: 'un_elevated' },
      )
      .then((res) => {
        const say = (res.output as { say?: string } | null)?.say;
        if (alive && say) setGreeting(say);
      })
      .catch(() => {
        /* graceful — the static fallback already shows */
      });
    return () => {
      alive = false;
    };
  }, [sdk, step]);

  function choosePath(path: Draft['path']) {
    setDraft((d) => ({ ...d, path }));
    bus.dispatch([{ type: 'setMood', mood: 'correct' }]);
    router.navigate({ name: 'onboarding', step: 'age' });
  }

  function goTo(next: OnboardingStep) {
    router.navigate({ name: 'onboarding', step: next });
  }

  function submitAnswer(item: DiagItem, chosen: string) {
    const ok = chosen.trim() === item.answer;
    const last = diagIndex + 1 >= DIAGNOSTIC.length;
    setCorrectCount((c) => c + (ok ? 1 : 0));
    setNumericValue('');
    if (last) {
      setDone(true);
      // Vidya's one earned moment: the map lights and she celebrates.
      bus.dispatch([
        { type: 'setMood', mood: 'celebrate' },
        { type: 'say', text: "Look at that — your map's already glowing. Let's begin." },
      ]);
    } else {
      setDiagIndex((i) => i + 1);
    }
  }

  const canBack = router.canGoBack && step !== 'door' && !done;

  return (
    <main
      style={{
        flex: 1,
        width: '100%',
        maxWidth: 940,
        margin: '0 auto',
        padding: `${space[6]}px ${space[4]}px ${space[12]}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: space[6],
      }}
    >
      {canBack && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            ← Back
          </Button>
        </div>
      )}

      {/* key={step} remounts on every step so the staggered rise replays; layout only, children animate. */}
      <div
        key={step}
        style={{ display: 'flex', flexDirection: 'column', gap: space[6], position: 'relative' }}
      >
        {step === 'door' && (
          <>
            <VidyaLine reduced={reduced}>{greeting ?? FALLBACK_GREETING}</VidyaLine>

            <motion.header
              {...rise(0, reduced)}
              style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: typeScale.display.size,
                  lineHeight: 1.02,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: ink[900],
                  maxWidth: '16ch',
                }}
              >
                Where would you like to start?
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: typeScale.bodyLg.size,
                  lineHeight: typeScale.bodyLg.lineHeight,
                  color: ink[700],
                  maxWidth: '40ch',
                }}
              >
                Two ways in. You can switch anytime.
              </p>
            </motion.header>

            {/* Primary path — the hero, with earned light. Bigger, weightier than the open path below. */}
            <motion.section {...rise(1, reduced)} style={{ position: 'relative' }}>
              <Aura />
              <Choice ref={courseRef} reduced={reduced} onClick={() => choosePath('course')}>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: space[2],
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: space[3],
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
                      <span style={labelStyle}>Guided</span>
                      <span
                        style={{
                          fontSize: typeScale.h2.size,
                          fontWeight: 600,
                          letterSpacing: '-0.025em',
                          color: ink[900],
                        }}
                      >
                        Follow a course
                      </span>
                      <span
                        style={{
                          fontSize: typeScale.body.size,
                          color: ink[700],
                          lineHeight: typeScale.body.lineHeight,
                          maxWidth: '42ch',
                        }}
                      >
                        A guided path for your board and grade — lit concept by concept as you
                        master it.
                      </span>
                    </div>
                    <div
                      aria-hidden
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: space.half,
                        height: 30,
                        flex: 'none',
                      }}
                    >
                      {[12, 20, 28].map((h) => (
                        <span
                          key={h}
                          style={{
                            width: 12,
                            height: h,
                            borderRadius: 2,
                            border: `1px solid ${ink[300]}`,
                            background: canvas,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <FootRow label="CBSE · Class 8 · Mathematics" />
                </div>
              </Choice>
            </motion.section>

            <motion.div {...rise(2, reduced)}>
              <Rule />
            </motion.div>

            {/* Open path — quieter: a smaller heading, no aura, the dashed ask-anything cue. */}
            <motion.section {...rise(3, reduced)}>
              <Choice ref={anythingRef} reduced={reduced} onClick={() => choosePath('anything')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
                  <span style={labelStyle}>Open</span>
                  <span
                    style={{
                      fontSize: typeScale.h3.size,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: ink[900],
                    }}
                  >
                    Learn anything
                  </span>
                  <span
                    style={{
                      fontSize: typeScale.body.size,
                      color: ink[700],
                      lineHeight: typeScale.body.lineHeight,
                      maxWidth: '42ch',
                    }}
                  >
                    Bring any curiosity. Classess builds a path around exactly what you want to
                    understand.
                  </span>
                  <div
                    aria-hidden
                    style={{
                      display: 'inline-flex',
                      alignSelf: 'flex-start',
                      alignItems: 'center',
                      gap: space[1],
                      marginTop: space.half,
                      padding: `${space.half}px ${space[2]}px`,
                      border: `1px dashed ${ink[300]}`,
                      borderRadius: radius.jelly,
                      color: ink[500],
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: radius.jelly,
                        background: accent.molten,
                        flex: 'none',
                      }}
                    />
                    <span style={{ fontSize: typeScale.caption.size }}>Ask anything…</span>
                  </div>
                  <FootRow label="Any topic, any depth" />
                </div>
              </Choice>
            </motion.section>
          </>
        )}

        {step === 'age' && (
          <>
            <StepHead
              reduced={reduced}
              label="About you"
              title="A little about you"
              sub="This just sets the right experience — nothing here is graded or shared."
              hero
            />
            <motion.div
              {...rise(1, reduced)}
              style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
            >
              <Field label="Age">
                <Segmented
                  reduced={reduced}
                  value={draft.ageGroup}
                  onChange={(v) => setDraft((d) => ({ ...d, ageGroup: v }))}
                  options={[
                    { value: 'under18', label: 'Under 18', sub: 'Private by default' },
                    { value: 'adult', label: '18 or older', sub: 'Full experience' },
                  ]}
                />
              </Field>
              <Select
                label="Grade"
                value={draft.grade}
                onChange={(e) => setDraft((d) => ({ ...d, grade: e.target.value }))}
                options={GRADES.map((g) => ({ value: g, label: g }))}
              />
              <Select
                label="Country"
                value={draft.country}
                onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              />
            </motion.div>
            <motion.p
              {...rise(2, reduced)}
              style={{
                margin: 0,
                fontSize: typeScale.caption.size,
                color: ink[700],
                lineHeight: typeScale.caption.lineHeight,
                maxWidth: '52ch',
              }}
            >
              {draft.ageGroup === 'adult'
                ? "Great — you'll get the full, personalised experience."
                : draft.ageGroup === 'under18'
                  ? 'Under 18: your learning stays private. Personalised coaching switches on only when a parent links their account.'
                  : 'Pick one so we set the right privacy for you.'}
            </motion.p>
            <motion.div {...rise(3, reduced)}>
              <Button size="lg" disabled={!draft.ageGroup} onClick={() => goTo('goal')}>
                Continue
              </Button>
            </motion.div>
          </>
        )}

        {step === 'goal' && (
          <>
            <StepHead
              reduced={reduced}
              label="Your aim"
              title="What are you reaching for?"
              sub="One goal is enough. It becomes your north star."
              hero
            />
            <motion.div
              {...rise(1, reduced)}
              style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
            >
              <Input
                label="Your goal"
                placeholder="e.g. Get confident with algebra"
                value={draft.goal}
                onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[1] }}>
                {GOAL_EXAMPLES.map((ex) => (
                  <Chip
                    key={ex}
                    reduced={reduced}
                    onClick={() => setDraft((d) => ({ ...d, goal: ex }))}
                  >
                    {ex}
                  </Chip>
                ))}
              </div>
            </motion.div>

            {/* Reflected goal — a hairline-ruled callout (not a card), with the molten action underline
                and Vidya's one handwritten margin note. */}
            {draft.goal.trim() !== '' && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.22, ease: EASE }}
                style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}
              >
                <Rule />
                <span style={labelStyle}>Your next self</span>
                <div
                  style={{
                    fontSize: typeScale.h3.size,
                    color: ink[900],
                    fontWeight: 500,
                    lineHeight: 1.3,
                    maxWidth: '40ch',
                  }}
                >
                  You want to{' '}
                  <span style={{ borderBottom: `2px solid ${molten.base}`, paddingBottom: 1 }}>
                    {draft.goal.trim()}
                  </span>
                  .
                </div>
                <span
                  aria-hidden
                  style={{
                    marginTop: space.half,
                    fontFamily: fontFamily.handwritten,
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    color: molten.base,
                    transform: 'rotate(-4deg)',
                    alignSelf: 'flex-start',
                  }}
                >
                  your north star — Vidya
                </span>
              </motion.div>
            )}
            <motion.div {...rise(2, reduced)}>
              <Button
                size="lg"
                disabled={draft.goal.trim() === ''}
                onClick={() => goTo('diagnostic')}
              >
                Continue
              </Button>
            </motion.div>
          </>
        )}

        {step === 'diagnostic' && !done && (
          <Quiz
            reduced={reduced}
            index={diagIndex}
            total={DIAGNOSTIC.length}
            numericValue={numericValue}
            onNumericChange={setNumericValue}
            onAnswer={submitAnswer}
          />
        )}

        {step === 'diagnostic' && done && (
          <Reveal
            reduced={reduced}
            correct={correctCount}
            total={DIAGNOSTIC.length}
            onStart={() => router.replace({ name: 'today' })}
          />
        )}
      </div>
    </main>
  );
}

// --- Small building blocks -----------------------------------------------------------------------

function StepHead({
  label,
  title,
  sub,
  hero,
  reduced,
  i = 0,
}: {
  label?: string;
  title: string;
  sub: string;
  hero?: boolean;
  reduced: boolean;
  i?: number;
}) {
  return (
    <motion.header
      {...rise(i, reduced)}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: space[2] }}
    >
      {hero && <Aura />}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: space[1],
        }}
      >
        {label && <span style={labelStyle}>{label}</span>}
        <h1
          style={{
            margin: 0,
            fontSize: typeScale.h1.size,
            lineHeight: 1.05,
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: ink[900],
            maxWidth: '16ch',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: typeScale.bodyLg.size,
            color: ink[700],
            lineHeight: typeScale.bodyLg.lineHeight,
            maxWidth: '46ch',
          }}
        >
          {sub}
        </p>
      </div>
    </motion.header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
      <span style={{ fontSize: typeScale.caption.size, color: ink[700], fontWeight: 500 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

/** A meta row that closes a choice — small label left, forward arrow right, above a hairline. */
function FootRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
      <Rule />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: ink[500],
        }}
      >
        <span style={{ fontSize: typeScale.caption.size }}>{label}</span>
        <span aria-hidden style={{ fontSize: '1.1rem', color: ink[700] }}>
          →
        </span>
      </div>
    </div>
  );
}

/** Vidya's handwritten greeting — her voice, her identity dot. Self-fades on mount. */
function VidyaLine({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE }}
      style={{ display: 'flex', alignItems: 'center', gap: space[1] }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: radius.jelly,
          background: accent.molten,
          flex: 'none',
        }}
      />
      <span
        style={{
          fontFamily: fontFamily.handwritten,
          fontSize: '1.4rem',
          color: ink[700],
          lineHeight: 1.2,
        }}
      >
        {children}
      </span>
    </motion.div>
  );
}

/** A borderless, tappable choice region. Depth is type + whitespace; hover nudges forward, never shadow. */
function Choice({
  children,
  onClick,
  reduced,
  ref,
}: {
  children: React.ReactNode;
  onClick: () => void;
  reduced: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <motion.button
      ref={ref}
      type="button"
      className="clss-focusable"
      onClick={onClick}
      whileHover={reduced ? undefined : { x: 2 }}
      whileTap={reduced ? undefined : { scale: 0.995 }}
      transition={{ duration: 0.18, ease: EASE }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: 0,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        fontFamily: fontFamily.system,
        color: ink[900],
      }}
    >
      {children}
    </motion.button>
  );
}

function Chip({
  children,
  onClick,
  reduced,
}: {
  children: React.ReactNode;
  onClick: () => void;
  reduced: boolean;
}) {
  return (
    <motion.button
      type="button"
      className="clss-focusable"
      onClick={onClick}
      whileHover={reduced ? undefined : { backgroundColor: canvas, borderColor: ink[300] }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.16, ease: EASE }}
      style={{
        padding: `${space.half}px ${space[2]}px`,
        background: paper,
        border: `1px solid ${hairline.onPaper}`,
        borderRadius: radius.jelly,
        color: ink[700],
        fontFamily: fontFamily.system,
        fontSize: typeScale.caption.size,
        cursor: 'pointer',
      }}
    >
      {children}
    </motion.button>
  );
}

interface SegOption {
  value: 'under18' | 'adult';
  label: string;
  sub: string;
}

function Segmented({
  value,
  onChange,
  options,
  reduced,
}: {
  value: 'under18' | 'adult' | null;
  onChange: (v: 'under18' | 'adult') => void;
  options: SegOption[];
  reduced: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Age group" style={{ display: 'flex', gap: space[1] }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <motion.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={sel}
            className="clss-focusable"
            onClick={() => onChange(o.value)}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: space.half,
              padding: space[2],
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: fontFamily.system,
              color: sel ? paper : ink[900],
              background: sel ? ink[900] : paper,
              border: `1px solid ${sel ? ink[900] : hairline.onPaper}`,
              borderRadius: radius.md,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: space[1] }}>
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: radius.jelly,
                  flex: 'none',
                  background: sel ? accent.molten : 'transparent',
                  border: `1px solid ${sel ? accent.molten : ink[300]}`,
                }}
              />
              <span style={{ fontSize: typeScale.body.size, fontWeight: 500 }}>{o.label}</span>
            </span>
            <span
              style={{
                fontSize: typeScale.caption.size,
                color: sel ? 'rgba(255,255,255,0.82)' : ink[500],
              }}
            >
              {o.sub}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

// --- Diagnostic ----------------------------------------------------------------------------------

function Quiz({
  reduced,
  index,
  total,
  numericValue,
  onNumericChange,
  onAnswer,
}: {
  reduced: boolean;
  index: number;
  total: number;
  numericValue: string;
  onNumericChange: (v: string) => void;
  onAnswer: (item: DiagItem, chosen: string) => void;
}) {
  const item = DIAGNOSTIC[index];
  if (!item) return null;

  return (
    <>
      <StepHead
        reduced={reduced}
        label="A quick check"
        title="A quick check"
        sub="Three questions to find your starting point. No pressure."
        hero
      />

      <motion.div
        {...rise(1, reduced)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
          <span style={{ fontSize: typeScale.caption.size, color: ink[700], fontWeight: 500 }}>
            {index + 1} of {total}
          </span>
          <ProgressBar value={index} max={total} label="Quick check progress" heightPx={4} />
        </div>

        <motion.div
          key={index}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, ease: EASE }}
          style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
        >
          <p
            style={{
              margin: 0,
              fontSize: typeScale.h2.size,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: ink[900],
            }}
          >
            {item.prompt}
          </p>

          {item.kind === 'mcq' ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Rule />
              {item.options.map((opt) => (
                <motion.button
                  key={opt}
                  type="button"
                  className="clss-focusable"
                  onClick={() => onAnswer(item, opt)}
                  whileHover={reduced ? undefined : { x: 4 }}
                  whileTap={reduced ? undefined : { scale: 0.995 }}
                  transition={{ duration: 0.16, ease: EASE }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: space[2],
                    padding: `${space[2]}px 0`,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    borderBottom: `1px solid ${hairline.onPaper}`,
                    color: ink[900],
                    fontFamily: fontFamily.system,
                    fontSize: typeScale.bodyLg.size,
                    cursor: 'pointer',
                  }}
                >
                  <span>{opt}</span>
                  <span aria-hidden style={{ fontSize: '1.1rem', color: ink[300] }}>
                    →
                  </span>
                </motion.button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (numericValue.trim()) onAnswer(item, numericValue);
              }}
              style={{ display: 'flex', gap: space[1], alignItems: 'flex-end' }}
            >
              <div style={{ flex: 1 }}>
                <Input
                  label="Your answer"
                  inputMode="numeric"
                  placeholder="Type a number"
                  value={numericValue}
                  onChange={(e) => onNumericChange(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={numericValue.trim() === ''}>
                Check
              </Button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}

function Reveal({
  reduced,
  correct,
  total,
  onStart,
}: {
  reduced: boolean;
  correct: number;
  total: number;
  onStart: () => void;
}) {
  const lit = masteredCount();
  const scoreLine =
    correct === total
      ? `All ${total} right — you're further along than you think.`
      : correct === 0
        ? "That's our starting line, and everyone begins somewhere."
        : `You got ${correct} of ${total} — a real place to build from.`;

  return (
    <>
      <VidyaLine reduced={reduced}>Look at that — your map's already glowing.</VidyaLine>
      <StepHead reduced={reduced} title="Here's where you are." sub={scoreLine} />

      {/* The earned finale — the map on the open page, lit by the one aura. */}
      <motion.section
        {...rise(1, reduced)}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: space[1] }}
      >
        <Aura />
        <span style={{ ...labelStyle, position: 'relative' }}>Your map, already glowing</span>
        <div style={{ position: 'relative' }}>
          <Constellation variant="peek" currentId={currentNodeId} />
        </div>
      </motion.section>

      <motion.p
        {...rise(2, reduced)}
        style={{
          margin: 0,
          fontSize: typeScale.body.size,
          color: ink[700],
          lineHeight: typeScale.body.lineHeight,
          maxWidth: '46ch',
        }}
      >
        <span style={{ color: EARNED, fontWeight: 600 }}>{lit} concepts</span> are already lit. The
        rest, we'll light together.
      </motion.p>
      <motion.div {...rise(3, reduced)}>
        <Button size="lg" onClick={onStart}>
          Start
        </Button>
      </motion.div>
    </>
  );
}
