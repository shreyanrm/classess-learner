'use client';

/**
 * A golden board, drawing inside a frame.
 *
 * The frame is the plane's chrome (`WoboPlane`'s title bar, hairline and 3px corners) reproduced at
 * the size a page section can hold, because the plane itself is a floating surface the app summons
 * and this is a section of a document. Everything inside it is the real thing: the shipping store,
 * the shipping renderer, the shipping plan.
 *
 * Work is gated on visibility. A board draws when it scrolls into view, replays only when asked,
 * and every pending frame is cancelled when it leaves — a page with five boards on it must not run
 * five timelines at once on a cheap phone.
 *
 * Reduced motion lands the whole plan at once: the same board, no performance.
 */

import { useReducedMotion } from '@wobo/motion';
import { BoardStore, BoardSurface } from '@wobo/wobo';
import { useEffect, useMemo, useState } from 'react';
import { type LandingGolden, planEndsAt, playPlan } from './board-play';
import { useDocumentVisible, useOnScreen } from './scroll';

export interface BoardFrameProps {
  golden: LandingGolden;
  /** What the frame's title bar says on the left. */
  frameLabel: string;
  /** Bumping this replays the board — the "draw it again" control. */
  replayKey?: number;
  /** A hint on the right of the title bar, e.g. the subject. */
  hint?: string;
}

export function BoardFrame({ golden, frameLabel, replayKey = 0, hint }: BoardFrameProps) {
  const reduced = useReducedMotion();
  const store = useMemo(() => new BoardStore({ presentation: 'full' }), []);
  const { ref, onScreen } = useOnScreen<HTMLDivElement>('120px');
  const visible = useDocumentVisible();
  /** The (board, replay) pair that has finished drawing, or null while none has. */
  const [landed, setLanded] = useState<string | null>(null);
  const key = `${golden.name}:${replayKey}`;

  // The plan runs once per (board, replay) pair, and only while the frame is actually being looked
  // at. The guard is the LANDED key, set when the plan finishes — deliberately not a ref set before
  // the play starts: under StrictMode's double mount that ref would be set by the first pass, whose
  // cleanup cancels every timer, and the second pass would skip and leave the board empty forever.
  useEffect(() => {
    if (!onScreen || !visible || landed === key) return;
    const cancel = playPlan(store, golden.plan, { instant: reduced });
    if (reduced) {
      setLanded(key);
      return cancel;
    }
    const settle = setTimeout(() => setLanded(key), planEndsAt(golden.plan) + 300);
    return () => {
      cancel();
      clearTimeout(settle);
    };
  }, [golden, onScreen, visible, reduced, key, landed, store]);

  return (
    <div
      className="lp-frame"
      ref={ref}
      data-drawn={landed === key ? 'yes' : 'no'}
      data-board={golden.name}
    >
      <div className="lp-frame-bar">
        <span>
          <b>{frameLabel}</b>
          {` · ${golden.title}`}
        </span>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="lp-board">
        <BoardSurface
          store={store}
          autoCamera
          capture={false}
          label={`Wobo's board: ${golden.title}`}
        />
      </div>
    </div>
  );
}
