import { beforeEach, describe, expect, it } from 'bun:test';

/** A localStorage stand-in — the app's stores talk to the real one; here we watch every key. */
class FakeStorage {
  readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const storage = new FakeStorage();
(globalThis as { localStorage?: unknown }).localStorage = storage;

const { applyScope, forgetScope, inheritScope, rememberedScope, scoped, scopedKey } = await import(
  './scope'
);
const { readArchive, writeArchive } = await import('../wobo/chat');

const ARCHIVE = 'wobo-archive-v1';
const turn = (text: string) => [{ id: 't1', role: 'wobo' as const, text }];

beforeEach(() => {
  storage.clear();
  applyScope(null);
});

describe('per-learner storage scope', () => {
  it('keys personal stores to the subject who owns them', () => {
    applyScope('subject-a');
    expect(scopedKey(ARCHIVE)).toBe(`${ARCHIVE}::subject-a`);
    scoped.setItem(ARCHIVE, 'x');
    expect(storage.getItem(`${ARCHIVE}::subject-a`)).toBe('x');
    expect(storage.getItem(ARCHIVE)).toBeNull();
  });

  it('one learner can never read the other’s conversation on a shared device', () => {
    applyScope('subject-a');
    writeArchive(turn('what we talked about'));
    applyScope('subject-b');
    expect(readArchive()).toEqual([]);
    writeArchive(turn('a different learner'));
    applyScope('subject-a');
    expect(readArchive()[0]?.text).toBe('what we talked about');
  });

  it('the first subject to claim the device inherits what was written before there was a session', () => {
    writeArchive(turn('before anyone signed in')); // unscoped — a keyless boot
    expect(storage.getItem(ARCHIVE)).not.toBeNull();

    applyScope('subject-a');

    expect(readArchive()[0]?.text).toBe('before anyone signed in');
    expect(storage.getItem(ARCHIVE)).toBeNull(); // moved, not copied — the next learner starts clean
    applyScope('subject-b');
    expect(readArchive()).toEqual([]);
  });

  it('signing in for real carries the anonymous learner’s work across', () => {
    applyScope('anon-1', true);
    writeArchive(turn('the lesson before sign-up'));
    expect(rememberedScope()).toEqual({ subject: 'anon-1', anonymous: true });

    inheritScope('anon-1', 'real-1');

    expect(readArchive()[0]?.text).toBe('the lesson before sign-up');
    expect(rememberedScope()).toEqual({ subject: 'real-1', anonymous: false });
    expect(storage.getItem(`${ARCHIVE}::anon-1`)).toBeNull();
  });

  it('signing out takes that learner’s keys off the device', () => {
    applyScope('subject-a');
    writeArchive(turn('mine'));
    scoped.setItem('wobo-mind-v1', '{"facts":[]}');
    scoped.setItem('wobo-learner-profile', '{"name":"Learner"}');

    forgetScope('subject-a');

    expect(storage.getItem(`${ARCHIVE}::subject-a`)).toBeNull();
    expect(storage.getItem('wobo-mind-v1::subject-a')).toBeNull();
    expect(storage.getItem('wobo-learner-profile::subject-a')).toBeNull();
    expect(rememberedScope()).toBeNull();
    expect(readArchive()).toEqual([]);
  });

  it('an unscoped build keeps the plain keys, exactly as it always did', () => {
    applyScope(null);
    writeArchive(turn('local only'));
    expect(storage.getItem(ARCHIVE)).not.toBeNull();
    expect(readArchive()[0]?.text).toBe('local only');
  });
});
