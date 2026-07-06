import { describe, expect, it } from 'bun:test';
import { DEV_DEFAULTS } from '../src/config';
import { SupabaseOutboxEventProvider } from '../src/events';
import {
  emptyLearnerState,
  type KVStorage,
  type LearnerState,
  LocalStateProvider,
  mergeLearnerState,
  mergeThread,
  normalizeLearnerState,
  STATE_CACHE_KEY,
  SupabaseStateProvider,
  type ThreadSnapshot,
} from '../src/state';

function state(partial: Partial<LearnerState>): LearnerState {
  return { ...emptyLearnerState(), ...partial };
}

class FakeStorage implements KVStorage {
  readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('mergeLearnerState reconciliation', () => {
  it('takes the max of monotonic counters and unions the sets', () => {
    const a = state({
      xp: 300,
      completedTopics: ['m1-1'],
      awardedOnce: ['account'],
      topicProgress: { 'm1-1': 1, 'm2-1': 0.4 },
    });
    const b = state({
      xp: 220,
      completedTopics: ['m2-1'],
      awardedOnce: ['profile_photo'],
      topicProgress: { 'm2-1': 0.7 },
    });
    const merged = mergeLearnerState(a, b);
    expect(merged.xp).toBe(300);
    expect(merged.completedTopics.sort()).toEqual(['m1-1', 'm2-1']);
    expect(merged.awardedOnce.sort()).toEqual(['account', 'profile_photo']);
    expect(merged.topicProgress).toEqual({ 'm1-1': 1, 'm2-1': 0.7 });
  });

  it('is order-independent on the union/max fields', () => {
    const a = state({ xp: 10, completedTopics: ['x'], topicProgress: { x: 0.2 } });
    const b = state({ xp: 90, completedTopics: ['y'], topicProgress: { x: 0.9 } });
    const ab = mergeLearnerState(a, b);
    const ba = mergeLearnerState(b, a);
    expect(ab.xp).toBe(ba.xp);
    expect(ab.topicProgress).toEqual(ba.topicProgress);
    expect(new Set(ab.completedTopics)).toEqual(new Set(ba.completedTopics));
  });

  it('keeps the larger streak when both copies share the active day', () => {
    const merged = mergeLearnerState(
      state({ streakDays: 4, lastActiveDay: '2026-07-06' }),
      state({ streakDays: 9, lastActiveDay: '2026-07-06' }),
    );
    expect(merged.streakDays).toBe(9);
    expect(merged.lastActiveDay).toBe('2026-07-06');
  });

  it('continues the chain when the other device was active the day before', () => {
    // Remote device kept a 10-day streak through yesterday; this device started fresh today.
    const merged = mergeLearnerState(
      state({ streakDays: 1, lastActiveDay: '2026-07-06' }),
      state({ streakDays: 10, lastActiveDay: '2026-07-05' }),
    );
    expect(merged.streakDays).toBe(11);
    expect(merged.lastActiveDay).toBe('2026-07-06');
  });

  it('resets honestly when the copies are more than a day apart', () => {
    const merged = mergeLearnerState(
      state({ streakDays: 2, lastActiveDay: '2026-07-06' }),
      state({ streakDays: 30, lastActiveDay: '2026-06-20' }),
    );
    expect(merged.streakDays).toBe(2);
  });

  it('lets the fresher mind win key conflicts while keeping the union', () => {
    const merged = mergeLearnerState(
      state({ mind: { voice: 'on', theme: 'dusk' }, updatedAt: '2026-07-06T10:00:00Z' }),
      state({ mind: { voice: 'off' }, updatedAt: '2026-07-06T12:00:00Z' }),
    );
    expect(merged.mind).toEqual({ voice: 'off', theme: 'dusk' });
    expect(merged.updatedAt).toBe('2026-07-06T12:00:00Z');
  });

  it('normalizes a legacy cache shape (no mind/updatedAt) without losing progress', () => {
    const legacy = normalizeLearnerState({
      xp: 120,
      streakDays: 3,
      lastActiveDay: '2026-07-01',
      completedTopics: ['m1-1'],
      awardedOnce: [],
    } as Partial<LearnerState>);
    expect(legacy.xp).toBe(120);
    expect(legacy.mind).toEqual({});
    expect(legacy.topicProgress).toEqual({});
    expect(legacy.updatedAt).toBeTruthy();
  });
});

describe('mergeThread reconciliation', () => {
  const turnsA = [{ id: '1', role: 'vidya' as const, text: 'hello' }];
  const turnsB = [
    { id: '1', role: 'vidya' as const, text: 'hello' },
    { id: '2', role: 'user' as const, text: 'hi' },
  ];

  it('newer snapshot wins whole', () => {
    const older: ThreadSnapshot = { turns: turnsB, updatedAt: '2026-07-06T09:00:00Z' };
    const newer: ThreadSnapshot = { turns: turnsA, updatedAt: '2026-07-06T11:00:00Z' };
    expect(mergeThread(older, newer)).toBe(newer);
    expect(mergeThread(newer, older)).toBe(newer);
  });

  it('on an equal stamp the longer transcript wins', () => {
    const a: ThreadSnapshot = { turns: turnsA, updatedAt: '2026-07-06T09:00:00Z' };
    const b: ThreadSnapshot = { turns: turnsB, updatedAt: '2026-07-06T09:00:00Z' };
    expect(mergeThread(a, b)).toBe(b);
  });
});

describe('LocalStateProvider', () => {
  it('round-trips state and threads through the cache keys', async () => {
    const storage = new FakeStorage();
    const provider = new LocalStateProvider(storage);
    const s = state({ xp: 42, completedTopics: ['m1-1'] });
    provider.save(s);
    expect((await provider.hydrate()).xp).toBe(42);
    provider.saveThread('vidya', [{ id: 't1', role: 'user', text: 'hey' }]);
    const thread = provider.loadThreadCache('vidya');
    expect(thread?.turns[0]?.text).toBe('hey');
    // Same keys the app has always used.
    expect(storage.map.has(STATE_CACHE_KEY)).toBe(true);
    expect(storage.map.has('clss-vidya-conversation-v1')).toBe(true);
  });

  it('reads a legacy bare-array conversation cache', () => {
    const storage = new FakeStorage();
    storage.setItem(
      'clss-vidya-conversation-v1',
      JSON.stringify([{ id: 'seed', role: 'vidya', text: 'ask me anything' }]),
    );
    const thread = new LocalStateProvider(storage).loadThreadCache('vidya');
    expect(thread?.turns).toHaveLength(1);
  });
});

describe('SupabaseStateProvider hydration', () => {
  const SUBJECT = '00000000-0000-7000-8000-000000000001';

  function fakeRest(remoteRow: Record<string, unknown> | null) {
    const upserts: { table: string; row: Record<string, unknown> }[] = [];
    return {
      upserts,
      rest: {
        selectOne: async () => remoteRow,
        upsert: async (table: string, row: Record<string, unknown>) => {
          upserts.push({ table, row });
        },
      },
    };
  }

  it('merges the remote row over the local cache and pushes the merged truth back', async () => {
    const storage = new FakeStorage();
    storage.setItem(
      STATE_CACHE_KEY,
      JSON.stringify(state({ xp: 100, completedTopics: ['m1-1'], lastActiveDay: '2026-07-06' })),
    );
    const { rest, upserts } = fakeRest({
      subject_id: SUBJECT,
      xp: 250,
      streak_days: 6,
      last_active_day: '2026-07-05',
      completed_topics: ['m2-1'],
      topic_progress: { 'm2-1': 0.5 },
      awarded_once: ['account'],
      mind: {},
      client_updated_at: '2026-07-05T10:00:00Z',
    });
    const provider = new SupabaseStateProvider(rest, SUBJECT, storage, 1);
    const merged = await provider.hydrate();
    expect(merged.xp).toBe(250);
    expect(merged.completedTopics.sort()).toEqual(['m1-1', 'm2-1']);
    expect(merged.streakDays).toBe(7); // remote chain through yesterday continues today
    // Cache now holds the merged truth; the merged row went back up.
    expect(JSON.parse(storage.map.get(STATE_CACHE_KEY) ?? '{}').xp).toBe(250);
    expect(upserts).toHaveLength(1);
    expect(upserts[0]?.row.xp).toBe(250);
  });

  it('degrades to the local cache when the network is down', async () => {
    const storage = new FakeStorage();
    storage.setItem(STATE_CACHE_KEY, JSON.stringify(state({ xp: 77 })));
    const provider = new SupabaseStateProvider(
      {
        selectOne: async () => {
          throw new Error('offline');
        },
        upsert: async () => {
          throw new Error('offline');
        },
      },
      SUBJECT,
      storage,
      1,
    );
    expect((await provider.hydrate()).xp).toBe(77);
  });

  it('prefers the fresher remote conversation on thread hydrate', async () => {
    const storage = new FakeStorage();
    storage.setItem(
      'clss-vidya-conversation-v1',
      JSON.stringify({
        turns: [{ id: 'a', role: 'vidya', text: 'old' }],
        updatedAt: '2026-07-06T08:00:00Z',
      }),
    );
    const { rest } = fakeRest({
      subject_id: SUBJECT,
      thread: 'vidya',
      turns: [
        { id: 'a', role: 'vidya', text: 'old' },
        { id: 'b', role: 'user', text: 'new from the other device' },
      ],
      client_updated_at: '2026-07-06T09:30:00Z',
    });
    const provider = new SupabaseStateProvider(rest, SUBJECT, storage, 1);
    const merged = await provider.hydrateThread('vidya');
    expect(merged?.turns).toHaveLength(2);
    // The cache was reconciled too.
    expect(
      (JSON.parse(storage.map.get('clss-vidya-conversation-v1') ?? '{}') as ThreadSnapshot).turns,
    ).toHaveLength(2);
  });
});

describe('SupabaseOutboxEventProvider batching', () => {
  it('flushes recorded events to the outbox in one batch and re-queues on failure', async () => {
    const calls: unknown[][] = [];
    let fail = true;
    const rest = {
      rpc: async (_fn: string, args: Record<string, unknown>) => {
        if (fail) throw new Error('offline');
        calls.push(args.p_events as unknown[]);
        return calls.length;
      },
    };
    const kgtopg = { consume: async () => ({ accepted: true, deduped: false }) };
    const provider = new SupabaseOutboxEventProvider(DEV_DEFAULTS, kgtopg, rest, 60_000);

    const payload = {
      surface: 'pwa' as const,
      app_version: '0.0.0',
      locale: 'en-IN',
      resumed: false,
    };
    provider.record('session.started.v1', payload);
    provider.record('session.started.v1', { ...payload, resumed: true });

    // Offline: the batch is kept, nothing lost.
    expect(await provider.flush()).toBe(0);
    expect(provider.pendingCount).toBe(2);

    // Back online: one rpc call carries the whole batch, in order.
    fail = false;
    expect(await provider.flush()).toBe(2);
    expect(provider.pendingCount).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(2);

    // The local log/mastery path was never blocked.
    expect(provider.getLog()).toHaveLength(2);
  });
});
