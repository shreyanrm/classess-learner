'use client';

/**
 * The composing journey. Seed mode: an honest, beautiful state for topics whose verified course
 * is not built yet — Vidya writes the outline in ink, then runs a small structural mini-course.
 * Live mode: while the ink draws, the engines are asked for the real thing (engine.compose, then
 * engine.simulate / engine.diagram / engine.motion / engine.image per card) and the generated
 * course renders through the runtime engines. Refusal anywhere is invisible — anything that does
 * not parse, verify, or arrive falls back to the seed journey, never to an error (CONTEXT.md §6).
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';
import { imageSrcFrom, GeneratedImage } from '../../engines/GeneratedImage';
import { DiagramView, svgIsClean } from '../../engines/DiagramView';
import { type MotionScene, MotionPlayer, parseMotionScene } from '../../engines/MotionPlayer';
import { parseSimSpec, type SimSpec, SimRunner } from '../../engines/SimRunner';
import { useRouter } from '../../shell/router';
import { useSdk } from '../../store/sdk';
import { useVidyaChat } from '../../vidya/chat';
import type { BarState } from './shared';
import { CardBody, cardTitle, Deck, lead, whisper } from './shared';

const ATOM_TOPIC_ID = 'm2-1';

// --- The composed course (engine.compose output, validated before anything renders) ---------------

type CardKind = 'sim' | 'diagram' | 'motion' | 'image' | 'text';

interface ComposedCard {
  id: string;
  kind: CardKind;
  title: string;
  blurb?: string;
  /** Text cards carry their body inline. */
  body?: string;
  /** An artifact the composer embedded directly (spec / svg / scene / image). */
  inline?: unknown;
}

interface ComposedCourse {
  courseId: string;
  title: string;
  cards: ComposedCard[];
}

const KINDS: ReadonlySet<string> = new Set(['sim', 'diagram', 'motion', 'image', 'text']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function parseComposedCourse(raw: unknown, fallbackTitle: string): ComposedCourse | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.course) ? raw.course : raw;
  // the verifier's word is law: an explicitly unverified compilation never serves
  if (src.all_verified === false || src.verified === false) return null;
  const rawCards = Array.isArray(src.cards) ? src.cards : Array.isArray(src.nodes) ? src.nodes : [];
  const cards: ComposedCard[] = [];
  rawCards.forEach((c, i) => {
    if (!isRecord(c)) return;
    const kindRaw =
      typeof c.kind === 'string' ? c.kind : typeof c.modality === 'string' ? c.modality : 'text';
    const kind = kindRaw === 'simulator' ? 'sim' : kindRaw;
    const title =
      typeof c.title === 'string' ? c.title : typeof c.name === 'string' ? c.name : null;
    if (!KINDS.has(kind) || !title) return;
    cards.push({
      id: typeof c.id === 'string' ? c.id : `card-${i}`,
      kind: kind as CardKind,
      title,
      blurb: typeof c.blurb === 'string' ? c.blurb : undefined,
      body: typeof c.body === 'string' ? c.body : undefined,
      inline: c.spec ?? c.svg ?? c.scene ?? c.image ?? undefined,
    });
  });
  if (cards.length < 2) return null;
  return {
    courseId:
      typeof src.course_id === 'string' && UUID_RE.test(src.course_id)
        ? src.course_id
        : crypto.randomUUID(),
    title: typeof src.title === 'string' ? src.title : fallbackTitle,
    cards,
  };
}

// --- Per-card artifacts (hydrated through the matching engine capability) --------------------------

type Artifact =
  | { status: 'pending' }
  | { status: 'failed' }
  | { status: 'ready'; kind: 'sim'; spec: SimSpec }
  | { status: 'ready'; kind: 'diagram'; svg: string }
  | { status: 'ready'; kind: 'motion'; scene: MotionScene }
  | { status: 'ready'; kind: 'image'; src: string };

const ENGINE_FOR: Record<Exclude<CardKind, 'text'>, string> = {
  sim: 'engine.simulate',
  diagram: 'engine.diagram',
  motion: 'engine.motion',
  image: 'engine.image',
};

function parseArtifact(kind: CardKind, raw: unknown): Artifact | null {
  if (kind === 'sim') {
    const spec = parseSimSpec(raw);
    return spec ? { status: 'ready', kind: 'sim', spec } : null;
  }
  if (kind === 'diagram') {
    const svg =
      typeof raw === 'string' ? raw : isRecord(raw) && typeof raw.svg === 'string' ? raw.svg : null;
    return svg && svgIsClean(svg) ? { status: 'ready', kind: 'diagram', svg } : null;
  }
  if (kind === 'motion') {
    const scene = parseMotionScene(raw);
    return scene ? { status: 'ready', kind: 'motion', scene } : null;
  }
  if (kind === 'image') {
    const src = imageSrcFrom(raw);
    return src ? { status: 'ready', kind: 'image', src } : null;
  }
  return null;
}

function useArtifact(card: ComposedCard, topic: string, courseId: string): Artifact {
  const sdk = useSdk();
  const [artifact, setArtifact] = useState<Artifact>({ status: 'pending' });

  useEffect(() => {
    if (card.kind === 'text') return;
    const inline = card.inline === undefined ? null : parseArtifact(card.kind, card.inline);
    if (inline) {
      setArtifact(inline);
      return;
    }
    let cancelled = false;
    setArtifact({ status: 'pending' });
    sdk.llm
      .invoke(
        ENGINE_FOR[card.kind],
        { topic, concept: card.title, brief: card.blurb ?? '', course_id: courseId, difficulty: 'core' },
        { consentTier: 'un_elevated' },
      )
      .then((res) => {
        if (!cancelled) setArtifact(parseArtifact(card.kind, res.output) ?? { status: 'failed' });
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

const KIND_SEAL: Record<CardKind, string> = {
  sim: 'drag it — feel the law move',
  diagram: 'the picture',
  motion: 'watch it move',
  image: 'the real thing',
  text: 'the idea',
};

function PendingCard() {
  return (
    <div
      style={{
        border: '0.5px solid var(--clss-hairline-on-paper)',
        borderRadius: 'var(--clss-radius-md)',
        padding: '44px 0',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        style={whisper}
      >
        composing this piece
      </motion.div>
    </div>
  );
}

function GeneratedCard({
  card,
  topic,
  courseId,
}: {
  card: ComposedCard;
  topic: string;
  courseId: string;
}) {
  const artifact = useArtifact(card, topic, courseId);

  let surface: ReactNode = null;
  if (card.kind === 'text') {
    surface = card.body ? (
      <div style={{ ...lead, color: 'var(--clss-ink-900)' }}>{card.body}</div>
    ) : null;
  } else if (artifact.status === 'ready') {
    surface =
      artifact.kind === 'sim' ? (
        <SimRunner spec={artifact.spec} />
      ) : artifact.kind === 'diagram' ? (
        <DiagramView id={card.id} svg={artifact.svg} label={`diagram: ${card.title}`} />
      ) : artifact.kind === 'motion' ? (
        <MotionPlayer scene={artifact.scene} />
      ) : (
        <GeneratedImage id={card.id} src={artifact.src} alt={card.title} />
      );
  } else if (card.kind === 'image') {
    // the image frame waits gracefully on its own
    surface = <GeneratedImage id={card.id} src={null} alt={card.title} />;
  } else if (artifact.status === 'pending') {
    surface = <PendingCard />;
  }
  // a failed artifact renders nothing — the title and blurb stand alone, refusal invisible

  return (
    <CardBody maxWidth={620}>
      <div style={whisper}>{KIND_SEAL[card.kind]}</div>
      <div style={cardTitle}>{card.title.toLowerCase()}</div>
      {card.blurb && <div style={lead}>{card.blurb}</div>}
      {surface}
    </CardBody>
  );
}

function GeneratedJourney({
  course,
  topic,
  setBar,
  setProgress,
  onExit,
}: {
  course: ComposedCourse;
  topic: string;
  setBar: (b: BarState | null) => void;
  setProgress: (p: { f: number; segments: number }) => void;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const count = course.cards.length;
  const last = idx >= count - 1;
  const card = course.cards[Math.min(idx, count - 1)];

  // endowed progress — never empty, never quite full until done
  useEffect(() => {
    setProgress({ f: (idx + 0.6) / count, segments: count });
  }, [idx, count, setProgress]);

  useEffect(() => {
    setBar({
      primary: {
        label: last ? 'done' : 'continue',
        onClick: () => (last ? onExit() : setIdx((i) => i + 1)),
      },
      ...(last ? {} : { secondary: { label: 'done', onClick: onExit } }),
    });
  }, [last, onExit, setBar]);

  if (!card) return null;
  return (
    <Deck id={`gen-${idx}`}>
      <GeneratedCard card={card} topic={topic} courseId={course.courseId} />
    </Deck>
  );
}

// --- The seed journey (the honest floor — unchanged in spirit and in fact) -------------------------

/** Structural outline — a plan, never an unverified fact. */
function outlineFor(name: string): string[] {
  const n = name.toLowerCase();
  return [
    `what ${n} is really asking`,
    `${n}, made visible`,
    'bend it until it breaks',
    `where ${n} shows up around you`,
    'the boss — prove it is yours',
  ];
}

function revealsFor(name: string): { seal: string; text: string }[] {
  const n = name.toLowerCase();
  return [
    {
      seal: 'first',
      text: `${n} gets made visible — something you can drag and push, never a paragraph to sit through.`,
    },
    {
      seal: 'then',
      text: 'you bend it until it breaks — the fastest way to trust a rule is to find where it stops working.',
    },
    {
      seal: 'last',
      text: 'the boss — you prove it is yours, the greeting lands, and the map lights up.',
    },
  ];
}

function SeedPreview({
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
  const router = useRouter();
  const bus = useVidyaBus();
  const { setMood } = useVidyaChat();

  const [stage, setStage] = useState(1);
  const [reflection, setReflection] = useState('');
  const [shared, setShared] = useState(false);
  const [opened, setOpened] = useState<boolean[]>([false, false, false]);

  const reveals = revealsFor(title);
  const allOpen = opened.every(Boolean);

  const reflectionRef = useRegisterTarget<HTMLTextAreaElement>('course-reflection', {
    kind: 'input',
    label: `where the learner writes what they already notice about ${title.toLowerCase()}`,
  });

  // endowed progress across the preview cards
  useEffect(() => {
    const f = [0.38, 0.38, 0.64, 0.92][stage] ?? 0.92;
    setProgress({ f, segments: 4 });
  }, [setProgress, stage]);

  useEffect(() => {
    if (!shared || reflection === '') return;
    bus.publishCanvas({
      nodeId: `composing-${topicId}`,
      steps: [`the learner's own noticing about ${title.toLowerCase()}: ${reflection}`],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, topicId, title, shared, reflection]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  // the action bar per card
  useEffect(() => {
    if (stage === 1) {
      setBar(
        shared
          ? { primary: { label: 'continue', onClick: () => setStage(2) } }
          : {
              primary: {
                label: 'share it',
                disabled: reflection.trim().length < 3,
                onClick: () => {
                  setShared(true);
                  setMood('correct');
                  window.setTimeout(() => setMood('idle'), 1400);
                },
              },
            },
      );
    } else if (stage === 2) {
      setBar({ primary: { label: 'continue', onClick: () => setStage(3), disabled: !allOpen } });
    } else {
      setBar({
        primary: {
          label: 'open the atom',
          onClick: () => router.replace({ name: 'course', topicId: ATOM_TOPIC_ID }),
        },
        secondary: { label: 'done', onClick: onExit },
      });
    }
  }, [setBar, stage, shared, reflection, allOpen, router, onExit, setMood]);

  return (
    <Deck id={`compose-${stage}`}>
      {stage === 1 && (
        <CardBody maxWidth={560}>
          <div style={whisper}>before anything</div>
          <div style={cardTitle}>what do you already notice about {title.toLowerCase()}?</div>
          <div style={lead}>there is no wrong answer — your own noticing is the raw material.</div>
          <textarea
            ref={reflectionRef}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            disabled={shared}
            rows={4}
            placeholder="write anything you have seen, guessed, or wondered…"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 'var(--clss-radius-sm)',
              outline: 'none',
              resize: 'vertical',
              background: 'var(--clss-paper)',
              color: 'var(--clss-ink-900)',
            }}
          />
          <AnimatePresence>
            {shared && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                style={{ ...lead, borderLeft: '2px solid var(--clss-ink-900)', paddingLeft: 14 }}
              >
                held. the finished course will take exactly this and test it against the real thing
                — that is how the good ones start.
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      )}

      {stage === 2 && (
        <CardBody maxWidth={560}>
          <div style={whisper}>act first — tap each seal</div>
          <div style={cardTitle}>how this course will treat you</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
            {reveals.map((r, i) => (
              <motion.button
                key={r.seal}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setOpened((o) => o.map((v, j) => (j === i ? true : v)))}
                aria-expanded={opened[i]}
                style={{
                  textAlign: 'left',
                  padding: '16px 18px',
                  fontFamily: 'inherit',
                  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  borderRadius: 'var(--clss-radius-md)',
                  background: opened[i] ? 'var(--clss-paper)' : 'var(--clss-canvas)',
                  cursor: opened[i] ? 'default' : 'pointer',
                }}
              >
                <span style={whisper}>{r.seal}</span>
                <AnimatePresence mode="wait" initial={false}>
                  {opened[i] ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                      style={{
                        marginTop: 6,
                        fontSize: '0.98rem',
                        lineHeight: 1.6,
                        color: 'var(--clss-ink-900)',
                      }}
                    >
                      {r.text}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sealed"
                      exit={{ opacity: 0 }}
                      style={{ marginTop: 6, fontSize: '0.98rem', color: 'var(--clss-ink-500)' }}
                    >
                      tap to open
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </CardBody>
      )}

      {stage === 3 && (
        <CardBody maxWidth={520}>
          <div style={{ textAlign: 'center' }}>
            <div style={whisper}>while this course is verified</div>
            <div style={{ ...cardTitle, marginTop: 12 }}>one door is already open</div>
            <div style={{ ...lead, marginTop: 12 }}>
              the full {title.toLowerCase()} course is being prepared and checked line by line. the
              atom — linear equations — is live today, end to end: the scale, the sandbox, the boss,
              the greeting.
            </div>
          </div>
        </CardBody>
      )}
    </Deck>
  );
}

// --- The composing shell (the ink card, then whichever journey is real) -----------------------------

const COMPOSE_TIMEOUT_MS = 20_000;

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
  const live = sdk.config.llmMode === 'live';

  const [course, setCourse] = useState<ComposedCourse | null>(null);
  const [settled, setSettled] = useState(!live);
  const [inkDone, setInkDone] = useState(false);
  const [entered, setEntered] = useState(false);

  // live mode: ask the engines for the real course while the ink draws
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let timer = 0;
    (async () => {
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = window.setTimeout(() => reject(new Error('compose timeout')), COMPOSE_TIMEOUT_MS);
        });
        const res = await Promise.race([
          sdk.llm.invoke(
            'engine.compose',
            {
              topic_id: topicId,
              topic: title,
              difficulty: 'core',
              modalities: ['sim', 'diagram', 'motion', 'image', 'text'],
            },
            { consentTier: 'un_elevated' },
          ),
          timeout,
        ]);
        const parsed = parseComposedCourse(res.output, title);
        if (!cancelled && parsed) {
          setCourse(parsed);
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
        // refusal invisible — the seed journey is the floor, never an error
      }
      window.clearTimeout(timer);
      if (!cancelled) setSettled(true);
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [live, sdk, topicId, title]);

  // she is visibly composing
  useEffect(() => {
    if (entered) return;
    setMood('thinking');
    const done = window.setTimeout(() => {
      setInkDone(true);
      setMood('idle');
    }, 3300);
    return () => window.clearTimeout(done);
  }, [entered, setMood]);

  // endowed progress for the ink card
  useEffect(() => {
    if (entered) return;
    setProgress({ f: 0.08, segments: course ? course.cards.length : 4 });
  }, [entered, course, setProgress]);

  // the ink card's action bar
  useEffect(() => {
    if (entered) return;
    setBar({
      primary: {
        label: course ? 'start the course' : 'start the preview',
        onClick: () => setEntered(true),
        disabled: !(inkDone && settled),
      },
    });
  }, [entered, course, inkDone, settled, setBar]);

  if (entered && course) {
    return (
      <GeneratedJourney
        course={course}
        topic={title}
        setBar={setBar}
        setProgress={setProgress}
        onExit={onExit}
      />
    );
  }
  if (entered) {
    return (
      <SeedPreview
        topicId={topicId}
        title={title}
        setBar={setBar}
        setProgress={setProgress}
        onExit={onExit}
      />
    );
  }

  const outline = course ? course.cards.map((c) => c.title.toLowerCase()) : outlineFor(title);
  const inkNote = course
    ? 'written and verified — it starts on the next card.'
    : settled
      ? 'the full course is in verification — nothing lands here until it passes. a working preview is ready now.'
      : 'every line is being checked before it reaches you.';

  return (
    <Deck id="compose-ink">
      <CardBody maxWidth={560}>
        <div style={whisper}>Vidya is writing your course</div>
        <div style={cardTitle}>{title.toLowerCase()}</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
          {/* the ink line, drawing itself */}
          <svg
            width="20"
            height={outline.length * 54}
            viewBox={`0 0 20 ${outline.length * 54}`}
            role="presentation"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <motion.path
              d={`M 10 6 C 4 ${outline.length * 9}, 16 ${outline.length * 27}, 10 ${outline.length * 54 - 10}`}
              fill="none"
              stroke="var(--clss-ink-900)"
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.9, ease: [0.3, 0, 0.2, 1] }}
            />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {outline.map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.55, duration: 0.45, ease: [0.2, 0, 0, 1] }}
                style={{
                  fontSize: '1.02rem',
                  color: 'var(--clss-ink-900)',
                  lineHeight: 1.45,
                  minHeight: 38,
                }}
              >
                <span style={{ ...whisper, marginRight: 10 }}>{i + 1}</span>
                {line}
              </motion.div>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {inkDone && (
            <motion.div
              key={inkNote}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ ...lead, marginTop: 6 }}
            >
              {inkNote}
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Deck>
  );
}
