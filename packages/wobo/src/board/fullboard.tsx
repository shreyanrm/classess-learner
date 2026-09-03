'use client';

/**
 * The full board (docs/BOARD.md §5) — inside a lesson the board *is* the screen. Same grammar, same
 * renderer, same ink; only the surface changes. Cards are regions on it, the camera follows the ink
 * as the board fills, and the history can be scrubbed and the whole thing shared as an image.
 */

import { hairline, radius } from '@wobo/config';
import { useCallback, useRef, useState } from 'react';
import { boardFileName, exportBoardPng } from './export';
import { BoardSurface, type BoardSurfaceProps } from './renderer';
import type { BoardStore } from './store';
import { useTimeline } from './timeline';

export interface WoboFullBoardProps
  extends Pick<
    BoardSurfaceProps,
    'targets' | 'focusRegions' | 'onLearnerFocus' | 'onVariableChange' | 'fontUrl'
  > {
  store: BoardStore;
  /** The lesson or topic this board belongs to — it names the export. */
  title?: string;
  /** Show the scrubber and the share affordance. On inside a lesson, off in a demo. */
  chrome?: boolean;
  capture?: boolean;
  /** Called with the rendered image when the learner shares. */
  onShare?: (blob: Blob, filename: string) => void;
}

/** The full-bleed board. It fills its parent; give it a parent that fills the screen. */
export function WoboFullBoard(props: WoboFullBoardProps) {
  const { store, chrome = true, capture = true } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const timeline = useTimeline(store);
  const [busy, setBusy] = useState(false);

  const share = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg || busy) return;
    setBusy(true);
    try {
      const dark =
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-theme') === 'dark';
      const blob = await exportBoardPng(svg, {
        ...(props.title ? { caption: props.title } : {}),
        ...(dark ? { theme: { background: '#17181C', ink: '#F2F2F5' } } : {}),
      });
      if (blob) props.onShare?.(blob, boardFileName(props.title));
    } finally {
      setBusy(false);
    }
  }, [busy, props.onShare, props.title]);

  const span = Math.max(1, timeline.range.to - timeline.range.from);

  return (
    <div style={{ inset: 0, position: 'absolute', background: 'var(--wobo-page, #FFFFFF)' }}>
      <BoardSurface
        store={store}
        svgRef={svgRef}
        capture={capture}
        // The handle drives the surface (BOARD.md §9): dragging shows the board as it was at that
        // moment, and letting go — "live" — hands the board back to the present.
        {...(timeline.scrubbing ? { at: timeline.at } : {})}
        autoCamera
        label={props.title ? `Wobo's board: ${props.title}` : "Wobo's board"}
        {...(props.targets ? { targets: props.targets } : {})}
        {...(props.focusRegions ? { focusRegions: props.focusRegions } : {})}
        {...(props.onLearnerFocus ? { onLearnerFocus: props.onLearnerFocus } : {})}
        {...(props.onVariableChange ? { onVariableChange: props.onVariableChange } : {})}
        {...(props.fontUrl ? { fontUrl: props.fontUrl } : {})}
      />
      {chrome ? (
        <div
          style={{
            alignItems: 'center',
            borderTop: `0.5px solid ${hairline.onPaper}`,
            bottom: 0,
            display: 'flex',
            gap: 12,
            left: 0,
            padding: '10px 16px',
            position: 'absolute',
            right: 0,
          }}
        >
          <input
            type="range"
            aria-label="scrub the board's history"
            min={timeline.range.from}
            max={timeline.range.to}
            step={Math.max(1, span / 400)}
            value={timeline.at}
            onChange={(e) => timeline.seek(Number(e.target.value))}
            style={{ accentColor: 'var(--wobo-ultramarine, #1F35E0)', flex: '1 1 auto' }}
          />
          <button
            type="button"
            aria-label={timeline.scrubbing ? 'return to the live board' : 'replay the board'}
            onClick={() => (timeline.scrubbing ? timeline.live() : timeline.play())}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: `0.5px solid ${hairline.onPaper}`,
              borderRadius: radius.sm,
              color: 'var(--wobo-ink-500, #6E6E76)',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 12,
              padding: '4px 10px',
            }}
          >
            {timeline.scrubbing ? 'live' : 'replay'}
          </button>
          <button
            type="button"
            aria-label="share this board as an image"
            onClick={() => void share()}
            disabled={busy}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: `0.5px solid ${hairline.onPaper}`,
              borderRadius: radius.sm,
              color: 'var(--wobo-ink-500, #6E6E76)',
              cursor: busy ? 'progress' : 'pointer',
              font: 'inherit',
              fontSize: 12,
              padding: '4px 10px',
            }}
          >
            share
          </button>
        </div>
      ) : null}
    </div>
  );
}
