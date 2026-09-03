'use client';

/**
 * The plane (docs/BOARD.md §5) — a frosted board that slides in from Wobo's orb and floats over the
 * screen, so the thing being explained stays visible underneath.
 *
 * It can be dragged, resized, pinned, and minimised to a thumbnail that keeps its ink; on a phone
 * it is a sheet. A session can hold several boards ("fresh board" starts another), and any code can
 * summon one by name — that is the summon API the word "board" and the gesture layer both call.
 */

import { frost, hairline, radius, zIndex } from '@wobo/config';
import { useReducedMotion } from '@wobo/motion';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BoardSurface, type BoardSurfaceProps } from './renderer';
import { BoardStore } from './store';

// --- The book of boards ---------------------------------------------------------------------------

/** Several boards per session; a fresh board never wipes the one before it. */
class BoardBook {
  private readonly boards = new Map<string, BoardStore>();
  private readonly listeners = new Set<() => void>();
  private order: string[] = [];
  private n = 0;
  /**
   * How many boards a session keeps. "Fresh board" minted a new store every time and the book kept
   * every one of them, ink and all, for the life of the tab; fifty cycles left fifty boards alive.
   * A handful is what a session can actually come back to.
   */
  private static readonly MAX_BOARDS = 8;

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  private emit(): void {
    for (const l of this.listeners) l();
  }

  /** The board with this id, created on first ask. */
  get(id: string): BoardStore {
    const existing = this.boards.get(id);
    if (existing) return existing;
    const store = new BoardStore({ presentation: 'plane' });
    this.boards.set(id, store);
    this.order = [...this.order, id];
    this.evict();
    this.emit();
    return store;
  }

  /** A new, empty board. Returns its id. */
  fresh(): string {
    const id = `board-${++this.n}`;
    this.get(id);
    return id;
  }

  ids(): readonly string[] {
    return this.order;
  }

  /** Forget a board entirely — the learner closed it and did not save it. */
  drop(id: string): void {
    if (!this.boards.has(id)) return;
    this.boards.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this.emit();
  }

  /** Forget a board that was closed with nothing on it. It was never a board Wobo kept. */
  dropIfEmpty(id: string): void {
    if ((this.boards.get(id)?.snapshot().length ?? 0) === 0) this.drop(id);
  }

  /** Over the cap: the oldest empty board goes, then the oldest board, never the one on screen. */
  private evict(): void {
    while (this.order.length > BoardBook.MAX_BOARDS) {
      const open = plane.get().boardId;
      const spare = this.order.filter((id) => id !== open);
      const empty = spare.find((id) => (this.boards.get(id)?.snapshot().length ?? 0) === 0);
      const going = empty ?? spare[0];
      if (!going) return;
      this.boards.delete(going);
      this.order = this.order.filter((x) => x !== going);
    }
  }
}

export const boardBook = new BoardBook();

// --- The summon API -----------------------------------------------------------------------------------

export interface PlaneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlaneState {
  open: boolean;
  minimized: boolean;
  pinned: boolean;
  boardId: string;
  rect: PlaneRect;
  /** Where it slides from — Wobo's orb. */
  origin: { x: number; y: number } | null;
  title: string;
}

const RESTING: PlaneState = {
  open: false,
  minimized: false,
  pinned: false,
  boardId: 'board-1',
  rect: { x: 0, y: 0, w: 520, h: 360 },
  origin: null,
  title: 'board',
};

class PlaneController {
  private state: PlaneState = RESTING;
  private readonly listeners = new Set<() => void>();

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  get = (): PlaneState => this.state;

  private set(patch: Partial<PlaneState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  /** Bring a board in. With no id it reopens the one Wobo was last on. */
  summon(opts?: { boardId?: string; origin?: { x: number; y: number }; title?: string }): string {
    const boardId = opts?.boardId ?? this.state.boardId;
    boardBook.get(boardId);
    this.set({
      open: true,
      minimized: false,
      boardId,
      ...(opts?.origin ? { origin: opts.origin } : {}),
      ...(opts?.title ? { title: opts.title } : {}),
    });
    return boardId;
  }

  /** A fresh board, summoned. */
  fresh(origin?: { x: number; y: number }): string {
    const id = boardBook.fresh();
    return this.summon(origin ? { boardId: id, origin } : { boardId: id });
  }

  dismiss(): void {
    if (this.state.pinned) return;
    const closing = this.state.boardId;
    this.set({ open: false, minimized: false });
    // Closed with nothing on it: forget it rather than keeping an empty store per dismissal.
    boardBook.dropIfEmpty(closing);
  }

  /** Away, but with its ink — the thumbnail by the orb. */
  minimize(): void {
    this.set({ minimized: true });
  }
  restore(): void {
    this.set({ minimized: false, open: true });
  }
  togglePin(): void {
    this.set({ pinned: !this.state.pinned });
  }
  move(rect: Partial<PlaneRect>): void {
    this.set({ rect: { ...this.state.rect, ...rect } });
  }
  /** Wipe the board Wobo is on, keeping the plane open. */
  wipe(): void {
    boardBook.get(this.state.boardId).reset();
  }
}

/** The one plane. Summon it from anywhere: `plane.summon()`, `plane.fresh()`. */
export const plane = new PlaneController();

/** Subscribe a component to the plane's state. */
export function usePlane(): PlaneState {
  return useSyncExternalStore(plane.subscribe, plane.get, plane.get);
}

/** The store behind a board id, subscribed so a fresh board re-renders its surface. */
export function useBoard(boardId: string): BoardStore {
  useSyncExternalStore(
    boardBook.subscribe,
    () => boardBook.ids().length,
    () => boardBook.ids().length,
  );
  return boardBook.get(boardId);
}

// --- The surface ------------------------------------------------------------------------------------------

const PHONE_WIDTH = 640;
const MIN_W = 320;
const MIN_H = 220;
const THUMB = 96;

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < PHONE_WIDTH,
  );
  useEffect(() => {
    const on = () => setPhone(window.innerWidth < PHONE_WIDTH);
    window.addEventListener('resize', on, { passive: true });
    return () => window.removeEventListener('resize', on);
  }, []);
  return phone;
}

const chromeButton = (label: string, onClick: () => void, glyph: string) => (
  <button
    key={label}
    type="button"
    aria-label={label}
    onClick={onClick}
    style={{
      appearance: 'none',
      background: 'transparent',
      border: `0.5px solid ${hairline.onPaper}`,
      borderRadius: radius.sm,
      color: 'var(--wobo-ink-500, #6E6E76)',
      cursor: 'pointer',
      font: 'inherit',
      fontSize: 12,
      height: 24,
      lineHeight: '22px',
      padding: '0 8px',
    }}
  >
    {glyph}
  </button>
);

export interface WoboPlaneProps
  extends Pick<
    BoardSurfaceProps,
    'targets' | 'focusRegions' | 'onLearnerFocus' | 'onVariableChange' | 'fontUrl'
  > {
  /** Let the learner draw on the plane. On by default — the board is bidirectional. */
  capture?: boolean;
}

/**
 * The floating board. Mount once, near the root, beside the orb. Everything about where it is and
 * whether it is here is on the `plane` controller, so a word ("board"), a gesture, or a turn can
 * summon it without prop drilling.
 */
export function WoboPlane(props: WoboPlaneProps) {
  const state = usePlane();
  const store = useBoard(state.boardId);
  const reduced = useReducedMotion();
  const phone = useIsPhone();
  const dragging = useRef<{ dx: number; dy: number } | null>(null);
  const resizing = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // A plane that has never been placed opens in the lower right, above Wobo's orb.
  useEffect(() => {
    if (!state.open || phone) return;
    if (state.rect.x !== 0 || state.rect.y !== 0) return;
    plane.move({
      x: Math.max(24, window.innerWidth - state.rect.w - 104),
      y: Math.max(24, window.innerHeight - state.rect.h - 132),
    });
  }, [state.open, state.rect.x, state.rect.y, state.rect.w, state.rect.h, phone]);

  useEffect(() => {
    if (!state.open || state.minimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') plane.dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open, state.minimized]);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (phone) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragging.current = { dx: e.clientX - state.rect.x, dy: e.clientY - state.rect.y };
    },
    [phone, state.rect.x, state.rect.y],
  );
  const onDragMove = useCallback((e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    plane.move({ x: e.clientX - d.dx, y: e.clientY - d.dy });
  }, []);
  const onDragEnd = useCallback(() => {
    dragging.current = null;
    resizing.current = null;
  }, []);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      resizing.current = { x: e.clientX, y: e.clientY, w: state.rect.w, h: state.rect.h };
    },
    [state.rect.w, state.rect.h],
  );
  const onResizeMove = useCallback((e: React.PointerEvent) => {
    const r = resizing.current;
    if (!r) return;
    plane.move({
      w: Math.max(MIN_W, r.w + (e.clientX - r.x)),
      h: Math.max(MIN_H, r.h + (e.clientY - r.y)),
    });
  }, []);

  /** Keyboard path for every interaction: the header moves and resizes with the arrow keys. */
  const onChromeKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 24 : 8;
    const map: Record<string, Partial<PlaneRect>> = {
      ArrowLeft: e.altKey ? { w: state.rect.w - step } : { x: state.rect.x - step },
      ArrowRight: e.altKey ? { w: state.rect.w + step } : { x: state.rect.x + step },
      ArrowUp: e.altKey ? { h: state.rect.h - step } : { y: state.rect.y - step },
      ArrowDown: e.altKey ? { h: state.rect.h + step } : { y: state.rect.y + step },
    };
    const patch = map[e.key];
    if (!patch) return;
    e.preventDefault();
    plane.move({
      ...patch,
      ...(patch.w !== undefined ? { w: Math.max(MIN_W, patch.w) } : {}),
      ...(patch.h !== undefined ? { h: Math.max(MIN_H, patch.h) } : {}),
    });
  };

  /**
   * The resize handle's own keyboard path. It is a focusable, labelled button, so it has to DO
   * something when it is pressed: a control that announces itself and then ignores every key is
   * worse than no control at all.
   */
  const onResizeKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 24 : 8;
    const map: Record<string, Partial<PlaneRect>> = {
      ArrowLeft: { w: state.rect.w - step },
      ArrowRight: { w: state.rect.w + step },
      ArrowUp: { h: state.rect.h - step },
      ArrowDown: { h: state.rect.h + step },
    };
    const patch = map[e.key];
    if (!patch) return;
    e.preventDefault();
    plane.move({
      ...(patch.w !== undefined ? { w: Math.max(MIN_W, patch.w) } : {}),
      ...(patch.h !== undefined ? { h: Math.max(MIN_H, patch.h) } : {}),
    });
  };

  const spring = reduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 } as const);

  const frame: React.CSSProperties = phone
    ? { left: 0, right: 0, bottom: 0, width: '100%', height: '62vh' }
    : { left: state.rect.x, top: state.rect.y, width: state.rect.w, height: state.rect.h };

  const from = state.origin
    ? {
        x: state.origin.x - state.rect.x - state.rect.w / 2,
        y: state.origin.y - state.rect.y - state.rect.h / 2,
      }
    : { x: 0, y: 24 };

  return (
    <AnimatePresence>
      {state.open && !state.minimized ? (
        <motion.section
          key="plane"
          role="dialog"
          aria-label={`${state.title}, Wobo's board`}
          initial={reduced ? false : { opacity: 0, scale: 0.86, x: from.x, y: from.y }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: from.x, y: from.y }}
          transition={spring}
          style={{
            position: 'fixed',
            ...frame,
            zIndex: zIndex.panel,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--wobo-frost-on-paper, rgba(255,255,255,0.78))',
            backdropFilter: `blur(${frost.blur})`,
            WebkitBackdropFilter: `blur(${frost.blur})`,
            border: `0.5px solid ${hairline.onPaper}`,
            borderRadius: phone ? `${radius.sm}px ${radius.sm}px 0 0` : radius.sm,
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              alignItems: 'center',
              borderBottom: `0.5px solid ${hairline.onPaper}`,
              display: 'flex',
              flex: '0 0 auto',
              gap: 8,
              padding: '8px 10px',
              userSelect: 'none',
            }}
          >
            {/* The drag handle is a real button, so the board can be moved and resized from the
                keyboard exactly as it can with a pointer. */}
            <button
              type="button"
              aria-label={`${state.title} — drag to move, arrows to move, alt and arrows to resize`}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              onKeyDown={onChromeKey}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--wobo-ink-500, #6E6E76)',
                cursor: phone ? 'default' : 'grab',
                flex: '1 1 auto',
                font: 'inherit',
                fontSize: 12,
                letterSpacing: '0.01em',
                margin: 0,
                padding: 0,
                textAlign: 'left',
                touchAction: 'none',
              }}
            >
              {state.title}
            </button>
            {chromeButton('fresh board', () => plane.fresh(), 'fresh')}
            {chromeButton('wipe the board', () => plane.wipe(), 'wipe')}
            {chromeButton(
              state.pinned ? 'unpin the board' : 'pin the board',
              () => plane.togglePin(),
              state.pinned ? 'pinned' : 'pin',
            )}
            {chromeButton('minimise the board', () => plane.minimize(), 'hide')}
            {chromeButton('close the board', () => plane.dismiss(), 'close')}
          </header>
          <div style={{ flex: '1 1 auto', position: 'relative' }}>
            <BoardSurface
              store={store}
              capture={props.capture ?? true}
              {...(props.targets ? { targets: props.targets } : {})}
              {...(props.focusRegions ? { focusRegions: props.focusRegions } : {})}
              {...(props.onLearnerFocus ? { onLearnerFocus: props.onLearnerFocus } : {})}
              {...(props.onVariableChange ? { onVariableChange: props.onVariableChange } : {})}
              {...(props.fontUrl ? { fontUrl: props.fontUrl } : {})}
              autoCamera
              label="Wobo's board"
            />
          </div>
          {phone ? null : (
            <button
              type="button"
              aria-label="resize the board — drag, or the arrow keys"
              onPointerDown={onResizeStart}
              onPointerMove={onResizeMove}
              onPointerUp={onDragEnd}
              onKeyDown={onResizeKey}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                bottom: 0,
                cursor: 'nwse-resize',
                height: 18,
                padding: 0,
                position: 'absolute',
                right: 0,
                touchAction: 'none',
                width: 18,
              }}
            />
          )}
        </motion.section>
      ) : null}
      {state.open && state.minimized ? (
        <motion.button
          key="thumb"
          type="button"
          aria-label={`open ${state.title}`}
          onClick={() => plane.restore()}
          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring}
          style={{
            background: 'var(--wobo-frost-on-paper, rgba(255,255,255,0.78))',
            backdropFilter: `blur(${frost.blur})`,
            WebkitBackdropFilter: `blur(${frost.blur})`,
            border: `0.5px solid ${hairline.onPaper}`,
            borderRadius: radius.sm,
            bottom: 132,
            cursor: 'pointer',
            height: THUMB * 0.68,
            overflow: 'hidden',
            padding: 0,
            position: 'fixed',
            right: 24,
            width: THUMB,
            zIndex: zIndex.panel,
          }}
        >
          <div style={{ inset: 0, position: 'absolute' }}>
            <BoardSurface store={store} label={`${state.title}, minimised`} />
          </div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
