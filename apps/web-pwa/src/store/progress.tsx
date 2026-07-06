'use client';

/**
 * The gamification spine: XP, the identity streak, completions, and the bloom queue.
 *
 * Psychology (CONTEXT.md §9): XP is the visible currency; mastery is the truth underneath.
 * Rewards are few and precious — a bloom fires on genuine earn (completion, boss, account
 * moments), never on routine taps. The streak is an identity streak ("day 7 of being a
 * learner") and rest is sanctioned, never guilted.
 *
 * Persistence rides the SDK state seam: localStorage is the always-on cache (same key as ever);
 * in live mode learner_state hydrates on boot and merges on write, so devices reconcile.
 */

import { type LearnerState, mergeLearnerState } from '@classess/sdk';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { hueForTopic } from '../ui/hues';
import { useSdk } from './sdk';

export type XpReason =
  | 'item'
  | 'boss'
  | 'topic'
  | 'account'
  | 'profile_photo'
  | 'invite_friend'
  | 'invite_parent'
  | 'mystery'
  | 'bonus';

export const XP_AWARDS: Record<XpReason, number> = {
  item: 10,
  boss: 80,
  topic: 150,
  account: 50,
  profile_photo: 20,
  invite_friend: 40,
  invite_parent: 40,
  mystery: 60,
  bonus: 45,
};

export interface XpBloom {
  id: number;
  amount: number;
  reason: XpReason;
  /** The owning subject's hue — earned moments carry the subject family. */
  hue?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Streak roll-forward: yesterday keeps it, today keeps it, older resets honestly (no guilt). */
function rollForward(p: LearnerState): LearnerState {
  const t = today();
  if (p.lastActiveDay === t) return p;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return {
    ...p,
    streakDays: p.lastActiveDay === yesterday ? p.streakDays + 1 : 1,
    lastActiveDay: t,
  };
}

function bumpToday() {
  try {
    const key = 'clss-activity-counts-v1';
    const counts = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>;
    const t = today();
    counts[t] = (counts[t] ?? 0) + 1;
    localStorage.setItem(key, JSON.stringify(counts));
  } catch {
    // storage unavailable — heat map just stays cool
  }
}

export interface ProgressStore {
  xp: number;
  streakDays: number;
  completed: ReadonlySet<string>;
  /** Furthest fraction reached inside each topic's course (0..1). */
  topicProgress: Record<string, number>;
  /** Persist the furthest point reached in a course — powers the row progress fills. */
  reportProgress: (topicId: string, fraction: number) => void;
  blooms: XpBloom[];
  /** Award XP with a bloom. One-time reasons (account, invites, photo) only ever grant once. */
  award: (reason: XpReason, opts?: { amount?: number; onceKey?: string; hue?: string }) => number;
  completeTopic: (topicId: string, xp?: number) => void;
  dismissBloom: (id: number) => void;
}

const Ctx = createContext<ProgressStore | null>(null);

export function useProgress(): ProgressStore {
  const s = useContext(Ctx);
  if (!s) throw new Error('useProgress must be used within <ProgressProvider>');
  return s;
}

let bloomSeq = 1;

export function ProgressProvider({ children }: { children: ReactNode }) {
  const sdk = useSdk();
  const [state, setState] = useState<LearnerState>(() => rollForward(sdk.state.loadCache()));
  const [blooms, setBlooms] = useState<XpBloom[]>([]);

  // Hydrate on boot: reconcile the local cache with learner_state (a no-op in local mode) so a
  // session on another device carries over — union of topics, max XP, the streak chain intact.
  useEffect(() => {
    let cancelled = false;
    sdk.state.hydrate().then((remote) => {
      if (cancelled) return;
      setState((prev) => {
        const merged = rollForward(mergeLearnerState(prev, remote));
        sdk.state.save(merged);
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  /** Every mutation stamps updatedAt and goes through the seam (cache now, remote debounced). */
  const persist = useCallback(
    (next: LearnerState): LearnerState => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      sdk.state.save(stamped);
      return stamped;
    },
    [sdk],
  );

  const pushBloom = useCallback((amount: number, reason: XpReason, hue?: string) => {
    const id = bloomSeq++;
    setBlooms((b) => [...b, { id, amount, reason, hue }]);
    setTimeout(() => setBlooms((b) => b.filter((x) => x.id !== id)), 2400);
  }, []);

  const award = useCallback(
    (reason: XpReason, opts?: { amount?: number; onceKey?: string; hue?: string }) => {
      const amount = opts?.amount ?? XP_AWARDS[reason];
      let granted = 0;
      setState((prev) => {
        const onceKey =
          opts?.onceKey ?? (['account', 'profile_photo'].includes(reason) ? reason : undefined);
        if (onceKey && prev.awardedOnce.includes(onceKey)) return prev;
        granted = amount;
        return persist({
          ...prev,
          xp: prev.xp + amount,
          lastActiveDay: today(),
          awardedOnce: onceKey ? [...prev.awardedOnce, onceKey] : prev.awardedOnce,
        });
      });
      bumpToday(); // the You heat map warms with every earned moment
      // The bloom must feel immediate; if the grant was a duplicate one-time award it is silent.
      setTimeout(() => granted > 0 && pushBloom(amount, reason, opts?.hue), 0);
      return amount;
    },
    [pushBloom, persist],
  );

  const completeTopic = useCallback(
    (topicId: string, xp?: number) => {
      setState((prev) => {
        if (prev.completedTopics.includes(topicId)) return prev;
        return persist({
          ...prev,
          xp: prev.xp + (xp ?? XP_AWARDS.topic),
          completedTopics: [...prev.completedTopics, topicId],
          lastActiveDay: today(),
        });
      });
      bumpToday();
      // a completion bloom carries the mastered topic's subject hue
      pushBloom(xp ?? XP_AWARDS.topic, 'topic', hueForTopic(topicId));
    },
    [pushBloom, persist],
  );

  const reportProgress = useCallback(
    (topicId: string, fraction: number) => {
      setState((prev) => {
        const cur = prev.topicProgress[topicId] ?? 0;
        const f = Math.max(0, Math.min(1, fraction));
        if (f <= cur) return prev;
        return persist({
          ...prev,
          topicProgress: { ...prev.topicProgress, [topicId]: f },
        });
      });
    },
    [persist],
  );

  const dismissBloom = useCallback((id: number) => {
    setBlooms((b) => b.filter((x) => x.id !== id));
  }, []);

  const store = useMemo<ProgressStore>(
    () => ({
      xp: state.xp,
      streakDays: state.streakDays,
      completed: new Set(state.completedTopics),
      topicProgress: state.topicProgress,
      reportProgress,
      blooms,
      award,
      completeTopic,
      dismissBloom,
    }),
    [state, blooms, award, completeTopic, dismissBloom, reportProgress],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
