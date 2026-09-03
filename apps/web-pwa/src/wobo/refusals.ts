/**
 * What Wobo says when the brain says no.
 *
 * The gateway refuses in exactly two ways a learner can meet — it does not know who you are, or
 * you have used today up — and both must arrive as Wobo's own line. Never a status code, never a
 * provider, never a price, and never a raw error: a child who has just been thinking hard deserves
 * a sentence, not a stack trace.
 */

import { BudgetExhaustedError, GATEWAY_COPY, SignInRequiredError } from '@wobo/sdk';
import { WOBBLY_LINE } from '../shell/resilience';

export interface Refusal {
  /** The line Wobo says. Already in Wobo's voice. Empty means Wobo says nothing — see `isBargeIn`. */
  text: string;
  /** True when the only way on is to sign in — the app takes them to Wobo's sign-in beat. */
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
 * True when the learner cut Wobo off. An `AbortController` rejects the in-flight fetch with an
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

/**
 * True when the request never reached the gateway at all — a dropped link, DNS, a captive portal,
 * a tunnel. `fetch` rejects these as a TypeError with a browser-specific message, which is the only
 * thing that distinguishes them from a real failure.
 *
 * It matters because family N (the struggler on 2G) says the dead-end rule applies here: a stall on
 * the way out is not "something went wrong", it is the network being the network, and Wobo says so.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  return /fetch|network|connection|load failed/i.test(err.message);
}

/** Turn whatever a turn threw into the one line Wobo says about it. */
export function refusalLine(err: unknown): Refusal {
  // Wobo says nothing at all when Wobo was interrupted; an empty line is never spoken or written.
  if (isBargeIn(err)) return { text: '', signIn: false };
  if (err instanceof SignInRequiredError) {
    return { text: err.message || GATEWAY_COPY.signIn, signIn: true };
  }
  if (err instanceof BudgetExhaustedError) {
    const when = friendlyTime(err.resetAt);
    // Wobo's own line when we know the hour; otherwise whatever the brain said, still in Wobo's voice.
    return {
      text: when ? GATEWAY_COPY.budgetAt(when) : err.message || GATEWAY_COPY.budget,
      signIn: false,
    };
  }
  // The link wobbled — Wobo's own line for it (resilience.ts), not the generic trouble line.
  if (isNetworkError(err)) return { text: WOBBLY_LINE, signIn: false };
  return { text: GATEWAY_COPY.trouble, signIn: false };
}
