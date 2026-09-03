'use client';

/**
 * FrameBuilding — the moment right after setup, before the world opens. Wobo narrates, playfully
 * and honestly, what Wobo is actually doing while a skeleton constellation forms (MOTION.md §1/§3):
 * nodes settle in and faint edges draw between them, the shape of a course assembling. Wobo is honest
 * about speed — a cached frame opens almost at once; a fresh board takes a breath while its catalog
 * is fetched and wired.
 *
 * When the frame is ready Wobo gives the WELCOME MOMENT (Ceremony-class, welcome-flavored): Wobo jumps
 * and welcomes the learner BY NAME aloud, a 3-color confetti burst fires with the warm fanfare, and
 * the real subject doors cascade in. This replaces the old plan-reveal card.
 *
 * An unknown board (no catalog yet) is flagged for the fetch pipeline through a gateway event and met
 * with a warm empty state — no fake subjects — offering to build a custom course from the learner's
 * own textbook chapter names. Every path ends with the learner stepping into a home that's truly theirs.
 */

import { useWoboBus, WoboBody, type WoboMood } from '@wobo/wobo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ONBOARDED_KEY } from '../App';
import { requestBoardSourcing } from '../data/board-request';
import { ensureFrame, type Frame } from '../data/frame';
import { useRouter } from '../shell/router';
import { lifetimeSnapshot } from '../store/mind';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { SubjectGlyph } from '../ui/art';
import { Confetti } from '../ui/ceremony';
import { toneForSubject } from '../ui/hues';
import { AmbientWash, fluidSpace, MagneticButton } from '../ui/kit';
import { sfx } from '../ui/sound';
import { speakLine } from '../wobo/speech';
import { boardName, loadProfile } from './you/profile';

const ULTRA = '#1F35E0';
const BUILDING_WASH =
  'radial-gradient(46% 40% at 50% 40%, var(--wobo-ultramarine-soft) 0%, transparent 66%),' +
  ' radial-gradient(60% 44% at 50% 42%, rgba(255,201,60,0.04) 0%, transparent 74%)';

type Phase = 'building' | 'welcome' | 'empty';

/** A deterministic skeleton constellation — nodes and the near-neighbour edges between them. */
function useConstellation(seed: number) {
  return useMemo(() => {
    // a tiny LCG so the shape is stable within a session but varied across learners
    let s = seed || 1;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const nodes = Array.from({ length: 13 }, (_, i) => ({
      id: i,
      x: 12 + rand() * 76,
      y: 14 + rand() * 72,
    }));
    const edges: { a: number; b: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      // link each node to its nearest yet-unlinked forward neighbour — a sparse, tree-like web
      let best = -1;
      let bestD = Infinity;
      for (let j = i + 1; j < nodes.length; j++) {
        const na = nodes[i];
        const nb = nodes[j];
        if (!na || !nb) continue;
        const d = (na.x - nb.x) ** 2 + (na.y - nb.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      if (best >= 0) edges.push({ a: i, b: best });
    }
    return { nodes, edges };
  }, [seed]);
}

function SkeletonConstellation({ reduced }: { reduced: boolean }) {
  const seed = useMemo(() => Math.floor(Math.random() * 1e6), []);
  const { nodes, edges } = useConstellation(seed);
  return (
    <svg
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.9 }}
    >
      {edges.map((e, i) => {
        const a = nodes[e.a];
        const b = nodes[e.b];
        if (!a || !b) return null;
        return (
          <motion.line
            key={`e-${e.a}-${e.b}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={ULTRA}
            strokeOpacity={0.24}
            strokeWidth={0.35}
            initial={reduced ? { pathLength: 1, opacity: 0.24 } : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.24 }}
            transition={{ duration: 0.7, delay: 0.5 + i * 0.12, ease: [0.2, 0, 0, 1] }}
          />
        );
      })}
      {nodes.map((n, i) => (
        <motion.circle
          key={n.id}
          cx={n.x}
          cy={n.y}
          r={i % 4 === 0 ? 1.5 : 1}
          fill={ULTRA}
          fillOpacity={i % 4 === 0 ? 0.85 : 0.5}
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          animate={
            reduced
              ? { scale: 1, opacity: 1 }
              : {
                  scale: 1,
                  opacity: 1,
                  transition: { delay: i * 0.09, type: 'spring', stiffness: 320, damping: 18 },
                }
          }
        >
          {!reduced && i % 4 === 0 && (
            <animate
              attributeName="fill-opacity"
              values="0.85;0.35;0.85"
              dur="2.4s"
              repeatCount="indefinite"
            />
          )}
        </motion.circle>
      ))}
    </svg>
  );
}

/** The real subject doors, cascading in during the welcome — glyph tiles in the board's own naming. */
function WelcomeDoors({ frame, reduced }: { frame: Frame; reduced: boolean }) {
  const doors = frame.doors.slice(0, 6);
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        maxWidth: 460,
      }}
    >
      {doors.map((d, i) => {
        const tone = toneForSubject(d.id);
        return (
          <motion.div
            key={d.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              reduced
                ? { duration: 0.2, delay: 0.1 + i * 0.06 }
                : { delay: 0.35 + i * 0.09, type: 'spring', stiffness: 300, damping: 20 }
            }
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              width: 116,
              padding: '16px 10px',
              background: tone.wash,
              borderRadius: 3,
            }}
          >
            <SubjectGlyph subjectId={d.id} size={46} accent />
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--wobo-ink-900)',
                textAlign: 'center',
                lineHeight: 1.25,
              }}
            >
              {d.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function FrameBuilding() {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useWoboBus();
  const { award } = useProgress();
  const reduced = useReducedMotion() ?? false;

  const profile = useMemo(() => loadProfile(), []);
  const label = boardName(profile.boardId);
  const firstName = profile.name.split(' ')[0] || profile.name;

  const [phase, setPhase] = useState<Phase>('building');
  const [frame, setFrame] = useState<Frame | null>(null);
  const [mood, setMood] = useState<WoboMood>('thinking');
  const [narration, setNarration] = useState(0);
  const ran = useRef(false);

  // The playful, honest narration while Wobo works — board- and grade-specific so it never reads canned.
  const lines = useMemo(
    () => [
      `Opening the ${label} shelf for ${profile.grade}…`,
      'Laying your subjects out in a constellation…',
      'Wiring the chapters into a map I can teach from…',
      'Almost there — tidying the edges…',
    ],
    [label, profile.grade],
  );

  useEffect(() => {
    bus.publishPage({
      route: 'building',
      state: { board: profile.boardId, grade: profile.grade, phase },
    });
  }, [bus, profile.boardId, profile.grade, phase]);

  // Cycle the narration lines while building.
  useEffect(() => {
    if (phase !== 'building') return;
    const id = window.setInterval(() => setNarration((n) => (n + 1) % lines.length), 2100);
    return () => window.clearInterval(id);
  }, [phase, lines.length]);

  // The one real job: build (or fetch) the frame, honestly timed, then welcome or fall to empty.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once, guarded by the ran ref
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void speakLine(lines[0] as string);
    const startedAt = performance.now();
    void ensureFrame(profile.boardId, profile.grade).then((result) => {
      // hold the building beat a touch so it never flashes — shorter when it was instant (cached)
      const floor = result.instant ? 900 : 1700;
      const wait = Math.max(0, floor - (performance.now() - startedAt));
      window.setTimeout(() => {
        if (result.status === 'ready' && result.frame && result.frame.doors.length > 0) {
          setFrame(result.frame);
          setMood('celebrate');
          setPhase('welcome');
        } else {
          // unknown/unsourced board — flag it for the offline fetch pipeline and be honest
          requestBoardSourcing(profile.boardId, label, profile.grade);
          setMood('idle');
          setPhase('empty');
        }
      }, wait);
    });
  }, [profile.boardId, profile.grade, label, sdk]);

  // The welcome fanfare + spoken welcome, once, on entering the welcome beat.
  const welcomed = useRef(false);
  useEffect(() => {
    if (phase !== 'welcome' || welcomed.current) return;
    welcomed.current = true;
    sfx.fanfare();
    void speakLine(`Welcome, ${firstName}. This is all yours — let's begin.`);
  }, [phase, firstName]);

  const finish = (to: 'home' | 'learn') => {
    award('account'); // +50, blooms on home
    try {
      sdk.events.record('onboarding.step.completed.v1', {
        step: 'aha',
        step_index: 0,
        total_steps: 1,
      });
    } catch {
      // event stream best-effort
    }
    bus.publishLifetime(lifetimeSnapshot());
    localStorage.setItem(ONBOARDED_KEY, '1');
    // live mode rebuilds on the real session so providers re-key to auth.uid()
    if (!sdk.config.devAuth) {
      window.location.assign('/');
      return;
    }
    router.replace({ name: to });
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: `${fluidSpace.xl} ${fluidSpace.gutter}`,
        position: 'relative',
        isolation: 'isolate',
        gap: fluidSpace.lg,
        textAlign: 'center',
      }}
    >
      <AmbientWash gradient={BUILDING_WASH} />
      {phase === 'welcome' && !reduced && <Confetti hue={ULTRA} />}

      {/* the constellation stage behind Wobo — the skeleton of the course, forming */}
      <div style={{ position: 'relative', width: 'min(560px, 86vw)', height: 300 }}>
        <AnimatePresence>
          {phase === 'building' && (
            <motion.div
              key="constellation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <SkeletonConstellation reduced={reduced} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wobo at the centre — thinking as Wobo builds, jumping as Wobo welcomes */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <motion.div
            animate={
              phase === 'welcome' && !reduced
                ? { y: [0, -26, 0, -11, 0] }
                : phase === 'building' && !reduced
                  ? { y: [0, -6, 0] }
                  : { y: 0 }
            }
            transition={
              phase === 'welcome'
                ? { duration: 0.95, ease: [0.3, 0, 0.3, 1], times: [0, 0.3, 0.6, 0.8, 1] }
                : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <WoboBody size={112} mood={mood} label="Wobo" />
          </motion.div>
        </div>
      </div>

      {/* the message under the stage — one beat at a time */}
      <div style={{ width: '100%', maxWidth: 560, minHeight: 150 }}>
        <AnimatePresence mode="wait">
          {phase === 'building' && (
            <motion.div
              key="building"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <div
                style={{
                  fontSize: 'clamp(1.2rem, 1rem + 1vw, 1.55rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--wobo-ink-900)',
                }}
              >
                Building your personalised course
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={narration}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ fontSize: '0.95rem', color: 'var(--wobo-ink-500)', lineHeight: 1.5 }}
                >
                  {lines[narration]}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {phase === 'welcome' && frame && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    fontSize: 'clamp(1.6rem, 1.2rem + 1.8vw, 2.2rem)',
                    fontWeight: 650,
                    letterSpacing: '-0.03em',
                    color: 'var(--wobo-ink-900)',
                  }}
                >
                  Welcome, {firstName}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--wobo-ink-500)' }}>
                  Your {label} · {profile.grade} world is ready
                </div>
              </div>
              <WelcomeDoors frame={frame} reduced={reduced} />
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={() => finish('home')}
                style={{ minWidth: 150, justifyContent: 'center' }}
              >
                Step in
              </MagneticButton>
            </motion.div>
          )}

          {phase === 'empty' && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}
            >
              <div
                style={{
                  fontSize: 'clamp(1.4rem, 1.1rem + 1.4vw, 1.9rem)',
                  fontWeight: 640,
                  letterSpacing: '-0.02em',
                  color: 'var(--wobo-ink-900)',
                }}
              >
                I don't have {label} yet, {firstName}
              </div>
              <div
                style={{
                  fontSize: '0.98rem',
                  color: 'var(--wobo-ink-500)',
                  lineHeight: 1.6,
                  maxWidth: 440,
                }}
              >
                I've asked my team to source it — I'll let you know the moment it lands. Until then,
                we can build your first course together: tell me a chapter from your textbook and
                I'll make it real.
              </div>
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={() => finish('home')}
                style={{ minWidth: 190, justifyContent: 'center' }}
              >
                Build one with Wobo
              </MagneticButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
