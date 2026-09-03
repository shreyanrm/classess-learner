/**
 * Which state the app is in, decided in one pure function.
 *
 * There are six ways a screen can be replaced by something other than itself, and they can be true
 * at once: a learner whose link expired can also be offline, and a 500 that arrives while the
 * network is down is not a 500 at all. Spreading that decision across the components that render
 * them is how a product ends up showing two apologies at the same time, so the whole decision lives
 * here, takes plain data, and is unit-tested (`select.test.ts`).
 *
 * The failure store below is the other half: a tiny module store that any part of the app can
 * report a failure to (`reportFailure`) and clear (`clearFailure`). It is deliberately NOT a React
 * context — an error boundary, a fetch in a store, and a redirect handler all need to reach it, and
 * only one of the three is inside the tree.
 */

import { useEffect, useState } from 'react';

/** The states a learner can be shown instead of the screen they asked for. */
export type StateKind =
  | 'ok'
  | 'not-found'
  | 'expired-link'
  | 'maintenance'
  | 'daily-limit'
  | 'server-error'
  | 'offline';

/** What went wrong, as the app last saw it. */
export interface Failure {
  kind: 'server' | 'maintenance' | 'budget' | 'expired-link' | 'network';
  /** When the daily meter refills, ISO, exactly as the brain sent it. Never invented. */
  resetAt?: string | null;
  /** When maintenance expects to be over, ISO, from the server. Never invented. */
  backAt?: string | null;
}

export interface StateSignals {
  /** The route the learner is on. */
  routeName: string;
  /** navigator.onLine, read live. */
  online: boolean;
  /** The last failure nothing has recovered from, or null. */
  failure: Failure | null;
}

/**
 * The one decision.
 *
 * Order matters and is the whole point:
 *  · a 404 is the address itself, and no failure changes what address was asked for;
 *  · an expired link is about the learner's own next action, so it outranks anything ambient;
 *  · planned maintenance is a fact the server told us, and beats our guesses about the network;
 *  · a spent day is a real refusal with a real time on it, not a fault;
 *  · being offline explains a server error and a bare network failure, so it takes them both —
 *    telling somebody with no connection that "something on our side broke" is a lie;
 *  · a server error only shows when we genuinely reached the server and it failed.
 *
 * Being offline on its own is NOT a page. The product works offline — downloaded lessons, practice
 * already opened, the whole conversation — and covering that up with an apology the moment a train
 * enters a tunnel would take away something that still works. The offline page appears when a
 * learner offline actually asked for something that needed the network and it failed. A network
 * failure while online is not a page either: Wobo says one line about it where the learner is
 * (`shell/resilience.ts`) and the screen stays.
 */
export function selectState(s: StateSignals): StateKind {
  if (s.routeName === 'notfound') return 'not-found';
  const kind = s.failure?.kind;
  if (kind === 'expired-link') return 'expired-link';
  if (kind === 'maintenance') return 'maintenance';
  if (kind === 'budget') return 'daily-limit';
  if (!s.online && (kind === 'network' || kind === 'server')) return 'offline';
  if (kind === 'server') return 'server-error';
  return 'ok';
}

/** True when the state is one the learner can wave away and carry on underneath. */
export function isDismissible(kind: StateKind): boolean {
  return kind === 'daily-limit' || kind === 'offline';
}

/**
 * The moment a spent day refills, in the learner's own clock, from the instant the brain sent.
 * Null when there is no time to show — and then the copy says so rather than inventing one.
 */
export function resetClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Tomorrow, today, or a weekday — how the reset time is introduced, in the learner's own clock. */
export function resetDay(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  const days = Math.round(
    (new Date(when.getFullYear(), when.getMonth(), when.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return when.toLocaleDateString(undefined, { weekday: 'long' });
}

// --- the failure store ----------------------------------------------------------------------------

let current: Failure | null = null;
const listeners = new Set<() => void>();

function fan(): void {
  for (const l of listeners) l();
}

/** What the app last failed at. */
export function currentFailure(): Failure | null {
  return current;
}

/**
 * Report a failure. A second report of the same kind does not re-render anybody — a retry loop
 * hitting the same 503 four times is one maintenance page, not four.
 */
export function reportFailure(failure: Failure): void {
  if (
    current &&
    current.kind === failure.kind &&
    current.resetAt === failure.resetAt &&
    current.backAt === failure.backAt
  ) {
    return;
  }
  current = failure;
  fan();
}

/** The learner is past it — a retry worked, they dismissed it, or they navigated away. */
export function clearFailure(): void {
  if (!current) return;
  current = null;
  fan();
}

/** The live failure, for a component. */
export function useFailure(): Failure | null {
  const [failure, setFailure] = useState<Failure | null>(current);
  useEffect(() => {
    const sync = () => setFailure(current);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return failure;
}

// --- turning what the app threw into a failure ------------------------------------------------------

interface MaybeGatewayError {
  name?: unknown;
  code?: unknown;
  status?: unknown;
  resetAt?: unknown;
}

/**
 * The failure an error from the gateway means, or null when it means nothing a page should say.
 *
 * It reads the SHAPE rather than importing the error classes, so a rejection that crossed a
 * dynamic-import boundary (and therefore fails `instanceof`) is still understood, and so this stays
 * a pure function the tests can drive with plain objects.
 */
export function failureFromError(err: unknown): Failure | null {
  if (!err || typeof err !== 'object') return null;
  // A request that never left the device rejects as a TypeError with a browser-specific message.
  // It is the only signal that separates "the link is dead" from "the server said no".
  if (err instanceof TypeError && /fetch|network|connection|load failed/i.test(err.message)) {
    return { kind: 'network' };
  }
  const e = err as MaybeGatewayError;
  if (e.code === 'budget_exhausted') {
    return { kind: 'budget', resetAt: typeof e.resetAt === 'string' ? e.resetAt : null };
  }
  const status = typeof e.status === 'number' ? e.status : 0;
  if (status === 503) return { kind: 'maintenance', backAt: null };
  if (status >= 500) return { kind: 'server' };
  return null;
}

/**
 * The failure a returning sign-in link carries, read off the address the auth service sent the
 * learner back to. Both halves are checked because the implicit flow answers in the fragment and a
 * refusal can answer in the query string.
 *
 * Only an EXPIRED code counts. A learner who opened the provider's consent screen and changed their
 * mind comes back with a plain refusal, and that is not a broken link — showing them an apology for
 * a decision they made on purpose would be the product misreading them.
 */
export function failureFromAuthReturn(search: string, hash: string): Failure | null {
  for (const raw of [search, hash]) {
    const params = new URLSearchParams(raw.replace(/^[?#]/, ''));
    if (params.get('error_code') === 'otp_expired') return { kind: 'expired-link' };
  }
  return null;
}
