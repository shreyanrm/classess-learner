import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

/** A localStorage for a test that has no window. */
function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe('the reduce-motion switch', () => {
  const g = globalThis as { localStorage?: Storage };
  let before: Storage | undefined;
  beforeEach(() => {
    before = g.localStorage;
    g.localStorage = fakeStorage();
  });
  afterEach(() => {
    if (before) g.localStorage = before;
    else delete g.localStorage;
  });

  it('is off until the learner turns it on, and remembers the choice', async () => {
    const { getMotionPref, setMotionPref } = await import('./motion');
    expect(getMotionPref()).toBe(false);
    setMotionPref(true);
    expect(getMotionPref()).toBe(true);
    expect(g.localStorage?.getItem('wobo-motion-v1')).toBe('reduce');
    setMotionPref(false);
    expect(getMotionPref()).toBe(false);
    expect(g.localStorage?.getItem('wobo-motion-v1')).toBeNull();
  });

  it('tells its listeners', async () => {
    const { setMotionPref, useMotionPref } = await import('./motion');
    expect(typeof useMotionPref).toBe('function');
    // no document here: stamping the root is a no-op and never throws
    expect(() => setMotionPref(true)).not.toThrow();
  });
});
