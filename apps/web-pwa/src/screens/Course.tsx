'use client';

/**
 * The course player — the keystone (DESIGN.md §8, §9). A guided-discovery shell: full-bleed card
 * area, a thin segmented progress bar (endowed, eased), close top-left, and one action bar at the
 * bottom. Cards slide horizontally on springs. Vidya stays docked (mounted globally) and reads
 * every interactive card at code level through the bus.
 *
 * Three journeys share the shell: the atom (topic m2-1 — the complete proven course), the honest
 * composing journey for topics whose verified course is still being prepared, and the free-play
 * sandbox (route `sandbox`) that opens straight into the what-if card.
 */

import { useVidyaBus } from '@classess/vidya';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chapterById, topicById } from '../data/catalog';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { AtomJourney } from './course/AtomJourney';
import { Composing } from './course/Composing';
import { ActionBar, type BarState, SegmentedProgress, whisper } from './course/shared';
import { WhatIf } from './course/WhatIf';

export function Course({ topicId, sandbox = false }: { topicId: string; sandbox?: boolean }) {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useVidyaBus();

  const topic = topicById(topicId);
  const chapter = topic ? chapterById(topic.chapterId) : chapterById(topicId);
  const title = topic?.name ?? chapter?.name ?? 'a new course';
  const nodeId = topic?.nodeId;
  const mode: 'sandbox' | 'atom' | 'composing' = sandbox
    ? 'sandbox'
    : nodeId
      ? 'atom'
      : 'composing';

  const [bar, setBar] = useState<BarState | null>(null);
  const { reportProgress } = useProgress();
  const [progress, setProgress] = useState<{ f: number; segments: number }>({
    f: 0.08,
    segments: 9,
  });
  const sandboxEntered = useRef(false);
  // stable exit — card effects depend on it
  const exit = useCallback(() => router.back(), [router]);

  useEffect(() => {
    bus.publishPage({ route: sandbox ? 'sandbox' : 'course', state: { topicId, title, mode } });
  }, [bus, sandbox, topicId, title, mode]);

  // the row on the subject page fills as the learner travels — the tab is the progress bar
  useEffect(() => {
    if (!sandbox && topic) reportProgress(topic.id, progress.f);
  }, [sandbox, topic, progress.f, reportProgress]);

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

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--clss-paper)',
      }}
    >
      {/* the shell chrome: close, and the endowed progress line */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '14px 20px 10px',
          minHeight: 52,
        }}
      >
        <button
          type="button"
          aria-label="Close course"
          onClick={() => router.back()}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--clss-ink-500)',
            fontSize: '1.45rem',
            lineHeight: 1,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '2px 6px',
          }}
        >
          ×
        </button>
        {mode === 'sandbox' ? (
          <div style={{ ...whisper, flex: 1, textAlign: 'center' }}>
            free play{topic ? ` · ${topic.name.toLowerCase()}` : ''}
          </div>
        ) : (
          <div style={{ flex: 1, maxWidth: 460, margin: '0 auto', display: 'flex' }}>
            <SegmentedProgress fraction={progress.f} segments={progress.segments} />
          </div>
        )}
        <div aria-hidden style={{ width: 34 }} />
      </header>

      {/* the full-bleed card area */}
      <main
        className="clss-scroll-quiet"
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
          />
        )}
        {mode === 'composing' && (
          <Composing
            topicId={topicId}
            title={title}
            setBar={setBar}
            setProgress={setProgress}
            onExit={exit}
          />
        )}
      </main>

      <ActionBar bar={bar} />
    </div>
  );
}
