'use client';

/**
 * The forge store — forged workbooks persist here, survive a reload, and re-attempt freely.
 *
 * A forge follows the downloading discipline (CONTEXT.md content law): binding a workbook enqueues
 * it as `building`, one composition runs at a time, and the learner is notified when it is ready —
 * never a preloaded pile, never a fake spinner. Composition itself lives in pools.ts; this module
 * is the pure store (localStorage + a window event so every surface stays in sync) plus the shelf's
 * per-attempt score log. Re-attempts earn no XP (owner replay law) — the run flips the store's
 * replay guard, exactly like a replayed course.
 *
 * ponytail: the same tiny event-emitter-over-localStorage the course download queue uses.
 */

import { useEffect, useState } from 'react';
import type { ComposedWorkbook, ForgeMix, ForgeSize } from './pools';

export interface ForgeAttempt {
  at: number;
  correct: number;
  total: number;
}

export interface ForgedWorkbook {
  id: string;
  title: string;
  /** Picked topic ids and their display names — the pages of the bindery. */
  picks: string[];
  pickNames: string[];
  size: ForgeSize;
  mix: ForgeMix;
  status: 'building' | 'ready';
  at: number;
  /** Composed once the build settles (empty while building). */
  pages: ComposedWorkbook['pages'];
  total: number;
  note: string;
  attempts: ForgeAttempt[];
}

const KEY = 'clss-forged-v1';
const EVT = 'clss-forged-changed';

function load(): ForgedWorkbook[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as ForgedWorkbook[];
    if (!Array.isArray(raw)) return [];
    // a build lost to a reload never finished — it stays `building`; the runner picks it up again.
    return raw.filter((w) => w && typeof w.id === 'string' && Array.isArray(w.picks));
  } catch {
    return [];
  }
}

let items: ForgedWorkbook[] = typeof window === 'undefined' ? [] : load();

function persist(next: ForgedWorkbook[]): void {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable — the shelf is session-only, still fully functional in memory
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT));
}

export function getForged(): ForgedWorkbook[] {
  return items;
}

export function getForge(id: string): ForgedWorkbook | undefined {
  return items.find((w) => w.id === id);
}

/** Bind a workbook — it enters the queue as `building`. Returns its id. */
export function createForge(config: {
  title: string;
  picks: string[];
  pickNames: string[];
  size: ForgeSize;
  mix: ForgeMix;
}): string {
  const id = crypto.randomUUID();
  persist([
    {
      id,
      title: config.title,
      picks: config.picks,
      pickNames: config.pickNames,
      size: config.size,
      mix: config.mix,
      status: 'building',
      at: Date.now(),
      pages: [],
      total: 0,
      note: '',
      attempts: [],
    },
    ...items,
  ]);
  return id;
}

/** The runner's claim: the oldest still-building forge, or undefined when one is in flight/none. */
export function claimNextForge(): ForgedWorkbook | undefined {
  return [...items].reverse().find((w) => w.status === 'building');
}

/** Settle a build with its composed pages — it becomes ready and re-attemptable. */
export function settleForge(id: string, composed: ComposedWorkbook): void {
  persist(
    items.map((w) =>
      w.id === id
        ? {
            ...w,
            status: 'ready',
            pages: composed.pages,
            total: composed.total,
            note: composed.note,
          }
        : w,
    ),
  );
}

/** Log a completed attempt's score (no XP is earned on a re-attempt — replay law, held by the run). */
export function recordAttempt(id: string, correct: number, total: number): void {
  persist(
    items.map((w) =>
      w.id === id ? { ...w, attempts: [...w.attempts, { at: Date.now(), correct, total }] } : w,
    ),
  );
}

export function removeForge(id: string): void {
  persist(items.filter((w) => w.id !== id));
}

/** The learner's best score across attempts, or null if never attempted. */
export function bestScore(w: ForgedWorkbook): ForgeAttempt | null {
  if (w.attempts.length === 0) return null;
  return [...w.attempts].sort((a, b) => b.correct / b.total - a.correct / a.total)[0] ?? null;
}

// --- Hooks ----------------------------------------------------------------------------------------

function useForgedRaw(): ForgedWorkbook[] {
  const [snap, setSnap] = useState<ForgedWorkbook[]>(items);
  useEffect(() => {
    const sync = () => setSnap(items);
    sync();
    window.addEventListener(EVT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        items = load();
        setSnap(items);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return snap;
}

export function useForged(): ForgedWorkbook[] {
  return useForgedRaw();
}

export function useForge(id: string | null): ForgedWorkbook | undefined {
  const all = useForgedRaw();
  return id ? all.find((w) => w.id === id) : undefined;
}
