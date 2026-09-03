import { describe, expect, it } from 'bun:test';
import {
  anyAvailable,
  callSeam,
  liveSeams,
  METHOD_SEAMS,
  mergeSeams,
  methodStates,
  seamFor,
} from './client';

describe('reading what the one auth client can do', () => {
  it('finds a method by the seam the client exposes', () => {
    const seams = mergeSeams({ signInWithGoogle: () => {}, requestPhoneOtp: () => {} });
    expect(seamFor('google', seams)).toBe('signInWithGoogle');
    expect(seamFor('phone', seams)).toBe('requestPhoneOtp');
    expect(seamFor('apple', seams)).toBeNull();
  });

  it('takes the first seam name it recognises, so a rename does not shut the door', () => {
    expect(seamFor('password', mergeSeams({ signInWithPassword: () => {} }))).toBe(
      'signInWithPassword',
    );
    expect(seamFor('password', mergeSeams({ signInWithEmailPassword: () => {} }))).toBe(
      'signInWithEmailPassword',
    );
  });

  it('opens a door on its own the day the client grows the seam', () => {
    // The SDK is another wave's file. Detection is by shape precisely so that adding
    // `signInWithApple` there lights this button up with no edit here.
    expect(methodStates(mergeSeams({})).find((s) => s.name === 'apple')?.available).toBe(false);
    const grown = mergeSeams({ signInWithApple: () => {} });
    expect(methodStates(grown).find((s) => s.name === 'apple')?.available).toBe(true);
  });

  it('reports every method, so a shut door is still rendered and can say so', () => {
    const states = methodStates(mergeSeams({}));
    expect(states.map((s) => s.name).sort()).toEqual(Object.keys(METHOD_SEAMS).sort() as never);
    expect(states.every((s) => s.available === false)).toBe(true);
    expect(anyAvailable(states)).toBe(false);
  });

  it('ignores a property that is not callable', () => {
    expect(seamFor('google', mergeSeams({ signInWithGoogle: 'yes' as unknown }))).toBeNull();
  });
});

describe('merging the client’s seams', () => {
  it('lets the account layer win where both expose the same name', () => {
    const account = { signInWithGoogle: () => 'account' };
    const identity = { signInWithGoogle: () => 'identity' };
    const seams = mergeSeams(account, identity);
    expect((seams.signInWithGoogle as () => string)()).toBe('account');
  });

  it('survives a client that is not there at all', () => {
    expect(mergeSeams(null, undefined)).toEqual({});
    expect(anyAvailable(methodStates(mergeSeams(null)))).toBe(false);
  });

  it('keeps a seam bound to the object it came from', async () => {
    // A prototype method would lose `this` if it were copied bare — and would fail in front of
    // somebody trying to sign in, which is the worst possible place to find out.
    class Client {
      readonly who = 'the one client';
      signInWithGoogle(): string {
        return this.who;
      }
    }
    const seams = mergeSeams(new Client() as unknown as Record<string, unknown>);
    expect(await callSeam(seams, 'signInWithGoogle')).toBe('the one client');
  });

  it('refuses to call a seam that is not there', async () => {
    await expect(callSeam(mergeSeams({}), 'signInWithApple')).rejects.toThrow();
  });

  it('passes the arguments through', async () => {
    const seen: unknown[] = [];
    const seams = mergeSeams({ signInWithPassword: (...a: unknown[]) => seen.push(...a) });
    await callSeam(seams, 'signInWithPassword', 'me@example.com', 'a-password');
    expect(seen).toEqual(['me@example.com', 'a-password']);
  });
});

describe('telling a real seam from a throwing stub', () => {
  const stub = {
    signInWithGoogle: () => {
      throw new Error('not enabled');
    },
    requestPhoneOtp: () => {
      throw new Error('not enabled');
    },
  };

  it('shuts every door in dev-mock mode, where every seam throws', () => {
    // The trap: the dev stub is a full set of correctly-named functions that all throw. Five doors
    // that look open and fail on press is exactly what the disabled state exists to prevent.
    const seams = liveSeams({ identityAuth: stub, devAuth: true });
    expect(anyAvailable(methodStates(seams))).toBe(false);
  });

  it('opens them under live auth, where that same object is the real client', () => {
    const seams = liveSeams({ identityAuth: stub, devAuth: false });
    expect(seamFor('google', seams)).toBe('signInWithGoogle');
    expect(seamFor('phone', seams)).toBe('requestPhoneOtp');
  });

  it('trusts the account layer whenever it is there, because it only exists with real keys', () => {
    const seams = liveSeams({ account: { signInWithGoogle: () => {} }, devAuth: true });
    expect(seamFor('google', seams)).toBe('signInWithGoogle');
  });
});
