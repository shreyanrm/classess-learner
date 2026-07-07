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
import { useProgress, XP_AWARDS } from '../../store/progress';
import { useSdk } from '../../store/sdk';
import { ComboMeter, comboBreak, comboHit, XpTick } from '../../ui/combo';
import { sfx } from '../../ui/sound';
import { useVidyaChat } from '../../vidya/chat';
import { announceCard } from '../../vidya/speech';
import { hintFor, maxHintDepth, noteCorrect, noteMiss, regrade, useTutor } from '../../vidya/tutor';
import { firstMove, fmt, linearize } from './equations';
import type { BarState } from './shared';
import { CardBody, cardTitle, lead, ParticlePop, rgba, Stage, whisper } from './shared';

const PAD_KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['−', '0', '⌫'],
] as const;

const HUE = 'var(--clss-ultramarine)';
const RETRY = '#B26A00';

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

      {/* the equality physically cracks — a flash, then the two halves separate */}
      <div style={{ position: 'relative', padding: '6px 0' }}>
        {/* the flash at the moment of the break */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ delay: 1.1, duration: 0.55, times: [0, 0.25, 1] }}
          style={{
            position: 'absolute',
            inset: -24,
            background: `radial-gradient(circle, ${rgba(RETRY, 0.3)} 0%, transparent 62%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--clss-feedback-retry)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <motion.span
            initial={{ x: 0, rotate: 0 }}
            animate={{ x: [0, -6, -18], rotate: [0, -1, -3] }}
            transition={{ delay: 1.15, duration: 0.5, ease: [0.2, 0, 0.2, 1] }}
            style={{ display: 'inline-block' }}
          >
            {fmt(lhsVal)}
          </motion.span>
          {/* the crack itself, drawing down between the halves */}
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 46,
            }}
          >
            <motion.svg
              aria-hidden
              viewBox="0 0 16 56"
              width={16}
              height={56}
              style={{ position: 'absolute', top: -8 }}
            >
              <motion.path
                d="M 9 0 L 5 12 L 11 22 L 4 34 L 10 44 L 6 56"
                fill="none"
                stroke={RETRY}
                strokeWidth={2}
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 1.12, duration: 0.35, ease: [0.3, 0, 0.4, 1] }}
              />
            </motion.svg>
            <motion.span
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: [0.4, 1.35, 1] }}
              transition={{ delay: 1.5, duration: 0.4, times: [0, 0.55, 1] }}
              style={{ display: 'inline-block', position: 'relative' }}
            >
              ≠
            </motion.span>
          </span>
          <motion.span
            initial={{ x: 0, rotate: 0 }}
            animate={{ x: [0, 6, 18], rotate: [0, 1, 3] }}
            transition={{ delay: 1.15, duration: 0.5, ease: [0.2, 0, 0.2, 1] }}
            style={{ display: 'inline-block' }}
          >
            {fmt(rhsVal)}
          </motion.span>
        </div>
      </div>

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
          background: 'var(--clss-paper)',
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
  const { mode } = useTutor();

  const [queue, setQueue] = useState<PracticeItem[]>(items);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<'answer' | 'correct' | 'detonate'>('answer');
  const [entry, setEntry] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);
  const [detReady, setDetReady] = useState(false);
  const [wrongValue, setWrongValue] = useState(0);
  // the assistance ladder at work: hint depth per item, and the "I think I'm right" contest
  const [hintLevel, setHintLevel] = useState(0);
  const lastHintRef = useRef<string>('');
  const [contest, setContest] = useState<'idle' | 'checking' | 'upheld' | 'stood'>('idle');
  const [contestNote, setContestNote] = useState('');

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

  // she reads each question aloud as the learner arrives at it — never gates the check button
  useEffect(() => {
    if (!item || phase !== 'answer') return;
    const spoken = item.equation
      .replace(/=/g, ' equals ')
      .replace(/\+/g, ' plus ')
      .replace(/[-−]/g, ' minus ')
      .replace(/\s+/g, ' ')
      .trim();
    announceCard(`q-${nodeId}-${item.id}-${pos}`, `solve for x. ${spoken}.`, false);
  }, [item, pos, phase, nodeId]);

  // done when the queue (including re-queued misses) is exhausted
  useEffect(() => {
    if (pos >= queue.length && queue.length > 0) onDone();
  }, [pos, queue.length, onDone]);

  useEffect(() => {
    setSub(queue.length === 0 ? 0 : Math.min(1, pos / queue.length));
  }, [setSub, pos, queue.length]);

  // she reads the pad at code level — including how much support she is currently giving
  useEffect(() => {
    if (!item) return;
    bus.publishCanvas({
      nodeId,
      equation: item.equation,
      steps: [
        `item ${Math.min(pos + 1, queue.length)} of ${queue.length}`,
        `learner's entry so far: ${entry === '' ? '(nothing yet)' : entry.replace('-', '−')}`,
        `assistance: ${mode}${hintLevel > 0 ? ` · hint depth ${hintLevel}` : ''}`,
        phase === 'correct'
          ? 'answered correctly'
          : phase === 'detonate'
            ? `answered x = ${fmt(wrongValue)}, which breaks the equality — misconception shown`
            : 'still working',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, item, pos, queue.length, entry, phase, wrongValue, mode, hintLevel]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  const advance = useCallback(() => {
    setPhase('answer');
    setEntry('');
    setWhyOpen(false);
    setDetReady(false);
    setHintLevel(0);
    lastHintRef.current = '';
    setContest('idle');
    setContestNote('');
    setPos((p) => p + 1);
  }, []);

  // one clue at a time — depth escalates on request, capped by the ladder, delivered in her ink
  const giveHint = useCallback(() => {
    if (!item) return;
    const cap = maxHintDepth(mode);
    // Escalate — and never repeat the last clue: if a depth lands on the same words, step further.
    let next = hintLevel;
    let text = '';
    do {
      next = Math.min(next + 1, cap);
      text = hintFor(item, next, mode);
    } while (text === lastHintRef.current && next < cap);
    if (next === hintLevel && text === lastHintRef.current) return;
    lastHintRef.current = text;
    setHintLevel(next);
    sdk.events.record(
      'vidya.hint.escalated.v1',
      { node_id: nodeId, from_level: hintLevel, to_level: next, reason: 'explicit_request' },
      { ontologyNodeId: nodeId },
    );
    bus.dispatch([
      { type: 'setMood', mood: 'hint' },
      { type: 'write', targetId: 'course-practice-equation', text, ttl: 9000 },
    ]);
  }, [item, hintLevel, mode, sdk, nodeId, bus]);

  // the learner contests an evaluated answer — the verifier looks again, gracefully either way
  const doContest = useCallback(async () => {
    if (!item) return;
    setContest('checking');
    const r = await regrade(sdk, item, wrongValue);
    setContestNote(r.note);
    if (r.upheld) {
      // the grade bends to the proof: corrected evidence, the earned moment, no re-queue
      sdk.events.record(
        'practice.item.answered.v1',
        {
          node_id: nodeId,
          item_id: item.id,
          response: { kind: 'numeric', value: wrongValue },
          correct: true,
          latency_ms: 0,
          independence_signal: 0.95,
        },
        { ontologyNodeId: nodeId },
      );
      setQueue((q) => {
        const i = q.lastIndexOf(item);
        return i > pos ? q.filter((_, j) => j !== i) : q;
      });
      noteCorrect();
      award('item');
      comboHit();
      setContest('upheld');
      setPhase('correct');
      setMood('correct');
      window.setTimeout(() => setMood('idle'), 1400);
    } else {
      setContest('stood');
    }
  }, [item, wrongValue, sdk, nodeId, pos, award, setMood]);

  const check = useCallback(() => {
    if (!item) return;
    const value = Number(entry.replace('−', '-'));
    if (!Number.isFinite(value)) return;
    const correct = Math.abs(value - Number(item.answer)) < 1e-9;
    const latency = Date.now() - startRef.current;
    const attemptIndex = attemptsByItem.current[item.id] ?? 0;
    attemptsByItem.current[item.id] = attemptIndex + 1;
    onAttempt();

    // honesty about independence: a hinted answer is aided evidence, not unaided
    const aided = hintLevel > 0;
    const independence = aided ? 0.6 : 0.95;
    sdk.events.record(
      'learn.attempt.submitted.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        response: { kind: 'numeric', value },
        correct,
        aided,
        independence_signal: independence,
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
        independence_signal: independence,
      },
      { ontologyNodeId: nodeId },
    );

    if (correct) {
      noteCorrect();
      setPhase('correct');
      award('item');
      comboHit();
      setMood('correct');
      window.setTimeout(() => setMood('idle'), 1400);
    } else {
      noteMiss();
      comboBreak();
      sfx.wrong(); // a gentle low blip — kind, never punishing (correct blooms via award)
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
  }, [item, entry, sdk, nodeId, award, setMood, onAttempt, hintLevel]);

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

  // the action bar follows the phase — and carries the ladder's quiet affordances
  useEffect(() => {
    if (!item) {
      setBar(null);
      return;
    }
    if (phase === 'answer') {
      const invalid = entry === '' || entry === '-' || !Number.isFinite(Number(entry));
      setBar({
        primary: { label: 'check', onClick: () => checkRef.current(), disabled: invalid },
        secondary:
          hintLevel < maxHintDepth(mode)
            ? { label: hintLevel === 0 ? 'hint' : 'another hint', onClick: giveHint }
            : undefined,
      });
    } else if (phase === 'correct') {
      setBar({
        primary: { label: 'continue', onClick: advance },
        secondary: { label: 'why?', onClick: () => setWhyOpen((o) => !o) },
      });
    } else {
      setBar({
        primary: { label: 'continue', onClick: advance, disabled: !detReady },
        secondary:
          contest === 'idle' && detReady
            ? { label: 'I think I’m right', onClick: () => void doContest() }
            : undefined,
      });
    }
  }, [
    setBar,
    item,
    phase,
    entry,
    detReady,
    advance,
    hintLevel,
    mode,
    giveHint,
    contest,
    doContest,
  ]);

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
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={whisper}>
          practice · {Math.min(pos + 1, queue.length)} of {queue.length}
        </div>
        <ComboMeter hue={HUE} />
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

      {/* one hint, one surface: her handwritten ink beside the equation (VidyaOverlay 'write'). */}

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'detonate' ? (
          <motion.div
            key={`det-${pos}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Stage hue={RETRY} tint={0.06} minHeight={320} style={{ padding: '28px 18px' }}>
              <Detonation item={item} theirs={wrongValue} />
            </Stage>
            {/* the re-grade path: contesting is welcome, and the outcome is graceful either way */}
            <AnimatePresence initial={false}>
              {contest !== 'idle' && (
                <motion.div
                  key={contest}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                  style={{
                    marginTop: 12,
                    textAlign: 'center',
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    color: 'var(--clss-ink-700)',
                  }}
                >
                  {contest === 'checking' ? 'asking the verifier to look again…' : contestNote}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key={`pad-${pos}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Stage
              hue={phase === 'correct' ? '#2E7D32' : HUE}
              tint={0.05}
              minHeight={phase === 'correct' ? 300 : 0}
              style={{
                padding: '18px 16px',
                gap: 16,
                justifyContent: phase === 'correct' ? 'center' : 'flex-start',
              }}
            >
              {/* the entry */}
              <motion.div
                animate={phase === 'correct' ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                style={{
                  ...tint,
                  position: 'relative',
                  width: '100%',
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
                {/* the earned burst — small, hue-true, once — with the real +xp riding up beside it */}
                {phase === 'correct' && <ParticlePop hue={HUE} />}
                {phase === 'correct' && <XpTick amount={XP_AWARDS.item} hue={HUE} />}
              </motion.div>

              {phase === 'correct' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--clss-feedback-correct)', fontWeight: 550 }}>
                    that holds.
                  </div>
                  {contest === 'upheld' && (
                    <div style={{ marginTop: 6, fontSize: '0.9rem', color: 'var(--clss-ink-700)' }}>
                      you contested — and the proof took your side.
                    </div>
                  )}
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

              {/* the pad — tactile keys with real faces */}
              {phase === 'answer' && (
                <div
                  ref={padRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%' }}
                >
                  {PAD_KEYS.map((row) => (
                    <div key={row.join('')} style={{ display: 'flex', gap: 9 }}>
                      {row.map((key) => (
                        <motion.button
                          key={key}
                          type="button"
                          onClick={() => onKey(key)}
                          whileTap={{ scale: 0.94, y: 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          aria-label={key === '⌫' ? 'delete' : key === '−' ? 'minus' : key}
                          style={{
                            flex: 1,
                            height: 58,
                            fontSize: '1.2rem',
                            fontFamily: 'inherit',
                            fontWeight: 550,
                            color: 'var(--clss-ink-900)',
                            background:
                              'linear-gradient(180deg, var(--clss-card) 0%, #F2F3FB 100%)',
                            border: '1px solid #DDE0F0',
                            borderBottom: '3px solid #C9CEE8',
                            borderRadius: 4,
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
            </Stage>
          </motion.div>
        )}
      </AnimatePresence>
    </CardBody>
  );
}
