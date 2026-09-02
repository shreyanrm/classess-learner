import { describe, expect, it } from 'bun:test';
import { DEVICE_SUBJECT_KEY, deviceMockSubject, type SimpleStorage } from './device';

const LEGACY = '00000000-0000-7000-8000-000000000001';

function memory(seed: Record<string, string> = {}): SimpleStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

describe('the keyless dev identity is per device, not per build', () => {
  it('mints a fresh id on a device that has never been used', () => {
    const store = memory();
    const id = deviceMockSubject(LEGACY, store, () => 'fresh-1');
    expect(id).toBe('fresh-1');
    expect(store.getItem(DEVICE_SUBJECT_KEY)).toBe('fresh-1');
  });

  it('never returns the shared built-in default to a new device', () => {
    const id = deviceMockSubject(LEGACY, memory(), () => 'fresh-2');
    expect(id).not.toBe(LEGACY);
  });

  it('is stable across calls, so a learner keeps their world', () => {
    const store = memory();
    const first = deviceMockSubject(LEGACY, store, () => 'fresh-3');
    const second = deviceMockSubject(LEGACY, store, () => 'a-different-one');
    expect(second).toBe(first);
  });

  it('keeps the legacy id when this device already has data under it', () => {
    const store = memory({ [`wobo.mind::${LEGACY}`]: '{"x":1}' });
    expect(deviceMockSubject(LEGACY, store, () => 'fresh-4')).toBe(LEGACY);
  });

  it('falls back to the SDK default when storage refuses to answer', () => {
    const blocked: SimpleStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      length: 0,
      key: () => null,
    };
    expect(deviceMockSubject(LEGACY, blocked)).toBeUndefined();
  });
});
