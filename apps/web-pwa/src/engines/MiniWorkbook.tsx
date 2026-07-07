'use client';

/**
 * MiniWorkbook — the in-lesson interactive mix (DESIGN.md §9, "mini-workbooks in-lesson"). A short,
 * hands-on check that lives inside a course without leaving the flow: a spec-driven sequence of
 * items across four verbs, answered together and graded together into evidence exactly the way the
 * boss ItemSet does (learn.attempt.submitted.v1), with kind wrong-answer handling (sfx.wrong, the
 * right answer surfaced, never a shame) and a bloom on each correct.
 *
 *   match  — connect each left to its right (tap left, tap right; a hue line draws the link)
 *   fill   — a sentence with blanks filled from a word bank of chips (tap to drop into the next gap)
 *   label  — tap a point on a small SVG diagram, then tap its label from the bank
 *   order  — put shuffled steps into sequence by tapping them in order
 *
 * Publishes its working state to the Vidya bus and registers as a scene target she can read and
 * drive (applyTutorAction: { check } grades, { reveal } fills the answers). Reduced-motion + mute
 * aware; both themes; no new deps.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BarState } from '../screens/course/shared';
import { CardBody, cardTitle, lead, rgba, whisper } from '../screens/course/shared';
import { useSdk } from '../store/sdk';
import { hueForTopic } from '../ui/hues';
import { sfx } from '../ui/sound';

// --- The spec ------------------------------------------------------------------------------------

export interface MatchItem {
  id: string;
  kind: 'match';
  prompt: string;
  pairs: { left: string; right: string }[];
}
export interface FillItem {
  id: string;
  kind: 'fill';
  prompt: string;
  /** The sentence with `{}` marking each blank, e.g. "water is {} parts hydrogen to {} oxygen". */
  text: string;
  /** The correct fill for each `{}` in order. */
  blanks: string[];
  /** Extra distractor chips added to the bank. */
  distractors?: string[];
}
export interface LabelPoint {
  id: string;
  x: number; // 0..100 viewBox
  y: number; // 0..62 viewBox
  label: string;
}
export interface LabelItem {
  id: string;
  kind: 'label';
  prompt: string;
  points: LabelPoint[];
  distractors?: string[];
}
export interface OrderItem {
  id: string;
  kind: 'order';
  prompt: string;
  /** The steps in their CORRECT order; shown shuffled. */
  steps: string[];
}

export type WorkbookItem = MatchItem | FillItem | LabelItem | OrderItem;

export interface MiniWorkbookSpec {
  id: string;
  title: string;
  items: WorkbookItem[];
}

// --- Validation (a malformed generated spec never reaches the learner) ----------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter(str) : []);

function parseItem(raw: unknown, i: number): WorkbookItem | null {
  if (!isRecord(raw) || !str(raw.prompt)) return null;
  const id = str(raw.id) ? raw.id : `wi${i + 1}`;
  if (raw.kind === 'match') {
    const pairs = (Array.isArray(raw.pairs) ? raw.pairs : [])
      .filter((p): p is Record<string, unknown> => isRecord(p) && str(p.left) && str(p.right))
      .map((p) => ({ left: p.left as string, right: p.right as string }));
    return pairs.length >= 2 && pairs.length <= 5
      ? { id, kind: 'match', prompt: raw.prompt, pairs }
      : null;
  }
  if (raw.kind === 'fill') {
    if (!str(raw.text)) return null;
    const blanks = strs(raw.blanks);
    const slots = (raw.text.match(/\{\}/g) ?? []).length;
    if (blanks.length === 0 || slots !== blanks.length) return null;
    return {
      id,
      kind: 'fill',
      prompt: raw.prompt,
      text: raw.text,
      blanks,
      distractors: strs(raw.distractors),
    };
  }
  if (raw.kind === 'label') {
    const points = (Array.isArray(raw.points) ? raw.points : [])
      .filter(
        (p): p is Record<string, unknown> => isRecord(p) && num(p.x) && num(p.y) && str(p.label),
      )
      .map((p, j) => ({
        id: str(p.id) ? (p.id as string) : `p${j}`,
        x: p.x as number,
        y: p.y as number,
        label: p.label as string,
      }));
    return points.length >= 2 && points.length <= 6
      ? { id, kind: 'label', prompt: raw.prompt, points, distractors: strs(raw.distractors) }
      : null;
  }
  if (raw.kind === 'order') {
    const steps = strs(raw.steps);
    return steps.length >= 2 && steps.length <= 6
      ? { id, kind: 'order', prompt: raw.prompt, steps }
      : null;
  }
  return null;
}

export function parseMiniWorkbook(raw: unknown): MiniWorkbookSpec | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.artifact) ? raw.artifact : raw;
  if (raw.verified === false || src.verified === false) return null;
  const items = (Array.isArray(src.items) ? src.items : [])
    .map(parseItem)
    .filter((it): it is WorkbookItem => it !== null);
  if (items.length === 0 || items.length > 5) return null;
  return {
    id: str(src.id) ? src.id : 'workbook',
    title: str(src.title) ? src.title : 'a quick check',
    items,
  };
}

// --- Deterministic shuffle (stable across renders; banks must not re-order on every keystroke) -----

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
}
function shuffle<T>(arr: T[], seed: string): T[] {
  const rng = seeded(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

// --- Per-item answer state (a discriminated model, one per item kind) ------------------------------

type ItemAnswer =
  | { kind: 'match'; links: Record<string, string | null> } // left.id-index -> chosen right
  | { kind: 'fill'; filled: (string | null)[] }
  | { kind: 'label'; assigned: Record<string, string | null> } // point.id -> chosen label
  | { kind: 'order'; sequence: string[] }; // steps chosen so far, in order

function initialAnswer(item: WorkbookItem): ItemAnswer {
  switch (item.kind) {
    case 'match':
      return {
        kind: 'match',
        links: Object.fromEntries(item.pairs.map((_, i) => [`l${i}`, null])),
      };
    case 'fill':
      return { kind: 'fill', filled: item.blanks.map(() => null) };
    case 'label':
      return { kind: 'label', assigned: Object.fromEntries(item.points.map((p) => [p.id, null])) };
    case 'order':
      return { kind: 'order', sequence: [] };
  }
}

function itemComplete(item: WorkbookItem, ans: ItemAnswer): boolean {
  if (item.kind === 'match' && ans.kind === 'match') return Object.values(ans.links).every(Boolean);
  if (item.kind === 'fill' && ans.kind === 'fill') return ans.filled.every((f) => f !== null);
  if (item.kind === 'label' && ans.kind === 'label')
    return Object.values(ans.assigned).every(Boolean);
  if (item.kind === 'order' && ans.kind === 'order')
    return ans.sequence.length === item.steps.length;
  return false;
}

function itemCorrect(item: WorkbookItem, ans: ItemAnswer): boolean {
  if (item.kind === 'match' && ans.kind === 'match')
    return item.pairs.every((p, i) => ans.links[`l${i}`] === p.right);
  if (item.kind === 'fill' && ans.kind === 'fill')
    return item.blanks.every((b, i) => (ans.filled[i] ?? '').trim() === b.trim());
  if (item.kind === 'label' && ans.kind === 'label')
    return item.points.every((p) => ans.assigned[p.id] === p.label);
  if (item.kind === 'order' && ans.kind === 'order')
    return item.steps.every((s, i) => ans.sequence[i] === s);
  return false;
}

// --- Small chrome ---------------------------------------------------------------------------------

const chipStyle = (state: 'idle' | 'chosen' | 'correct' | 'wrong', hue: string) => ({
  padding: '7px 12px',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  borderRadius: 999,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border:
    state === 'correct'
      ? '1px solid var(--clss-feedback-correct)'
      : state === 'wrong'
        ? '1px solid var(--clss-feedback-retry)'
        : state === 'chosen'
          ? `1px solid ${hue}`
          : '0.5px solid var(--clss-hairline-on-paper-strong)',
  background:
    state === 'chosen'
      ? rgba(hue, 0.12)
      : state === 'correct'
        ? 'var(--clss-feedback-correctSoft)'
        : state === 'wrong'
          ? 'var(--clss-feedback-retrySoft)'
          : 'var(--clss-paper)',
  color: 'var(--clss-ink-900)',
});

// --- Match ----------------------------------------------------------------------------------------

function MatchView({
  item,
  ans,
  graded,
  hue,
  onLink,
}: {
  item: MatchItem;
  ans: Extract<ItemAnswer, { kind: 'match' }>;
  graded: boolean;
  hue: string;
  onLink: (leftId: string, right: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null); // a left waiting for its right
  const rights = useMemo(
    () =>
      shuffle(
        item.pairs.map((p) => p.right),
        item.id,
      ),
    [item],
  );
  const rightState = (r: string): 'idle' | 'chosen' | 'correct' | 'wrong' => {
    const linkedLeftIdx = item.pairs.findIndex((_, i) => ans.links[`l${i}`] === r);
    if (linkedLeftIdx < 0) return 'idle';
    if (!graded) return 'chosen';
    return item.pairs[linkedLeftIdx]?.right === r ? 'correct' : 'wrong';
  };
  return (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {item.pairs.map((p, i) => {
          const chosen = ans.links[`l${i}`];
          const state: 'idle' | 'chosen' | 'correct' | 'wrong' = graded
            ? chosen === p.right
              ? 'correct'
              : 'wrong'
            : pending === `l${i}`
              ? 'chosen'
              : chosen
                ? 'chosen'
                : 'idle';
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: positional match rows, order fixed
              key={`l${i}`}
              type="button"
              disabled={graded}
              onClick={() => !graded && setPending(`l${i}`)}
              style={{ ...chipStyle(state, hue), borderRadius: 8, textAlign: 'left' }}
            >
              {p.left}
              {chosen && <span style={{ ...whisper, marginLeft: 8, color: hue }}>→ {chosen}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {rights.map((r) => (
          <button
            key={r}
            type="button"
            disabled={graded || pending === null}
            onClick={() => {
              if (pending === null) return;
              onLink(pending, r);
              setPending(null);
            }}
            style={{ ...chipStyle(rightState(r), hue), borderRadius: 8, textAlign: 'left' }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Fill -----------------------------------------------------------------------------------------

function FillView({
  item,
  ans,
  graded,
  hue,
  onFill,
}: {
  item: FillItem;
  ans: Extract<ItemAnswer, { kind: 'fill' }>;
  graded: boolean;
  hue: string;
  onFill: (blankIndex: number, value: string | null) => void;
}) {
  const parts = item.text.split('{}');
  const bank = useMemo(
    () => shuffle([...item.blanks, ...(item.distractors ?? [])], item.id),
    [item],
  );
  const used = new Set(ans.filled.filter((f): f is string => f !== null));
  const nextEmpty = ans.filled.indexOf(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...lead, color: 'var(--clss-ink-900)', lineHeight: 2 }}>
        {parts.map((part, i) => {
          const blankIdx = i; // there are parts.length-1 blanks; blank i sits after part i
          const val = ans.filled[blankIdx];
          const correct = graded && (val ?? '').trim() === (item.blanks[blankIdx] ?? '').trim();
          return (
            <span key={`p${blankIdx}-${part.slice(0, 4)}`}>
              {part}
              {blankIdx < item.blanks.length && (
                <button
                  type="button"
                  disabled={graded || val === null}
                  onClick={() => !graded && val !== null && onFill(blankIdx, null)}
                  style={{
                    display: 'inline-block',
                    minWidth: 54,
                    margin: '0 3px',
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: `1px solid ${graded ? (correct ? 'var(--clss-feedback-correct)' : 'var(--clss-feedback-retry)') : val ? hue : 'var(--clss-hairline-on-paper-strong)'}`,
                    borderBottomWidth: 2,
                    background: val
                      ? graded
                        ? correct
                          ? 'var(--clss-feedback-correctSoft)'
                          : 'var(--clss-feedback-retrySoft)'
                        : rgba(hue, 0.1)
                      : 'transparent',
                    color: 'var(--clss-ink-900)',
                    cursor: graded || val === null ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                  }}
                >
                  {val ?? ' '}
                  {graded && !correct && (
                    <span
                      style={{ ...whisper, marginLeft: 6, color: 'var(--clss-feedback-correct)' }}
                    >
                      {item.blanks[blankIdx]}
                    </span>
                  )}
                </button>
              )}
            </span>
          );
        })}
      </div>
      {!graded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bank.map((chip) => {
            const isUsed = used.has(chip);
            return (
              <button
                key={chip}
                type="button"
                disabled={isUsed || nextEmpty < 0}
                onClick={() => nextEmpty >= 0 && onFill(nextEmpty, chip)}
                style={{ ...chipStyle(isUsed ? 'chosen' : 'idle', hue), opacity: isUsed ? 0.4 : 1 }}
              >
                {chip}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Label ----------------------------------------------------------------------------------------

function LabelView({
  item,
  ans,
  graded,
  hue,
  onAssign,
}: {
  item: LabelItem;
  ans: Extract<ItemAnswer, { kind: 'label' }>;
  graded: boolean;
  hue: string;
  onAssign: (pointId: string, label: string | null) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const bank = useMemo(
    () => shuffle([...item.points.map((p) => p.label), ...(item.distractors ?? [])], item.id),
    [item],
  );
  const used = new Set(Object.values(ans.assigned).filter((v): v is string => v !== null));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <svg
        viewBox="0 0 100 62"
        width="100%"
        style={{ maxHeight: 260 }}
        role="img"
        aria-label={item.prompt}
      >
        <rect
          x={1}
          y={1}
          width={98}
          height={60}
          rx={3}
          fill="none"
          stroke="var(--clss-hairline-on-paper)"
          strokeWidth={0.5}
        />
        {item.points.map((p) => {
          const val = ans.assigned[p.id];
          const correct = graded && val === p.label;
          const stroke = graded
            ? correct
              ? 'var(--clss-feedback-correct)'
              : 'var(--clss-feedback-retry)'
            : sel === p.id
              ? hue
              : val
                ? hue
                : 'var(--clss-ink-500)';
          return (
            // biome-ignore lint/a11y/useSemanticElements: an SVG hit target can't be a real <button>
            <g
              key={p.id}
              role="button"
              tabIndex={graded ? -1 : 0}
              aria-label={`label point: ${val ?? 'unlabelled'}`}
              onClick={() => !graded && setSel(p.id)}
              onKeyDown={(e) => {
                if (!graded && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setSel(p.id);
                }
              }}
              style={{ cursor: graded ? 'default' : 'pointer', outline: 'none' }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={2.6}
                fill={val ? rgba(hue, 0.8) : 'var(--clss-paper)'}
                stroke={stroke}
                strokeWidth={1.2}
              />
              {(val || graded) && (
                <text
                  x={p.x}
                  y={p.y - 4}
                  fontSize={4}
                  textAnchor="middle"
                  fill={stroke}
                  style={{ fontFamily: 'inherit', fontWeight: 560 }}
                >
                  {graded ? p.label : val}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {!graded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bank.map((label) => {
            const isUsed = used.has(label);
            return (
              <button
                key={label}
                type="button"
                disabled={isUsed || sel === null}
                onClick={() => {
                  if (sel === null) return;
                  onAssign(sel, label);
                  setSel(null);
                }}
                style={{ ...chipStyle(isUsed ? 'chosen' : 'idle', hue), opacity: isUsed ? 0.4 : 1 }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Order ----------------------------------------------------------------------------------------

function OrderView({
  item,
  ans,
  graded,
  hue,
  onPick,
}: {
  item: OrderItem;
  ans: Extract<ItemAnswer, { kind: 'order' }>;
  graded: boolean;
  hue: string;
  onPick: (step: string) => void;
}) {
  const shown = useMemo(() => shuffle(item.steps, item.id), [item]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {shown.map((step) => {
        const pos = ans.sequence.indexOf(step);
        const picked = pos >= 0;
        const correct = graded && item.steps[pos] === step;
        const state: 'idle' | 'chosen' | 'correct' | 'wrong' = graded
          ? correct
            ? 'correct'
            : picked
              ? 'wrong'
              : 'idle'
          : picked
            ? 'chosen'
            : 'idle';
        return (
          <button
            key={step}
            type="button"
            disabled={graded || picked}
            onClick={() => !graded && !picked && onPick(step)}
            style={{
              ...chipStyle(state, hue),
              borderRadius: 8,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: picked ? hue : 'var(--clss-tonal)',
                color: picked ? 'var(--clss-on-ink)' : 'var(--clss-ink-500)',
              }}
            >
              {picked ? pos + 1 : '·'}
            </span>
            {step}
          </button>
        );
      })}
    </div>
  );
}

// --- The workbook ---------------------------------------------------------------------------------

export function MiniWorkbook({
  spec,
  hue = hueForTopic(''),
  nodeId,
  courseId,
  setBar,
  onDone,
}: {
  spec: MiniWorkbookSpec;
  hue?: string;
  nodeId: string;
  courseId?: string;
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const reduced = useReducedMotion();
  const [answers, setAnswers] = useState<ItemAnswer[]>(() => spec.items.map(initialAnswer));
  const [graded, setGraded] = useState(false);
  const startedAt = useRef(Date.now());
  const itemIds = useRef(spec.items.map(() => crypto.randomUUID()));

  const setAnswer = (i: number, next: ItemAnswer) =>
    setAnswers((prev) => prev.map((a, j) => (j === i ? next : a)));

  const allComplete = spec.items.every((it, i) => itemComplete(it, answers[i] as ItemAnswer));
  const correctness = () => spec.items.map((it, i) => itemCorrect(it, answers[i] as ItemAnswer));

  const grade = () => {
    if (graded) return;
    const results = correctness();
    const latency = Math.max(0, Date.now() - startedAt.current);
    spec.items.forEach((it, i) => {
      const ok = results[i] ?? false;
      sdk.events.record(
        'learn.attempt.submitted.v1',
        {
          node_id: nodeId,
          item_id: itemIds.current[i],
          response: { kind: 'text', text: `${it.kind} item ${it.id}` },
          correct: ok,
          aided: false,
          independence_signal: 0.8,
          latency_ms: latency,
          attempt_index: 0,
        },
        { ontologyNodeId: nodeId, ...(courseId ? { courseId } : {}) },
      );
    });
    const allRight = results.every(Boolean);
    if (allRight) sfx.bloom();
    else sfx.wrong();
    setGraded(true);
  };

  // reveal: fill every item with the correct answer (her demonstration), then grade
  const revealAll = () => {
    setAnswers(
      // biome-ignore lint/suspicious/useIterableCallbackReturn: switch is exhaustive over WorkbookItem kinds
      spec.items.map((it): ItemAnswer => {
        switch (it.kind) {
          case 'match':
            return {
              kind: 'match',
              links: Object.fromEntries(it.pairs.map((p, i) => [`l${i}`, p.right])),
            };
          case 'fill':
            return { kind: 'fill', filled: [...it.blanks] };
          case 'label':
            return {
              kind: 'label',
              assigned: Object.fromEntries(it.points.map((p) => [p.id, p.label])),
            };
          case 'order':
            return { kind: 'order', sequence: [...it.steps] };
        }
      }),
    );
    window.setTimeout(grade, 60);
  };

  // the action bar: Check (held until every item is complete) → Continue
  // biome-ignore lint/correctness/useExhaustiveDependencies: grade/correctness close over live answers; graded+answers drive it
  useEffect(() => {
    if (!graded) {
      setBar({
        primary: { label: 'Check', disabled: !allComplete, onClick: grade },
      });
    } else {
      const right = correctness().filter(Boolean).length;
      setBar({
        primary: {
          label: right === spec.items.length ? 'Continue' : 'Got it, continue',
          onClick: onDone,
        },
      });
    }
  }, [graded, allComplete, answers, setBar, onDone]);

  // she reads the workbook at code level, and can drive it
  const doneCount = spec.items.filter((it, i) => itemComplete(it, answers[i] as ItemAnswer)).length;
  useRegisterTarget<HTMLDivElement>(`workbook-${spec.id}`, {
    kind: 'workbook',
    label: `mini-workbook: ${spec.title}`,
    getSceneState: () => ({
      title: spec.title,
      items: spec.items.length,
      completed: doneCount,
      graded,
      correct: graded ? correctness().filter(Boolean).length : undefined,
    }),
    getValidActions: () =>
      graded
        ? ['continue']
        : allComplete
          ? ['check the answers']
          : ['finish every item, then check'],
    applyTutorAction: (patch) => {
      if (patch.reveal === true) return revealAll();
      if (patch.check === true && allComplete) return grade();
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: correctness closes over answers; the listed deps cover the read
  useEffect(() => {
    bus.publishCanvas({
      nodeId,
      steps: [
        `mini-workbook: ${spec.title}`,
        `${doneCount} of ${spec.items.length} items done`,
        graded
          ? `checked — ${correctness().filter(Boolean).length}/${spec.items.length} correct`
          : 'not yet checked',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, spec, doneCount, graded]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  return (
    <CardBody maxWidth={640} center={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={whisper}>a quick check · answered together</div>
          <div style={{ ...cardTitle, marginTop: 8 }}>{spec.title}</div>
        </div>
        {spec.items.map((item, i) => {
          const ans = answers[i] as ItemAnswer;
          const done = graded && itemCorrect(item, ans);
          return (
            <motion.div
              key={item.id}
              initial={reduced ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduced ? 0 : i * 0.06,
                type: 'spring',
                stiffness: 300,
                damping: 28,
              }}
              style={{
                border: graded
                  ? done
                    ? '1px solid var(--clss-feedback-correct)'
                    : '1px solid var(--clss-feedback-retry)'
                  : '0.5px solid var(--clss-hairline-on-paper-strong)',
                background: graded
                  ? done
                    ? 'var(--clss-feedback-correctSoft)'
                    : 'var(--clss-feedback-retrySoft)'
                  : 'var(--clss-paper)',
                borderRadius: 3,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 520,
                  color: 'var(--clss-ink-900)',
                  lineHeight: 1.5,
                }}
              >
                {item.prompt}
              </div>
              {item.kind === 'match' && ans.kind === 'match' && (
                <MatchView
                  item={item}
                  ans={ans}
                  graded={graded}
                  hue={hue}
                  onLink={(l, r) =>
                    setAnswer(i, { kind: 'match', links: { ...ans.links, [l]: r } })
                  }
                />
              )}
              {item.kind === 'fill' && ans.kind === 'fill' && (
                <FillView
                  item={item}
                  ans={ans}
                  graded={graded}
                  hue={hue}
                  onFill={(bi, v) =>
                    setAnswer(i, {
                      kind: 'fill',
                      filled: ans.filled.map((f, j) => (j === bi ? v : f)),
                    })
                  }
                />
              )}
              {item.kind === 'label' && ans.kind === 'label' && (
                <LabelView
                  item={item}
                  ans={ans}
                  graded={graded}
                  hue={hue}
                  onAssign={(pid, l) =>
                    setAnswer(i, { kind: 'label', assigned: { ...ans.assigned, [pid]: l } })
                  }
                />
              )}
              {item.kind === 'order' && ans.kind === 'order' && (
                <OrderView
                  item={item}
                  ans={ans}
                  graded={graded}
                  hue={hue}
                  onPick={(s) => setAnswer(i, { kind: 'order', sequence: [...ans.sequence, s] })}
                />
              )}
            </motion.div>
          );
        })}
        <AnimatePresence>
          {graded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', color: 'var(--clss-ink-700)', fontSize: '0.95rem' }}
            >
              {correctness().every(Boolean)
                ? 'all of them — clean.'
                : 'the greens are yours; the reds show the answer worth keeping.'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CardBody>
  );
}

// --- A hand-authored demo (proves every verb end to end) ------------------------------------------

export const WORKBOOK_DEMO: MiniWorkbookSpec = {
  id: 'demo-workbook',
  title: 'hold what you built',
  items: [
    {
      id: 'm1',
      kind: 'match',
      prompt: 'match each particle to where it lives.',
      pairs: [
        { left: 'proton', right: 'in the nucleus' },
        { left: 'electron', right: 'in a shell' },
        { left: 'neutron', right: 'in the nucleus, no charge' },
      ],
    },
    {
      id: 'f1',
      kind: 'fill',
      prompt: 'fill the gaps from the bank.',
      text: 'an atom of carbon has {} protons, which is what makes it {}.',
      blanks: ['6', 'carbon'],
      distractors: ['8', 'oxygen'],
    },
    {
      id: 'o1',
      kind: 'order',
      prompt: 'put the shells in filling order, innermost first.',
      steps: ['first shell (2)', 'second shell (8)', 'third shell (8)'],
    },
  ],
};
