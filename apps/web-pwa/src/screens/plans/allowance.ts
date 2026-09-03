/**
 * "Turns left today", read from the brain rather than guessed.
 *
 * WOBO-PLAN §16 asks for an allowance widget with a real reset time. The client never computes a
 * limit — `sdk.me()` asks the gateway, which answers with what is left of the day and the instant
 * the window rolls over (`packages/sdk/src/gateway.ts`). Everything here is the honest reading of
 * that answer, including the two cases where there is no answer: a build with no gateway
 * configured, and a learner the gateway has not met yet.
 */

import type { Me } from '@wobo/sdk';

export interface Allowance {
  /** False when nothing could be read — the widget then says so instead of showing a number. */
  known: boolean;
  remaining: number | null;
  limit: number | null;
  /** When the day's allowance comes back. */
  resetsAt: Date | null;
}

/** Read the allowance out of what the brain said about this learner. */
export function readAllowance(me: Me | null | undefined): Allowance {
  if (!me) return { known: false, remaining: null, limit: null, resetsAt: null };
  const { remaining, limit, used } = me.budget.turns;
  const left = remaining ?? (limit !== null && used !== null ? Math.max(limit - used, 0) : null);
  const at = me.budget.resetAt ? new Date(me.budget.resetAt) : null;
  return {
    known: left !== null || limit !== null,
    remaining: left,
    limit,
    resetsAt: at && !Number.isNaN(at.getTime()) ? at : null,
  };
}

/** The clock time an allowance comes back, in the reader's own locale. */
export function resetTime(at: Date): string {
  return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * What the widget says. One sentence, sentence case, no exclamation, and never a number we did not
 * read — an unknown allowance says it is unknown.
 */
export function allowanceLine(
  allowance: Allowance,
  format: (at: Date) => string = resetTime,
): string {
  if (!allowance.known || allowance.remaining === null) {
    return 'Sign in and this shows how many turns are left today, and when they come back.';
  }
  const of = allowance.limit !== null ? ` of ${allowance.limit}` : '';
  const turns = allowance.remaining === 1 ? '1 turn' : `${allowance.remaining} turns`;
  const back = allowance.resetsAt ? ` They come back at ${format(allowance.resetsAt)}.` : '';
  if (allowance.remaining === 0) {
    return `No turns left today${of ? ` (${allowance.limit} a day)` : ''}.${back || ' They come back when the day rolls over.'}`;
  }
  return `${turns}${of} left today.${back}`;
}
