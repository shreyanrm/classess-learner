'use client';

/**
 * The course player — the keystone (DESIGN.md §8, §9). A guided-discovery shell: full-bleed card
 * area, a thin segmented progress bar (endowed, eased), close top-left, and one action bar at the
 * bottom. Cards slide horizontally on springs. Wobo stays docked (mounted globally) and reads
 * every interactive card at code level through the bus.
 *
 * Three journeys share the shell: the atom (topic m2-1 — the complete proven course), the honest
 * composing journey for topics whose verified course is still being prepared, and the free-play
 * sandbox (route `sandbox`) that opens straight into the what-if card.
 */

import { useRegisterTarget, useWoboBus } from '@wobo/wobo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chapterById, topicById } from '../data/catalog';
import { useRouter } from '../shell/router';
import { enqueue as enqueueDownload, getDownload } from '../store/downloads';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { CloseIcon } from '../ui/icons';
import { MuteButton, ReplayButton, useCardNarration } from '../wobo/speech';
import { AtomJourney } from './course/AtomJourney';
import { Composing } from './course/Composing';
import { ActionBar, type BarState, SegmentedProgress, whisper } from './course/shared';
import { WhatIf } from './course/WhatIf';

export function Course({ topicId, sandbox = false }: { topicId: string; sandbox?: boolean }) {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useWoboBus();
  const still = useReducedMotion();
  // the close affordance comes forward on hover/focus — ink lifts from quiet grey to full ink
  const [closeLit, setCloseLit] = useState(false);

  // A custom course Wobo composed from a free-text ask: topicId carries the concept itself
  // (`custom:black holes`), so the composing player gets the real title, never "a new course".
  const custom = topicId.startsWith('custom:') ? topicId.slice('custom:'.length).trim() : null;
  const topic = custom ? undefined : topicById(topicId);
  const chapter = topic ? chapterById(topic.chapterId) : custom ? undefined : chapterById(topicId);
  const title = topic?.name ?? chapter?.name ?? custom ?? 'a new course';
  const nodeId = topic?.nodeId;
  const mode: 'sandbox' | 'atom' | 'composing' = sandbox
    ? 'sandbox'
    : nodeId
      ? 'atom'
      : 'composing';

  const [bar, setBar] = useState<BarState | null>(null);
  const { reportProgress, completed } = useProgress();

  // THE DOWNLOAD-FIRST CHOKEPOINT (CONTEXT.md content law). Every path into a course routes through
  // here, so the gate lives here once — not on each of the N call sites (subject rows, the Learn
  // continue card, home thread stops, expedition checkpoints, the command palette, Wobo's route
  // actions, custom courses, progress). A composed course the learner does not yet own is NEVER
  // opened cold into an in-page skeleton: if its content is not generated/cached and it is not
  // already on its way, enqueue it and bounce back — the downloading pill + the ready notification
  // carry it (owner law: first click says downloading → notify when ready → then they enter; tapping
  // the ready toast opens it). The atom (a prebuilt node), a mastered course (warm cache), a course
  // already ready to open, and every practice sandbox all open instantly, untouched by the gate.
  const dl = getDownload(topicId);
  const needsDownload = mode === 'composing' && !completed.has(topicId) && dl?.status !== 'ready';
  const [progress, setProgress] = useState<{ f: number; segments: number }>({
    f: 0.08,
    segments: 9,
  });
  const sandboxEntered = useRef(false);
  // the quiet "picking up where you left off" beat — shown when a player restores a saved position
  const [resumed, setResumed] = useState(false);
  const onResume = useCallback(() => setResumed(true), []);
  useEffect(() => {
    if (!resumed) return;
    const t = window.setTimeout(() => setResumed(false), 3200);
    return () => window.clearTimeout(t);
  }, [resumed]);
  // Wobo reads each card aloud and the advance button waits for Wobo — muted, an equal reading clock
  // stands in. Gating only bites teaching cards' advance (never "check", never a question read).
  const narration = useCardNarration();
  const primaryLabel = (bar?.primary.label ?? '').toLowerCase();
  const gateApplies =
    narration.gating &&
    !narration.ready &&
    primaryLabel !== 'check' &&
    primaryLabel !== 'hint' &&
    primaryLabel !== 'another hint';

  // stable exit — card effects depend on it
  const exit = useCallback(() => router.back(), [router]);

  // The gate acts: enqueue (unless already in line/running) and bounce back to the previous screen,
  // where the downloading pill/toast is visible and the ready notification will land.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-time gate; topicId/title are stable per route
  useEffect(() => {
    if (!needsDownload) return;
    if (dl?.status !== 'downloading' && dl?.status !== 'queued') enqueueDownload(topicId, title);
    router.back();
  }, [needsDownload]);

  useEffect(() => {
    bus.publishPage({ route: sandbox ? 'sandbox' : 'course', state: { topicId, title, mode } });
  }, [bus, sandbox, topicId, title, mode]);

  // The card on stage — the beat the learner is actually on. Registered so Wobo's ink anchors to the
  // card itself ("this step", "the box at the top") and so the full board knows what it is about.
  const stageRef = useRegisterTarget<HTMLElement>('course-card', {
    kind: 'card',
    label: `the card on stage in ${title}`,
    meaning: 'the beat of the lesson the learner is on right now',
    getSceneState: () => ({
      topic: title,
      mode,
      beat: Math.round(progress.f * progress.segments) + 1,
      of: progress.segments,
      advance: bar?.primary.label,
    }),
  });

  // the row on the subject page fills as the learner travels — the tab is the progress bar. Never
  // for a course being bounced to the download queue (it would falsely mark the topic as started).
  useEffect(() => {
    if (!sandbox && topic && !needsDownload) reportProgress(topic.id, progress.f);
  }, [sandbox, topic, progress.f, reportProgress, needsDownload]);

  // free play on a real node is still an arrival worth recording
  useEffect(() => {
    if (!sandbox || !nodeId || sandboxEntered.current) return;
    sandboxEntered.current = true;
    sdk.events.record(
      'learn.node.entered.v1',
      { node_id: nodeId, entry: 'practice_review', initial_band: 'not_started' },
      { ontologyNodeId: nodeId },
    );
  }, [sandbox, nodeId, sdk]);

  // Gated: hold a plain paper screen for the single frame before router.back() lands — no cold
  // skeleton, no white flash. The learner returns to where they were, download in flight.
  if (needsDownload) return <div style={{ height: '100dvh', background: 'var(--wobo-paper)' }} />;

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--wobo-paper)',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      {/* a whisper of paper warmth behind the chrome only (§1 ambient depth) — a soft light source
          for the header, fading out well before the full-bleed content so the card stays content-first */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 200,
          zIndex: -1,
          pointerEvents: 'none',
          background:
            'radial-gradient(64% 100% at 50% 0%, rgba(255,201,60,0.05) 0%, transparent 72%)',
        }}
      />
      {/* the shell chrome: close, and the endowed progress line — settles in as the course opens */}
      <motion.header
        initial={still ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 30, delay: 0.05 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          // clears the fixed 64px app header — the close button must never sit under the logo
          padding: '72px 20px 10px',
          minHeight: 52,
        }}
      >
        <motion.button
          type="button"
          aria-label="Close course"
          onClick={() => router.back()}
          onPointerEnter={() => setCloseLit(true)}
          onPointerLeave={() => setCloseLit(false)}
          onFocus={() => setCloseLit(true)}
          onBlur={() => setCloseLit(false)}
          whileTap={still ? undefined : { scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          style={{
            border: 'none',
            background: 'transparent',
            color: closeLit ? 'var(--wobo-ink-900)' : 'var(--wobo-ink-500)',
            lineHeight: 1,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 6,
            display: 'grid',
            placeItems: 'center',
            transition: 'color 0.18s ease',
          }}
        >
          <CloseIcon size={17} />
        </motion.button>
        {mode === 'sandbox' ? (
          <div style={{ ...whisper, flex: 1, textAlign: 'center' }}>
            Free play{topic ? ` · ${topic.name}` : ''}
          </div>
        ) : (
          <div style={{ flex: 1, maxWidth: 460, margin: '0 auto', display: 'flex' }}>
            <SegmentedProgress fraction={progress.f} segments={progress.segments} />
          </div>
        )}
        {/* on-stage voice controls: mute Wobo's narration, or replay the current card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReplayButton onReplay={narration.replay} />
          <MuteButton />
        </div>
      </motion.header>

      {/* the full-bleed card area */}
      <main
        ref={stageRef}
        className="wobo-scroll-quiet"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {mode === 'sandbox' && <WhatIf nodeId={nodeId} freePlay setBar={setBar} />}
        {mode === 'atom' && topic && nodeId && (
          <AtomJourney
            topic={topic}
            nodeId={nodeId}
            setBar={setBar}
            setProgress={setProgress}
            onExit={exit}
            onResume={onResume}
          />
        )}
        {mode === 'composing' && (
          <Composing
            topicId={topicId}
            title={title}
            setBar={setBar}
            setProgress={setProgress}
            onExit={exit}
            onResume={onResume}
          />
        )}
      </main>

      {/* the quiet resume beat — a soft line, then it fades on its own */}
      <AnimatePresence>
        {resumed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
              transform: 'translateX(-50%)',
              zIndex: 40,
              padding: '9px 16px',
              borderRadius: 3,
              background: 'var(--wobo-ink-900)',
              color: 'var(--wobo-paper)',
              fontSize: '0.82rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Picking up where you left off
          </motion.div>
        )}
      </AnimatePresence>

      <ActionBar bar={bar} gate={gateApplies ? { progress: narration.progress } : undefined} />
    </div>
  );
}
