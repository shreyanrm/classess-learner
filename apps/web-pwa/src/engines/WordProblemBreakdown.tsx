'use client';

/**
 * WordProblemBreakdown — depth on demand for any word problem (DESIGN.md §9). A wall of words is
 * dissected into four panes that reveal in sequence, one idea at a time: GIVEN (what you know),
 * FIND (what you're after), PLAN (the path), SOLVE (the working, line by line, landing on the
 * answer). Nothing is dumped at once — the learner taps to uncover the next pane, so the *method*
 * of reading a problem is what's taught, not just the answer.
 *
 * Registers as a Wobo scene target she can advance (applyTutorAction: { next } / { revealAll }).
 * Reduced-motion + mute aware; both themes; no new deps.
 */

import { useRegisterTarget, useWoboBus } from '@classess/wobo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { BarState } from '../screens/course/shared';
import { CardBody, cardTitle, lead, rgba, whisper } from '../screens/course/shared';
import { hueForTopic } from '../ui/hues';
import { sfx } from '../ui/sound';

// --- The spec ------------------------------------------------------------------------------------

export interface SolveStep {
  expr: string;
  note?: string;
}

export interface WordProblemSpec {
  id: string;
  title: string;
  /** The problem statement, in full. */
  problem: string;
  given: string[];
  find: string;
  plan: string[];
  solve: SolveStep[];
  answer: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter(str) : []);

export function parseWordProblem(raw: unknown): WordProblemSpec | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.artifact) ? raw.artifact : raw;
  if (raw.verified === false || src.verified === false) return null;
  const given = strs(src.given);
  const plan = strs(src.plan);
  const solve = (Array.isArray(src.solve) ? src.solve : [])
    .filter((s): s is Record<string, unknown> => isRecord(s) && str(s.expr))
    .map((s) => ({ expr: s.expr as string, note: str(s.note) ? (s.note as string) : undefined }));
  if (!str(src.problem) || !str(src.find) || !str(src.answer)) return null;
  if (given.length === 0 || plan.length === 0 || solve.length === 0) return null;
  return {
    id: str(src.id) ? src.id : 'wordproblem',
    title: str(src.title) ? src.title : 'break it down',
    problem: src.problem,
    given,
    find: src.find,
    plan,
    solve,
    answer: src.answer,
  };
}

// --- Panes ----------------------------------------------------------------------------------------

type PaneKey = 'given' | 'find' | 'plan' | 'solve';
const PANES: { key: PaneKey; label: string; hint: string }[] = [
  { key: 'given', label: 'given', hint: 'what the problem hands you' },
  { key: 'find', label: 'find', hint: 'what you are actually after' },
  { key: 'plan', label: 'plan', hint: 'the path from one to the other' },
  { key: 'solve', label: 'solve', hint: 'the working, line by line' },
];

function Pane({
  label,
  hint,
  hue,
  open,
  children,
}: {
  label: string;
  hint: string;
  hue: string;
  open: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      style={{
        border: `0.5px solid ${open ? rgba(hue, 0.5) : 'var(--clss-hairline-on-paper)'}`,
        borderRadius: 3,
        padding: '14px 16px',
        background: open ? rgba(hue, 0.04) : 'var(--clss-paper)',
        transition: 'border-color 0.3s ease, background 0.3s ease',
        opacity: open ? 1 : 0.55,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...whisper, color: open ? hue : 'var(--clss-ink-500)' }}>{label}</span>
        {!open && (
          <span style={{ ...whisper, opacity: 0.7, textTransform: 'none', letterSpacing: 0 }}>
            {hint}
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.2, 0, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 10 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- The breakdown --------------------------------------------------------------------------------

export function WordProblemBreakdown({
  spec,
  hue = hueForTopic(''),
  setBar,
  onDone,
}: {
  spec: WordProblemSpec;
  hue?: string;
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  const bus = useWoboBus();
  const reduced = useReducedMotion();
  // revealed = number of panes uncovered (0..4). answer shows once solve is open.
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= PANES.length;

  const next = () => {
    if (done) return;
    setRevealed((r) => r + 1);
    sfx.reveal();
  };
  const revealAll = () => {
    setRevealed(PANES.length);
    sfx.reveal();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: next/revealAll close over the live reveal count
  useEffect(() => {
    setBar({
      primary: done
        ? { label: 'continue', onClick: onDone }
        : {
            label: revealed === 0 ? 'start the breakdown' : `reveal ${PANES[revealed]?.label}`,
            onClick: next,
          },
    });
  }, [revealed, done, setBar, onDone]);

  useRegisterTarget<HTMLDivElement>(`wordproblem-${spec.id}`, {
    kind: 'word-problem',
    label: `word-problem breakdown: ${spec.title}`,
    getSceneState: () => ({
      title: spec.title,
      find: spec.find,
      revealed: PANES.slice(0, revealed).map((p) => p.key),
      answer: done ? spec.answer : undefined,
    }),
    getValidActions: () =>
      done ? ['continue'] : [`reveal the ${PANES[revealed]?.label} pane`, 'reveal all'],
    applyTutorAction: (patch) => {
      if (patch.revealAll === true) return revealAll();
      if (patch.next === true) return next();
    },
  });

  useEffect(() => {
    bus.publishCanvas({
      nodeId: `wordproblem-${spec.id}`,
      steps: [
        `word problem: ${spec.title}`,
        `finding: ${spec.find}`,
        `${revealed}/${PANES.length} panes revealed`,
        ...(done ? [`answer: ${spec.answer}`] : []),
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, revealed, done]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  const isOpen = (key: PaneKey) => PANES.findIndex((p) => p.key === key) < revealed;

  return (
    <CardBody maxWidth={620} center={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={whisper}>reading a problem, the method</div>
          <div style={{ ...cardTitle, marginTop: 8 }}>{spec.title}</div>
        </div>

        {/* the problem, always visible — the wall of words we dissect */}
        <div
          style={{
            ...lead,
            color: 'var(--clss-ink-900)',
            padding: '14px 16px',
            borderLeft: `2px solid ${hue}`,
            background: 'var(--clss-tonal)',
            borderRadius: 3,
          }}
        >
          {spec.problem}
        </div>

        <Pane label="given" hint={PANES[0]?.hint ?? ''} hue={hue} open={isOpen('given')}>
          <ul
            style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {spec.given.map((g) => (
              <li
                key={g}
                style={{ fontSize: '0.98rem', color: 'var(--clss-ink-900)', lineHeight: 1.5 }}
              >
                {g}
              </li>
            ))}
          </ul>
        </Pane>

        <Pane label="find" hint={PANES[1]?.hint ?? ''} hue={hue} open={isOpen('find')}>
          <div
            style={{
              fontSize: '1.02rem',
              fontWeight: 520,
              color: 'var(--clss-ink-900)',
              lineHeight: 1.5,
            }}
          >
            {spec.find}
          </div>
        </Pane>

        <Pane label="plan" hint={PANES[2]?.hint ?? ''} hue={hue} open={isOpen('plan')}>
          <ol
            style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {spec.plan.map((p) => (
              <li
                key={p}
                style={{ fontSize: '0.98rem', color: 'var(--clss-ink-900)', lineHeight: 1.5 }}
              >
                {p}
              </li>
            ))}
          </ol>
        </Pane>

        <Pane label="solve" hint={PANES[3]?.hint ?? ''} hue={hue} open={isOpen('solve')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {spec.solve.map((s, i) => (
              <motion.div
                // biome-ignore lint/suspicious/noArrayIndexKey: solve steps are positional
                key={i}
                initial={reduced ? undefined : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <div
                  style={{
                    fontSize: '1.08rem',
                    fontWeight: 540,
                    color: 'var(--clss-ink-900)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s.expr}
                </div>
                {s.note && (
                  <div style={{ fontSize: '0.88rem', color: 'var(--clss-ink-700)' }}>{s.note}</div>
                )}
              </motion.div>
            ))}
            {done && (
              <motion.div
                initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: reduced ? 0 : spec.solve.length * 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 24,
                }}
                style={{
                  marginTop: 4,
                  padding: '12px 16px',
                  border: '1px solid var(--clss-feedback-correct)',
                  background: 'var(--clss-feedback-correctSoft)',
                  borderRadius: 3,
                  fontSize: '1.05rem',
                  fontWeight: 560,
                  color: 'var(--clss-ink-900)',
                }}
              >
                <span style={{ ...whisper, color: hue, marginRight: 10 }}>answer</span>
                {spec.answer}
              </motion.div>
            )}
          </div>
        </Pane>
      </div>
    </CardBody>
  );
}

// --- A hand-authored demo -------------------------------------------------------------------------

export const WORDPROBLEM_DEMO: WordProblemSpec = {
  id: 'demo-wordproblem',
  title: 'a ladder against a wall',
  problem:
    'a 5 m ladder leans against a wall, its foot 3 m from the base. how high up the wall does the ladder reach?',
  given: ['the ladder is 5 m long (the hypotenuse)', 'its foot is 3 m from the wall (the base)'],
  find: 'the height up the wall the ladder reaches (the vertical side).',
  plan: [
    'the wall, ground, and ladder form a right triangle.',
    'use Pythagoras: base² + height² = hypotenuse².',
    'rearrange for the height and compute.',
  ],
  solve: [
    { expr: '3² + h² = 5²', note: 'base squared plus height squared equals the ladder squared.' },
    { expr: '9 + h² = 25' },
    { expr: 'h² = 16', note: 'subtract 9 from both sides.' },
    { expr: 'h = 4', note: 'take the positive root — a height is never negative.' },
  ],
  answer: 'the ladder reaches 4 m up the wall.',
};
