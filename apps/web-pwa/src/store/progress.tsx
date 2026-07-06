'use client';

/**
 * The gamification spine: XP, the identity streak, completions, and the bloom queue.
 *
 * Psychology (CONTEXT.md §9): XP is the visible currency; mastery is the truth underneath.
 * Rewards are few and precious — a bloom fires on genuine earn (completion, boss, account
 * moments), never on routine taps. The streak is an identity streak ("day 7 of being a
 * learner") and rest is sanctioned, never guilted.
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { hueForTopic } from '../ui/hues';

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

interface Persisted {
  xp: number;
  topicProgress?: Record<string, number>;
  streakDays: number;
  lastActiveDay: string; // YYYY-MM-DD
  completedTopics: string[];
  awardedOnce: string[]; // one-time reasons already granted (account, profile_photo, …)
}

const KEY = 'clss-progress-v1';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      // Streak roll-forward: yesterday keeps it, today keeps it, older resets honestly (no guilt).
      const t = today();
      if (p.lastActiveDay !== t) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        p.streakDays = p.lastActiveDay === yesterday ? p.streakDays + 1 : 1;
        p.lastActiveDay = t;
      }
      return p;
    }
  } catch {
    // fresh start below
  }
  return { xp: 0, streakDays: 1, lastActiveDay: today(), completedTopics: [], awardedOnce: [] };
}

function save(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable — session-only progress is fine
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
  const [state, setState] = useState<Persisted>(load);
  const [blooms, setBlooms] = useState<XpBloom[]>([]);

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
        const next: Persisted = {
          ...prev,
          xp: prev.xp + amount,
          lastActiveDay: today(),
          awardedOnce: onceKey ? [...prev.awardedOnce, onceKey] : prev.awardedOnce,
        };
        save(next);
        return next;
      });
      // The bloom must feel immediate; if the grant was a duplicate one-time award it is silent.
      setTimeout(() => granted > 0 && pushBloom(amount, reason, opts?.hue), 0);
      return amount;
    },
    [pushBloom],
  );

  const completeTopic = useCallback(
    (topicId: string, xp?: number) => {
      setState((prev) => {
        if (prev.completedTopics.includes(topicId)) return prev;
        const next: Persisted = {
          ...prev,
          xp: prev.xp + (xp ?? XP_AWARDS.topic),
          completedTopics: [...prev.completedTopics, topicId],
          lastActiveDay: today(),
        };
        save(next);
        return next;
      });
      // a completion bloom carries the mastered topic's subject hue
      pushBloom(xp ?? XP_AWARDS.topic, 'topic', hueForTopic(topicId));
    },
    [pushBloom],
  );

  const reportProgress = useCallback((topicId: string, fraction: number) => {
    setState((prev) => {
      const cur = prev.topicProgress?.[topicId] ?? 0;
      const f = Math.max(0, Math.min(1, fraction));
      if (f <= cur) return prev;
      const next: Persisted = {
        ...prev,
        topicProgress: { ...(prev.topicProgress ?? {}), [topicId]: f },
      };
      save(next);
      return next;
    });
  }, []);

  const dismissBloom = useCallback((id: number) => {
    setBlooms((b) => b.filter((x) => x.id !== id));
  }, []);

  const store = useMemo<ProgressStore>(
    () => ({
      xp: state.xp,
      streakDays: state.streakDays,
      completed: new Set(state.completedTopics),
      topicProgress: state.topicProgress ?? {},
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
