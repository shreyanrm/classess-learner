'use client';

/**
 * The download center — mounted once, globally (App.tsx), so it runs no matter which screen the
 * learner wanders to. Two jobs:
 *
 *  1. The runner. It drives the queue store one at a time: claim the oldest queued course, ask the
 *     real generation seam (engine.compose) to compose + verify it — which also warms the gateway's
 *     board-shared content cache, so when the learner opens the course the player's own compose call
 *     is an instant cache hit. LLM_MODE=mock returns immediately; the flow is identical live.
 *
 *  2. The notify moment. The instant a course is ready it lands wherever the learner now is: a soft
 *     sfx tick, Vidya says it aloud (mute-aware), and a frosted toast they can tap to dive in.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { claimNextForge, settleForge, useForged } from '../screens/practice/forge-store';
import { composeWorkbook } from '../screens/practice/pools';
import { useRouter } from '../shell/router';
import { sfx } from '../ui/sound';
import { speakLine } from '../vidya/speech';
import {
  acknowledge,
  claimNext,
  type Download,
  enqueue,
  markFailed,
  markReady,
  useDownloads,
} from './downloads';
import { loadMind } from './mind';
import { useSdk } from './sdk';

const COMPOSE_TIMEOUT_MS = 75_000;

// Honest staged progress while a course composes. The gateway genuinely moves through these stages
// (write the lesson → draw the visuals → verify the answers), so the label reflects real work rather
// than a fabricated percentage — no fake number, just where she is. Time-based because the client
// can't see per-stage gateway events; tuned to a typical live compose (~30-45s).
const COMPOSE_STAGES: readonly { readonly until: number; readonly label: string }[] = [
  { until: 9_000, label: 'Writing the lesson' },
  { until: 20_000, label: 'Drawing the visuals' },
  { until: 34_000, label: 'Checking every answer' },
  { until: Number.POSITIVE_INFINITY, label: 'Almost ready' },
];

function composeStage(elapsedMs: number): string {
  for (const s of COMPOSE_STAGES) if (elapsedMs < s.until) return s.label;
  return 'Almost ready';
}

/** Playful-cute, sentence case, no emoji, no exclamation (DESIGN.md copy law). */
function readyLine(title: string): string {
  return `your course on ${title.toLowerCase()} is ready — tap to dive in whenever you like.`;
}

export function DownloadCenter() {
  const sdk = useSdk();
  const router = useRouter();
  const items = useDownloads();
  const forged = useForged();
  const running = useRef(false);
  const forgeRunning = useRef(false);
  const forgeNotified = useRef<Set<string>>(new Set());
  const forgeInit = useRef(false);
  // Notifications fire exactly once per topic even though items re-renders many times.
  const notified = useRef<Set<string>>(new Set());

  // A gentle clock so the composing toast's staged label advances while she works. Only ticks while
  // something is actually composing, then stops — no idle timers.
  const [now, setNow] = useState(() => Date.now());
  const composingCount = items.filter(
    (d) => d.status === 'downloading' || d.status === 'queued',
  ).length;
  useEffect(() => {
    if (composingCount === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1200);
    return () => clearInterval(t);
  }, [composingCount]);

  // The runner loop: self-driving. Claiming flips a course to `downloading` and fans a store event,
  // which re-runs this effect; the running ref plus claimNext's one-in-flight guard keep it to a
  // single generation at a time. markReady/markFailed fan another event → the next course is claimed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `items` is the re-trigger (not read here); sdk is a stable singleton
  useEffect(() => {
    if (running.current) return;
    const next = claimNext();
    if (!next) return;
    running.current = true;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('compose timeout')), COMPOSE_TIMEOUT_MS);
    });
    Promise.race([
      sdk.llm.invoke(
        'engine.compose',
        { topic: next.title, topic_id: next.topicId, difficulty: 'core' },
        { consentTier: 'un_elevated' },
      ),
      timeout,
    ])
      // A refusal or timeout is not an error the learner should see: the course player floors to a
      // structural seed course either way (Composing.tsx). "ready" here just means it can be opened.
      .then(() => markReady(next.topicId))
      .catch(() => markFailed(next.topicId))
      .finally(() => {
        running.current = false;
      });
    // sdk is a stable singleton; `items` is the sole trigger that re-drives the queue.
  }, [items]);

  // The notify moment — fires as a course settles ready, once, wherever the learner is now.
  useEffect(() => {
    for (const d of items) {
      if (d.status !== 'ready' || d.seen || notified.current.has(d.topicId)) continue;
      notified.current.add(d.topicId);
      sfx.ding(); // a soft notification ding — mute-aware inside sound.ts
      void speakLine(readyLine(d.title)); // she says it aloud — mute-aware inside speech.ts
    }
  }, [items]);

  // The forge build runner — one composition in flight, mirroring the course queue's discipline. The
  // short delay is the "binding" moment made real; composition itself (pools.ts) is deterministic.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `forged` re-triggers; the runner reads the store directly
  useEffect(() => {
    if (forgeRunning.current) return;
    const next = claimNextForge();
    if (!next) return;
    forgeRunning.current = true;
    const slipNodeIds = loadMind().slips.map((s) => s.nodeId);
    const timer = window.setTimeout(() => {
      settleForge(next.id, composeWorkbook(next.picks, next.size, next.mix, slipNodeIds));
      forgeRunning.current = false;
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [forged]);

  // The forge notify moment — a workbook settling to ready lands wherever the learner now is. Ready
  // forges already on disk at mount are adopted silently (never a pile of dings on every boot).
  useEffect(() => {
    if (!forgeInit.current) {
      forgeInit.current = true;
      for (const w of forged) if (w.status === 'ready') forgeNotified.current.add(w.id);
      return;
    }
    for (const w of forged) {
      if (w.status !== 'ready' || forgeNotified.current.has(w.id)) continue;
      forgeNotified.current.add(w.id);
      sfx.ding();
      void speakLine(
        `your workbook on ${w.title.toLowerCase()} is forged — it's on your shelf, ready whenever you are.`,
      );
    }
  }, [forged]);

  // The toast carries the learner through the whole journey wherever they now are: composing (they
  // just tapped an ungenerated course and were bounced back per the content law), then ready (tap to
  // dive in) or a slip (tap to retry). downloading/queued carry seen=true, so they surface by status
  // alone; ready/failed surface until acknowledged. This is the visible downloading pill the bounce
  // relies on — no matter which screen the learner landed back on.
  const toasts = items.filter(
    (d) =>
      d.status === 'downloading' ||
      d.status === 'queued' ||
      ((d.status === 'ready' || d.status === 'failed') && !d.seen),
  );

  const open = (d: Download) => {
    if (d.status === 'downloading' || d.status === 'queued') return; // still composing — nothing to open yet
    acknowledge(d.topicId);
    if (d.status === 'ready') {
      router.navigate({ name: 'course', topicId: d.topicId });
    } else {
      // a slip → put it back in line; the runner picks it up, the notify moment lands again
      notified.current.delete(d.topicId);
      enqueue(d.topicId, d.title);
    }
  };

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 'min(420px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((d) => {
          const composing = d.status === 'downloading' || d.status === 'queued';
          const stage = composing ? composeStage(Math.max(0, now - d.at)) : '';
          return (
            <motion.button
              key={d.topicId}
              type="button"
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={() => open(d)}
              whileTap={{ scale: 0.985 }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                pointerEvents: 'auto',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 15px',
                borderRadius: 3,
                cursor: composing ? 'default' : 'pointer',
                fontFamily: 'inherit',
                color: 'var(--clss-paper)',
                background: 'var(--clss-frost-on-paper)',
                backdropFilter: 'blur(var(--clss-frost-blur)) saturate(1.2)',
                WebkitBackdropFilter: 'blur(var(--clss-frost-blur)) saturate(1.2)',
                border: '0.5px solid color-mix(in srgb, var(--clss-ink) 14%, transparent)',
              }}
            >
              {/* honest indeterminate track along the bottom — she is actively working, no fake % */}
              {composing && (
                <motion.span
                  aria-hidden
                  initial={{ x: '-60%' }}
                  animate={{ x: '160%' }}
                  transition={{
                    duration: 1.6,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    height: 2,
                    width: '40%',
                    borderRadius: 999,
                    background: 'var(--clss-ultramarine)',
                    opacity: 0.85,
                  }}
                />
              )}
              {/* a small breathing dot in the mastery pigment — ready glows, a slip is muted */}
              <motion.span
                aria-hidden
                animate={
                  d.status === 'ready' || composing
                    ? { scale: [1, 1.35, 1], opacity: [0.9, 0.5, 0.9] }
                    : { opacity: 0.6 }
                }
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                style={{
                  flexShrink: 0,
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background:
                    d.status === 'ready' || composing
                      ? 'var(--clss-ultramarine)'
                      : 'var(--clss-ink-300)',
                }}
              />
              <span
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <span style={{ fontSize: '0.94rem', fontWeight: 600, lineHeight: 1.25 }}>
                  {d.title}
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.82, lineHeight: 1.35 }}>
                  {composing
                    ? `${stage}… she'll let you know the moment it's ready`
                    : d.status === 'ready'
                      ? 'Your course is ready — tap to dive in'
                      : 'That one slipped away — tap to try again'}
                </span>
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  opacity: 0.9,
                  whiteSpace: 'nowrap',
                }}
              >
                {composing ? `${stage}…` : d.status === 'ready' ? 'Open' : 'Retry'}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
