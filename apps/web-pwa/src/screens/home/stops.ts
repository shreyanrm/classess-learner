'use client';

/**
 * The day's stops — derived live from real progress state, never hardcoded.
 * Every stop is a real navigation; the thread on the home is just these, drawn.
 */

import { chaptersBySubject, mathChapters, subjects, topicById } from '../../data/catalog';
import type { Topic } from '../../data/model';
import type { Route } from '../../shell/router';
import type { ProgressStore } from '../../store/progress';
import { XP_AWARDS } from '../../store/progress';
import { hueForTopic } from '../../ui/hues';

export type StopKind = 'landing' | 'done' | 'continue' | 'next' | 'review' | 'boss' | 'bonus';

export interface ThreadStop {
  id: string;
  kind: StopKind;
  title: string;
  meta: string;
  /** The XP a quest pays out — shown as its bounty; pigment only once earned. */
  bounty?: number;
  /** True once the quest is genuinely earned — lights the stop and its bounty. */
  done?: boolean;
  /** The owning subject's hue — the pigment the earned burst arrives in. */
  hue?: string;
  /** Furthest fraction reached inside a continue topic — drawn as its filament. */
  progress?: number;
  /** Boss gate only: dashed until the day's topic finishes. */
  locked?: boolean;
  route: Route;
}

const MOLTEN = '#FF5A1F';
const DAILY_KEY = 'clss-daily-quest-v1';
const todayStr = (): string => new Date().toISOString().slice(0, 10);

/** Whether today's bonus quest chest has already been claimed. */
function claimedToday(): boolean {
  try {
    return localStorage.getItem(DAILY_KEY) === todayStr();
  } catch {
    return false;
  }
}

/**
 * Claim today's bonus quest. Returns true only on the first claim of the day, so the caller
 * awards the reward XP exactly once. The date-keyed flag is the real per-day de-dup.
 */
export function claimDailyQuest(): boolean {
  try {
    if (localStorage.getItem(DAILY_KEY) === todayStr()) return false;
    localStorage.setItem(DAILY_KEY, todayStr());
    return true;
  } catch {
    return false;
  }
}

/**
 * Every topic of the learner's world, subjects in canonical order (math first).
 * ponytail: the catalog is mid-restructure by another agent — if the live shape breaks,
 * fall back to the stable math spine so the home never renders empty.
 */
function worldTopics(): Topic[] {
  try {
    const out: Topic[] = [];
    for (const s of subjects) {
      const chapters = chaptersBySubject[s.id];
      if (!chapters) continue;
      for (const ch of chapters) out.push(...ch.topics);
    }
    if (out.length > 0) return out;
  } catch {
    // catalog exports unavailable mid-restructure — the math spine below is stable
  }
  return mathChapters.flatMap((c) => c.topics);
}

export function deriveStops(p: Pick<ProgressStore, 'completed' | 'topicProgress' | 'streakDays'>): {
  stops: ThreadStop[];
  currentIndex: number;
} {
  const { completed, topicProgress, streakDays } = p;

  // Continue — the furthest-along topic still in flight.
  let continueTopic: Topic | undefined;
  let continueF = 0;
  for (const [id, f] of Object.entries(topicProgress)) {
    if (f > 0 && f < 1 && !completed.has(id) && f >= continueF) {
      const t = topicById(id);
      if (t) {
        continueTopic = t;
        continueF = f;
      }
    }
  }

  // Next up — the first uncompleted topic of the learner's world.
  const world = worldTopics();
  const nextTopic = world.find((t) => !completed.has(t.id) && t.id !== continueTopic?.id);

  // Recently lit — the last two completions render as stops already behind you.
  const doneTopics = [...completed]
    .slice(-2)
    .map((id) => topicById(id))
    .filter((t): t is Topic => Boolean(t));

  // The boss gate belongs to the day's topic; it unlocks when that topic finishes.
  const gate = continueTopic ?? nextTopic;
  const gateDone = gate ? (topicProgress[gate.id] ?? 0) >= 1 || completed.has(gate.id) : false;

  const stops: ThreadStop[] = [
    // Endowed progress: the landing stop is always already lit — showing up counts.
    {
      id: 'landing',
      kind: 'landing',
      title: 'Warm-up',
      meta: `Day ${streakDays} of being a learner · done`,
      done: true,
      route: { name: 'progress' },
    },
    ...doneTopics.map(
      (t): ThreadStop => ({
        id: `done-${t.id}`,
        kind: 'done',
        title: t.name,
        meta: 'Done · revisit any time',
        done: true,
        hue: hueForTopic(t.id),
        route: { name: 'course', topicId: t.id },
      }),
    ),
  ];

  if (continueTopic) {
    stops.push({
      id: `continue-${continueTopic.id}`,
      kind: 'continue',
      title: continueTopic.name,
      meta: `Continue · ${Math.round(continueF * 100)}% walked`,
      bounty: continueTopic.xp,
      hue: hueForTopic(continueTopic.id),
      progress: continueF,
      route: { name: 'course', topicId: continueTopic.id },
    });
  }
  if (nextTopic) {
    stops.push({
      id: `next-${nextTopic.id}`,
      kind: 'next',
      title: nextTopic.name,
      meta: 'Next up · a fresh idea',
      bounty: nextTopic.xp,
      hue: hueForTopic(nextTopic.id),
      route: { name: 'course', topicId: nextTopic.id },
    });
  }
  if (completed.size > 0) {
    stops.push({
      id: 'review',
      kind: 'review',
      title: 'Review',
      meta: 'Refresh what’s fading',
      bounty: XP_AWARDS.item,
      route: { name: 'practice' },
    });
  }
  if (gate) {
    stops.push({
      id: `boss-${gate.id}`,
      kind: 'boss',
      title: 'Boss gate',
      meta: gateDone ? 'Unlocked · ready when you are' : 'Locked · finish today’s topic',
      bounty: gate.xp,
      hue: hueForTopic(gate.id),
      done: gateDone,
      locked: !gateDone,
      route: { name: 'course', topicId: gate.id },
    });
  }

  // The daily bonus quest — one date-seeded nudge drawn from real state, paid out from a chest.
  // Eligibility is real (you can only clear reviews if you've completed something; a mystery only
  // shows if the world holds an undiscovered one), and the day-of-year seed rotates the pick so it
  // is stable within a day and different across days.
  const mysteryTopic = world.find(
    (t) => (t.kind === 'mystery' || t.kind === 'bonus') && !completed.has(t.id),
  );
  const quests = {
    reviews: {
      title: 'Clear your reviews',
      meta: 'Daily quest · refresh what is fading',
      bounty: XP_AWARDS.bonus,
      route: { name: 'practice' } as Route,
    },
    mystery: {
      title: 'Explore a mystery',
      meta: 'Daily quest · something out of syllabus',
      bounty: XP_AWARDS.mystery,
      route: (mysteryTopic
        ? { name: 'course', topicId: mysteryTopic.id }
        : { name: 'sandbox' }) as Route,
    },
    ask: {
      title: 'Ask Wobo something',
      meta: 'Daily quest · one good question',
      bounty: XP_AWARDS.bonus,
      route: { name: 'chat' } as Route,
    },
  };
  const eligible: (keyof typeof quests)[] = ['ask'];
  if (completed.size > 0) eligible.unshift('reviews');
  if (mysteryTopic) eligible.push('mystery');
  const seed = Math.floor(Date.now() / 86_400_000);
  const pick = eligible[seed % eligible.length] as keyof typeof quests;
  const q = quests[pick];
  const claimed = claimedToday();
  stops.push({
    id: 'bonus',
    kind: 'bonus',
    title: q.title,
    meta: claimed ? 'daily quest · bonus claimed' : q.meta,
    bounty: q.bounty,
    done: claimed,
    hue: MOLTEN,
    route: q.route,
  });

  const currentIndex = Math.max(
    stops.findIndex((s) => s.kind === (continueTopic ? 'continue' : 'next')),
    0,
  );
  return { stops, currentIndex };
}
