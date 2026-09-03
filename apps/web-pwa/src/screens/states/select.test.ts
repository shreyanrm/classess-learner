import { beforeEach, describe, expect, it } from 'bun:test';
import {
  clearFailure,
  currentFailure,
  type Failure,
  failureFromAuthReturn,
  failureFromError,
  isDismissible,
  reportFailure,
  resetClock,
  resetDay,
  type StateSignals,
  selectState,
} from './select';

const base: StateSignals = { routeName: 'home', online: true, failure: null };
const on = (over: Partial<StateSignals>): StateSignals => ({ ...base, ...over });

describe('which state the learner is shown', () => {
  it('shows the screen itself when nothing is wrong', () => {
    expect(selectState(base)).toBe('ok');
  });

  it('lets an address that is not ours be a 404, whatever else is true', () => {
    expect(selectState(on({ routeName: 'notfound' }))).toBe('not-found');
    expect(
      selectState(on({ routeName: 'notfound', online: false, failure: { kind: 'server' } })),
    ).toBe('not-found');
  });

  it('puts the learner’s own next action first: an expired link outranks everything ambient', () => {
    expect(selectState(on({ failure: { kind: 'expired-link' }, online: false }))).toBe(
      'expired-link',
    );
  });

  it('trusts planned maintenance over a guess about the network', () => {
    expect(selectState(on({ failure: { kind: 'maintenance' }, online: false }))).toBe(
      'maintenance',
    );
  });

  it('shows the spent day as itself, never as a fault', () => {
    expect(selectState(on({ failure: { kind: 'budget', resetAt: null } }))).toBe('daily-limit');
  });

  it('does NOT take the page just because the browser went offline', () => {
    // Downloaded lessons, practice already opened and the conversation all still work; covering
    // them with an apology would take away something that is still there.
    expect(selectState(on({ online: false }))).toBe('ok');
  });

  it('shows offline once something that needed the network actually failed', () => {
    expect(selectState(on({ online: false, failure: { kind: 'network' } }))).toBe('offline');
  });

  it('never blames our server for a connection the learner does not have', () => {
    expect(selectState(on({ online: false, failure: { kind: 'server' } }))).toBe('offline');
    expect(selectState(on({ online: true, failure: { kind: 'server' } }))).toBe('server-error');
  });

  it('keeps a wobble on a live connection off the page entirely', () => {
    expect(selectState(on({ online: true, failure: { kind: 'network' } }))).toBe('ok');
  });

  it('lets the learner wave away only the states that leave a working app underneath', () => {
    expect(isDismissible('daily-limit')).toBe(true);
    expect(isDismissible('offline')).toBe(true);
    expect(isDismissible('server-error')).toBe(false);
    expect(isDismissible('not-found')).toBe(false);
    expect(isDismissible('maintenance')).toBe(false);
  });
});

describe('the reset time is the brain’s, never ours', () => {
  it('reads a real instant into the learner’s own clock', () => {
    const iso = new Date(2026, 8, 4, 6, 0).toISOString();
    expect(resetClock(iso)).toBe(
      new Date(iso).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    );
  });

  it('says nothing at all when the brain sent nothing', () => {
    expect(resetClock(null)).toBeNull();
    expect(resetClock(undefined)).toBeNull();
    expect(resetClock('not a time')).toBeNull();
    expect(resetDay(null)).toBeNull();
  });

  it('names the day the way a learner would', () => {
    const now = new Date(2026, 8, 3, 22, 0);
    expect(resetDay(new Date(2026, 8, 3, 23, 30).toISOString(), now)).toBe('today');
    expect(resetDay(new Date(2026, 8, 4, 6, 0).toISOString(), now)).toBe('tomorrow');
    expect(resetDay(new Date(2026, 8, 6, 6, 0).toISOString(), now)).toBe(
      new Date(2026, 8, 6).toLocaleDateString(undefined, { weekday: 'long' }),
    );
  });
});

describe('reading a failure off what was thrown', () => {
  it('carries the 429’s own reset instant through', () => {
    const resetAt = '2026-09-04T00:30:00.000Z';
    expect(failureFromError({ code: 'budget_exhausted', resetAt })).toEqual({
      kind: 'budget',
      resetAt,
    });
  });

  it('keeps a budget refusal with no header honest rather than inventing a time', () => {
    expect(failureFromError({ code: 'budget_exhausted' })).toEqual({
      kind: 'budget',
      resetAt: null,
    });
  });

  it('tells planned work apart from a fault', () => {
    expect(failureFromError({ status: 503 })).toEqual({ kind: 'maintenance', backAt: null });
    expect(failureFromError({ status: 500 })).toEqual({ kind: 'server' });
  });

  it('reads a request that never left the device as the network, not a fault', () => {
    expect(failureFromError(new TypeError('Failed to fetch'))).toEqual({ kind: 'network' });
    expect(failureFromError(new TypeError('Load failed'))).toEqual({ kind: 'network' });
  });

  it('says nothing about a refusal the learner should meet as one of Wobo’s lines', () => {
    expect(failureFromError({ status: 403 })).toBeNull();
    expect(failureFromError({ code: 'sign_in_required' })).toBeNull();
    expect(failureFromError(null)).toBeNull();
    expect(failureFromError('boom')).toBeNull();
  });
});

describe('a sign-in link coming back', () => {
  it('reads an expired code out of the fragment', () => {
    expect(
      failureFromAuthReturn('', '#error=access_denied&error_code=otp_expired&error_description=x'),
    ).toEqual({ kind: 'expired-link' });
  });

  it('reads one out of the query string too', () => {
    expect(failureFromAuthReturn('?error_code=otp_expired', '')).toEqual({ kind: 'expired-link' });
  });

  it('does not apologise to somebody who changed their mind at the provider', () => {
    expect(failureFromAuthReturn('', '#error=access_denied')).toBeNull();
    expect(failureFromAuthReturn('', '')).toBeNull();
    expect(failureFromAuthReturn('?code=abc', '')).toBeNull();
  });
});

describe('the failure store', () => {
  beforeEach(() => clearFailure());

  it('remembers the last failure and lets it go', () => {
    const f: Failure = { kind: 'budget', resetAt: '2026-09-04T00:30:00.000Z' };
    reportFailure(f);
    expect(currentFailure()).toEqual(f);
    clearFailure();
    expect(currentFailure()).toBeNull();
  });

  it('tells nobody twice about the same failure', () => {
    // Re-reporting an identical failure must not replace the stored one, or a retry loop against a
    // single dead endpoint would fan a re-render on every attempt.
    reportFailure({ kind: 'server' });
    const before = currentFailure();
    reportFailure({ kind: 'server' });
    expect(currentFailure()).toBe(before as Failure);
  });

  it('replaces a failure when a different one arrives', () => {
    reportFailure({ kind: 'server' });
    reportFailure({ kind: 'maintenance', backAt: null });
    expect(currentFailure()).toEqual({ kind: 'maintenance', backAt: null });
  });
});
