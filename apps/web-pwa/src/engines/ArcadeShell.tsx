'use client';

/**
 * ArcadeShell — a minimal game frame (score · lives · restart) hosting a spec-driven micro-game
 * where the mechanic IS the concept (DESIGN.md §9, "mini-games & arcade"). It ships with one proven
 * pattern: a falling-answers catch game wired to real quiz items. Options rain down; slide the
 * catcher to grab the correct answer for the current question. A right catch scores and records real
 * evidence (learn.attempt.submitted.v1); a wrong catch (or letting the answer fall past) costs a
 * life. Three lives, then restart.
 *
 * Registers as a Wobo scene target (Wobo can nudge the catcher / restart). Keyboard + pointer
 * driven, reduced-motion aware (calmer fall), mute-aware via sfx, both themes, no new deps.
 */

import { useRegisterTarget, useWoboBus } from '@wobo/wobo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { BarState } from '../screens/course/shared';
import { CardBody, cardTitle, rgba, Stage, whisper } from '../screens/course/shared';
import { useSdk } from '../store/sdk';
import { hueForTopic } from '../ui/hues';
import { sfx } from '../ui/sound';

// --- The spec ------------------------------------------------------------------------------------

export interface ArcadeRound {
  id: string;
  prompt: string;
  answer: string;
  distractors: string[];
}

export interface ArcadeSpec {
  id: string;
  title: string;
  /** The one shipped mechanic. Kept as a field so new mechanics slot in behind the same shell. */
  game: 'catch';
  rounds: ArcadeRound[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

export function parseArcade(raw: unknown): ArcadeSpec | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.artifact) ? raw.artifact : raw;
  if (raw.verified === false || src.verified === false) return null;
  const rounds = (Array.isArray(src.rounds) ? src.rounds : [])
    .filter(
      (r): r is Record<string, unknown> =>
        isRecord(r) && str(r.prompt) && str(r.answer) && Array.isArray(r.distractors),
    )
    .map((r, i) => ({
      id: str(r.id) ? (r.id as string) : `r${i + 1}`,
      prompt: r.prompt as string,
      answer: r.answer as string,
      distractors: (r.distractors as unknown[]).filter(str).slice(0, 3),
    }))
    .filter((r) => r.distractors.length >= 1);
  if (rounds.length === 0 || rounds.length > 12) return null;
  return {
    id: str(src.id) ? src.id : 'arcade',
    title: str(src.title) ? src.title : 'catch it',
    game: 'catch',
    rounds,
  };
}

// --- Falling item -----------------------------------------------------------------------------------

interface FallingItem {
  key: string;
  label: string;
  correct: boolean;
  x: number; // 0..100
  y: number; // 0..100 (0 top)
  vy: number; // per second
  caught: 'right' | 'wrong' | null;
}

const CATCHER_Y = 88;
const CATCHER_W = 24; // half-width of the catch zone in x units
const START_LIVES = 3;

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  let h = seed >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

// --- The game -------------------------------------------------------------------------------------

type Phase = 'ready' | 'playing' | 'won' | 'lost';

export function ArcadeShell({
  spec,
  hue = hueForTopic(''),
  nodeId,
  courseId,
  setBar,
  onDone,
}: {
  spec: ArcadeSpec;
  hue?: string;
  nodeId: string;
  courseId?: string;
  setBar?: (b: BarState | null) => void;
  onDone?: () => void;
}) {
  const sdk = useSdk();
  const bus = useWoboBus();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [items, setItems] = useState<FallingItem[]>([]);
  const catcherX = useRef(50);
  const [catcherRender, setCatcherRender] = useState(50);
  const lastTs = useRef(0);
  const rafRef = useRef(0);
  const roundRef = useRef(0);
  const settling = useRef(false); // true briefly after a catch, before the next round
  const areaRef = useRef<HTMLDivElement>(null);
  const itemIds = useRef<Map<number, string>>(new Map());

  const fallSpeed = reduced ? 14 : 22; // x-units? no — y-units per second

  const spawnRound = useCallback(
    (r: number) => {
      const cur = spec.rounds[r];
      if (!cur) return;
      const options = shuffleSeeded(
        [
          { label: cur.answer, correct: true },
          ...cur.distractors.map((d) => ({ label: d, correct: false })),
        ],
        r + 1,
      );
      const n = options.length;
      const spawned: FallingItem[] = options.map((o, i) => ({
        key: `${r}-${i}`,
        label: o.label,
        correct: o.correct,
        x: 14 + (i + 0.5) * (72 / n) + (reduced ? 0 : (Math.random() - 0.5) * 6),
        y: -10 - i * 22, // staggered entry from above
        vy: fallSpeed * (0.85 + i * 0.08),
        caught: null,
      }));
      settling.current = false;
      setItems(spawned);
      if (!itemIds.current.has(r)) itemIds.current.set(r, crypto.randomUUID());
    },
    [spec, fallSpeed, reduced],
  );

  const recordAttempt = useCallback(
    (r: number, correct: boolean) => {
      sdk.events.record(
        'learn.attempt.submitted.v1',
        {
          node_id: nodeId,
          item_id: itemIds.current.get(r) ?? crypto.randomUUID(),
          response: { kind: 'choice', selected: [correct ? 'caught-answer' : 'caught-wrong'] },
          correct,
          aided: false,
          independence_signal: 0.9,
          latency_ms: 0,
          attempt_index: 0,
        },
        { ontologyNodeId: nodeId, ...(courseId ? { courseId } : {}) },
      );
    },
    [sdk, nodeId, courseId],
  );

  const loseLife = useCallback(() => {
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) setPhase('lost');
      return Math.max(0, next);
    });
  }, []);

  const advanceRound = useCallback(
    (r: number) => {
      settling.current = true;
      window.setTimeout(
        () => {
          if (r >= spec.rounds.length - 1) {
            setPhase('won');
            return;
          }
          const nr = r + 1;
          roundRef.current = nr;
          setRound(nr);
          spawnRound(nr);
        },
        reduced ? 200 : 550,
      );
    },
    [spec.rounds.length, spawnRound, reduced],
  );

  // the game loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const step = (ts: number) => {
      const dt = lastTs.current ? Math.min(0.05, (ts - lastTs.current) / 1000) : 0;
      lastTs.current = ts;
      setItems((prev) => {
        if (settling.current) return prev;
        let hitRight = false;
        let hitWrong = false;
        let missedAnswer = false;
        const next: FallingItem[] = [];
        for (const it of prev) {
          if (it.caught) {
            next.push(it);
            continue;
          }
          const y = it.y + it.vy * dt;
          // collision with the catcher band
          if (
            y >= CATCHER_Y &&
            it.y < CATCHER_Y &&
            Math.abs(it.x - catcherX.current) <= CATCHER_W / 2 + 6
          ) {
            if (it.correct) hitRight = true;
            else hitWrong = true;
            next.push({ ...it, y, caught: it.correct ? 'right' : 'wrong' });
            continue;
          }
          if (y > 108) {
            if (it.correct) missedAnswer = true; // the answer fell past — a miss
            continue; // drop it
          }
          next.push({ ...it, y });
        }
        const r = roundRef.current;
        if (hitRight) {
          settling.current = true;
          sfx.bloom();
          setScore((s) => s + 1);
          recordAttempt(r, true);
          advanceRound(r);
        } else if (hitWrong) {
          sfx.wrong();
          recordAttempt(r, false);
          loseLife();
        } else if (missedAnswer && !settling.current) {
          sfx.wrong();
          loseLife();
          advanceRound(r);
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, advanceRound, loseLife, recordAttempt]);

  const start = useCallback(() => {
    setScore(0);
    setLives(START_LIVES);
    setRound(0);
    roundRef.current = 0;
    lastTs.current = 0;
    catcherX.current = 50;
    setCatcherRender(50);
    setPhase('playing');
    spawnRound(0);
  }, [spawnRound]);

  // pointer + keyboard control of the catcher
  const moveCatcher = useCallback((x: number) => {
    const clamped = Math.max(CATCHER_W / 2, Math.min(100 - CATCHER_W / 2, x));
    catcherX.current = clamped;
    setCatcherRender(clamped);
  }, []);
  const onPointer = (e: ReactPointerEvent) => {
    if (phase !== 'playing') return;
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    moveCatcher(((e.clientX - rect.left) / rect.width) * 100);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'ArrowLeft') moveCatcher(catcherX.current - 8);
      else if (e.key === 'ArrowRight') moveCatcher(catcherX.current + 8);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, moveCatcher]);

  // the action bar — advance out of the game (won or as an escape hatch)
  useEffect(() => {
    if (!setBar) return;
    setBar({
      primary: {
        label: phase === 'won' ? 'continue' : 'done',
        disabled: false,
        onClick: () => onDone?.(),
      },
      secondary:
        phase === 'lost' || phase === 'won' ? { label: 'play again', onClick: start } : undefined,
    });
  }, [setBar, phase, onDone, start]);

  const stageRef = useRegisterTarget<HTMLDivElement>(`arcade-${spec.id}`, {
    kind: 'arcade',
    label: `catch game: ${spec.title}`,
    getSceneState: () => ({
      title: spec.title,
      phase,
      round: `${round + 1} of ${spec.rounds.length}`,
      prompt: spec.rounds[round]?.prompt,
      score,
      lives,
    }),
    getValidActions: () =>
      phase === 'playing'
        ? ['move the catcher left or right', 'catch the correct answer']
        : ['start the game'],
    applyTutorAction: (patch) => {
      if (patch.start === true) return start();
      if (patch.move === 'left') return moveCatcher(catcherX.current - 10);
      if (patch.move === 'right') return moveCatcher(catcherX.current + 10);
      if (typeof patch.catcherX === 'number') return moveCatcher(patch.catcherX);
    },
  });

  useEffect(() => {
    bus.publishCanvas({
      nodeId,
      steps: [
        `arcade: ${spec.title}`,
        `${phase} · round ${round + 1}/${spec.rounds.length}`,
        `score ${score} · lives ${lives}`,
        spec.rounds[round]?.prompt ?? '',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, spec, phase, round, score, lives]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  const cur = spec.rounds[round];

  return (
    <CardBody maxWidth={620} center={false}>
      <div ref={stageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 12,
          }}
        >
          <div>
            <div style={whisper}>catch the answer</div>
            <div style={{ ...cardTitle, marginTop: 6 }}>{spec.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={whisper}>score</div>
              <div
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  color: 'var(--wobo-ink-900)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {score}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }} role="img" aria-label={`${lives} lives`}>
              {Array.from({ length: START_LIVES }, (_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed life pips
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: i < lives ? hue : 'var(--wobo-ink-100)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* the current question — what you're hunting for */}
        {cur && phase === 'playing' && (
          <div
            style={{
              ...whisper,
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: '1rem',
              color: 'var(--wobo-ink-900)',
              fontWeight: 520,
            }}
          >
            {cur.prompt}
          </div>
        )}

        {/* the play field */}
        <div ref={areaRef} onPointerMove={onPointer} style={{ touchAction: 'none' }}>
          <Stage hue={hue} tint={0.05} minHeight={340} style={{ padding: 0 }}>
            <div style={{ position: 'relative', width: '100%', height: 340, overflow: 'hidden' }}>
              {/* falling answer chips */}
              <AnimatePresence>
                {items.map((it) => (
                  <div
                    key={it.key}
                    style={{
                      position: 'absolute',
                      left: `${it.x}%`,
                      top: `${it.y}%`,
                      transform: 'translate(-50%, -50%)',
                      padding: '7px 13px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                      fontSize: '0.9rem',
                      fontWeight: 520,
                      border: `1px solid ${it.caught === 'right' ? 'var(--wobo-feedback-correct)' : it.caught === 'wrong' ? 'var(--wobo-feedback-retry)' : 'var(--wobo-hairline-on-paper-strong)'}`,
                      background:
                        it.caught === 'right'
                          ? 'var(--wobo-feedback-correctSoft)'
                          : it.caught === 'wrong'
                            ? 'var(--wobo-feedback-retrySoft)'
                            : 'var(--wobo-paper)',
                      color: 'var(--wobo-ink-900)',
                      opacity: it.caught ? 0.85 : 1,
                      pointerEvents: 'none',
                    }}
                  >
                    {it.label}
                  </div>
                ))}
              </AnimatePresence>

              {/* the catcher */}
              {phase === 'playing' && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${catcherRender}%`,
                    top: `${CATCHER_Y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${CATCHER_W}%`,
                    height: 14,
                    borderRadius: 999,
                    background: hue,
                    boxShadow: `0 0 0 4px ${rgba(hue, 0.18)}`,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* ready / won / lost overlays */}
              {phase !== 'playing' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    padding: 20,
                    textAlign: 'center',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{ fontSize: '1.3rem', fontWeight: 560, color: 'var(--wobo-ink-900)' }}
                    >
                      {phase === 'ready'
                        ? 'slide to catch the right answer'
                        : phase === 'won'
                          ? `cleared it — ${score}/${spec.rounds.length}`
                          : `out of lives — ${score} caught`}
                    </div>
                    <div
                      style={{ ...whisper, textTransform: 'none', letterSpacing: 0, maxWidth: 320 }}
                    >
                      {phase === 'ready'
                        ? 'move with your finger or the arrow keys. grab the answer, dodge the rest.'
                        : phase === 'won'
                          ? 'every question, caught clean.'
                          : 'the answers are still yours — give it another run.'}
                    </div>
                    <button
                      type="button"
                      onClick={start}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 999,
                        border: 'none',
                        background: hue,
                        color: 'var(--wobo-on-ink)',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        fontWeight: 540,
                        cursor: 'pointer',
                      }}
                    >
                      {phase === 'ready' ? 'start' : 'play again'}
                    </button>
                  </motion.div>
                </div>
              )}
            </div>
          </Stage>
        </div>
      </div>
    </CardBody>
  );
}

// --- A hand-authored demo (real quiz items) -------------------------------------------------------

export const ARCADE_DEMO: ArcadeSpec = {
  id: 'demo-arcade',
  title: 'element catch',
  game: 'catch',
  rounds: [
    {
      id: 'r1',
      prompt: 'catch the element with 6 protons.',
      answer: 'carbon',
      distractors: ['oxygen', 'helium'],
    },
    {
      id: 'r2',
      prompt: 'catch the particle with no charge.',
      answer: 'neutron',
      distractors: ['proton', 'electron'],
    },
    {
      id: 'r3',
      prompt: 'catch what decides the element.',
      answer: 'proton count',
      distractors: ['electron count', 'neutron count'],
    },
  ],
};
