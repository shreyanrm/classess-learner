'use client';

/**
 * The per-learner mind (VIDYA.md §7) — behavioural signals accumulated locally and folded into
 * every Vidya call through the bus's lifetime slot: median item latency, the wrong-answer slip
 * log (each one detonated on screen), which surfaces the learner lingers on, and session cadence.
 * Visible and clearable in You — her memory of you is steerable, never hidden.
 * ponytail: localStorage until the mind syncs through KGtoPG; shapes mirror what that sync needs.
 */

import type { Sdk } from '@classess/sdk';
import { useVidyaBus } from '@classess/vidya';
import { useEffect, useRef } from 'react';
import { useRouter } from '../shell/router';
import { useSdk } from './sdk';

export const MIND_KEY = 'clss-mind-v1';
export const PROACTIVITY_KEY = 'clss-proactivity-v1';

// --- the mind state ------------------------------------------------------------------------------

/** One wrong answer, newest last — the raw material of a detonation. */
export interface Slip {
  nodeId: string;
  itemId?: string;
  /** the learner's own wrong number, when the response was numeric */
  value?: number;
  at: string;
}

export interface MindState {
  /** recent item latencies in ms, oldest first (practice + attempts) */
  latenciesMs: number[];
  /** recent wrong answers, oldest first */
  slips: Slip[];
  /** seconds of dwell per surface — which formats they linger on */
  dwellSec: Record<string, number>;
  /** ISO dates with at least one session — cadence */
  sessionDays: string[];
}

const EMPTY: MindState = { latenciesMs: [], slips: [], dwellSec: {}, sessionDays: [] };
const MAX_LATENCIES = 60;
const MAX_SLIPS = 12;
const MAX_DAYS = 30;

export function loadMind(): MindState {
  try {
    const raw = localStorage.getItem(MIND_KEY);
    if (!raw) return { ...EMPTY };
    const m = JSON.parse(raw) as Partial<MindState>;
    return {
      latenciesMs: Array.isArray(m.latenciesMs) ? m.latenciesMs : [],
      slips: Array.isArray(m.slips) ? m.slips : [],
      dwellSec: m.dwellSec && typeof m.dwellSec === 'object' ? m.dwellSec : {},
      sessionDays: Array.isArray(m.sessionDays) ? m.sessionDays : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveMind(mind: MindState): void {
  try {
    localStorage.setItem(MIND_KEY, JSON.stringify(mind));
  } catch {
    // storage unavailable — the mind lives for this session only
  }
}

/** The learner clears what she knows — steerable memory, honestly erased. */
export function clearMind(): void {
  try {
    localStorage.removeItem(MIND_KEY);
  } catch {
    // fine
  }
}

// --- folding signals in --------------------------------------------------------------------------

type LoggedEvent = ReturnType<Sdk['events']['getLog']>[number];

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/**
 * Fold new events into the mind. PracticeRun fires learn.attempt.submitted AND
 * practice.item.answered for the same answer — `seen` dedupes the pair by item and latency.
 */
export function foldEvents(mind: MindState, events: LoggedEvent[], seen: Set<string>): boolean {
  let changed = false;
  for (const e of events) {
    if (
      e.event_type !== 'practice.item.answered.v1' &&
      e.event_type !== 'learn.attempt.submitted.v1'
    )
      continue;
    const p = asRecord(e.payload);
    const latency = typeof p.latency_ms === 'number' ? p.latency_ms : undefined;
    const correct = p.correct === true;
    const key = `${String(p.item_id ?? 'x')}:${latency ?? 'x'}:${correct}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > 400) seen.clear(); // ponytail: cheap prune, worst case one duplicate slips in
    if (latency !== undefined && latency > 0) {
      mind.latenciesMs = [...mind.latenciesMs, latency].slice(-MAX_LATENCIES);
      changed = true;
    }
    if (p.correct === false) {
      const response = asRecord(p.response);
      mind.slips = [
        ...mind.slips,
        {
          nodeId: String(p.node_id ?? ''),
          itemId: typeof p.item_id === 'string' ? p.item_id : undefined,
          value: typeof response.value === 'number' ? response.value : undefined,
          at: e.occurred_at,
        },
      ].slice(-MAX_SLIPS);
      changed = true;
    }
  }
  return changed;
}

/** Mark today as a session day. Returns true when the day is new. */
export function markSessionDay(mind: MindState): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (mind.sessionDays.includes(today)) return false;
  mind.sessionDays = [...mind.sessionDays, today].slice(-MAX_DAYS);
  return true;
}

/** Add dwell seconds for a surface (per-stay capped so an idle tab never dominates). */
export function addDwell(mind: MindState, surface: string, seconds: number): void {
  const s = Math.min(seconds, 1800);
  if (s < 2) return;
  mind.dwellSec = { ...mind.dwellSec, [surface]: (mind.dwellSec[surface] ?? 0) + s };
}

// --- summarizing out -----------------------------------------------------------------------------

export function medianLatencyMs(mind: MindState): number | undefined {
  if (mind.latenciesMs.length === 0) return undefined;
  const sorted = [...mind.latenciesMs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** The surfaces worth calling a "preferred format" — home and you are ambient, not formats. */
const FORMAT_LABELS: Record<string, string> = {
  course: 'course cards',
  practice: 'practice runs',
  chat: 'conversation',
  learn: 'the learn map',
  sandbox: 'the what-if sandbox',
  progress: 'the progress map',
};

export function preferredFormat(mind: MindState): string | undefined {
  let best: string | undefined;
  let bestSec = 0;
  for (const [surface, sec] of Object.entries(mind.dwellSec)) {
    const label = FORMAT_LABELS[surface];
    if (label && sec > bestSec) {
      best = label;
      bestSec = sec;
    }
  }
  return bestSec >= 60 ? best : undefined;
}

export function activeDaysOfLastSeven(mind: MindState): number {
  const days = new Set(mind.sessionDays);
  let n = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (days.has(d)) n += 1;
  }
  return n;
}

/** The disclosure lines — exactly what the You card shows the learner. */
export function mindLines(mind: MindState): string[] {
  const lines: string[] = [];
  const median = medianLatencyMs(mind);
  if (median !== undefined)
    lines.push(
      `you usually answer an item in about ${Math.round(median / 1000)}s (${mind.latenciesMs.length} answers watched)`,
    );
  if (mind.slips.length > 0) {
    const last = mind.slips[mind.slips.length - 1];
    const lastBit = last?.value !== undefined ? ` — the last one was x = ${last.value}` : '';
    lines.push(
      `${mind.slips.length} recent wrong ${mind.slips.length === 1 ? 'answer' : 'answers'} she is keeping an eye on${lastBit}`,
    );
  }
  const format = preferredFormat(mind);
  if (format) lines.push(`you linger longest on ${format}`);
  const active = activeDaysOfLastSeven(mind);
  if (mind.sessionDays.length > 0) lines.push(`you showed up ${active} of the last 7 days`);
  return lines;
}

/** One compact string for the lifetime slot — every Vidya call is conditioned on this. */
export function summarizeMind(mind: MindState): string | undefined {
  const parts: string[] = [];
  const median = medianLatencyMs(mind);
  if (median !== undefined) parts.push(`median item latency ~${Math.round(median / 1000)}s`);
  if (mind.slips.length > 0) {
    const recent = mind.slips
      .slice(-3)
      .map((s) => (s.value !== undefined ? `x=${s.value}` : 'one answer'))
      .join(', ');
    parts.push(`${mind.slips.length} recent wrong answers (latest: ${recent})`);
  }
  const format = preferredFormat(mind);
  if (format) parts.push(`prefers ${format}`);
  if (mind.sessionDays.length > 0)
    parts.push(`active ${activeDaysOfLastSeven(mind)} of last 7 days`);
  return parts.length > 0 ? parts.join('; ') : undefined;
}

// --- the proactivity dial ------------------------------------------------------------------------

export type Proactivity = 'quiet' | 'balanced' | 'proactive';

export function loadProactivity(): Proactivity {
  try {
    const v = localStorage.getItem(PROACTIVITY_KEY);
    return v === 'quiet' || v === 'proactive' ? v : 'balanced';
  } catch {
    return 'balanced';
  }
}

export function saveProactivity(p: Proactivity): void {
  try {
    localStorage.setItem(PROACTIVITY_KEY, p);
  } catch {
    // fine
  }
}

/** Under the proactive dial only: one extra chip drawn from the mind, never a nag. */
export function proactiveChip(mind: MindState): { label: string; prompt: string } | null {
  const last = mind.slips[mind.slips.length - 1];
  if (!last) return null;
  return {
    label: 'Retry what slipped',
    prompt:
      'One of my recent practice answers was wrong. Set me up to retry that idea — a quick warm-up first, then the real thing.',
  };
}

// --- the observer --------------------------------------------------------------------------------

/**
 * Mounted once inside the app: marks the session, folds the event log into the mind on a slow
 * pulse, tracks dwell per surface, and keeps the bus's lifetime slot current so assembleContext
 * carries the mind into every Vidya call.
 */
export function MindObserver() {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { route } = useRouter();
  const mindRef = useRef<MindState | null>(null);
  const cursor = useRef(0);
  const seen = useRef<Set<string>>(new Set());
  if (mindRef.current === null) mindRef.current = loadMind();

  // session cadence + first publish, once per boot
  useEffect(() => {
    const mind = mindRef.current;
    if (!mind) return;
    if (markSessionDay(mind)) saveMind(mind);
    bus.publishLifetime({ twinSummary: summarizeMind(mind) });
  }, [bus]);

  // fold the event log on a slow pulse
  useEffect(() => {
    const fold = () => {
      const mind = mindRef.current;
      if (!mind) return;
      const log = sdk.events.getLog();
      if (log.length <= cursor.current) return;
      const fresh = log.slice(cursor.current);
      cursor.current = log.length;
      if (foldEvents(mind, fresh, seen.current)) {
        saveMind(mind);
        bus.publishLifetime({ twinSummary: summarizeMind(mind) });
      }
    };
    const t = window.setInterval(fold, 4000);
    return () => {
      fold();
      window.clearInterval(t);
    };
  }, [sdk, bus]);

  // dwell: how long each surface holds them
  useEffect(() => {
    const name = route.name;
    const started = Date.now();
    return () => {
      const mind = mindRef.current;
      if (!mind) return;
      addDwell(mind, name, (Date.now() - started) / 1000);
      saveMind(mind);
    };
  }, [route.name]);

  return null;
}
