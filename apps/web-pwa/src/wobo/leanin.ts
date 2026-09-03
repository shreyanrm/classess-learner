'use client';

/**
 * Proactive lean-in (docs/WOBO-PLAN.md §3, WOBO-TASKS §5.7).
 *
 * Three wrong actions or forty idle seconds and the orb leans in and offers a pointer. It is
 * governed by the dial the learner already owns in You — quiet, balanced, proactive — which is why
 * nothing here stores a second one. It never interrupts her own speech or the learner's typing, and
 * it never nags: one offer, then a cooldown.
 *
 * The policy is a pure function so it can be argued with in a test rather than waited out.
 */

import { loadProactivity, type Proactivity } from '../store/mind';

export type { Proactivity };
export { loadProactivity };

export interface DialThresholds {
  /** Wrong actions in a row before she offers. Infinity means never. */
  misses: number;
  /** Quiet milliseconds before she offers. Infinity means never. */
  idleMs: number;
  /** How long she waits after an offer before considering another. */
  cooldownMs: number;
}

export const THRESHOLDS: Record<Proactivity, DialThresholds> = {
  quiet: {
    misses: Number.POSITIVE_INFINITY,
    idleMs: Number.POSITIVE_INFINITY,
    cooldownMs: Number.POSITIVE_INFINITY,
  },
  balanced: { misses: 3, idleMs: 40_000, cooldownMs: 90_000 },
  proactive: { misses: 2, idleMs: 25_000, cooldownMs: 45_000 },
};

export interface LeanSignals {
  /** Wrong actions since the last correct one. */
  misses: number;
  /** Clock of the learner's last input, anywhere in the app. */
  lastInputAt: number;
  /** When she last offered, so she does not nag. 0 means never. */
  lastOfferAt: number;
  /** She is speaking — never talk over herself. */
  speaking: boolean;
  /** The learner is typing — never interrupt a sentence being written. */
  typing: boolean;
  /** Her drawer or her board is already open; the offer would be noise. */
  engaged: boolean;
}

export type LeanReason = 'misses' | 'idle';

/**
 * Should she lean in now, and why. Returns null for "stay where you are" — which is the answer most
 * of the time, and the whole point of the dial.
 */
export function shouldLeanIn(
  signals: LeanSignals,
  now: number,
  dial: Proactivity = 'balanced',
): LeanReason | null {
  const limits = THRESHOLDS[dial];
  if (signals.speaking || signals.typing || signals.engaged) return null;
  // `lastOfferAt === 0` is "she has never offered", not "she offered at the epoch" — without this
  // the cooldown would silence her for the first minute and a half of every session.
  if (signals.lastOfferAt > 0 && now - signals.lastOfferAt < limits.cooldownMs) return null;
  if (signals.misses >= limits.misses) return 'misses';
  if (now - signals.lastInputAt >= limits.idleMs) return 'idle';
  return null;
}

/**
 * Wrong actions in a row, read off the event backbone — the real thing the learner did, not a
 * counter some screen remembered to increment. A correct answer clears the run.
 */
export function trailingMisses(log: readonly { payload?: unknown }[]): number {
  let misses = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    const correct = (log[i]?.payload as { correct?: unknown } | undefined)?.correct;
    if (correct === true) return misses;
    if (correct === false) misses += 1;
  }
  return misses;
}

/** Her offer, in her voice. Sentence case, no exclamation marks, never a nag. */
export function leanInLine(reason: LeanReason, topic?: string): string {
  const where = topic ? ` with ${topic.toLowerCase()}` : '';
  return reason === 'misses'
    ? `that one is fighting you — want me to point at where it turns${where}?`
    : `still here${where} — want me to show you the next move?`;
}
