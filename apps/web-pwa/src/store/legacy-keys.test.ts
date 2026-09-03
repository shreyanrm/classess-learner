/**
 * The rename must not cost a learner their world. Together with `legacy-keys.ts`, this file is the
 * one place the pre-rename `clss-` prefix is still written on purpose.
 */
import { describe, expect, it } from 'bun:test';
import { type KeyStore, MIGRATION_DONE_KEY, migrateLegacyKeys, renamedKey } from './legacy-keys';

function memory(
  seed: Record<string, string> = {},
): KeyStore & { snapshot(): Record<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

describe('the pre-rename key name maps to its wobo- name', () => {
  it('swaps the prefix', () => {
    expect(renamedKey('clss-mind-v1')).toBe('wobo-mind-v1');
    expect(renamedKey('clss-theme-v1')).toBe('wobo-theme-v1');
  });

  it("collapses Wobo's own namespace instead of stuttering", () => {
    expect(renamedKey('clss-wobo-archive-v1')).toBe('wobo-archive-v1');
    expect(renamedKey('clss-wobo-conversation-v1')).toBe('wobo-conversation-v1');
  });

  it('carries the per-learner scope suffix and any dynamic tail along', () => {
    expect(renamedKey('clss-mind-v1::subject-a')).toBe('wobo-mind-v1::subject-a');
    expect(renamedKey('clss-frame-v1:physics/motion')).toBe('wobo-frame-v1:physics/motion');
    expect(renamedKey('clss-wobo-archive-v1::subject-a')).toBe('wobo-archive-v1::subject-a');
  });

  it('leaves anything that was never ours alone', () => {
    expect(renamedKey('wobo-mind-v1')).toBeNull();
    expect(renamedKey('sb-keepraxqagzgjrrweryt-auth-token')).toBeNull();
    expect(renamedKey('wobo.dev.subject')).toBeNull();
  });
});

describe('an already-installed device keeps its world across the rename', () => {
  it('moves every old key forward and removes the old name', () => {
    const store = memory({
      'clss-mind-v1::sub-a': '{"facts":["exam on Friday"]}',
      'clss-wobo-archive-v1::sub-a': '[{"role":"wobo"}]',
      'clss-theme-v1': 'dark',
      'clss-progress-v1': '{"stars":12}',
      'sb-project-auth-token': 'untouched',
      'wobo.dev.subject': 'device-1',
    });

    expect(migrateLegacyKeys(store)).toBe(4);

    expect(store.snapshot()).toEqual({
      'wobo-mind-v1::sub-a': '{"facts":["exam on Friday"]}',
      'wobo-archive-v1::sub-a': '[{"role":"wobo"}]',
      'wobo-theme-v1': 'dark',
      'wobo-progress-v1': '{"stars":12}',
      'sb-project-auth-token': 'untouched',
      'wobo.dev.subject': 'device-1',
      [MIGRATION_DONE_KEY]: store.getItem(MIGRATION_DONE_KEY) as string,
    });
    expect(store.getItem(MIGRATION_DONE_KEY)).toBeTruthy();
  });

  it('runs once — a second boot moves nothing and cannot resurrect a deleted key', () => {
    const store = memory({ 'clss-theme-v1': 'dark' });
    expect(migrateLegacyKeys(store)).toBe(1);

    // The learner then switches to light. A migration that ran again must not undo that.
    store.setItem('wobo-theme-v1', 'light');
    expect(migrateLegacyKeys(store)).toBe(0);
    expect(store.getItem('wobo-theme-v1')).toBe('light');
  });

  it('a post-rename write wins over a stale old-prefix value, which is dropped', () => {
    const store = memory({ 'clss-theme-v1': 'dark', 'wobo-theme-v1': 'light' });
    expect(migrateLegacyKeys(store)).toBe(0);
    expect(store.getItem('wobo-theme-v1')).toBe('light');
    expect(store.getItem('clss-theme-v1')).toBeNull();
  });

  it('is a no-op on a fresh install', () => {
    const store = memory();
    expect(migrateLegacyKeys(store)).toBe(0);
    expect(store.getItem(MIGRATION_DONE_KEY)).toBeTruthy();
  });

  it('walks every key even though the walk is writing into the same store', () => {
    const seed: Record<string, string> = {};
    for (let i = 0; i < 50; i += 1) seed[`clss-k${i}`] = String(i);
    const store = memory(seed);
    expect(migrateLegacyKeys(store)).toBe(50);
    for (let i = 0; i < 50; i += 1) {
      expect(store.getItem(`wobo-k${i}`)).toBe(String(i));
      expect(store.getItem(`clss-k${i}`)).toBeNull();
    }
  });

  it('storage denied (private mode) is a no-op, never a crash on the first frame', () => {
    const denied: KeyStore = {
      get length(): number {
        throw new Error('SecurityError');
      },
      key: () => null,
      getItem: () => null,
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {},
    };
    expect(migrateLegacyKeys(denied)).toBe(0);
    expect(migrateLegacyKeys(undefined)).toBe(0);
  });
});
