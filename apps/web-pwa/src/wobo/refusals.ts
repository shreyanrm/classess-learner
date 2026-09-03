/**
 * What she says when the brain says no.
 *
 * The gateway refuses in exactly two ways a learner can meet — it does not know who you are, or
 * you have used today up — and both must arrive as Wobo's own line. Never a status code, never a
 * provider, never a price, and never a raw error: a child who has just been thinking hard deserves
 * a sentence, not a stack trace.
 */

import { BudgetExhaustedError, GATEWAY_COPY, SignInRequiredError } from '@classess/sdk';

export interface Refusal {
  /** The line she says. Already in her voice. Empty means she says nothing — see `isBargeIn`. */
  text: string;
  /** True when the only way on is to sign in — the app takes them to her sign-in beat. */
  signIn: boolean;
}

/** The moment a spent day refills, in the learner's own clock. Null when the brain gave no time. */
export function friendlyTime(iso: string | null): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * True when the learner cut her off. An `AbortController` rejects the in-flight fetch with an
 * `AbortError`, and BOARD.md §4 is clear that a barge-in is not a failure: the pen lifts, the voice
 * stops, and what is drawn stays. Nothing is owed the learner about it — least of all an apology
 * for something they did on purpose.
 */
export function isBargeIn(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === 'AbortError';
  return (
    typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
  );
}

/** Turn whatever a turn threw into the one line she says about it. */
export function refusalLine(err: unknown): Refusal {
  // She says nothing at all when she was interrupted; an empty line is never spoken or written.
  if (isBargeIn(err)) return { text: '', signIn: false };
  if (err instanceof SignInRequiredError) {
    return { text: err.message || GATEWAY_COPY.signIn, signIn: true };
  }
  if (err instanceof BudgetExhaustedError) {
    const when = friendlyTime(err.resetAt);
    // Her own line when we know the hour; otherwise whatever the brain said, still in her voice.
    return {
      text: when ? GATEWAY_COPY.budgetAt(when) : err.message || GATEWAY_COPY.budget,
      signIn: false,
    };
  }
  return { text: GATEWAY_COPY.trouble, signIn: false };
}
