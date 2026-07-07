import type { SupabaseRest } from './supabase';

/**
 * The learner-state persistence seam. One shape (`LearnerState`) backs XP, the identity streak,
 * topic progress, and the mind snapshot; one shape (`ThreadSnapshot`) backs Vidya's conversation.
 * Mock/local mode persists to localStorage only. Live mode keeps localStorage as the offline cache
 * and reconciles with `learner.learner_state` / `learner.learner_threads` (RLS: subject_id =
 * auth.uid()) — hydrate on boot, merge on write. The merge functions are pure and tested.
 */

export interface LearnerState {
  xp: number;
  streakDays: number;
  /** YYYY-MM-DD of the last earned moment — drives the identity streak roll-forward. */
  lastActiveDay: string;
  completedTopics: string[];
  /** Furthest fraction reached inside each topic's course (0..1). */
  topicProgress: Record<string, number>;
  /** One-time award keys already granted (account, profile_photo, …). */
  awardedOnce: string[];
  /** Streak-freeze budget: repairs of a broken streak against a monthly allowance (family P). */
  streakFreezes: { month: string; used: number };
  /** A recently-broken streak awaiting a possible freeze-repair (within the repair window). */
  brokenStreak?: { days: number; brokenOn: string };
  /** The per-learner mind snapshot (preferences, profile touches, twin marks) — free-form, no PII. */
  mind: Record<string, unknown>;
  /** ISO stamp of the last local mutation — latest-wins fields reconcile on it. */
  updatedAt: string;
}

export interface ThreadTurn {
  id: string;
  role: 'user' | 'vidya';
  text: string;
}

export interface ThreadSnapshot {
  turns: ThreadTurn[];
  updatedAt: string;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyLearnerState(): LearnerState {
  return {
    xp: 0,
    streakDays: 1,
    lastActiveDay: todayISO(),
    completedTopics: [],
    topicProgress: {},
    awardedOnce: [],
    streakFreezes: { month: todayISO().slice(0, 7), used: 0 },
    mind: {},
    updatedAt: new Date().toISOString(),
  };
}

/** Fill defaults over a legacy/partial persisted shape (pre-live caches lack mind/updatedAt). */
export function normalizeLearnerState(raw: Partial<LearnerState> | null | undefined): LearnerState {
  const empty = emptyLearnerState();
  if (!raw || typeof raw !== 'object') return empty;
  return {
    xp: typeof raw.xp === 'number' ? raw.xp : empty.xp,
    streakDays: typeof raw.streakDays === 'number' ? raw.streakDays : empty.streakDays,
    lastActiveDay: raw.lastActiveDay ?? empty.lastActiveDay,
    completedTopics: raw.completedTopics ?? [],
    topicProgress: raw.topicProgress ?? {},
    awardedOnce: raw.awardedOnce ?? [],
    streakFreezes:
      raw.streakFreezes && typeof raw.streakFreezes.month === 'string'
        ? { month: raw.streakFreezes.month, used: Math.max(0, raw.streakFreezes.used || 0) }
        : empty.streakFreezes,
    brokenStreak:
      raw.brokenStreak &&
      typeof raw.brokenStreak.days === 'number' &&
      typeof raw.brokenStreak.brokenOn === 'string'
        ? { days: raw.brokenStreak.days, brokenOn: raw.brokenStreak.brokenOn }
        : undefined,
    mind: raw.mind ?? {},
    updatedAt: raw.updatedAt ?? empty.updatedAt,
  };
}

function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/**
 * Reconcile two copies of the learner's state (local cache vs remote row). Order-independent:
 * monotonic fields take the max, sets union, the streak follows the later active day (continuing
 * it when the other device kept the chain alive one day earlier), and the mind is a shallow merge
 * with the fresher copy on top.
 * ponytail: xp is max, not summed per-device deltas — two devices grinding simultaneously keep the
 * larger counter; switch to delta accounting if dual-device play becomes real.
 */
export function mergeLearnerState(a: LearnerState, b: LearnerState): LearnerState {
  const [earlier, later] = a.lastActiveDay <= b.lastActiveDay ? [a, b] : [b, a];
  let streakDays: number;
  if (earlier.lastActiveDay === later.lastActiveDay) {
    streakDays = Math.max(a.streakDays, b.streakDays);
  } else if (nextDay(earlier.lastActiveDay) === later.lastActiveDay) {
    // The other device was active the day before — the chain continues through it.
    streakDays = Math.max(later.streakDays, earlier.streakDays + 1);
  } else {
    streakDays = later.streakDays;
  }

  const topicProgress: Record<string, number> = { ...a.topicProgress };
  for (const [id, f] of Object.entries(b.topicProgress)) {
    topicProgress[id] = Math.max(topicProgress[id] ?? 0, f);
  }

  const [staler, fresher] = a.updatedAt <= b.updatedAt ? [a, b] : [b, a];

  // Streak-freeze budget: within one month keep the higher spend; a newer month resets naturally.
  const [fa, fb] = [a.streakFreezes, b.streakFreezes];
  const streakFreezes =
    fa.month === fb.month ? { month: fa.month, used: Math.max(fa.used, fb.used) } : fa.month > fb.month ? fa : fb;
  // ponytail: the fresher write wins on the pending break, so a repair (which clears it) propagates;
  // freeze state is local-first (not in the remote row) so this only matters across real devices.
  const brokenStreak = fresher.brokenStreak;

  return {
    xp: Math.max(a.xp, b.xp),
    streakDays,
    lastActiveDay: later.lastActiveDay,
    completedTopics: [...new Set([...a.completedTopics, ...b.completedTopics])],
    topicProgress,
    awardedOnce: [...new Set([...a.awardedOnce, ...b.awardedOnce])],
    streakFreezes,
    brokenStreak,
    mind: { ...staler.mind, ...fresher.mind },
    updatedAt: fresher.updatedAt,
  };
}

/**
 * Reconcile two copies of a conversation. Whole-thread latest-wins (a conversation is one document,
 * not a CRDT); on an equal stamp the longer transcript wins.
 * ponytail: no per-turn merge — interleaving two devices' turns mid-flight isn't worth it yet.
 */
export function mergeThread(a: ThreadSnapshot, b: ThreadSnapshot): ThreadSnapshot {
  if (a.updatedAt === b.updatedAt) return a.turns.length >= b.turns.length ? a : b;
  return a.updatedAt > b.updatedAt ? a : b;
}

// --- Providers ------------------------------------------------------------------------------------

/** The slice of Web Storage the providers need (injectable for tests / non-DOM runtimes). */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

class MemoryStorage implements KVStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function defaultStorage(): KVStorage {
  const ls = (globalThis as { localStorage?: KVStorage }).localStorage;
  return ls ?? new MemoryStorage();
}

/** The same keys the app has always used, so existing devices carry their progress over. */
export const STATE_CACHE_KEY = 'clss-progress-v1';
function threadCacheKey(thread: string): string {
  return thread === 'vidya' ? 'clss-vidya-conversation-v1' : `clss-thread-${thread}-v1`;
}

export interface StateProvider {
  /** Synchronous read of the local cache — the boot value before any network. */
  loadCache(): LearnerState;
  /** Reconcile with the remote store (a no-op locally); resolves to the merged truth. */
  hydrate(): Promise<LearnerState>;
  /** Merge-on-write: the cache updates immediately; the remote push is debounced. */
  save(state: LearnerState): void;
  loadThreadCache(thread: string): ThreadSnapshot | null;
  hydrateThread(thread: string): Promise<ThreadSnapshot | null>;
  saveThread(thread: string, turns: ThreadTurn[]): void;
}

/** localStorage-only persistence — mock/local mode, fully working keyless. */
export class LocalStateProvider implements StateProvider {
  constructor(
    protected readonly storage: KVStorage = defaultStorage(),
    // Scopes the cache to one account so two learners on the same browser never share a bucket.
    // Empty = legacy single-user local build (keeps the historical key so existing devices carry
    // over). Live mode passes the per-user subjectId, so a different account reads an empty bucket.
    protected readonly scope = '',
  ) {}

  protected stateKey(): string {
    return this.scope ? `${STATE_CACHE_KEY}:${this.scope}` : STATE_CACHE_KEY;
  }

  protected threadKey(thread: string): string {
    const base = threadCacheKey(thread);
    return this.scope ? `${base}:${this.scope}` : base;
  }

  loadCache(): LearnerState {
    try {
      const raw = this.storage.getItem(this.stateKey());
      return normalizeLearnerState(raw ? (JSON.parse(raw) as Partial<LearnerState>) : null);
    } catch {
      return emptyLearnerState();
    }
  }

  async hydrate(): Promise<LearnerState> {
    return this.loadCache();
  }

  save(state: LearnerState): void {
    try {
      this.storage.setItem(this.stateKey(), JSON.stringify(state));
    } catch {
      // storage unavailable — session-only state is fine
    }
  }

  loadThreadCache(thread: string): ThreadSnapshot | null {
    try {
      const raw = this.storage.getItem(this.threadKey(thread));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ThreadSnapshot | ThreadTurn[];
      // The pre-live cache stored the bare turns array.
      if (Array.isArray(parsed)) return { turns: parsed, updatedAt: new Date(0).toISOString() };
      return parsed.turns ? parsed : null;
    } catch {
      return null;
    }
  }

  async hydrateThread(thread: string): Promise<ThreadSnapshot | null> {
    return this.loadThreadCache(thread);
  }

  saveThread(thread: string, turns: ThreadTurn[]): void {
    try {
      const snapshot: ThreadSnapshot = { turns, updatedAt: new Date().toISOString() };
      this.storage.setItem(this.threadKey(thread), JSON.stringify(snapshot));
    } catch {
      // storage unavailable — session-only is fine
    }
  }
}

type StateRest = Pick<SupabaseRest, 'selectOne' | 'upsert'>;

function stateToRow(subjectId: string, s: LearnerState): Record<string, unknown> {
  return {
    subject_id: subjectId,
    xp: s.xp,
    streak_days: s.streakDays,
    last_active_day: s.lastActiveDay,
    completed_topics: s.completedTopics,
    topic_progress: s.topicProgress,
    awarded_once: s.awardedOnce,
    mind: s.mind,
    client_updated_at: s.updatedAt,
  };
}

function stateFromRow(row: Record<string, unknown>): LearnerState {
  return normalizeLearnerState({
    xp: row.xp as number,
    streakDays: row.streak_days as number,
    lastActiveDay: (row.last_active_day as string) ?? undefined,
    completedTopics: (row.completed_topics as string[]) ?? [],
    topicProgress: (row.topic_progress as Record<string, number>) ?? {},
    awardedOnce: (row.awarded_once as string[]) ?? [],
    mind: (row.mind as Record<string, unknown>) ?? {},
    updatedAt: (row.client_updated_at as string) ?? undefined,
  });
}

/**
 * Live persistence: localStorage stays the offline cache; `learner.learner_state` /
 * `learner.learner_threads` are the remote truth, reconciled through the pure merges above.
 * Remote failures degrade silently to the cache — the learner never loses a session to a network.
 * ponytail: the debounced push is a whole-row upsert (last writer wins inside the window); each
 * device's cache retains its own truth and the next hydrate re-merges, so nothing is lost for good.
 */
export class SupabaseStateProvider extends LocalStateProvider {
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private threadTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly rest: StateRest,
    private readonly subjectId: string,
    storage?: KVStorage,
    private readonly debounceMs = 1500,
  ) {
    // Scope the local cache to this account so a second signed-in user on the same browser starts
    // from an empty bucket (then hydrates their own remote row), never the previous user's progress.
    super(storage ?? defaultStorage(), subjectId);
  }

  override async hydrate(): Promise<LearnerState> {
    const local = this.loadCache();
    try {
      const row = await this.rest.selectOne(
        'learner_state',
        `subject_id=eq.${this.subjectId}&select=*`,
      );
      const merged = row ? mergeLearnerState(local, stateFromRow(row)) : local;
      super.save(merged);
      await this.rest.upsert('learner_state', stateToRow(this.subjectId, merged), 'subject_id');
      return merged;
    } catch {
      return local; // offline — the cache is the session's truth; the next boot reconciles
    }
  }

  override save(state: LearnerState): void {
    super.save(state);
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.rest
        .upsert('learner_state', stateToRow(this.subjectId, this.loadCache()), 'subject_id')
        .catch(() => {}); // offline — cache holds; the next hydrate/save pushes
    }, this.debounceMs);
  }

  override async hydrateThread(thread: string): Promise<ThreadSnapshot | null> {
    const local = this.loadThreadCache(thread);
    try {
      const row = await this.rest.selectOne(
        'learner_threads',
        `subject_id=eq.${this.subjectId}&thread=eq.${thread}&select=*`,
      );
      const remote: ThreadSnapshot | null = row
        ? {
            turns: (row.turns as ThreadTurn[]) ?? [],
            updatedAt: (row.client_updated_at as string) ?? new Date(0).toISOString(),
          }
        : null;
      const merged = local && remote ? mergeThread(local, remote) : (remote ?? local);
      if (merged) {
        this.storage.setItem(this.threadKey(thread), JSON.stringify(merged));
      }
      return merged;
    } catch {
      return local;
    }
  }

  override saveThread(thread: string, turns: ThreadTurn[]): void {
    super.saveThread(thread, turns);
    const prior = this.threadTimers.get(thread);
    if (prior) clearTimeout(prior);
    this.threadTimers.set(
      thread,
      setTimeout(() => {
        this.threadTimers.delete(thread);
        const snapshot = this.loadThreadCache(thread);
        if (!snapshot) return;
        void this.rest
          .upsert(
            'learner_threads',
            {
              subject_id: this.subjectId,
              thread,
              turns: snapshot.turns,
              client_updated_at: snapshot.updatedAt,
            },
            'subject_id,thread',
          )
          .catch(() => {});
      }, this.debounceMs),
    );
  }
}
