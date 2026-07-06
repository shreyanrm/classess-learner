'use client';

/**
 * The day's stops — derived live from real progress state, never hardcoded.
 * Every stop is a real navigation; the thread on the home is just these, drawn.
 */

import { chaptersBySubject, mathChapters, subjects, topicById } from '../../data/catalog';
import type { Topic } from '../../data/model';
import type { Route } from '../../shell/router';
import type { ProgressStore } from '../../store/progress';

export type StopKind = 'landing' | 'done' | 'continue' | 'next' | 'review' | 'boss';

export interface ThreadStop {
  id: string;
  kind: StopKind;
  title: string;
  meta: string;
  /** Furthest fraction reached inside a continue topic — drawn as its filament. */
  progress?: number;
  /** Boss gate only: dashed until the day's topic finishes. */
  locked?: boolean;
  route: Route;
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

export function deriveStops(
  p: Pick<ProgressStore, 'completed' | 'topicProgress' | 'streakDays'>,
): { stops: ThreadStop[]; currentIndex: number } {
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
      meta: `day ${streakDays} of being a learner · done`,
      route: { name: 'progress' },
    },
    ...doneTopics.map(
      (t): ThreadStop => ({
        id: `done-${t.id}`,
        kind: 'done',
        title: t.name,
        meta: 'done · revisit any time',
        route: { name: 'course', topicId: t.id },
      }),
    ),
  ];

  if (continueTopic) {
    stops.push({
      id: `continue-${continueTopic.id}`,
      kind: 'continue',
      title: continueTopic.name,
      meta: `continue · ${Math.round(continueF * 100)}% walked`,
      progress: continueF,
      route: { name: 'course', topicId: continueTopic.id },
    });
  }
  if (nextTopic) {
    stops.push({
      id: `next-${nextTopic.id}`,
      kind: 'next',
      title: nextTopic.name,
      meta: 'next up · a fresh idea',
      route: { name: 'course', topicId: nextTopic.id },
    });
  }
  if (completed.size > 0) {
    stops.push({
      id: 'review',
      kind: 'review',
      title: 'Review',
      meta: 'refresh what’s fading',
      route: { name: 'practice' },
    });
  }
  if (gate) {
    stops.push({
      id: `boss-${gate.id}`,
      kind: 'boss',
      title: 'Boss gate',
      meta: gateDone ? 'unlocked · ready when you are' : 'locked · finish today’s topic',
      locked: !gateDone,
      route: { name: 'course', topicId: gate.id },
    });
  }

  const currentIndex = Math.max(
    stops.findIndex((s) => s.kind === (continueTopic ? 'continue' : 'next')),
    0,
  );
  return { stops, currentIndex };
}
