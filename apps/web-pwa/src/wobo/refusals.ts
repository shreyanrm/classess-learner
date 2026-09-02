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
  /** The line she says. Already in her voice. */
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

/** Turn whatever a turn threw into the one line she says about it. */
export function refusalLine(err: unknown): Refusal {
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
