/**
 * The board's timeline (docs/BOARD.md §9) — every board keeps its object list and event log, and
 * the hand can scrub back in time.
 *
 * Scrubbing is a pure query over the log, never a re-run of the pen: `boardAt(store, t)` answers
 * "what was on this board at time t", which is what the scrubber renders and what "save to notes"
 * and the PNG export both read.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardObject } from './schema';
import { type BoardObjectState, type BoardStore, FADE_MS } from './store';

/** One stop on the scrubber — a moment worth landing on. */
export interface TimelineMark {
  /** Board-clock ms. */
  at: number;
  kind: 'ink' | 'say' | 'ask' | 'card' | 'action' | 'done';
  /** The object id, or the first words of what she said. */
  label: string;
}

/** The scrubbable range of a board, in board-clock ms. */
export interface TimelineRange {
  from: number;
  to: number;
}

/** Every moment on this board, oldest first. */
export function timelineMarks(store: BoardStore): TimelineMark[] {
  return store.log.map((entry) => {
    const e = entry.event;
    switch (e.type) {
      case 'ink':
        return { at: entry.at, kind: 'ink' as const, label: e.object.id };
      case 'say':
        return { at: entry.at, kind: 'say' as const, label: e.text.slice(0, 48) };
      case 'ask':
        return { at: entry.at, kind: 'ask' as const, label: e.prompt.slice(0, 48) };
      case 'card':
        return { at: entry.at, kind: 'card' as const, label: e.title ?? e.id };
      case 'action':
        return { at: entry.at, kind: 'action' as const, label: e.name };
      default:
        return { at: entry.at, kind: 'done' as const, label: 'done' };
    }
  });
}

/** The board's own span. An empty board is a zero-length range at the clock's origin. */
export function timelineRange(store: BoardStore): TimelineRange {
  const history = store.history();
  if (history.length === 0) {
    const t = store.time();
    return { from: t, to: t };
  }
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  for (const s of history) {
    from = Math.min(from, s.startAt);
    to = Math.max(to, s.startAt + (s.durMs ?? 600));
  }
  return { from, to: Math.max(to, from) };
}

/** True when this object was on the board at time `t`. */
export function visibleAt(state: BoardObjectState, t: number): boolean {
  if (t < state.startAt) return false;
  if (state.fadingAt !== undefined && t > state.fadingAt + FADE_MS) return false;
  if (state.ttl !== undefined && t > state.startAt + (state.durMs ?? 0) + state.ttl + FADE_MS) {
    return false;
  }
  return true;
}

/** What was on this board at time `t`, in drawing order — the scrub, the save, and the export. */
export function boardAt(store: BoardStore, t: number): BoardObject[] {
  return store
    .history()
    .filter((s) => visibleAt(s, t))
    .sort((a, b) => a.seq - b.seq)
    .map((s) => s.object);
}

export interface Scrubber {
  /** Where the scrubber is, in board-clock ms. */
  at: number;
  range: TimelineRange;
  marks: TimelineMark[];
  playing: boolean;
  /** True while the scrubber is behind the live board. */
  scrubbing: boolean;
  seek: (at: number) => void;
  play: () => void;
  pause: () => void;
  /** Return to the live board. */
  live: () => void;
}

/**
 * Drive a scrubber over a board's history. Playback runs on real time from wherever it was left,
 * and any seek pauses it — a learner dragging the handle is in charge, not the clock.
 */
export function useTimeline(store: BoardStore): Scrubber {
  const range = timelineRange(store);
  const [at, setAt] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = store.time();
    const loop = () => {
      const now = store.time();
      const dt = now - last;
      last = now;
      setAt((prev) => {
        const next = (prev ?? range.from) + dt;
        if (next >= range.to) {
          setPlaying(false);
          return null;
        }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, store, range.from, range.to]);

  const seek = useCallback((next: number) => {
    setPlaying(false);
    setAt(next);
  }, []);

  return {
    at: at ?? range.to,
    range,
    marks: timelineMarks(store),
    playing,
    scrubbing: at !== null,
    seek,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    live: useCallback(() => {
      setPlaying(false);
      setAt(null);
    }, []),
  };
}
