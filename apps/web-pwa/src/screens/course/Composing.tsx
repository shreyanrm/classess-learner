'use client';

/**
 * The generated course player. Every non-atom topic is playable here with real generated
 * content: engine.compose writes the course (cards + a mini-workbook + a boss, answers
 * verified server-side), then each card hydrates through its own engine (engine.simulate
 * CAS-verified, engine.diagram sanitized) and renders on the guided-discovery shell —
 * act-to-reveal, Check/Continue, per-card XP, the boss, the greeting, the ignite.
 *
 * Generation states are honest: a skeleton shimmer while she composes (notification-style,
 * never a fake spinner promise), and any refusal anywhere falls back to the structural seed
 * course — invisible to the learner, never an error (CONTEXT.md §6).
 */

import { useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { topicById } from '../../data/catalog';
import type { Topic } from '../../data/model';
import { DiagramView, svgIsClean } from '../../engines/DiagramView';
import { parseSimSpec, SimRunner, type SimSpec, simSpecFromGateway } from '../../engines/SimRunner';
import { useProgress } from '../../store/progress';
import { useSdk } from '../../store/sdk';
import { TopicSigil } from '../../ui/art';
import { hueForTopic } from '../../ui/hues';
import { cascade, rise } from '../../ui/kit';
import { useVidyaChat } from '../../vidya/chat';
import { Greeting } from './Greeting';
import type { BarState } from './shared';
import { CardBody, cardTitle, Deck, lead, rgba, Stage, whisper } from './shared';

// --- The composed course (engine.compose output, validated before anything renders) ---------------

type CardKind = 'sim' | 'diagram' | 'text';
type ActKind = 'tap' | 'drag' | 'slide' | 'type';

interface GenCard {
  id: string;
  kind: CardKind;
  title: string;
  idea: string;
  interaction: { kind: ActKind; prompt: string };
  reveal: string;
}

interface GenItem {
  id: string;
  type: 'mcq' | 'fill';
  prompt: string;
  options?: string[];
  answer: string;
}

interface GenCourse {
  courseId: string;
  title: string;
  cards: GenCard[];
  workbook: GenItem[];
  boss: GenItem[];
  seeded: boolean;
}

const CARD_KINDS: ReadonlySet<string> = new Set(['sim', 'diagram', 'text']);
const ACT_KINDS: ReadonlySet<string> = new Set(['tap', 'drag', 'slide', 'type']);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function parseItems(raw: unknown): GenItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: GenItem[] = [];
  raw.forEach((it, i) => {
    if (!isRecord(it)) return;
    const prompt = typeof it.prompt === 'string' ? it.prompt.trim() : '';
    const answer = typeof it.answer === 'string' ? it.answer.trim() : '';
    if (!prompt || !answer) return;
    const id = typeof it.id === 'string' ? it.id : `i${i + 1}`;
    if (it.type === 'mcq' && Array.isArray(it.options)) {
      const options = it.options.filter(
        (o): o is string => typeof o === 'string' && o.trim() !== '',
      );
      // the verifier's law, re-checked at the door: exactly one correct option present
      if (options.length < 2 || options.filter((o) => o === answer).length !== 1) return;
      items.push({ id, type: 'mcq', prompt, options, answer });
    } else if (it.type === 'fill') {
      items.push({ id, type: 'fill', prompt, answer });
    }
  });
  return items.length >= 3 ? items.slice(0, 3) : null;
}

function parseGenCourse(raw: unknown, fallbackTitle: string): GenCourse | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.artifact) ? raw.artifact : raw;
  if (raw.verified === false || src.verified === false) return null;
  const rawCards = Array.isArray(src.cards) ? src.cards : [];
  const cards: GenCard[] = [];
  rawCards.forEach((c, i) => {
    if (!isRecord(c)) return;
    const interaction = isRecord(c.interaction) ? c.interaction : null;
    const actKind = interaction && typeof interaction.kind === 'string' ? interaction.kind : '';
    const prompt = interaction && typeof interaction.prompt === 'string' ? interaction.prompt : '';
    const title = typeof c.title === 'string' ? c.title.trim() : '';
    const idea = typeof c.idea === 'string' ? c.idea.trim() : '';
    const reveal = typeof c.reveal === 'string' ? c.reveal.trim() : '';
    const kind =
      typeof c.kind === 'string' && CARD_KINDS.has(c.kind) ? (c.kind as CardKind) : 'text';
    if (!title || !idea || !reveal || !prompt || !ACT_KINDS.has(actKind)) return;
    cards.push({
      id: typeof c.id === 'string' ? c.id : `c${i + 1}`,
      kind,
      title,
      idea,
      interaction: { kind: actKind as ActKind, prompt },
      reveal,
    });
  });
  if (cards.length < 3) return null;
  const workbook = parseItems(src.workbook);
  const boss = parseItems(src.boss);
  if (!workbook || !boss) return null;
  return {
    courseId: crypto.randomUUID(),
    title: typeof src.topic === 'string' ? src.topic : fallbackTitle,
    cards,
    workbook,
    boss,
    seeded: raw.seeded === true,
  };
}

/** The client-side floor for mock mode or a network refusal — structural, never fabricated. */
function seedCourse(title: string): GenCourse {
  const n = title.toLowerCase();
  return {
    courseId: crypto.randomUUID(),
    title,
    seeded: true,
    cards: [
      {
        id: 'c1',
        kind: 'text',
        title: `Meet ${n}`,
        idea: `One place in the real world where ${n} quietly shows up.`,
        interaction: { kind: 'tap', prompt: 'Tap the part that looks unknown.' },
        reveal: 'The unknown is what we are hunting. Everything else is a clue.',
      },
      {
        id: 'c2',
        kind: 'sim',
        title: 'Feel the rule',
        idea: 'The idea behaves like a balance: change one side, the other follows.',
        interaction: { kind: 'drag', prompt: 'Drag a number until the relationship balances.' },
        reveal: 'Whatever you do to one side, you do to the other.',
      },
      {
        id: 'c3',
        kind: 'diagram',
        title: 'Predict, then check',
        idea: 'A claimed answer must survive the original problem.',
        interaction: { kind: 'type', prompt: 'Type your value and test it.' },
        reveal: 'Substitute it back. If both sides agree, the answer stands.',
      },
      {
        id: 'c4',
        kind: 'text',
        title: 'Where it bends',
        idea: `Every model of ${n} has an edge where it stops working.`,
        interaction: { kind: 'slide', prompt: 'Push the setting to its extreme.' },
        reveal: 'Knowing where the rule breaks is part of knowing the rule.',
      },
    ],
    workbook: [
      {
        id: 'w1',
        type: 'mcq',
        prompt: 'What tells you a claimed answer is trustworthy?',
        options: [
          'it survives being tested against the original problem',
          'it looks like the worked example',
          'it was the first answer you found',
        ],
        answer: 'it survives being tested against the original problem',
      },
      {
        id: 'w2',
        type: 'mcq',
        prompt: 'Pushing a rule to its extreme shows you…',
        options: [
          'where the ideal model stops matching reality',
          'that the rule was never true',
          'that extremes should be avoided',
        ],
        answer: 'where the ideal model stops matching reality',
      },
      {
        id: 'w3',
        type: 'fill',
        prompt: 'Before trusting a result, test it against the ________ problem.',
        answer: 'original',
      },
    ],
    boss: [
      {
        id: 'b1',
        type: 'mcq',
        prompt: 'Which move is always legal while working a problem?',
        options: [
          'one that keeps the answer set exactly the same',
          'one that makes the numbers smaller',
          'one that removes the hardest part',
        ],
        answer: 'one that keeps the answer set exactly the same',
      },
      {
        id: 'b2',
        type: 'mcq',
        prompt: 'You test your answer and the two sides disagree. What does that mean?',
        options: [
          'the answer does not survive the original problem',
          'the original problem must be wrong',
          'checking only works on easy problems',
        ],
        answer: 'the answer does not survive the original problem',
      },
      {
        id: 'b3',
        type: 'fill',
        prompt: 'Each legal move keeps the answer set exactly the ________.',
        answer: 'same',
      },
    ],
  };
}

// --- Events: a deterministic node id per topic (the contract wants UUIDs) --------------------------

function topicNodeUuid(topicId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < topicId.length; i++) {
    h ^= topicId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let h2 = 0x1000193 ^ topicId.length;
  for (let i = topicId.length - 1; i >= 0; i--) {
    h2 = Math.imul(h2 ^ topicId.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  const a = h.toString(16).padStart(8, '0');
  const b = h2.toString(16).padStart(8, '0').slice(0, 4);
  return `00000000-0000-7000-8000-${a}${b}`;
}

// --- Per-card artifacts (hydrated through the matching engine, refusal invisible) ------------------

type Artifact =
  | { status: 'pending' }
  | { status: 'failed' }
  | { status: 'ready'; kind: 'sim'; spec: SimSpec }
  | { status: 'ready'; kind: 'diagram'; svg: string };

function useArtifact(card: GenCard, topic: string, courseId: string): Artifact {
  const sdk = useSdk();
  const [artifact, setArtifact] = useState<Artifact>({ status: 'pending' });

  useEffect(() => {
    if (card.kind === 'text') return;
    let cancelled = false;
    setArtifact({ status: 'pending' });
    sdk.llm
      .invoke(
        card.kind === 'sim' ? 'engine.simulate' : 'engine.diagram',
        {
          concept: `${topic}: ${card.title}`,
          topic,
          brief: card.idea,
          course_id: courseId,
          difficulty: 'core',
        },
        { consentTier: 'un_elevated' },
      )
      .then((res) => {
        if (cancelled) return;
        const body =
          isRecord(res.output) && 'artifact' in res.output ? res.output.artifact : res.output;
        if (card.kind === 'sim') {
          const spec = simSpecFromGateway(res.output, card.title) ?? parseSimSpec(body);
          setArtifact(spec ? { status: 'ready', kind: 'sim', spec } : { status: 'failed' });
        } else {
          const svg =
            typeof body === 'string'
              ? body
              : isRecord(body) && typeof body.svg === 'string'
                ? body.svg
                : null;
          setArtifact(
            svg && svgIsClean(svg)
              ? { status: 'ready', kind: 'diagram', svg }
              : { status: 'failed' },
          );
        }
      })
      .catch(() => {
        if (!cancelled) setArtifact({ status: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [sdk, card, topic, courseId]);

  return artifact;
}

// --- Small chrome ----------------------------------------------------------------------------------

/** Honest skeleton shimmer — she is composing this piece; it lands on its own. */
function Shimmer({ lines = 3, note }: { lines?: number; note?: string }) {
  const widths = ['82%', '64%', '74%', '58%'];
  return (
    <div
      style={{
        border: '0.5px solid var(--clss-hairline-on-paper)',
        borderRadius: 3,
        padding: '26px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton lines are positional
          key={i}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 1.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            delay: i * 0.18,
          }}
          style={{
            height: 12,
            width: widths[i % widths.length],
            background: '#F1F1F5',
            borderRadius: 3,
          }}
        />
      ))}
      {note && <div style={{ ...whisper, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  fontSize: '1rem',
  fontFamily: 'inherit',
  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
  borderRadius: 3,
  outline: 'none',
  background: 'var(--clss-paper)',
  color: 'var(--clss-ink-900)',
};

const itemBlockStyle = (state: 'idle' | 'correct' | 'retry'): CSSProperties => ({
  border:
    state === 'correct'
      ? '1px solid var(--clss-feedback-correct)'
      : state === 'retry'
        ? '1px solid var(--clss-feedback-retry)'
        : '0.5px solid var(--clss-hairline-on-paper-strong)',
  background:
    state === 'correct'
      ? 'var(--clss-feedback-correctSoft)'
      : state === 'retry'
        ? 'var(--clss-feedback-retrySoft)'
        : 'var(--clss-paper)',
  borderRadius: 3,
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const choiceStyle = (selected: boolean): CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  padding: '11px 14px',
  fontSize: '0.95rem',
  lineHeight: 1.45,
  fontFamily: 'inherit',
  color: selected ? 'var(--clss-paper)' : 'var(--clss-ink-900)',
  background: selected ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
  borderRadius: 3,
  cursor: 'pointer',
});

// --- Item answering (shared by the workbook and the boss) ------------------------------------------

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function answerIsCorrect(item: GenItem, entry: string): boolean {
  if (item.type === 'mcq') return entry === item.answer;
  const a = norm(entry);
  const b = norm(item.answer);
  if (!a) return false;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-9;
  return a === b;
}

function ItemBlock({
  item,
  index,
  entry,
  state,
  disabled,
  onEntry,
}: {
  item: GenItem;
  index: number;
  entry: string;
  state: 'idle' | 'correct' | 'retry';
  disabled: boolean;
  onEntry: (v: string) => void;
}) {
  const ordinals = ['one', 'two', 'three'];
  return (
    <motion.div variants={rise} style={itemBlockStyle(state)}>
      <div style={whisper}>
        {ordinals[index]} · {item.type === 'mcq' ? 'choose one' : 'fill the gap'}
      </div>
      <div
        style={{
          fontSize: '1.02rem',
          lineHeight: 1.5,
          color: 'var(--clss-ink-900)',
          fontWeight: 520,
        }}
      >
        {item.prompt}
      </div>
      {item.type === 'mcq' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(item.options ?? []).map((choice) => (
            <motion.button
              key={choice}
              type="button"
              disabled={disabled}
              whileTap={{ scale: 0.985 }}
              onClick={() => onEntry(choice)}
              style={choiceStyle(entry === choice)}
            >
              {choice}
            </motion.button>
          ))}
        </div>
      ) : (
        <input
          value={entry}
          disabled={disabled}
          onChange={(e) => onEntry(e.target.value)}
          aria-label={item.prompt}
          placeholder="type your answer…"
          style={{ ...inputStyle, maxWidth: 300 }}
        />
      )}
      {state === 'retry' && (
        <div style={{ fontSize: '0.88rem', color: 'var(--clss-ink-700)', lineHeight: 1.55 }}>
          not this one — the answer worth keeping is “{item.answer}”.
        </div>
      )}
    </motion.div>
  );
}

/** A three-item set answered together and checked together — the workbook and the boss share it. */
function ItemSet({
  items,
  nodeId,
  courseId,
  heading,
  eyebrow,
  hue,
  passNeeded,
  setBar,
  onDone,
  onAttempt,
  awardCorrect,
}: {
  items: GenItem[];
  nodeId: string;
  courseId: string;
  heading: string;
  eyebrow: string;
  hue: string;
  /** Minimum correct to continue; below it the set re-opens for one more look. */
  passNeeded: number;
  setBar: (b: BarState | null) => void;
  onDone: (correctCount: number) => void;
  onAttempt: () => void;
  awardCorrect: (item: GenItem, index: number) => void;
}) {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const [entries, setEntries] = useState<string[]>(() => items.map(() => ''));
  const [results, setResults] = useState<boolean[] | null>(null);
  const round = useRef(0);
  const startedAt = useRef(Date.now());

  const answered = entries.filter((e) => e.trim() !== '').length;
  const evaluated = results !== null;

  useEffect(() => {
    bus.publishCanvas({
      nodeId,
      steps: [
        `${eyebrow}: ${answered} of ${items.length} answered`,
        evaluated
          ? `checked — ${results?.filter(Boolean).length ?? 0} of ${items.length} correct`
          : 'not yet checked',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, eyebrow, answered, evaluated, results, items.length]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  useEffect(() => {
    if (!evaluated) {
      setBar({
        primary: {
          label: 'check',
          disabled: answered < items.length,
          onClick: () => {
            const r = items.map((item, i) => answerIsCorrect(item, entries[i] ?? ''));
            const latency = Math.max(0, Date.now() - startedAt.current);
            items.forEach((item, i) => {
              onAttempt();
              sdk.events.record(
                'learn.attempt.submitted.v1',
                {
                  node_id: nodeId,
                  response:
                    item.type === 'mcq'
                      ? { kind: 'choice', selected: [entries[i] ?? ''] }
                      : { kind: 'text', text: entries[i] ?? '' },
                  correct: r[i] ?? false,
                  aided: false,
                  independence_signal: 0.85,
                  latency_ms: latency,
                  attempt_index: round.current,
                },
                { ontologyNodeId: nodeId, courseId },
              );
              if (r[i]) awardCorrect(item, i);
            });
            round.current += 1;
            setResults(r);
          },
        },
      });
    } else {
      const correct = results?.filter(Boolean).length ?? 0;
      setBar({
        primary:
          correct >= passNeeded
            ? { label: 'continue', onClick: () => onDone(correct) }
            : {
                label: 'one more look',
                onClick: () => {
                  setResults(null);
                  startedAt.current = Date.now();
                },
              },
      });
    }
  }, [
    setBar,
    evaluated,
    answered,
    entries,
    items,
    results,
    passNeeded,
    onDone,
    onAttempt,
    awardCorrect,
    sdk,
    nodeId,
    courseId,
  ]);

  const state = (i: number): 'idle' | 'correct' | 'retry' =>
    !results ? 'idle' : results[i] ? 'correct' : 'retry';
  const correct = results?.filter(Boolean).length ?? 0;

  return (
    <CardBody maxWidth={620} center={false}>
      <motion.div
        variants={cascade}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <motion.div
          variants={rise}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div>
            <div style={whisper}>{eyebrow}</div>
            <div style={{ ...cardTitle, marginTop: 8 }}>{heading}</div>
          </div>
        </motion.div>
        {items.map((item, i) => (
          <ItemBlock
            key={item.id}
            item={item}
            index={i}
            entry={entries[i] ?? ''}
            state={state(i)}
            disabled={evaluated}
            onEntry={(v) => setEntries((prev) => prev.map((e, j) => (j === i ? v : e)))}
          />
        ))}
        <AnimatePresence>
          {evaluated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              style={{ textAlign: 'center', color: 'var(--clss-ink-700)', fontSize: '0.95rem' }}
            >
              {correct === items.length
                ? 'all of them. clean.'
                : correct >= passNeeded
                  ? `${correct} of ${items.length} — that is a pass, earned.`
                  : 'close. take one more look — the answers are still yours to find.'}
            </motion.div>
          )}
        </AnimatePresence>
        <div aria-hidden style={{ height: 2, background: rgba(hue, 0.12), borderRadius: 3 }} />
      </motion.div>
    </CardBody>
  );
}

// --- A generated content card (act first, Check reveals) --------------------------------------------

function GenCardView({
  card,
  course,
  hue,
  revealed,
}: {
  card: GenCard;
  course: GenCourse;
  hue: string;
  revealed: boolean;
}) {
  const artifact = useArtifact(card, course.title, course.courseId);

  let surface: React.ReactNode = null;
  if (card.kind !== 'text') {
    if (artifact.status === 'ready') {
      surface =
        artifact.kind === 'sim' ? (
          <SimRunner spec={artifact.spec} />
        ) : (
          <Stage
            hue={hue}
            tint={0.05}
            minHeight={200}
            style={{ padding: 'clamp(14px, 3vw, 24px)' }}
          >
            <DiagramView id={card.id} svg={artifact.svg} label={`diagram: ${card.title}`} />
          </Stage>
        );
    } else if (artifact.status === 'pending') {
      surface = <Shimmer lines={3} note="she is composing this piece — it lands here on its own" />;
    }
    // failed: the idea and the act stand alone — refusal invisible
  }

  return (
    <CardBody maxWidth={620}>
      <motion.div
        variants={cascade}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <motion.div variants={rise} style={whisper}>
          {card.kind === 'sim'
            ? 'drag it — feel the law move'
            : card.kind === 'diagram'
              ? 'the picture'
              : 'the idea'}
        </motion.div>
        <motion.div variants={rise} style={cardTitle}>
          {card.title.toLowerCase()}
        </motion.div>
        <motion.div variants={rise} style={lead}>
          {card.idea}
        </motion.div>
        {surface && <motion.div variants={rise}>{surface}</motion.div>}
        <motion.div
          variants={rise}
          style={{
            ...lead,
            borderLeft: `2px solid ${hue}`,
            paddingLeft: 14,
            color: 'var(--clss-ink-900)',
          }}
        >
          {card.interaction.prompt}
        </motion.div>
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{
                border: '1px solid var(--clss-feedback-correct)',
                background: 'var(--clss-feedback-correctSoft)',
                borderRadius: 3,
                padding: '14px 16px',
                fontSize: '1rem',
                lineHeight: 1.6,
                color: 'var(--clss-ink-900)',
              }}
            >
              {card.reveal}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </CardBody>
  );
}

// --- The composing ink screen (skeleton first, the real outline the moment it lands) ---------------

function InkScreen({
  topicId,
  title,
  course,
  settled,
}: {
  topicId: string;
  title: string;
  course: GenCourse | null;
  settled: boolean;
}) {
  const outline = course
    ? [...course.cards.map((c) => c.title.toLowerCase()), 'the workbook', 'the boss']
    : null;
  return (
    <CardBody maxWidth={560}>
      <Stage tint={0.055} minHeight={170}>
        <TopicSigil id={topicId} size={104} draw />
      </Stage>
      <div style={whisper}>
        {course
          ? course.seeded
            ? 'a working course, honestly floored'
            : 'written and verified'
          : 'she is composing your course'}
      </div>
      <div style={cardTitle}>{title.toLowerCase()}</div>
      {!outline && (
        <>
          <Shimmer lines={4} />
          <div style={{ ...lead, marginTop: 2 }}>
            every card is generated, then checked, before it reaches you — it will land here on its
            own; no need to hold your breath.
          </div>
        </>
      )}
      {outline && (
        <motion.div
          variants={cascade}
          initial="hidden"
          animate="show"
          style={{ display: 'flex', flexDirection: 'column', gap: 13 }}
        >
          {outline.map((line, i) => (
            <motion.div
              key={line}
              variants={rise}
              style={{ fontSize: '1.02rem', color: 'var(--clss-ink-900)', lineHeight: 1.45 }}
            >
              <span style={{ ...whisper, marginRight: 10 }}>{i + 1}</span>
              {line}
            </motion.div>
          ))}
          <div style={{ ...lead, marginTop: 4 }}>
            {course?.seeded
              ? 'the fully generated course is still in verification — this working path is live now and follows the same grammar.'
              : settled
                ? 'composed and checked, line by line. it starts on the next card.'
                : ''}
          </div>
        </motion.div>
      )}
    </CardBody>
  );
}

// --- The player ------------------------------------------------------------------------------------

const COMPOSE_TIMEOUT_MS = 75_000;

export function Composing({
  topicId,
  title,
  setBar,
  setProgress,
  onExit,
}: {
  topicId: string;
  title: string;
  setBar: (b: BarState | null) => void;
  setProgress: (p: { f: number; segments: number }) => void;
  onExit: () => void;
}) {
  const sdk = useSdk();
  const { setMood } = useVidyaChat();
  const { award } = useProgress();

  const nodeUuid = useMemo(() => topicNodeUuid(topicId), [topicId]);
  const hue = hueForTopic(topicId);
  const topic: Topic = useMemo(
    () =>
      topicById(topicId) ?? {
        id: topicId,
        chapterId: '',
        name: title,
        blurb: '',
        prereqTopicIds: [],
        kind: 'syllabus',
        xp: 150,
      },
    [topicId, title],
  );

  const [course, setCourse] = useState<GenCourse | null>(null);
  const [settled, setSettled] = useState(false);
  const [entered, setEntered] = useState(false);
  // idx walks: cards… then workbook, boss, greeting
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const attempts = useRef(0);
  const enteredAt = useRef(Date.now());
  const arrivalRecorded = useRef(false);

  // arrival is an event — the contract is law
  useEffect(() => {
    if (arrivalRecorded.current) return;
    arrivalRecorded.current = true;
    enteredAt.current = Date.now();
    sdk.events.record(
      'learn.node.entered.v1',
      { node_id: nodeUuid, entry: 'map', initial_band: 'not_started' },
      { ontologyNodeId: nodeUuid },
    );
  }, [sdk, nodeUuid]);

  // ask the engines for the real course; refusal anywhere floors to the seed, never an error
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    setMood('thinking');
    (async () => {
      let parsed: GenCourse | null = null;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = window.setTimeout(() => reject(new Error('compose timeout')), COMPOSE_TIMEOUT_MS);
        });
        const res = await Promise.race([
          sdk.llm.invoke(
            'engine.compose',
            { topic: title, topic_id: topicId, difficulty: 'core' },
            { consentTier: 'un_elevated' },
          ),
          timeout,
        ]);
        parsed = parseGenCourse(res.output, title);
        if (parsed && !cancelled) {
          sdk.events.record(
            'create.course.compiled.v1',
            {
              request_id: crypto.randomUUID(),
              course_id: parsed.courseId,
              node_count: parsed.cards.length,
              reused_node_count: res.cached ? parsed.cards.length : 0,
              new_node_count: res.cached ? 0 : parsed.cards.length,
              all_verified: true,
            },
            { courseId: parsed.courseId },
          );
        }
      } catch {
        // the floor below is the fallback — never an error state
      }
      window.clearTimeout(timer);
      if (cancelled) return;
      setCourse(parsed ?? seedCourse(title));
      setSettled(true);
      setMood('idle');
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setMood('idle');
    };
  }, [sdk, topicId, title, setMood]);

  // stable identities — ItemSet's action-bar effect depends on these; fresh lambdas
  // every render would loop setBar -> parent setState -> render -> setBar forever
  const bumpAttempts = useCallback(() => {
    attempts.current += 1;
  }, []);
  const advance = useCallback(() => {
    setRevealed(false);
    setIdx((i) => i + 1);
  }, []);
  const awardWorkbookItem = useCallback(
    (item: GenItem) => award('item', { onceKey: `gen-wb-${topicId}-${item.id}`, hue }),
    [award, topicId, hue],
  );
  const awardNothing = useCallback(() => {}, []);
  const bossDone = useCallback(() => {
    award('boss', { onceKey: `gen-boss-${topicId}`, hue });
    setIdx((i) => i + 1);
  }, [award, topicId, hue]);

  const segments = (course?.cards.length ?? 4) + 3; // + workbook, boss, greeting
  const stops = course ? course.cards.length : 0;
  const stage: 'cards' | 'workbook' | 'boss' | 'greeting' = !course
    ? 'cards'
    : idx < stops
      ? 'cards'
      : idx === stops
        ? 'workbook'
        : idx === stops + 1
          ? 'boss'
          : 'greeting';

  // endowed progress — never empty, eased forward as the learner travels
  useEffect(() => {
    setProgress({ f: entered ? (idx + 0.6) / segments : 0.07, segments });
  }, [entered, idx, segments, setProgress]);

  // the ink card's action bar
  useEffect(() => {
    if (entered) return;
    setBar({
      primary: {
        label: course?.seeded ? 'start the working course' : 'start the course',
        disabled: !settled,
        onClick: () => setEntered(true),
      },
    });
  }, [entered, settled, course, setBar]);

  // content cards: act → check (reveal + XP) → continue
  const card = course && idx < stops ? course.cards[idx] : null;
  useEffect(() => {
    if (!entered || !card) return;
    if (!revealed) {
      setBar({
        primary: {
          label: 'check',
          onClick: () => {
            setRevealed(true);
            award('bonus', { amount: 15, onceKey: `gen-${topicId}-${card.id}`, hue });
            setMood('correct');
            window.setTimeout(() => setMood('idle'), 1200);
          },
        },
      });
    } else {
      setBar({
        primary: {
          label: 'continue',
          onClick: () => {
            setRevealed(false);
            setIdx((i) => i + 1);
          },
        },
      });
    }
  }, [entered, card, revealed, setBar, award, topicId, hue, setMood]);

  if (!entered || !course) {
    return (
      <Deck id="compose-ink">
        <InkScreen topicId={topicId} title={title} course={course} settled={settled} />
      </Deck>
    );
  }

  if (stage === 'greeting') {
    return (
      <Deck id="gen-greeting">
        <Greeting
          topic={topic}
          nodeId={nodeUuid}
          attemptsTotal={attempts.current}
          enteredAt={enteredAt.current}
          setBar={setBar}
          onContinue={onExit}
        />
      </Deck>
    );
  }

  if (stage === 'workbook') {
    return (
      <Deck id="gen-workbook">
        <ItemSet
          items={course.workbook}
          nodeId={nodeUuid}
          courseId={course.courseId}
          eyebrow="the workbook · three quick ones"
          heading="hold what you just built"
          hue={hue}
          passNeeded={0}
          setBar={setBar}
          onAttempt={bumpAttempts}
          awardCorrect={awardWorkbookItem}
          onDone={advance}
        />
      </Deck>
    );
  }

  if (stage === 'boss') {
    return (
      <Deck id="gen-boss">
        <ItemSet
          items={course.boss}
          nodeId={nodeUuid}
          courseId={course.courseId}
          eyebrow="the boss · answered together, checked together"
          heading="prove it is yours"
          hue={hue}
          passNeeded={2}
          setBar={setBar}
          onAttempt={bumpAttempts}
          awardCorrect={awardNothing}
          onDone={bossDone}
        />
      </Deck>
    );
  }

  return (
    <Deck id={`gen-card-${idx}`}>
      {card && <GenCardView card={card} course={course} hue={hue} revealed={revealed} />}
    </Deck>
  );
}
