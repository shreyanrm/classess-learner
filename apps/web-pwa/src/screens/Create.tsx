'use client';

import { fontFamily, hairline, ink, molten, radius, space, typeScale } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import type { Sdk } from '@classess/sdk';
import { Button, TextArea } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { learner } from '../mock/appData';
import { useRouter } from '../shell/router';

/**
 * Create anything — request → compiling → placed, recomposed as an editorial page (not a boxed form).
 * The learner names what fascinates them in a big, inviting prompt; Vidya compiles it into a walkable
 * path. In MOCK mode the LLM returns placeholder shapes, so every read is defensive and always falls
 * back to a believable course built from the goal. The world is monochrome until understanding is
 * earned, so a freshly-compiled course is a quiet list on hairline rules — only the first step (the one
 * live loop) carries molten, inviting the first walk. Depth is light (a soft aura), never a shadow.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const EXAMPLES = ['Photosynthesis', 'Stoichiometry', 'The French Revolution', 'Python'];

const STAGES = [
  { key: 'safety', label: 'Checking safety' },
  { key: 'compiling', label: 'Compiling your course' },
  { key: 'verifying', label: 'Verifying' },
] as const;
type Stage = (typeof STAGES)[number]['key'];

interface CourseNode {
  id: string;
  name: string;
  blurb: string;
}
interface GeneratedCourse {
  title: string;
  estMinutes: number;
  nodes: CourseNode[];
}

// The shared content column — same editorial rhythm as Today: wide, centred, breathing.
const mainStyle = {
  flex: 1,
  width: '100%',
  maxWidth: 940,
  margin: '0 auto',
  padding: `${space[6]}px ${space[4]}px ${space[12]}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: space[6],
} as const;

// A tiny sentence-case section label (never an all-caps eyebrow on every block).
const labelStyle = { fontSize: typeScale.caption.size, color: ink[500] } as const;

/** A thin rule — the app's structural line, replacing card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

/** The one earned light on a screen: a soft molten aura behind its focal element (light, not shadow). */
function Aura() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: -80,
        top: -60,
        width: 460,
        height: 320,
        background: `radial-gradient(closest-side, ${molten.soft}, transparent 70%)`,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    />
  );
}

// ponytail: pacing only — the real safety/compile/verify calls take real time; the mock is instant,
// so a short beat lets each honest stage actually be read. No fake percentage, just legible steps.
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Only an explicit `allow:false` blocks; unknown/mock shapes pass (graceful, never a false wall). */
function isAllowed(output: unknown): boolean {
  return (output as { allow?: boolean } | null)?.allow !== false;
}

/** A believable course from the goal alone — the fallback whenever the model gives nothing usable. */
function fallbackCourse(goal: string): GeneratedCourse {
  const title = goal.length > 64 ? `${goal.slice(0, 63).trimEnd()}…` : goal;
  const nodes: CourseNode[] = [
    {
      id: 'gen-0',
      name: 'The big picture',
      blurb: 'Where this sits, and why it is worth knowing.',
    },
    { id: 'gen-1', name: 'Foundations', blurb: 'The few ideas everything else is built on.' },
    { id: 'gen-2', name: 'How it works', blurb: 'The core mechanism, one clean step at a time.' },
    { id: 'gen-3', name: 'Worked examples', blurb: 'Watch it done, then try one yourself.' },
    { id: 'gen-4', name: 'Common pitfalls', blurb: 'The mistakes to sidestep before they set in.' },
    { id: 'gen-5', name: 'Bringing it together', blurb: 'Weave the pieces into one fluent whole.' },
  ];
  return { title, estMinutes: nodes.length * 12, nodes };
}

/** Read {title, estMinutes, nodes} from an unknown output; fall back to a built course if empty. */
function readCourse(output: unknown, goal: string): GeneratedCourse {
  const o = (output ?? {}) as Record<string, unknown>;
  const rawNodes: unknown[] = Array.isArray(o.nodes) ? o.nodes : [];
  const nodes = rawNodes
    .map((raw, i): CourseNode | null => {
      const n = (raw ?? {}) as Record<string, unknown>;
      const name = typeof n.name === 'string' ? n.name.trim() : '';
      if (!name) return null;
      return {
        id: typeof n.id === 'string' && n.id ? n.id : `gen-${i}`,
        name,
        blurb: typeof n.blurb === 'string' ? n.blurb : '',
      };
    })
    .filter((n): n is CourseNode => n !== null);
  if (nodes.length === 0) return fallbackCourse(goal);
  const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : goal;
  const estMinutes =
    typeof o.estMinutes === 'number' && o.estMinutes > 0
      ? Math.round(o.estMinutes)
      : nodes.length * 12;
  return { title, estMinutes, nodes };
}

export function Create({ sdk }: { sdk: Sdk }) {
  const bus = useVidyaBus();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<'request' | 'compiling' | 'placed'>('request');
  const [draft, setDraft] = useState('');
  const [stage, setStage] = useState<Stage>('safety');
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vidya can point at the primary action of whichever phase is live.
  const submitRef = useRegisterTarget<HTMLDivElement>('create-submit', {
    kind: 'control',
    label: 'the Create my course button',
  });
  const startRef = useRegisterTarget<HTMLDivElement>('create-start', {
    kind: 'control',
    label: 'the Start learning button',
  });

  // publishPage only writes a ref (no re-render), so keeping it fresh with phase is loop-safe.
  useEffect(() => {
    bus.publishPage({ route: 'create', state: { phase } });
  }, [bus, phase]);

  const ready = draft.trim().length > 10;

  // Subtle staggered rise on entrance (mirrors Today), honouring reduced motion.
  const rise = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: EASE },
        };

  async function compile() {
    const goal = draft.trim();
    if (goal.length <= 10) return;
    setError(null);
    setStage('safety');
    setPhase('compiling');
    bus.dispatch([{ type: 'setMood', mood: 'thinking' }]);

    const ctx = { consentTier: learner.consentTier };
    try {
      const safety = await sdk.llm.invoke('safety.moderate', { text: goal }, ctx);
      await wait(reduced ? 200 : 520);
      if (!isAllowed(safety.output)) {
        setError(
          'Let us keep it to something you want to learn — a topic, a skill, or a question.',
        );
        setPhase('request');
        bus.dispatch([{ type: 'setMood', mood: 'idle' }]);
        return;
      }

      setStage('compiling');
      const res = await sdk.llm.invoke('generate.course', { goal }, ctx);
      await wait(reduced ? 200 : 680);

      setStage('verifying');
      const built = readCourse(res.output, goal);
      await wait(reduced ? 150 : 460);

      setCourse(built);
      setPhase('placed');
      bus.dispatch([{ type: 'setMood', mood: 'celebrate' }]);
    } catch {
      // Never crash on an odd shape or a gateway hiccup — hand back a real, walkable course anyway.
      setCourse(fallbackCourse(goal));
      setPhase('placed');
      bus.dispatch([{ type: 'setMood', mood: 'celebrate' }]);
    }
  }

  function startOver() {
    setCourse(null);
    setError(null);
    setPhase('request');
    bus.dispatch([{ type: 'setMood', mood: 'idle' }]);
  }

  // --- Placed --------------------------------------------------------------------------------------
  if (phase === 'placed' && course) {
    return (
      <main style={mainStyle}>
        {/* Hero: the finished course title, lit by a soft aura; meta and Vidya's hand beneath. */}
        <motion.header {...rise(0)} style={{ position: 'relative' }}>
          <Aura />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: space[1],
            }}
          >
            <span style={labelStyle}>Your course is ready</span>
            <h1
              style={{
                margin: 0,
                fontSize: typeScale.h1.size,
                lineHeight: 1.05,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: ink[900],
                maxWidth: '18ch',
              }}
            >
              {course.title}
            </h1>
            <p style={{ margin: 0, fontSize: typeScale.body.size, color: ink[500] }}>
              {course.nodes.length} concepts · about {course.estMinutes} min
            </p>
            <span
              aria-hidden
              style={{
                marginTop: space[1],
                fontFamily: fontFamily.handwritten,
                fontSize: '1.5rem',
                lineHeight: 1,
                color: molten.base,
                transform: 'rotate(-4deg)',
              }}
            >
              here's your path — let's walk it.
            </span>
          </div>
        </motion.header>

        <Rule />

        {/* A quiet list on hairline rules — no card. Only the first step carries molten. */}
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {course.nodes.map((node, i) => {
            const first = i === 0;
            return (
              <motion.li
                key={node.id}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduced ? { duration: 0 } : { delay: i * 0.05, duration: 0.22, ease: EASE }
                }
                style={{
                  display: 'flex',
                  gap: space[2],
                  padding: `${space[2]}px 0`,
                  borderTop: first ? 'none' : `1px solid ${hairline.onPaper}`,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: 'none',
                    marginTop: 8,
                    width: 10,
                    height: 10,
                    borderRadius: radius.jelly,
                    background: first ? molten.base : 'transparent',
                    border: first ? 'none' : `1.5px solid ${ink[300]}`,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: space.half }}>
                  <span
                    style={{
                      fontSize: typeScale.h3.size,
                      fontWeight: 500,
                      letterSpacing: '-0.02em',
                      color: ink[900],
                      lineHeight: 1.25,
                    }}
                  >
                    {node.name}
                  </span>
                  {first && (
                    <span
                      style={{
                        fontSize: typeScale.caption.size,
                        fontWeight: 600,
                        color: molten.base,
                      }}
                    >
                      Start here
                    </span>
                  )}
                  {node.blurb && (
                    <span
                      style={{
                        fontSize: typeScale.body.size,
                        color: ink[700],
                        lineHeight: 1.5,
                        maxWidth: '52ch',
                      }}
                    >
                      {node.blurb}
                    </span>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>

        <Rule />

        <motion.div
          {...rise(1)}
          style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}
        >
          {/* ponytail: every generated node routes to the atom — the one verifier-backed live loop. */}
          <div ref={startRef}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.navigate({ name: 'learn', nodeId: 'linear-one-var' })}
            >
              Start learning
            </Button>
          </div>
          <Button variant="ghost" onClick={startOver}>
            Create another
          </Button>
        </motion.div>
      </main>
    );
  }

  // --- Compiling -----------------------------------------------------------------------------------
  if (phase === 'compiling') {
    const stageIndex = STAGES.findIndex((s) => s.key === stage);
    return (
      <main style={mainStyle}>
        <motion.header {...rise(0)} style={{ position: 'relative' }}>
          <Aura />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: space[2],
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: typeScale.h1.size,
                lineHeight: 1.05,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: ink[900],
              }}
            >
              Compiling your course
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: typeScale.bodyLg.size,
                lineHeight: typeScale.bodyLg.lineHeight,
                color: ink[700],
                maxWidth: '46ch',
              }}
            >
              “{draft.trim()}”
            </p>
          </div>
        </motion.header>

        <Rule />

        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: space[3],
          }}
        >
          {STAGES.map((s, i) => {
            const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending';
            return (
              <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
                <span
                  aria-hidden
                  style={{
                    flex: 'none',
                    width: 12,
                    height: 12,
                    borderRadius: radius.jelly,
                    display: 'grid',
                    placeItems: 'center',
                    border: state === 'pending' ? `1.5px solid ${ink[300]}` : 'none',
                    background: state === 'done' ? ink[900] : 'transparent',
                  }}
                >
                  {state === 'done' && (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                      role="img"
                      aria-label="done"
                    >
                      <title>done</title>
                      <path
                        d="M1 4.2 3 6 7 1.5"
                        stroke="#fff"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {state === 'active' && (
                    <motion.span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: radius.jelly,
                        background: molten.base,
                      }}
                      animate={reduced ? {} : { opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
                      }
                    />
                  )}
                </span>
                <span
                  style={{
                    fontSize: typeScale.bodyLg.size,
                    color: state === 'pending' ? ink[500] : ink[900],
                    fontWeight: state === 'active' ? 600 : 400,
                  }}
                >
                  {s.label}
                  {state === 'active' && '…'}
                </span>
              </li>
            );
          })}
        </ol>
      </main>
    );
  }

  // --- Request -------------------------------------------------------------------------------------
  return (
    <main style={mainStyle}>
      {/* Hero prompt: big, inviting, lit by one soft aura; Vidya's hand adds her voice. */}
      <motion.header {...rise(0)} style={{ position: 'relative' }}>
        <Aura />
        <div
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: space[2] }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: typeScale.display.size,
              lineHeight: 1.02,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: ink[900],
              maxWidth: '15ch',
            }}
          >
            Tell Classess what fascinates you
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: typeScale.bodyLg.size,
              lineHeight: typeScale.bodyLg.lineHeight,
              color: ink[700],
              maxWidth: '46ch',
            }}
          >
            Name a topic, a skill, or a question. Vidya compiles it into a path you can walk.
          </p>
          <span
            aria-hidden
            style={{
              marginTop: space.half,
              fontFamily: fontFamily.handwritten,
              fontSize: '1.5rem',
              lineHeight: 1,
              color: molten.base,
              transform: 'rotate(-4deg)',
            }}
          >
            Ooh — what are we building today?
          </span>
        </div>
      </motion.header>

      <motion.div {...rise(1)} style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
        <span style={labelStyle}>Or start from one of these</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[1] }}>
          {EXAMPLES.map((ex) => (
            <Button key={ex} variant="secondary" size="sm" onClick={() => setDraft(ex)}>
              {ex}
            </Button>
          ))}
        </div>
      </motion.div>

      <motion.div {...rise(2)}>
        <TextArea
          aria-label="What do you want to learn?"
          placeholder="I want to understand how photosynthesis turns light into sugar…"
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          error={error ?? undefined}
          hint={error ? undefined : 'A sentence or two works best.'}
          style={{ fontSize: typeScale.body.size, lineHeight: 1.5 }}
        />
      </motion.div>

      <motion.div {...rise(3)} ref={submitRef} style={{ alignSelf: 'flex-start' }}>
        <Button variant="primary" size="lg" disabled={!ready} onClick={compile}>
          Create my course
        </Button>
      </motion.div>
    </main>
  );
}
