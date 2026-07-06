'use client';

/**
 * The practice run — three quick items, number-pad entry, honest events. A wrong answer never
 * shames: it detonates the misconception (DESIGN.md §9) — the learner's own number is substituted
 * back into the equation, the equality visibly breaks, the correct move replays (never the final
 * answer), and the item returns later in the run with an FSRS retry framing.
 */

import { type PracticeItem, reviewCard } from '@classess/sdk';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgress } from '../../store/progress';
import { useSdk } from '../../store/sdk';
import { useVidyaChat } from '../../vidya/chat';
import { firstMove, fmt, linearize } from './equations';
import type { BarState } from './shared';
import { CardBody, cardTitle, lead, whisper } from './shared';

const PAD_KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['−', '0', '⌫'],
] as const;

function Detonation({ item, theirs }: { item: PracticeItem; theirs: number }) {
  const lin = linearize(item.equation);
  if (!lin) return null;
  const lhsVal = lin.lhs(theirs);
  const rhsVal = lin.rhs(theirs);
  const lhsSrc = item.equation.split('=')[0]?.trim() ?? '';
  const substituted = lhsSrc.replace(/x/gi, `(${fmt(theirs)})`);
  const move = firstMove(lin);
  const at = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: [0.2, 0, 0, 1] as const },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
      <motion.div {...at(0)} style={{ fontSize: '1.15rem', color: 'var(--clss-ink-900)' }}>
        you said x = {fmt(theirs)} — watch.
      </motion.div>

      <motion.div
        {...at(0.5)}
        style={{
          fontSize: '1.35rem',
          fontWeight: 550,
          color: 'var(--clss-ink-900)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {substituted} → {fmt(lhsVal)}
      </motion.div>

      {/* the equality breaks — shake, then settle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, x: [0, -9, 8, -5, 3, 0] }}
        transition={{ opacity: { delay: 1.1, duration: 0.25 }, x: { delay: 1.2, duration: 0.55 } }}
        style={{
          fontSize: '1.8rem',
          fontWeight: 550,
          color: 'var(--clss-feedback-retry)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmt(lhsVal)} ≠ {fmt(rhsVal)}
      </motion.div>

      <motion.div {...at(1.8)} style={{ ...lead, textAlign: 'center' }}>
        the two sides stopped being equal — the scale tipped.
      </motion.div>

      <motion.div
        {...at(2.3)}
        style={{
          margin: '4px auto 0',
          padding: '14px 18px',
          border: '0.5px solid var(--clss-hairline-on-paper-strong)',
          borderRadius: 'var(--clss-radius-md)',
          maxWidth: 420,
        }}
      >
        <div style={{ ...whisper, marginBottom: 6 }}>the honest move</div>
        <div style={{ fontSize: '1rem', color: 'var(--clss-ink-900)' }}>
          {move.text}
          {move.result ? ` → ${move.result}` : ''}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', marginTop: 6 }}>
          this one comes back before the end — the finish is yours.
        </div>
      </motion.div>
    </div>
  );
}

export function PracticeRun({
  nodeId,
  items,
  setBar,
  setSub,
  onAttempt,
  onDone,
}: {
  nodeId: string;
  items: PracticeItem[];
  setBar: (b: BarState | null) => void;
  setSub: (f: number) => void;
  onAttempt: () => void;
  onDone: () => void;
}) {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { award } = useProgress();
  const { setMood } = useVidyaChat();

  const [queue, setQueue] = useState<PracticeItem[]>(items);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<'answer' | 'correct' | 'detonate'>('answer');
  const [entry, setEntry] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);
  const [detReady, setDetReady] = useState(false);
  const [wrongValue, setWrongValue] = useState(0);

  const startRef = useRef(Date.now());
  const attemptsByItem = useRef<Record<string, number>>({});
  const servedRef = useRef<Set<number>>(new Set());

  const item = queue[pos];

  const equationRef = useRegisterTarget<HTMLDivElement>('course-practice-equation', {
    kind: 'equation',
    label: item ? `the practice equation ${item.equation}` : 'the practice equation',
  });
  const padRef = useRegisterTarget<HTMLDivElement>('course-practice-pad', {
    kind: 'input',
    label: 'the number pad where the learner types x',
  });

  // every item arrival: serve event + fresh clock
  useEffect(() => {
    if (!item || servedRef.current.has(pos)) return;
    servedRef.current.add(pos);
    startRef.current = Date.now();
    sdk.events.record(
      'practice.item.served.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        difficulty: item.difficulty,
        scheduled_by: 'orchestrator',
        aided: false,
      },
      { ontologyNodeId: nodeId },
    );
  }, [item, pos, sdk, nodeId]);

  // done when the queue (including re-queued misses) is exhausted
  useEffect(() => {
    if (pos >= queue.length && queue.length > 0) onDone();
  }, [pos, queue.length, onDone]);

  useEffect(() => {
    setSub(queue.length === 0 ? 0 : Math.min(1, pos / queue.length));
  }, [setSub, pos, queue.length]);

  // she reads the pad at code level
  useEffect(() => {
    if (!item) return;
    bus.publishCanvas({
      nodeId,
      equation: item.equation,
      steps: [
        `item ${Math.min(pos + 1, queue.length)} of ${queue.length}`,
        `learner's entry so far: ${entry === '' ? '(nothing yet)' : entry.replace('-', '−')}`,
        phase === 'correct'
          ? 'answered correctly'
          : phase === 'detonate'
            ? `answered x = ${fmt(wrongValue)}, which breaks the equality — misconception shown`
            : 'still working',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, item, pos, queue.length, entry, phase, wrongValue]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  const advance = useCallback(() => {
    setPhase('answer');
    setEntry('');
    setWhyOpen(false);
    setDetReady(false);
    setPos((p) => p + 1);
  }, []);

  const check = useCallback(() => {
    if (!item) return;
    const value = Number(entry.replace('−', '-'));
    if (!Number.isFinite(value)) return;
    const correct = Math.abs(value - Number(item.answer)) < 1e-9;
    const latency = Date.now() - startRef.current;
    const attemptIndex = attemptsByItem.current[item.id] ?? 0;
    attemptsByItem.current[item.id] = attemptIndex + 1;
    onAttempt();

    sdk.events.record(
      'learn.attempt.submitted.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        response: { kind: 'numeric', value },
        correct,
        aided: false,
        independence_signal: 0.95,
        latency_ms: latency,
        attempt_index: attemptIndex,
      },
      { ontologyNodeId: nodeId },
    );
    sdk.events.record(
      'practice.item.answered.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        response: { kind: 'numeric', value },
        correct,
        latency_ms: latency,
        independence_signal: 0.95,
      },
      { ontologyNodeId: nodeId },
    );

    if (correct) {
      setPhase('correct');
      award('item');
      setMood('correct');
      window.setTimeout(() => setMood('idle'), 1400);
    } else {
      // FSRS framing: a lapse, due again soon — and it literally returns later in this run
      const card = reviewCard(null, false, Date.now());
      sdk.events.record(
        'practice.retrieval.scheduled.v1',
        {
          node_id: nodeId,
          item_id: item.id,
          due_at: card.dueAt,
          stability: card.stabilityDays,
          difficulty: card.difficulty,
          scheduler: 'fsrs',
        },
        { ontologyNodeId: nodeId },
      );
      setWrongValue(value);
      setQueue((q) => [...q, item]);
      setPhase('detonate');
      setMood('hint');
      window.setTimeout(() => setMood('idle'), 2000);
      window.setTimeout(() => setDetReady(true), 2600);
    }
  }, [item, entry, sdk, nodeId, award, setMood, onAttempt]);

  const checkRef = useRef(check);
  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  const onKey = useCallback((key: string) => {
    if (key === '⌫') setEntry((e) => e.slice(0, -1));
    else if (key === '−') setEntry((e) => (e.startsWith('-') ? e.slice(1) : `-${e}`));
    else setEntry((e) => (e.length < 7 ? e + key : e));
  }, []);

  // hardware keyboard is a first-class citizen
  useEffect(() => {
    if (phase !== 'answer') return;
    const handler = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) onKey(e.key);
      else if (e.key === '-') onKey('−');
      else if (e.key === 'Backspace') onKey('⌫');
      else if (e.key === 'Enter') checkRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, onKey]);

  // the action bar follows the phase
  useEffect(() => {
    if (!item) {
      setBar(null);
      return;
    }
    if (phase === 'answer') {
      const invalid = entry === '' || entry === '-' || !Number.isFinite(Number(entry));
      setBar({ primary: { label: 'check', onClick: () => checkRef.current(), disabled: invalid } });
    } else if (phase === 'correct') {
      setBar({
        primary: { label: 'continue', onClick: advance },
        secondary: { label: 'why?', onClick: () => setWhyOpen((o) => !o) },
      });
    } else {
      setBar({ primary: { label: 'continue', onClick: advance, disabled: !detReady } });
    }
  }, [setBar, item, phase, entry, detReady, advance]);

  if (!item) return null;

  const lin = linearize(item.equation);
  const correctValue = Number(item.answer);
  const tint =
    phase === 'correct'
      ? {
          border: '1px solid var(--clss-feedback-correct)',
          background: 'var(--clss-feedback-correctSoft)',
        }
      : phase === 'detonate'
        ? {
            border: '1px solid var(--clss-feedback-retry)',
            background: 'var(--clss-feedback-retrySoft)',
          }
        : {
            border: '0.5px solid var(--clss-hairline-on-paper-strong)',
            background: 'var(--clss-paper)',
          };

  return (
    <CardBody maxWidth={520} center={false}>
      <div style={whisper}>
        practice · {Math.min(pos + 1, queue.length)} of {queue.length}
      </div>
      <div style={cardTitle}>solve for x</div>

      <div
        ref={equationRef}
        style={{
          textAlign: 'center',
          fontSize: 'clamp(1.7rem, 6vw, 2.2rem)',
          fontWeight: 550,
          letterSpacing: '-0.01em',
          color: 'var(--clss-ink-900)',
          fontVariantNumeric: 'tabular-nums',
          padding: '18px 0 6px',
        }}
      >
        {item.equation}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'detonate' ? (
          <motion.div
            key={`det-${pos}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Detonation item={item} theirs={wrongValue} />
          </motion.div>
        ) : (
          <motion.div
            key={`pad-${pos}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* the entry */}
            <motion.div
              animate={phase === 'correct' ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
              style={{
                ...tint,
                borderRadius: 'var(--clss-radius-sm)',
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.7rem',
                fontWeight: 550,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--clss-ink-900)',
                gap: 10,
              }}
            >
              <span style={{ color: 'var(--clss-ink-500)', fontWeight: 500 }}>x =</span>
              <span>{entry === '' ? ' ' : entry.replace('-', '−')}</span>
            </motion.div>

            {phase === 'correct' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--clss-feedback-correct)', fontWeight: 550 }}>
                  that holds.
                </div>
                <AnimatePresence>
                  {whyOpen && lin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ ...lead, marginTop: 8 }}>
                        put x = {fmt(correctValue)} back in: both sides make{' '}
                        {fmt(lin.lhs(correctValue))}. the scale stays level — that is what being a
                        solution means.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* the pad — generous, tactile */}
            {phase === 'answer' && (
              <div ref={padRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PAD_KEYS.map((row) => (
                  <div key={row.join('')} style={{ display: 'flex', gap: 8 }}>
                    {row.map((key) => (
                      <motion.button
                        key={key}
                        type="button"
                        onClick={() => onKey(key)}
                        whileTap={{ scale: 0.93 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        aria-label={key === '⌫' ? 'delete' : key === '−' ? 'minus' : key}
                        style={{
                          flex: 1,
                          height: 56,
                          fontSize: '1.15rem',
                          fontFamily: 'inherit',
                          fontWeight: 500,
                          color: 'var(--clss-ink-900)',
                          background: 'var(--clss-paper)',
                          border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                          borderRadius: 'var(--clss-radius-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        {key}
                      </motion.button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </CardBody>
  );
}
